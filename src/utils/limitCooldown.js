const COOLDOWN_PREFIX = 'digimenu_80_cooldown_';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Verifica se o aviso de 80% pode ser exibido (máx 1x por dia por tipo).
 * @param {string} type - 'orders' | 'products' | 'collaborators' | 'locations'
 * @returns {boolean} true se pode mostrar
 */
export function canShowLimit80Warning(type) {
  try {
    const key = COOLDOWN_PREFIX + type;
    const stored = localStorage.getItem(key);
    const today = todayKey();
    return stored !== today;
  } catch (e) {
    return true;
  }
}

/**
 * Marca que o aviso foi exibido hoje (para cooldown 1x por dia).
 * @param {string} type - 'orders' | 'products' | ...
 */
export function markLimit80Shown(type) {
  try {
    const key = COOLDOWN_PREFIX + type;
    localStorage.setItem(key, todayKey());
  } catch (e) {
    // ignore
  }
}
