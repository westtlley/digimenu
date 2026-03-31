import { describe, expect, it } from 'vitest';
import {
  calculateDeliveryContext,
  findMatchingDeliveryZone,
  normalizeDeliveryZone,
  resolveCheckoutAddressMode,
  resolveDeliveryHybridStrategy,
  resolveDeliveryMaxRadiusKm,
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

  it('resolve o raio configurado e bloqueia distancia fora do limite', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Centro',
      deliveryZones: [],
      store: {
        delivery_fee_mode: 'distance',
        delivery_max_radius_km: 0.5,
        delivery_radius_behavior: 'block',
        latitude: -2.53,
        longitude: -44.29,
        delivery_base_fee: 4,
        delivery_price_per_km: 2,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(resolveDeliveryMaxRadiusKm({ delivery_max_radius_km: '0.5' })).toBe(0.5);
    expect(context.blocked).toBe(true);
    expect(context.blockReason).toBe('outside_radius');
    expect(context.deliveryRuleSource).toBe('outside_radius_blocked');
    expect(context.deliveryRadiusResult).toBe('outside_radius');
    expect(context.deliveryRadiusEnforced).toBe(true);
    expect(context.decisionPath).toEqual(['radius:outside', 'fallback:block']);
  });

  it('permite distancia fora do raio quando a loja libera esse comportamento', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Centro',
      deliveryZones: [],
      store: {
        delivery_fee_mode: 'distance',
        delivery_max_radius_km: 0.5,
        delivery_radius_behavior: 'allow_with_distance',
        latitude: -2.53,
        longitude: -44.29,
        delivery_base_fee: 4,
        delivery_price_per_km: 2,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(context.blocked).toBe(false);
    expect(context.deliveryFeeModeApplied).toBe('distance');
    expect(context.deliveryRuleSource).toBe('distance');
    expect(context.deliveryRadiusResult).toBe('outside_radius');
    expect(context.deliveryRadiusEnforced).toBe(true);
    expect(context.decisionPath).toEqual([
      'radius:outside',
      'radius:allow_with_distance',
      'distance:calculated',
    ]);
  });

  it('nao herda pedido minimo da zona quando a decisao final e por distancia', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Centro',
      deliveryZones: [{ id: 'zone-1', neighborhood: 'Centro', fee: 9, min_order: 50, is_active: true }],
      store: {
        delivery_fee_mode: 'distance',
        min_order_value: 20,
        latitude: -2.53,
        longitude: -44.29,
        delivery_base_fee: 4,
        delivery_price_per_km: 2,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(context.deliveryFeeModeApplied).toBe('distance');
    expect(context.minimumOrderValue).toBe(20);
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

  it('resolve modo hibrido pela zona quando encontra bairro ativo', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Centro',
      deliveryZones: [{ id: 'zone-1', neighborhood: 'Centro', fee: 7.5, min_order: 30, is_active: true }],
      store: {
        delivery_fee_mode: 'hybrid',
        delivery_hybrid_strategy: 'zone_then_distance',
        checkout_address_mode: 'map_optional',
        min_order_value: 20,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(resolveDeliveryHybridStrategy({ delivery_fee_mode: 'hybrid' })).toBe('zone_then_distance');
    expect(context.deliveryFeeModeApplied).toBe('hybrid_zone');
    expect(context.deliveryRuleSource).toBe('hybrid_zone');
    expect(context.deliveryFee).toBe(7.5);
    expect(context.minimumOrderValue).toBe(30);
    expect(context.decisionPath).toEqual(['zone:matched']);
  });

  it('mantem a zona como prioridade no hibrido mesmo quando o raio detecta distancia maior', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Centro',
      deliveryZones: [{ id: 'zone-1', neighborhood: 'Centro', fee: 7.5, min_order: 30, is_active: true }],
      store: {
        delivery_fee_mode: 'hybrid',
        delivery_hybrid_strategy: 'zone_then_distance',
        delivery_max_radius_km: 0.5,
        delivery_radius_behavior: 'block',
        latitude: -2.53,
        longitude: -44.29,
        delivery_base_fee: 4,
        delivery_price_per_km: 2,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(context.deliveryFeeModeApplied).toBe('hybrid_zone');
    expect(context.deliveryRuleSource).toBe('hybrid_zone');
    expect(context.deliveryRadiusResult).toBe('outside_radius');
    expect(context.deliveryRadiusEnforced).toBe(false);
    expect(context.decisionPath).toEqual(['zone:matched']);
  });

  it('resolve modo hibrido pela distancia quando nao encontra zona', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Bairro Novo',
      deliveryZones: [{ id: 'zone-1', neighborhood: 'Centro', fee: 7.5, is_active: true }],
      store: {
        delivery_fee_mode: 'hybrid',
        delivery_hybrid_strategy: 'zone_then_distance',
        checkout_address_mode: 'map_optional',
        latitude: -2.53,
        longitude: -44.29,
        delivery_base_fee: 4,
        delivery_price_per_km: 2,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(context.deliveryFeeModeApplied).toBe('hybrid_distance');
    expect(context.deliveryRuleSource).toBe('hybrid_distance');
    expect(context.distanceKm).toBeGreaterThan(0);
    expect(context.decisionPath).toEqual(['zone:no_active_zone', 'distance:calculated']);
  });

  it('bloqueia o hibrido por raio antes de aplicar a distancia quando a loja exige trava espacial', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Bairro Novo',
      deliveryZones: [{ id: 'zone-1', neighborhood: 'Centro', fee: 7.5, is_active: true }],
      store: {
        delivery_fee_mode: 'hybrid',
        delivery_hybrid_strategy: 'zone_then_distance',
        delivery_max_radius_km: 0.5,
        delivery_radius_behavior: 'block',
        latitude: -2.53,
        longitude: -44.29,
        delivery_base_fee: 4,
        delivery_price_per_km: 2,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(context.blocked).toBe(true);
    expect(context.blockReason).toBe('outside_radius');
    expect(context.deliveryRuleSource).toBe('hybrid_outside_radius_blocked');
    expect(context.deliveryRadiusResult).toBe('outside_radius');
    expect(context.decisionPath).toEqual([
      'zone:no_active_zone',
      'radius:outside',
      'fallback:block',
    ]);
  });

  it('cai no fallback configurado quando hibrido nao resolve zona nem distancia', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Bairro Novo',
      deliveryZones: [{ id: 'zone-1', neighborhood: 'Centro', fee: 7.5, is_active: true }],
      store: {
        delivery_fee_mode: 'hybrid',
        delivery_hybrid_strategy: 'zone_then_distance',
        delivery_outside_area_behavior: 'block',
      },
    });

    expect(context.blocked).toBe(true);
    expect(context.deliveryFeeModeApplied).toBe('fallback');
    expect(context.deliveryRuleSource).toBe('hybrid_outside_area_blocked');
    expect(context.decisionPath).toEqual([
      'zone:no_active_zone',
      'distance:missing_customer_coordinates',
      'fallback:block',
    ]);
  });

  it('permite estrategia hibrida explicita sem distancia', () => {
    const context = calculateDeliveryContext({
      deliveryMethod: 'delivery',
      neighborhood: 'Bairro Novo',
      deliveryZones: [{ id: 'zone-1', neighborhood: 'Centro', fee: 7.5, is_active: true }],
      store: {
        delivery_fee_mode: 'hybrid',
        delivery_hybrid_strategy: 'zone_then_store_fee',
        delivery_fee: 11,
      },
      customerLat: -2.54,
      customerLng: -44.3,
    });

    expect(context.blocked).toBe(false);
    expect(context.deliveryFeeModeApplied).toBe('fallback');
    expect(context.deliveryFee).toBe(11);
    expect(context.deliveryRuleSource).toBe('hybrid_fallback_store_fee');
    expect(context.decisionPath).toEqual([
      'zone:no_active_zone',
      'strategy:zone_then_store_fee',
      'fallback:store_fee',
    ]);
  });
});
