/**
 * Extrai cores dominantes de uma imagem
 * @param {string} imageUrl - URL da imagem
 * @returns {Promise<{primary: string, secondary: string, accent: string}>}
 */
export async function extractColorsFromImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Redimensionar para processar mais rápido (máx 200px)
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Obter dados da imagem
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Agrupar cores similares
        const colorMap = new Map();
        const step = 4; // Processar cada 4 pixels (RGBA)
        
        for (let i = 0; i < pixels.length; i += step * 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          // Ignorar pixels transparentes ou muito claros/brancos
          if (a < 128) continue;
          if (r > 250 && g > 250 && b > 250) continue; // Branco puro
          if (r < 5 && g < 5 && b < 5) continue; // Preto puro
          
          // Quantizar cores para agrupar similares
          const qr = Math.floor(r / 32) * 32;
          const qg = Math.floor(g / 32) * 32;
          const qb = Math.floor(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          
          if (colorMap.has(key)) {
            colorMap.set(key, colorMap.get(key) + 1);
          } else {
            colorMap.set(key, 1);
          }
        }
        
        // Ordenar por frequência
        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10); // Top 10 cores
        
        if (sortedColors.length === 0) {
          // Fallback para cores padrão
          resolve({
            primary: '#8b5cf6',
            secondary: '#1e1b4b',
            accent: '#a855f7'
          });
          return;
        }
        
        // Converter para hex
        const colors = sortedColors.map(([rgb, count]) => {
          const [r, g, b] = rgb.split(',').map(Number);
          return {
            hex: `#${[r, g, b].map(x => {
              const hex = x.toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            }).join('')}`,
            count
          };
        });
        
        // Encontrar cor primária (mais frequente e mais saturada)
        const primary = colors[0].hex;
        
        // Encontrar cor secundária (segunda mais frequente ou mais escura)
        let secondary = colors[1]?.hex || colors[0].hex;
        // Se a secundária for muito clara, usar uma versão mais escura
        const secondaryRgb = hexToRgb(secondary);
        if (secondaryRgb && (secondaryRgb.r + secondaryRgb.g + secondaryRgb.b) > 500) {
          secondary = darkenColor(secondary, 0.6);
        }
        
        // Encontrar cor de destaque (mais vibrante)
        let accent = colors.find(c => {
          const rgb = hexToRgb(c.hex);
          if (!rgb) return false;
          const saturation = getSaturation(rgb);
          return saturation > 0.5;
        })?.hex || primary;
        
        // Se não encontrou cor vibrante, usar uma versão mais clara da primária
        if (accent === primary) {
          accent = lightenColor(primary, 0.2);
        }
        
        resolve({
          primary,
          secondary,
          accent
        });
      } catch (error) {
        console.error('Erro ao extrair cores:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Converte hex para RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calcula saturação de uma cor RGB
 */
function getSaturation(rgb) {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;
  return max === 0 ? 0 : delta / max;
}

/**
 * Escurece uma cor
 */
function darkenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return `#${[rgb.r, rgb.g, rgb.b]
    .map(x => Math.max(0, Math.floor(x * amount)))
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('')}`;
}

/**
 * Clareia uma cor
 */
function lightenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return `#${[rgb.r, rgb.g, rgb.b]
    .map(x => Math.min(255, Math.floor(x + (255 - x) * amount)))
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('')}`;
}
