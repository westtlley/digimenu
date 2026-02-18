/**
 * Testes de limites por plano (Monetização Agressiva 2.0)
 */
import { describe, it, expect } from 'vitest';
import {
  getPlanLimits,
  formatLimitCopy,
  LIMIT_BLOCK_COPY,
  PLAN_LIMITS,
  UNLIMITED,
  ADDONS_ORDERS_OPTIONS,
} from '../constants/planLimits.js';

describe('planLimits - getPlanLimits', () => {
  it('retorna limites do free', () => {
    const limits = getPlanLimits('free');
    expect(limits).toBeTruthy();
    expect(limits.orders_per_month).toBe(200);
    expect(limits.products).toBe(20);
    expect(limits.collaborators).toBe(0);
    expect(limits.locations).toBe(1);
  });

  it('retorna limites do basic', () => {
    const limits = getPlanLimits('basic');
    expect(limits.orders_per_month).toBe(600);
    expect(limits.products).toBe(150);
    expect(limits.collaborators).toBe(2);
    expect(limits.locations).toBe(1);
  });

  it('retorna limites do pro', () => {
    const limits = getPlanLimits('pro');
    expect(limits.orders_per_month).toBe(3000);
    expect(limits.products).toBe(800);
    expect(limits.collaborators).toBe(5);
    expect(limits.locations).toBe(2);
  });

  it('retorna ilimitado para ultra em orders e products', () => {
    const limits = getPlanLimits('ultra');
    expect(limits.orders_per_month).toBe(UNLIMITED);
    expect(limits.products).toBe(UNLIMITED);
    expect(limits.collaborators).toBe(20);
    expect(limits.locations).toBe(5);
  });

  it('retorna null para custom', () => {
    expect(getPlanLimits('custom')).toBeNull();
  });

  it('retorna basic para plano desconhecido', () => {
    const limits = getPlanLimits('unknown');
    expect(limits).toEqual(PLAN_LIMITS.basic);
  });
});

describe('planLimits - formatLimitCopy', () => {
  it('substitui placeholders na mensagem', () => {
    const msg = 'Seu plano {PLANO} inclui {LIMITE} pedidos/mês. Você usou {USADOS}.';
    const out = formatLimitCopy(msg, { PLANO: 'Básico', LIMITE: 600, USADOS: 612 });
    expect(out).toContain('Básico');
    expect(out).toContain('600');
    expect(out).toContain('612');
  });
});

describe('planLimits - effective limits (logic)', () => {
  it('effective orders = base + addons', () => {
    const base = getPlanLimits('basic');
    const addonsOrders = 1000;
    const effective = base.orders_per_month === UNLIMITED
      ? UNLIMITED
      : base.orders_per_month + addonsOrders;
    expect(effective).toBe(1600);
  });

  it('ultra com addon continua ilimitado em orders', () => {
    const base = getPlanLimits('ultra');
    const addonsOrders = 3000;
    const effective = base.orders_per_month === UNLIMITED
      ? UNLIMITED
      : base.orders_per_month + addonsOrders;
    expect(effective).toBe(UNLIMITED);
  });
});

describe('planLimits - percentUsed (logic)', () => {
  it('percentUsed 80 quando usage = 80% do limit', () => {
    const limit = 100;
    const current = 80;
    const percent = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
    expect(percent).toBe(80);
  });

  it('percentUsed 100 quando usage >= limit', () => {
    const limit = 100;
    const current = 100;
    const percent = Math.min(100, Math.round((current / limit) * 100));
    expect(percent).toBe(100);
  });
});

describe('planLimits - LIMIT_BLOCK_COPY', () => {
  it('tem copy para orders, collaborators, products, locations', () => {
    expect(LIMIT_BLOCK_COPY.orders?.title).toBeTruthy();
    expect(LIMIT_BLOCK_COPY.collaborators?.title).toBeTruthy();
    expect(LIMIT_BLOCK_COPY.products?.title).toBeTruthy();
    expect(LIMIT_BLOCK_COPY.locations?.title).toBeTruthy();
  });

  it('orders tem ctaSecondary para add volume', () => {
    expect(LIMIT_BLOCK_COPY.orders?.ctaSecondary).toBeTruthy();
    expect(LIMIT_BLOCK_COPY.collaborators?.ctaSecondary).toBeFalsy();
  });
});

describe('planLimits - ADDONS_ORDERS_OPTIONS', () => {
  it('tem opções 0, 1000, 3000, 5000', () => {
    const values = ADDONS_ORDERS_OPTIONS.map((o) => o.value);
    expect(values).toContain(0);
    expect(values).toContain(1000);
    expect(values).toContain(3000);
    expect(values).toContain(5000);
  });
});
