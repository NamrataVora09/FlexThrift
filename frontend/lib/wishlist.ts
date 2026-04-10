export interface WishlistItem {
  id: number;
  title: string;
  listing_type: string;
  price: string;
  image?: string;
  seller_name: string;
}

const WISHLIST_KEY = 'flex_wishlist';

function getWishlist(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveWishlist(items: WishlistItem[]) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('wishlist-updated'));
}

export function addToWishlist(item: WishlistItem): boolean {
  const wishlist = getWishlist();
  if (wishlist.some((i) => i.id === item.id)) return false;
  wishlist.push(item);
  saveWishlist(wishlist);
  return true;
}

export function removeFromWishlist(id: number) {
  saveWishlist(getWishlist().filter((i) => i.id !== id));
}

export function getWishlistItems(): WishlistItem[] {
  return getWishlist();
}

export function getWishlistCount(): number {
  return getWishlist().length;
}

export function isInWishlist(id: number): boolean {
  return getWishlist().some((i) => i.id === id);
}

export function clearWishlist() {
  saveWishlist([]);
}
