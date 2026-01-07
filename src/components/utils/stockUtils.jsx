export const stockUtils = {
  isUnlimited(stock) {
    return stock === null || stock === undefined || stock === '';
  },

  isOutOfStock(stock) {
    const unlimited = this.isUnlimited(stock);
    return !unlimited && stock <= 0;
  },

  isLowStock(stock) {
    const unlimited = this.isUnlimited(stock);
    return !unlimited && stock > 0 && stock <= 5;
  },

  canAddToCart(dish) {
    return !this.isOutOfStock(dish.stock);
  }
};