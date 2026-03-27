const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;

export function getCartItemQuantity(item) {
  const quantity = Number(item?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getLegacyUnitPrice(item, quantity) {
  const totalPrice = toNumber(item?.totalPrice, 0);
  const fallbackUnitPrice = toNumber(item?.dish?.price ?? item?.price, 0);
  const productType = String(item?.dish?.product_type || item?.product_type || '').toLowerCase();

  if (
    quantity > 1 &&
    productType === 'beverage' &&
    fallbackUnitPrice > 0 &&
    Math.abs(totalPrice - (fallbackUnitPrice * quantity)) < 0.01
  ) {
    return roundMoney(totalPrice / quantity);
  }

  return totalPrice || fallbackUnitPrice;
}

export function getCartItemUnitPrice(item) {
  const quantity = getCartItemQuantity(item);
  const explicitUnitPrice = Number(item?.unitPrice);

  if (Number.isFinite(explicitUnitPrice)) {
    return roundMoney(explicitUnitPrice);
  }

  return roundMoney(getLegacyUnitPrice(item, quantity));
}

export function getCartItemLineTotal(item) {
  return roundMoney(getCartItemUnitPrice(item) * getCartItemQuantity(item));
}

export function normalizeCartItem(item) {
  if (!item || typeof item !== 'object') return item;

  const quantity = getCartItemQuantity(item);
  const unitPrice = getCartItemUnitPrice(item);

  return {
    ...item,
    quantity,
    unitPrice,
    totalPrice: unitPrice,
    lineTotal: roundMoney(unitPrice * quantity),
  };
}

export function normalizeCartItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(Boolean)
    .map(normalizeCartItem)
    .filter(Boolean);
}

export function calculateCartSubtotal(items) {
  return roundMoney(normalizeCartItems(items).reduce((sum, item) => sum + getCartItemLineTotal(item), 0));
}
