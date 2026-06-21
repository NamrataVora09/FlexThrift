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
  if (wishlist.some((i) => Number(i.id) === Number(item.id))) return false;
  wishlist.push(item);
  saveWishlist(wishlist);
  return true;
}

export function removeFromWishlist(id: number | string) {
  saveWishlist(getWishlist().filter((i) => Number(i.id) !== Number(id)));
}

export function getWishlistItems(): WishlistItem[] {
  return getWishlist();
}

export function getWishlistCount(): number {
  return getWishlist().length;
}

export function isInWishlist(id: number | string): boolean {
  return getWishlist().some((i) => Number(i.id) === Number(id));
}

export function clearWishlist() {
  saveWishlist([]);
}
