/**
 * Testes básicos de utilitários
 */
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../components/utils/formatters';

describe('Formatters', () => {
  it('deve formatar moeda corretamente', () => {
    expect(formatCurrency(10.5)).toBe('R$ 10,50');
    expect(formatCurrency(0)).toBe('R$ 0,00');
    expect(formatCurrency(1000)).toBe('R$ 1.000,00');
  });
});
