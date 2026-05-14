'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getWishlistItems, removeFromWishlist, WishlistItem, clearWishlist } from '@/lib/wishlist';
import { addToCart } from '@/lib/cart';
import { confirmToast } from '@/lib/toast-utils';
import { useToast } from '@/lib/toast';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080/';

export default function WishlistPage() {
  const { user, isAuthenticated } = useAuth();
  const { toastSuccess } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    setItems(getWishlistItems());
    const handler = () => setItems(getWishlistItems());
    window.addEventListener('wishlist-updated', handler);
    return () => window.removeEventListener('wishlist-updated', handler);
  }, []);

  const handleRemove = (id: number) => {
    removeFromWishlist(id);
    setItems(getWishlistItems());
    toastSuccess('wishlist_removed', 'Removed from wishlist.');
  };

  const handleMoveToCart = (item: WishlistItem) => {
    addToCart({
      id: item.id,
      title: item.title,
      listing_type: item.listing_type,
      price: item.price,
      image: item.image,
      seller_name: item.seller_name
    });
    removeFromWishlist(item.id);
    setItems(getWishlistItems());
    toastSuccess('wishlist_moved_to_cart', 'Item moved to cart!');
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        .wishlist-page { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8f9fa; min-height: 100vh; }
        .navbar-main { background: rgba(255,255,255,0.85); backdrop-filter: blur(25px) saturate(180%); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 0.7rem 0; z-index: 1050; position: fixed; top: 0; left: 0; right: 0; }
        .navbar-brand-main { font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: #000 !important; letter-spacing: -1.5px; position: relative; text-decoration: none; }
        .navbar-brand-main::after { content: '.'; color: #ffc63a; font-size: 2.5rem; line-height: 0; position: absolute; bottom: 8px; }
      `}</style>

      <div className="wishlist-page" style={{ paddingTop: 100 }}>
        <nav className="navbar-main">
          <div className="container-fluid px-lg-5 d-flex align-items-center justify-content-between">
            <Link className="navbar-brand-main" href="/">Flex Market</Link>
            <div className="d-flex align-items-center gap-3">
              <Link href="/buyer/browse" className="btn btn-outline-dark" style={{ borderRadius: 10, fontWeight: 600 }}>
                <i className="bi bi-arrow-left me-1"></i> Back to Browse
              </Link>
              <Link href="/cart" className="btn btn-dark position-relative" style={{ borderRadius: 10, fontWeight: 600 }}>
                <i className="bi bi-cart me-1"></i> Cart
              </Link>
            </div>
          </div>
        </nav>

        <div className="container py-4">
          <h2 style={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            <i className="bi bi-heart-fill me-2" style={{ color: '#ff4d4d' }}></i>
            My Wishlist ({items.length})
          </h2>
          <p className="text-muted mb-4">
            Items you've saved for later.
          </p>

          {items.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-heart" style={{ fontSize: '4rem', color: '#ddd' }}></i>
              <h4 className="mt-3 fw-bold">Your wishlist is empty</h4>
              <p className="text-muted">Save items you like to keep track of them.</p>
              <Link href="/buyer/browse" className="btn btn-lg" style={{ background: '#ffc63a', borderRadius: 12, fontWeight: 700, padding: '12px 40px' }}>
                Start Exploring
              </Link>
            </div>
          ) : (
            <>
              <div className="row g-4">
                {items.map((item) => (
                  <div key={item.id} className="col-md-6 col-lg-4">
                    <div className="card border-0 h-100" style={{ borderRadius: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                      <div style={{ height: 200, background: '#f1f5f9', borderRadius: '16px 16px 0 0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image ? (
                          <img src={item.image.startsWith('http') ? item.image : item.image.startsWith('uploads/') ? `${BASE_URL}${item.image}` : `${BASE_URL}uploads/products/${item.image}`} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <i className="bi bi-image" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                        )}
                      </div>
                      <div className="card-body d-flex flex-column">
                        <span className="badge mb-2" style={{ background: item.listing_type === 'rent' ? 'rgba(13,202,240,0.1)' : 'rgba(255,198,58,0.15)', color: item.listing_type === 'rent' ? '#0dcaf0' : '#b8860b', fontWeight: 700, fontSize: '0.7rem', width: 'fit-content' }}>
                          {item.listing_type === 'rent' ? 'RENT' : 'BUY'}
                        </span>
                        <h6 className="fw-bold text-truncate">{item.title}</h6>
                        <p className="text-muted small mb-2">by {item.seller_name}</p>
                        <div className="fw-bold mb-3" style={{ fontSize: '1.2rem' }}>
                          ₹{Number(item.price || 0).toLocaleString('en-IN')}
                          {item.listing_type === 'rent' && <small className="text-muted fw-normal">/day</small>}
                        </div>
                        <div className="mt-auto d-flex gap-2">
                          <button
                            className="btn flex-grow-1"
                            style={{ background: '#ffc63a', borderRadius: 10, fontWeight: 700 }}
                            onClick={() => handleMoveToCart(item)}
                          >
                            <i className="bi bi-cart-plus me-1"></i> Move to Cart
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            style={{ borderRadius: 10 }}
                            onClick={() => handleRemove(item.id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-white rounded-3 shadow-sm text-end">
                <button 
                  className="btn btn-outline-secondary" 
                  style={{ borderRadius: 10 }} 
                  onClick={() => { 
                    confirmToast('Are you sure you want to clear your wishlist?', () => {
                      clearWishlist(); 
                      setItems([]); 
                    });
                  }}
                >
                  <i className="bi bi-x-circle me-1"></i> Clear Wishlist
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
