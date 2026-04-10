export interface CartItem {
  id: number;
  title: string;
  listing_type: string;
  price: string;
  image?: string;
  seller_name: string;
}

const CART_KEY = 'flex_cart';

function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-updated'));
}

export function addToCart(item: CartItem): boolean {
  const cart = getCart();
  if (cart.some((c) => c.id === item.id)) return false;
  cart.push(item);
  saveCart(cart);
  return true;
}

export function removeFromCart(id: number) {
  saveCart(getCart().filter((c) => c.id !== id));
}

export function getCartItems(): CartItem[] {
  return getCart();
}

export function getCartCount(): number {
  return getCart().length;
}

export function isInCart(id: number): boolean {
  return getCart().some((c) => c.id === id);
}

export function clearCart() {
  saveCart([]);
}
