import { describe, expect, it } from 'vitest';
import {
  buildDeliveryZonePayload,
  findDuplicateZoneGroups,
  findEquivalentDeliveryZones,
  parseBulkZonesInput,
  simulateDeliveryCoverage,
} from '../utils/deliveryZoneAdmin';

describe('deliveryZoneAdmin', () => {
  it('monta payload com source e compatibilidade de zona', () => {
    const zone = buildDeliveryZonePayload({
      name: 'Centro',
      fee: '8.5',
      min_order: '25',
    }, {
      defaultSource: 'bulk',
    });

    expect(zone).toMatchObject({
      neighborhood: 'Centro',
      name: 'Centro',
      fee: 8.5,
      min_order: 25,
      min_order_value: 25,
      source: 'bulk',
    });
  });

  it('detecta equivalencia de bairros por normalizacao', () => {
    const equivalents = findEquivalentDeliveryZones([
      { id: '1', neighborhood: 'Renascenca', fee: 8 },
      { id: '2', neighborhood: 'Centro', fee: 6 },
    ], 'renascença');

    expect(equivalents).toHaveLength(1);
    expect(equivalents[0].id).toBe('1');
  });

  it('parseia cadastro em lote com defaults, override por linha e duplicata interna', () => {
    const parsed = parseBulkZonesInput([
      'Centro',
      'Renascenca;9.5;30;inativo',
      'renascença',
    ].join('\n'), {
      fee: 7,
      minOrder: 20,
      isActive: true,
      source: 'bulk',
    });

    expect(parsed.parsedCount).toBe(2);
    expect(parsed.skippedCount).toBe(1);
    expect(parsed.items[0]).toMatchObject({
      neighborhood: 'Centro',
      fee: 7,
      min_order: 20,
      is_active: true,
      source: 'bulk',
    });
    expect(parsed.items[1]).toMatchObject({
      neighborhood: 'Renascenca',
      fee: 9.5,
      min_order: 30,
      is_active: false,
    });
    expect(parsed.duplicatesInInput).toHaveLength(1);
  });

  it('lista grupos duplicados ja existentes', () => {
    const duplicates = findDuplicateZoneGroups([
      { id: '1', neighborhood: 'Renascenca', fee: 8 },
      { id: '2', neighborhood: 'renascença', fee: 9 },
      { id: '3', neighborhood: 'Centro', fee: 6 },
    ]);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].zones).toHaveLength(2);
  });

  it('simula pedido minimo insuficiente usando a regra central', () => {
    const result = simulateDeliveryCoverage({
      neighborhood: 'Centro',
      subtotal: 18,
      store: {
        delivery_fee_mode: 'zone',
        min_order_value: 10,
      },
      deliveryZones: [
        { id: '1', neighborhood: 'Centro', fee: 6, min_order: 25, is_active: true },
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.belowMinimumOrder).toBe(true);
    expect(result.minimumOrderValue).toBe(25);
  });

  it('simula bairro fora da area respeitando o bloqueio real', () => {
    const result = simulateDeliveryCoverage({
      neighborhood: 'Bairro Inexistente',
      store: {
        delivery_fee_mode: 'zone',
        delivery_outside_area_behavior: 'block',
      },
      deliveryZones: [
        { id: '1', neighborhood: 'Centro', fee: 6, is_active: true },
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.deliveryRuleSource).toBe('outside_area_blocked');
  });
});
