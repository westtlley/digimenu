import { describe, expect, it } from 'vitest';
import {
  calculateDeliveryContext,
  findMatchingDeliveryZone,
  normalizeDeliveryZone,
  resolveCheckoutAddressMode,
} from '../utils/deliveryRules';

describe('deliveryRules', () => {
  it('normaliza bairro e aproveita legado com campo name', () => {
    const zone = normalizeDeliveryZone({
      id: 'legacy-1',
      name: 'Renascenca',
      fee: 8,
      is_active: true,
    });

    expect(zone).toMatchObject({
      neighborhood: 'Renascenca',
      name: 'Renascenca',
      fee: 8,
    });

    expect(findMatchingDeliveryZone([zone], 'Renascença')?.id).toBe('legacy-1');
  });

  it('bloqueia fora da area por padrao no modo bairro', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Bairro Inexistente',
      deliveryZones: [{ id: '1', neighborhood: 'Centro', fee: 6, is_active: true }],
      store: { delivery_fee_mode: 'zone', delivery_fee: 10 },
    });

    expect(context.blocked).toBe(true);
    expect(context.blockReason).toBe('outside_area');
    expect(context.deliveryRuleSource).toBe('outside_area_blocked');
  });

  it('mantem text_only no modo bairro e aplica taxa/minimo da zona', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Renascença',
      deliveryZones: [{ id: 'zone-1', neighborhood: 'Renascenca', fee: 9.5, min_order: 35, is_active: true }],
      store: {
        delivery_fee_mode: 'zone',
        checkout_address_mode: 'text_only',
        min_order_value: 20,
      },
    });

    expect(resolveCheckoutAddressMode({
      delivery_fee_mode: 'zone',
      checkout_address_mode: 'text_only',
    })).toBe('text_only');
    expect(context.blocked).toBe(false);
    expect(context.matchedZoneId).toBe('zone-1');
    expect(context.deliveryFee).toBe(9.5);
    expect(context.minimumOrderValue).toBe(35);
    expect(context.deliveryRuleSource).toBe('zone');
  });

  it('permite fallback explicito para taxa padrao da loja', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Bairro Inexistente',
      deliveryZones: [{ id: '1', neighborhood: 'Centro', fee: 6, is_active: true }],
      store: {
        delivery_fee_mode: 'zone',
        delivery_fee: 12,
        delivery_outside_area_behavior: 'fallback_store_fee',
      },
    });

    expect(context.blocked).toBe(false);
    expect(context.deliveryFee).toBe(12);
    expect(context.deliveryRuleSource).toBe('fallback_store_fee');
  });

  it('forca mapa no modo distancia e calcula taxa com coordenadas', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Centro',
      deliveryZones: [],
      store: {
        delivery_fee_mode: 'distance',
        checkout_address_mode: 'text_only',
        latitude: -2.53,
        longitude: -44.29,
        delivery_base_fee: 4,
        delivery_price_per_km: 2,
        delivery_min_fee: 0,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(resolveCheckoutAddressMode({ delivery_fee_mode: 'distance', checkout_address_mode: 'text_only' })).toBe('map_required');
    expect(context.deliveryFeeModeApplied).toBe('distance');
    expect(context.deliveryRuleSource).toBe('distance');
    expect(context.distanceKm).toBeGreaterThan(0);
    expect(context.deliveryFee).toBeGreaterThan(4);
  });

  it('sinaliza coordenadas obrigatorias quando mapa e requerido', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Centro',
      deliveryZones: [{ id: '1', neighborhood: 'Centro', fee: 6, is_active: true }],
      store: {
        delivery_fee_mode: 'distance',
        latitude: -2.53,
        longitude: -44.29,
      },
    });

    expect(context.requiresCoordinates).toBe(true);
    expect(context.missingRequiredCoordinates).toBe(true);
  });
});
