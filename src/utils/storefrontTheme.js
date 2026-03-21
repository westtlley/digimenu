const DEFAULT_PRIMARY = '#f97316';
const DEFAULT_SECONDARY = '#1f2937';
const DEFAULT_ACCENT = '#eab308';
const DEFAULT_SURFACE = '#ffffff';
const DEFAULT_SURFACE_ALT = '#f8fafc';
const DEFAULT_LAYOUT = 'grid';
const DEFAULT_CARD_STYLE = 'solid';
const DEFAULT_GRID_COLS = 4;
const DEFAULT_AUTOPLAY_MS = 4500;

export const STOREFRONT_LAYOUT_OPTIONS = [
  {
    value: 'grid',
    label: 'Grid',
    description: 'Melhor equilibrio entre vitrine, leitura e conversao.',
    maturity: 'recommended',
  },
  {
    value: 'list',
    label: 'Lista',
    description: 'Mais compacta e eficiente para cardapios extensos.',
    maturity: 'recommended',
  },
  {
    value: 'carousel',
    label: 'Carrossel',
    description: 'Boa para destaque visual, mas exige mais interacao.',
    maturity: 'advanced',
  },
  {
    value: 'magazine',
    label: 'Revista',
    description: 'Apresentacao dramatica, mais cenica do que pratica.',
    maturity: 'experimental',
  },
  {
    value: 'masonry',
    label: 'Masonry',
    description: 'Visual variado para menus curtos e visuais.',
    maturity: 'experimental',
  },
];

export const STOREFRONT_THEME_PRESETS = [
  {
    key: 'amber',
    label: 'Laranja Classico',
    description: 'Seguro para restaurantes e delivery geral.',
    badge: 'Recomendado',
    primary: '#f97316',
    secondary: '#1f2937',
    accent: '#eab308',
    surface: '#ffffff',
    surfaceAlt: '#fff7ed',
  },
  {
    key: 'bistro',
    label: 'Bistro Grafite',
    description: 'Mais sofisticado, com contraste forte e cara premium.',
    badge: 'Premium',
    primary: '#d97706',
    secondary: '#111827',
    accent: '#f59e0b',
    surface: '#ffffff',
    surfaceAlt: '#f3f4f6',
  },
  {
    key: 'pizzaria',
    label: 'Pizzaria Vermelha',
    description: 'Mais calor, mais apetite, mais cara de pizzaria.',
    badge: 'Pizzaria',
    primary: '#dc2626',
    secondary: '#7f1d1d',
    accent: '#fb7185',
    surface: '#fff7f7',
    surfaceAlt: '#ffe4e6',
  },
  {
    key: 'fresh',
    label: 'Fresh Verde',
    description: 'Boa para acai, saudavel, bowls e cafeterias leves.',
    badge: 'Versatil',
    primary: '#16a34a',
    secondary: '#14532d',
    accent: '#22c55e',
    surface: '#f7fee7',
    surfaceAlt: '#ecfccb',
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexDigitPair(value) {
  return `${value}${value}`;
}

function hexToRgb(color) {
  const value = String(color || '').trim();
  if (!value) return null;

  if (value.startsWith('rgb')) {
    const parts = value.match(/\d+/g);
    if (!parts || parts.length < 3) return null;
    return {
      r: clamp(Number(parts[0]), 0, 255),
      g: clamp(Number(parts[1]), 0, 255),
      b: clamp(Number(parts[2]), 0, 255),
    };
  }

  if (!value.startsWith('#')) return null;

  const hex = value.slice(1);
  if (hex.length === 3) {
    const r = parseInt(normalizeHexDigitPair(hex[0]), 16);
    const g = parseInt(normalizeHexDigitPair(hex[1]), 16);
    const b = parseInt(normalizeHexDigitPair(hex[2]), 16);
    if ([r, g, b].every((item) => Number.isFinite(item))) {
      return { r, g, b };
    }
    return null;
  }

  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].every((item) => Number.isFinite(item))) {
      return { r, g, b };
    }
  }

  return null;
}

