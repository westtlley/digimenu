import { describe, expect, it } from 'vitest';
import {
  SAO_LUIS_MA_CENTER,
  buildNominatimViewbox,
  extractAddressData,
  extractAddressDataFromNominatim,
  formatCEP,
  resolveMapCenter,
} from '../utils/addressSearch';

describe('addressSearch', () => {
  it('resolveMapCenter respeita a precedencia cliente -> loja -> Sao Luis', () => {
    expect(
      resolveMapCenter(
        { lat: '-2.5601', lng: '-44.2982' },
        { lat: '-2.5307', lng: '-44.3068' },
        SAO_LUIS_MA_CENTER
      )
    ).toEqual({
      lat: -2.5601,
      lng: -44.2982,
    });

    expect(
      resolveMapCenter(
        { lat: '', lng: '' },
        { lat: '-2.5307', lng: '-44.3068' },
        SAO_LUIS_MA_CENTER
      )
    ).toEqual({
      lat: -2.5307,
      lng: -44.3068,
    });
  });

  it('resolveMapCenter usa a primeira coordenada valida', () => {
    expect(resolveMapCenter(null, { lat: '-2.55', lng: '-44.30' })).toEqual({
      lat: -2.55,
      lng: -44.3,
    });
  });

  it('resolveMapCenter cai para Sao Luis quando nao encontra coordenadas', () => {
    expect(resolveMapCenter(null, { lat: '', lng: '' })).toEqual(SAO_LUIS_MA_CENTER);
  });

  it('buildNominatimViewbox retorna quatro limites numericos', () => {
    const parts = buildNominatimViewbox({ lat: -2.55, lng: -44.3 }).split(',');

    expect(parts).toHaveLength(4);
    expect(parts.every((part) => Number.isFinite(Number(part)))).toBe(true);
  });

  it('extractAddressData interpreta componentes do Google Places', () => {
    const data = extractAddressData({
      formattedAddress: 'Av. Litoranea, 7, Sao Luis - MA, 65000-000, Brasil',
      addressComponents: [
        { longText: 'Av. Litoranea', shortText: 'Av. Litoranea', types: ['route'] },
        { longText: '7', shortText: '7', types: ['street_number'] },
        { longText: 'Ponta d Areia', shortText: 'Ponta d Areia', types: ['sublocality_level_1'] },
        { longText: 'Sao Luis', shortText: 'Sao Luis', types: ['locality'] },
        { longText: 'Maranhao', shortText: 'MA', types: ['administrative_area_level_1'] },
        { longText: '65000-000', shortText: '65000-000', types: ['postal_code'] },
      ],
    });

    expect(data).toEqual({
      street: 'Av. Litoranea',
      number: '7',
      complement: '',
      neighborhood: 'Ponta d Areia',
      city: 'Sao Luis',
      state: 'MA',
      cep: '65000-000',
      fullAddress: 'Av. Litoranea, 7, Sao Luis - MA, 65000-000, Brasil',
    });
  });

  it('extractAddressDataFromNominatim interpreta retorno de fallback', () => {
    const data = extractAddressDataFromNominatim({
      display_name: 'Rua dos Bobos, 0, Centro, Sao Luis, Maranhao, 65010-000, Brasil',
      address: {
        road: 'Rua dos Bobos',
        house_number: '0',
        suburb: 'Centro',
        city: 'Sao Luis',
        state_code: 'MA',
        postcode: '65010000',
      },
    });

    expect(data).toEqual({
      street: 'Rua dos Bobos',
      number: '0',
      complement: '',
      neighborhood: 'Centro',
      city: 'Sao Luis',
      state: 'MA',
      cep: '65010-000',
      fullAddress: 'Rua dos Bobos, 0, Centro, Sao Luis, Maranhao, 65010-000, Brasil',
    });
  });

  it('formatCEP mascara corretamente', () => {
    expect(formatCEP('65010000')).toBe('65010-000');
    expect(formatCEP('65010-000')).toBe('65010-000');
  });
});
