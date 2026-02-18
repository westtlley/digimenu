/**
 * Testes unitários - Limites efetivos (Monetização 2.0)
 */
import { describe, it, expect } from 'vitest';
import { getEffectiveLimits, getBaseLimits, UNLIMITED } from '../../utils/planLimits.js';

describe('planLimits - getBaseLimits', () => {
  it('retorna limites do basic', () => {
    const base = getBaseLimits('basic');
    expect(base.orders_per_month).toBe(600);
    expect(base.products).toBe(150);
    expect(base.collaborators).toBe(2);
    expect(base.locations).toBe(1);
  });

  it('retorna orders ilimitado para ultra', () => {
    const base = getBaseLimits('ultra');
    expect(base.orders_per_month).toBe(UNLIMITED);
    expect(base.products).toBe(UNLIMITED);
  });
});

describe('planLimits - getEffectiveLimits', () => {
  it('soma addons.orders ao limite base', () => {
    const effective = getEffectiveLimits('basic', { orders: 1000 });
    expect(effective.orders_per_month).toBe(1600);
    expect(effective.products).toBe(150);
    expect(effective.collaborators).toBe(2);
    expect(effective.locations).toBe(1);
  });

  it('addons vazio ou inválido não altera', () => {
    const effective = getEffectiveLimits('basic', {});
    expect(effective.orders_per_month).toBe(600);
    const effective2 = getEffectiveLimits('pro', { orders: null });
    expect(effective2.orders_per_month).toBe(3000);
  });

  it('ultra com addon mantém orders ilimitado', () => {
    const effective = getEffectiveLimits('ultra', { orders: 5000 });
    expect(effective.orders_per_month).toBe(UNLIMITED);
  });

  it('free + 3000 addon = 3200 orders', () => {
    const effective = getEffectiveLimits('free', { orders: 3000 });
    expect(effective.orders_per_month).toBe(3200); // 200 + 3000
  });
});
