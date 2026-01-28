/**
 * Testes para otimização de imagens
 */
import { describe, it, expect } from 'vitest';
import { optimizeCloudinaryImage, generateSrcSet } from '@/utils/imageOptimizer';

describe('imageOptimizer', () => {
  it('deve otimizar URL do Cloudinary', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const optimized = optimizeCloudinaryImage(url, { width: 400 });
    
    expect(optimized).toContain('w_400');
    expect(optimized).toContain('q_auto:good');
    expect(optimized).toContain('f_auto');
  });

  it('deve retornar URL original se não for Cloudinary', () => {
    const url = 'https://example.com/image.jpg';
    const optimized = optimizeCloudinaryImage(url);
    
    expect(optimized).toBe(url);
  });

  it('deve gerar srcset para imagens responsivas', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const srcset = generateSrcSet(url, [400, 800]);
    
    expect(srcset).toContain('400w');
    expect(srcset).toContain('800w');
  });
});
