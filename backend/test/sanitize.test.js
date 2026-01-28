/**
 * Testes de sanitização
 */
import { describe, it, expect } from 'vitest';
import { 
  sanitizeString, 
  sanitizeEmail, 
  sanitizePhone, 
  sanitizeCPF 
} from '../utils/sanitize.js';

describe('Sanitização de dados', () => {
  describe('sanitizeString', () => {
    it('deve remover tags HTML', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).toBe('Hello');
      expect(result).not.toContain('<script>');
    });

    it('deve remover event handlers', () => {
      const input = '<div onclick="hack()">Test</div>';
      const result = sanitizeString(input);
      expect(result).not.toContain('onclick');
    });

    it('deve remover javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      const result = sanitizeString(input);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('sanitizeEmail', () => {
    it('deve validar email válido', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
    });

    it('deve rejeitar email inválido', () => {
      expect(sanitizeEmail('invalid')).toBeNull();
      expect(sanitizeEmail('user@')).toBeNull();
      expect(sanitizeEmail('@example.com')).toBeNull();
    });
  });

  describe('sanitizePhone', () => {
    it('deve aceitar telefones válidos', () => {
      expect(sanitizePhone('5586999999999')).toBe('5586999999999');
      expect(sanitizePhone('(55) 86 99999-9999')).toBe('5586999999999');
    });

    it('deve rejeitar telefones inválidos', () => {
      expect(sanitizePhone('123')).toBeNull();
      expect(sanitizePhone('abc')).toBeNull();
    });
  });

  describe('sanitizeCPF', () => {
    it('deve aceitar CPF válido', () => {
      const validCPF = '12345678909';
      // Note: este é um CPF de exemplo, não real
      const result = sanitizeCPF(validCPF);
      expect(result).toHaveLength(11);
    });

    it('deve rejeitar CPF com dígitos iguais', () => {
      expect(sanitizeCPF('11111111111')).toBeNull();
      expect(sanitizeCPF('00000000000')).toBeNull();
    });
  });
});
