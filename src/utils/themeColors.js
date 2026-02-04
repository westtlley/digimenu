/**
 * Utilitários para adaptar cores do tema ao modo escuro
 * Garante contraste adequado mantendo a identidade das cores
 */

/**
 * Converte hex ou rgb para RGB
 */
function hexToRgb(color) {
  if (!color) return null;
  
  // Se já é RGB
  if (color.startsWith('rgb')) {
    const matches = color.match(/\d+/g);
    if (matches && matches.length >= 3) {
      return {
        r: parseInt(matches[0], 10),
        g: parseInt(matches[1], 10),
        b: parseInt(matches[2], 10)
      };
    }
  }
  
  // Se é hex
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calcula o brilho relativo de uma cor (0-255)
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calcula o contraste entre duas cores
 */
function getContrast(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Escurece uma cor mantendo o matiz
 */
function darkenColor(hex, amount = 0.3) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return `rgb(${Math.max(0, Math.floor(rgb.r * (1 - amount)))}, ${Math.max(0, Math.floor(rgb.g * (1 - amount)))}, ${Math.max(0, Math.floor(rgb.b * (1 - amount)))})`;
}

/**
 * Clareia uma cor mantendo o matiz
 */
function lightenColor(hex, amount = 0.3) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  return `rgb(${Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * amount))}, ${Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * amount))}, ${Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * amount))})`;
}

/**
 * Adapta uma cor primária para modo escuro
 * Mantém a identidade da cor mas garante visibilidade
 */
export function adaptPrimaryColorForDark(primaryColor, darkBg = '#0f172a') {
  if (!primaryColor) return '#f97316'; // fallback
  
  const rgb = hexToRgb(primaryColor);
  if (!rgb) return primaryColor;
  
  // Calcula o brilho da cor primária
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  
  // Se a cor já é clara (luminância > 0.5), mantém ou clareia um pouco
  if (luminance > 0.5) {
    // Cor já é clara, pode usar diretamente ou clarear um pouco
    return lightenColor(primaryColor, 0.1);
  }
  
  // Se a cor é escura, clareia significativamente para ter contraste
  // Mas mantém o matiz original
  return lightenColor(primaryColor, 0.4);
}

/**
 * Gera cor de texto baseada na cor primária para modo escuro
 * Garante contraste mínimo de 4.5:1 (WCAG AA)
 */
export function getTextColorForDark(primaryColor, darkBg = '#0f172a') {
  if (!primaryColor) return '#f8fafc'; // fallback branco
  
  // Para textos importantes (títulos, preços), usa a cor primária clareada
  const adaptedPrimary = adaptPrimaryColorForDark(primaryColor, darkBg);
  
  // Verifica contraste
  const contrast = getContrast(adaptedPrimary, darkBg);
  
  // Se contraste é bom (>= 4.5), usa a cor adaptada
  if (contrast >= 4.5) {
    return adaptedPrimary;
  }
  
  // Se não, clareia mais até ter contraste adequado
  let lightened = adaptedPrimary;
  let attempts = 0;
  while (getContrast(lightened, darkBg) < 4.5 && attempts < 10) {
    const rgb = hexToRgb(lightened);
    if (!rgb) break;
    lightened = lightenColor(lightened, 0.1);
    attempts++;
  }
  
  return lightened;
}

/**
 * Gera cor de texto secundário (descrições) para modo escuro
 * Mais suave que o texto primário mas ainda legível
 */
export function getSecondaryTextColorForDark(primaryColor, darkBg = '#0f172a') {
  if (!primaryColor) return '#cbd5e1'; // fallback
  
  // Para textos secundários, usa um tom mais neutro mas com leve influência da cor primária
  const adaptedPrimary = adaptPrimaryColorForDark(primaryColor, darkBg);
  const rgb = hexToRgb(adaptedPrimary);
  
  if (!rgb) return '#cbd5e1';
  
  // Cria um tom mais neutro misturando com cinza claro
  const grayRgb = { r: 203, g: 213, b: 225 }; // slate-300
  const mixed = {
    r: Math.floor(rgb.r * 0.3 + grayRgb.r * 0.7),
    g: Math.floor(rgb.g * 0.3 + grayRgb.g * 0.7),
    b: Math.floor(rgb.b * 0.3 + grayRgb.b * 0.7)
  };
  
  return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
}

/**
 * Adapta background para modo escuro baseado na cor primária
 */
export function adaptBackgroundForDark(primaryColor) {
  if (!primaryColor) return '#0f172a'; // fallback
  
  const rgb = hexToRgb(primaryColor);
  if (!rgb) return '#0f172a';
  
  // Cria um background escuro com leve influência da cor primária
  // Mas mantém escuro o suficiente para contraste
  const darkBase = { r: 15, g: 23, b: 42 }; // slate-900
  
  // Mistura 10% da cor primária escurecida com 90% do background base
  const darkenedPrimary = {
    r: Math.floor(rgb.r * 0.2),
    g: Math.floor(rgb.g * 0.2),
    b: Math.floor(rgb.b * 0.2)
  };
  
  return `rgb(${Math.floor(darkBase.r * 0.9 + darkenedPrimary.r * 0.1)}, ${Math.floor(darkBase.g * 0.9 + darkenedPrimary.g * 0.1)}, ${Math.floor(darkBase.b * 0.9 + darkenedPrimary.b * 0.1)})`;
}

/**
 * Adapta todas as cores do tema para modo escuro
 */
export function adaptThemeForDark(themeColors) {
  const primaryColor = themeColors.theme_primary_color || '#f97316';
  const secondaryColor = themeColors.theme_secondary_color || '#1f2937';
  const accentColor = themeColors.theme_accent_color || '#eab308';
  
  const darkBg = adaptBackgroundForDark(primaryColor);
  
  return {
    bgPrimary: darkBg,
    bgSecondary: lightenColor(darkBg, 0.15), // Um pouco mais claro
    bgTertiary: lightenColor(darkBg, 0.25),
    bgCard: lightenColor(darkBg, 0.15),
    bgInput: lightenColor(darkBg, 0.25),
    bgHover: lightenColor(darkBg, 0.3),
    textPrimary: getTextColorForDark(primaryColor, darkBg), // Títulos, preços
    textSecondary: getSecondaryTextColorForDark(primaryColor, darkBg), // Descrições
    textMuted: lightenColor(darkBg, 0.4), // Textos menos importantes
    textDisabled: lightenColor(darkBg, 0.3),
    borderColor: lightenColor(darkBg, 0.25),
    borderHover: lightenColor(darkBg, 0.35),
    borderFocus: adaptPrimaryColorForDark(primaryColor, darkBg),
    accent: adaptPrimaryColorForDark(primaryColor, darkBg),
    accentHover: lightenColor(adaptPrimaryColorForDark(primaryColor, darkBg), 0.1),
  };
}
