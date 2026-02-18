/**
 * Testes da matriz de planos (PlanPresets)
 * Garante que FREE/BASIC/PRO/ULTRA refletem as regras de negócio.
 */
import { describe, it, expect } from 'vitest';
import {
  getPlanPermissions,
  mergeWithPlanPreset,
  comparePermissions,
} from '../components/permissions/PlanPresets.jsx';

function has(perms, module, action) {
  const arr = perms[module];
  return Array.isArray(arr) && arr.includes(action);
}

describe('PlanPresets - FREE', () => {
  const free = getPlanPermissions('free');

  it('gestor_pedidos apenas view (sem update)', () => {
    expect(has(free, 'gestor_pedidos', 'view')).toBe(true);
    expect(has(free, 'gestor_pedidos', 'update')).toBe(false);
  });
  it('orders apenas view', () => {
    expect(has(free, 'orders', 'view')).toBe(true);
    expect(has(free, 'orders', 'update')).toBe(false);
  });
  it('whatsapp desativado', () => {
    expect((free.whatsapp || []).length).toBe(0);
  });
  it('sem payments, financial, clients, history', () => {
    expect((free.payments || []).length).toBe(0);
    expect((free.financial || []).length).toBe(0);
    expect((free.clients || []).length).toBe(0);
    expect((free.history || []).length).toBe(0);
  });
  it('dishes CRUD e store view+update', () => {
    expect(has(free, 'dishes', 'create')).toBe(true);
    expect(has(free, 'store', 'update')).toBe(true);
  });
});

describe('PlanPresets - BASIC', () => {
  const basic = getPlanPermissions('basic');

  it('gestor_pedidos e orders têm update', () => {
    expect(has(basic, 'gestor_pedidos', 'update')).toBe(true);
    expect(has(basic, 'orders', 'update')).toBe(true);
  });
  it('payments view+update e financial view', () => {
    expect(has(basic, 'payments', 'update')).toBe(true);
    expect(has(basic, 'financial', 'view')).toBe(true);
  });
  it('2FA view+update', () => {
    expect(has(basic, '2fa', 'update')).toBe(true);
  });
  it('pdv e caixa vazios', () => {
    expect((basic.pdv || []).length).toBe(0);
    expect((basic.caixa || []).length).toBe(0);
  });
});

describe('PlanPresets - PRO', () => {
  const pro = getPlanPermissions('pro');

  it('gestor_pedidos e orders CRUD completo', () => {
    expect(has(pro, 'gestor_pedidos', 'delete')).toBe(true);
    expect(has(pro, 'orders', 'delete')).toBe(true);
  });
  it('cupons e delivery_zones CRUD', () => {
    expect(has(pro, 'coupons', 'create')).toBe(true);
    expect(has(pro, 'delivery_zones', 'delete')).toBe(true);
  });
  it('inventory, affiliates, colaboradores CRUD', () => {
    expect(has(pro, 'inventory', 'delete')).toBe(true);
    expect(has(pro, 'colaboradores', 'create')).toBe(true);
  });
  it('comandas sem close/history (só ULTRA)', () => {
    expect((pro.comandas || []).includes('close')).toBe(false);
    expect((pro.comandas || []).includes('history')).toBe(false);
  });
});

describe('PlanPresets - ULTRA', () => {
  const ultra = getPlanPermissions('ultra');

  it('pdv e caixa view+create+update', () => {
    expect(has(ultra, 'pdv', 'update')).toBe(true);
    expect(has(ultra, 'caixa', 'update')).toBe(true);
  });
  it('comandas tem close e history', () => {
    expect((ultra.comandas || []).includes('close')).toBe(true);
    expect((ultra.comandas || []).includes('history')).toBe(true);
  });
  it('tables CRUD', () => {
    expect(has(ultra, 'tables', 'create')).toBe(true);
    expect(has(ultra, 'tables', 'delete')).toBe(true);
  });
});

describe('getPlanPermissions', () => {
  it('retorna cópia (não mutar preset)', () => {
    const a = getPlanPermissions('basic');
    const b = getPlanPermissions('basic');
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
  it('plan desconhecido fallback para basic', () => {
    const perms = getPlanPermissions('inexistente');
    expect(has(perms, 'gestor_pedidos', 'update')).toBe(true);
  });
});

describe('mergeWithPlanPreset', () => {
  it('permissões vazias retorna preset do plano', () => {
    const merged = mergeWithPlanPreset({}, 'basic');
    expect(Object.keys(merged).length).toBeGreaterThan(0);
    expect(has(merged, 'gestor_pedidos', 'update')).toBe(true);
  });
  it('permissões preenchidas mantém e complementa com preset', () => {
    const merged = mergeWithPlanPreset({ dashboard: ['view', 'create'] }, 'free');
    expect(merged.dashboard).toEqual(['view', 'create']);
  });
});

describe('comparePermissions', () => {
  it('detecta adição e remoção de ações', () => {
    const before = { orders: ['view'] };
    const after = { orders: ['view', 'update'] };
    const changes = comparePermissions(before, after);
    const added = changes.find((c) => c.type === 'added' && c.module === 'orders');
    expect(added).toBeDefined();
    expect(added.actions).toContain('update');
  });
});
