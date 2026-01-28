/**
 * Utilitários de otimização de imagens
 */

/**
 * Otimizar URL de imagem do Cloudinary
 */
export function optimizeCloudinaryImage(url, options = {}) {
  if (!url || typeof url !== 'string') return url;
  
  // Se não for Cloudinary, retornar original
  if (!url.includes('cloudinary.com')) return url;
  
  const {
    width = 800,
    quality = 'auto:good',
    format = 'auto',
    crop = 'fill',
  } = options;
  
  // Construir transformações
  const transformations = [
    `w_${width}`,
    `q_${quality}`,
    `f_${format}`,
    `c_${crop}`
  ].join(',');
  
  // Adicionar transformações na URL
  return url.replace('/upload/', `/upload/${transformations}/`);
}

/**
 * Gerar srcset para imagens responsivas
 */
export function generateSrcSet(url, widths = [400, 800, 1200]) {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }
  
  return widths
    .map(w => `${optimizeCloudinaryImage(url, { width: w })} ${w}w`)
    .join(', ');
}

/**
 * Placeholder blur (base64)
 */
export function getImagePlaceholder() {
  // Imagem 1x1 pixel cinza em base64
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
}

/**
 * Lazy load de imagens com IntersectionObserver
 */
export function setupLazyLoading(selector = '[data-lazy]') {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.getAttribute('data-lazy');
          if (src) {
            img.src = src;
            img.removeAttribute('data-lazy');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px' // Começar a carregar 50px antes
    });

    document.querySelectorAll(selector).forEach(img => {
      imageObserver.observe(img);
    });

    return () => {
      imageObserver.disconnect();
    };
  }
}

/**
 * Preload de imagens críticas
 */
export function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Preload de múltiplas imagens
 */
export async function preloadImages(urls) {
  return Promise.allSettled(urls.map(url => preloadImage(url)));
}

export default {
  optimizeCloudinaryImage,
  generateSrcSet,
  getImagePlaceholder,
  setupLazyLoading,
  preloadImage,
  preloadImages
};
