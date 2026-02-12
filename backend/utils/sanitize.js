/**
 * Utilitários de sanitização e validação de dados
 * Proteção contra XSS, SQL Injection e dados maliciosos
 */

import { z } from 'zod';

/**
 * Sanitizar string removendo tags HTML e caracteres perigosos
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return String(input || '');
  }
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]+>/g, '') // Remove todas as tags HTML
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitizar objeto recursivamente
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validar e sanitizar email
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Validar e sanitizar URL
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  try {
    const parsed = new URL(url);
    // Permitir apenas http e https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validar e sanitizar número de telefone brasileiro
 * Aceita:
 * - 10-11 dígitos (DDD + número)
 * - 12-13 dígitos começando com 55 (DDI Brasil)
 */
export function sanitizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return null;
  }
  
  // Remover tudo que não é dígito
  const digits = phone.replace(/\D/g, '');
  
  // Validar formato brasileiro
  // 10-11 dígitos: DDD (2) + número (8-9 dígitos)
  // 12-13 dígitos: DDI 55 (2) + DDD (2) + número (8-9 dígitos)
  if (digits.length >= 10 && digits.length <= 11) {
    // Formato sem DDI (10-11 dígitos)
    return digits;
  } else if (digits.length >= 12 && digits.length <= 13 && digits.startsWith('55')) {
    // Formato com DDI Brasil (12-13 dígitos)
    return digits;
  }
  
  return null;
}

/**
 * Validar e sanitizar CPF
 */
export function sanitizeCPF(cpf) {
  if (!cpf || typeof cpf !== 'string') {
    return null;
  }
  
  const digits = cpf.replace(/\D/g, '');
  
  if (digits.length !== 11) {
    return null;
  }
  
  // Validar dígitos verificadores
  if (/^(\d)\1{10}$/.test(digits)) {
    return null; // CPF com todos dígitos iguais
  }
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(digits.charAt(9))) {
    return null;
  }
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(digits.charAt(10))) {
    return null;
  }
  
  return digits;
}

/**
 * Schemas Zod para validação comum
 */
export const schemas = {
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().regex(/^\d{10,11}$/),
  cpf: z.string().regex(/^\d{11}$/),
  url: z.string().url(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  positiveNumber: z.number().positive(),
  nonEmptyString: z.string().min(1).trim(),
  dateISO: z.string().datetime(),
};

/**
 * Middleware de sanitização para Express
 */
export function sanitizeMiddleware(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

export default {
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizeUrl,
  sanitizePhone,
  sanitizeCPF,
  schemas,
  sanitizeMiddleware
};