function rgbToHex({ r, g, b }) {
  const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function normalizeColor(value, fallback) {
  const rgb = hexToRgb(value);
  if (!rgb) return fallback;
  return rgbToHex(rgb);
}

export function withAlpha(color, alpha = 1) {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(Number(alpha), 0, 1)})`;
}

export function mixColors(colorA, colorB, weight = 0.5) {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA && !rgbB) return DEFAULT_PRIMARY;
  if (!rgbA) return normalizeColor(colorB, DEFAULT_PRIMARY);
  if (!rgbB) return normalizeColor(colorA, DEFAULT_PRIMARY);

  const ratio = clamp(Number(weight), 0, 1);
  return rgbToHex({
    r: rgbA.r * (1 - ratio) + rgbB.r * ratio,
    g: rgbA.g * (1 - ratio) + rgbB.g * ratio,
    b: rgbA.b * (1 - ratio) + rgbB.b * ratio,
  });
}

function getRelativeLuminance(color) {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastRatio(colorA, colorB) {
  const lumA = getRelativeLuminance(colorA);
  const lumB = getRelativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export function pickReadableText(background, preferredDark = '#0f172a', preferredLight = '#ffffff') {
  const darkContrast = getContrastRatio(background, preferredDark);
  const lightContrast = getContrastRatio(background, preferredLight);
  return darkContrast >= lightContrast ? preferredDark : preferredLight;
}

function ensureReadableText(textColor, background, fallback) {
  const safeText = normalizeColor(textColor, fallback);
  if (getContrastRatio(safeText, background) >= 4.2) {
    return safeText;
  }
  return fallback;
}

function deriveSecondaryText(textPrimary, surface) {
  return mixColors(textPrimary, surface, 0.35);
}

function normalizeLayout(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return STOREFRONT_LAYOUT_OPTIONS.some((item) => item.value === normalized)
    ? normalized
    : DEFAULT_LAYOUT;
}

function normalizeCardStyle(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'aero' ? 'aero' : DEFAULT_CARD_STYLE;
}

function normalizeGridCols(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return [2, 3, 4, 5].includes(parsed) ? parsed : DEFAULT_GRID_COLS;
}

function normalizeAutoplay(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed >= 2500 && parsed <= 10000
    ? parsed
    : DEFAULT_AUTOPLAY_MS;
}

export function getStorefrontPreset(presetKey) {
  const normalized = String(presetKey || '').trim().toLowerCase();
  return STOREFRONT_THEME_PRESETS.find((preset) => preset.key === normalized)
    || STOREFRONT_THEME_PRESETS[0];
}

export function getStorefrontLayoutMeta(layout) {
  return STOREFRONT_LAYOUT_OPTIONS.find((item) => item.value === layout)
    || STOREFRONT_LAYOUT_OPTIONS[0];
}

export function buildStorefrontThemePayload(input = {}) {
  const preset = getStorefrontPreset(input.storefront_theme_preset);

  const primary = normalizeColor(input.theme_primary_color, preset.primary || DEFAULT_PRIMARY);
  const secondary = normalizeColor(input.theme_secondary_color, preset.secondary || DEFAULT_SECONDARY);
  const accent = normalizeColor(input.theme_accent_color, preset.accent || DEFAULT_ACCENT);

  const surfaceBase = normalizeColor(
    input.theme_surface_color,
    preset.surface || mixColors(secondary, DEFAULT_SURFACE, 0.92),
  );
  const surfaceAltBase = normalizeColor(
    input.theme_surface_alt_color,
    preset.surfaceAlt || mixColors(primary, DEFAULT_SURFACE_ALT, 0.9),
  );

  const textPrimaryFallback = pickReadableText(surfaceBase);
  const textPrimary = ensureReadableText(
    input.theme_text_primary,
    surfaceBase,
    textPrimaryFallback,
  );
  const textSecondary = ensureReadableText(
    input.theme_text_secondary,
    surfaceBase,
    deriveSecondaryText(textPrimary, surfaceBase),
  );

  const ctaBg = normalizeColor(input.theme_cta_bg, primary);
  const ctaText = ensureReadableText(
    input.theme_cta_text,
    ctaBg,
    pickReadableText(ctaBg),
  );

  const heroBg = normalizeColor(input.theme_hero_bg, secondary);
  const heroText = ensureReadableText(
    input.theme_hero_text,
    heroBg,
    pickReadableText(heroBg),
  );

  const badgeBg = normalizeColor(input.theme_badge_bg, accent);
  const badgeText = ensureReadableText(
    input.theme_badge_text,
    badgeBg,
    pickReadableText(badgeBg),
  );

  const footerBg = normalizeColor(
    input.theme_footer_bg,
    mixColors(heroBg, '#020617', 0.28),
  );
  const footerText = ensureReadableText(
    input.theme_footer_text,
    footerBg,
    pickReadableText(footerBg),
  );

  const menuLayoutMobile = normalizeLayout(input.menu_layout_mobile || input.menu_layout);
  const menuLayoutDesktop = normalizeLayout(input.menu_layout_desktop || input.menu_layout);

  return {
    storefront_theme_preset: preset.key,
    theme_primary_color: primary,
    theme_secondary_color: secondary,
    theme_accent_color: accent,
    theme_surface_color: surfaceBase,
    theme_surface_alt_color: surfaceAltBase,
    theme_text_primary: textPrimary,
    theme_text_secondary: textSecondary,
    theme_cta_bg: ctaBg,
    theme_cta_text: ctaText,
    theme_hero_bg: heroBg,
    theme_hero_text: heroText,
    theme_badge_bg: badgeBg,
    theme_badge_text: badgeText,
    theme_footer_bg: footerBg,
    theme_footer_text: footerText,
    theme_header_bg: heroBg,
    theme_header_text: heroText,
    theme_menu_card_style: normalizeCardStyle(input.theme_menu_card_style),
    menu_layout: menuLayoutDesktop,
    menu_layout_mobile: menuLayoutMobile,
    menu_layout_desktop: menuLayoutDesktop,
    menu_grid_cols_desktop: normalizeGridCols(input.menu_grid_cols_desktop),
    menu_autoplay_interval_ms: normalizeAutoplay(input.menu_autoplay_interval_ms),
  };
}

export function resolveStorefrontTheme(store = {}, options = {}) {
  const base = buildStorefrontThemePayload(store);
  const isDark = Boolean(options.isDark);

  if (!isDark) {
    const borderColor = mixColors(base.theme_surface_alt_color, base.theme_text_primary, 0.12);
    return {
      ...base,
      mode: 'light',
      primary: base.theme_primary_color,
      secondary: base.theme_secondary_color,
      accent: base.theme_accent_color,
      surface: base.theme_surface_color,
      surfaceAlt: base.theme_surface_alt_color,
      textPrimary: base.theme_text_primary,
      textSecondary: base.theme_text_secondary,
      ctaBg: base.theme_cta_bg,
      ctaText: base.theme_cta_text,
      heroBg: base.theme_hero_bg,
      heroText: base.theme_hero_text,
      badgeBg: base.theme_badge_bg,
      badgeText: base.theme_badge_text,
      footerBg: base.theme_footer_bg,
      footerText: base.theme_footer_text,
      headerBg: base.theme_header_bg,
      headerText: base.theme_header_text,
      borderColor,
      dividerColor: mixColors(borderColor, base.theme_surface_color, 0.4),
      heroOverlayStart: withAlpha(base.theme_hero_bg, 0.92),
      heroOverlayEnd: withAlpha(base.theme_hero_bg, 0.46),
      heroChromeBg: withAlpha(base.theme_hero_text, 0.12),
      heroChromeBorder: withAlpha(base.theme_hero_text, 0.18),
      mutedBadgeBg: mixColors(base.theme_badge_bg, base.theme_surface_color, 0.82),
      mutedBadgeText: ensureReadableText(
        mixColors(base.theme_badge_text, base.theme_badge_bg, 0.15),
        mixColors(base.theme_badge_bg, base.theme_surface_color, 0.82),
        base.theme_text_primary,
      ),
    };
  }

  const surface = mixColors(base.theme_surface_color, '#0f172a', 0.78);
  const surfaceAlt = mixColors(base.theme_surface_alt_color, '#172033', 0.72);
  const heroBg = mixColors(base.theme_hero_bg, '#020617', 0.5);
  const footerBg = mixColors(base.theme_footer_bg, '#020617', 0.42);
  const primary = normalizeColor(mixColors(base.theme_primary_color, '#ffffff', 0.18), base.theme_primary_color);
  const secondary = normalizeColor(mixColors(base.theme_secondary_color, '#cbd5f5', 0.12), base.theme_secondary_color);
  const accent = normalizeColor(mixColors(base.theme_accent_color, '#ffffff', 0.14), base.theme_accent_color);
  const textPrimary = pickReadableText(surface, '#f8fafc', '#0f172a');
  const textSecondary = deriveSecondaryText(textPrimary, surface);
  const ctaBg = normalizeColor(mixColors(base.theme_cta_bg, '#ffffff', 0.12), primary);
  const ctaText = pickReadableText(ctaBg, '#f8fafc', '#111827');
  const badgeBg = normalizeColor(mixColors(base.theme_badge_bg, '#ffffff', 0.1), accent);
  const badgeText = pickReadableText(badgeBg, '#f8fafc', '#111827');
  const footerText = pickReadableText(footerBg, '#f8fafc', '#111827');
  const borderColor = mixColors(surfaceAlt, '#ffffff', 0.18);

  return {
    ...base,
    mode: 'dark',
    primary,
    secondary,
    accent,
    surface,
    surfaceAlt,
    textPrimary,
    textSecondary,
    ctaBg,
    ctaText,
    heroBg,
    heroText: pickReadableText(heroBg, '#f8fafc', '#111827'),
    badgeBg,
    badgeText,
    footerBg,
    footerText,
    headerBg: heroBg,
    headerText: pickReadableText(heroBg, '#f8fafc', '#111827'),
    borderColor,
    dividerColor: mixColors(borderColor, surface, 0.35),
    heroOverlayStart: withAlpha(heroBg, 0.9),
    heroOverlayEnd: withAlpha(heroBg, 0.52),
    heroChromeBg: withAlpha('#ffffff', 0.12),
    heroChromeBorder: withAlpha('#ffffff', 0.16),
    mutedBadgeBg: mixColors(badgeBg, surface, 0.68),
    mutedBadgeText: pickReadableText(mixColors(badgeBg, surface, 0.68), '#f8fafc', '#111827'),
  };
}
