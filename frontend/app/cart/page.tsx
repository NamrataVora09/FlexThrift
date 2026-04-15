'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getCartItems, removeFromCart, clearCart, CartItem } from '@/lib/cart';
import { addToWishlist } from '@/lib/wishlist';
import { confirmToast } from '@/lib/toast-utils';
import toast from 'react-hot-toast';

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/$/, '');
const BASE_URL = BACKEND_URL;

export default function CartPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Blocked admin check
    if (isAuthenticated && user) {
      if (user.role === 'admin' && Number(user.blocked_buyer) === 1) {
        router.replace('/admin');
        return;
      }
    }
    setItems(getCartItems());
    const handler = () => setItems(getCartItems());
    window.addEventListener('cart-updated', handler);
    return () => window.removeEventListener('cart-updated', handler);
  }, [isAuthenticated, user, router]);

  const handleRemove = (id: number) => {
    removeFromCart(id);
    setItems(getCartItems());
  };

  const handleCheckout = (item: CartItem) => {
    if (!isAuthenticated) {
      sessionStorage.setItem('redirect_after_login', `/buyer/product/${item.id}`);
      router.push('/login');
      return;
    }
    router.push(`/buyer/product/${item.id}`);
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Maven+Pro:wght@400..900&family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />

      <style jsx global>{`
        .cart-page { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8f9fa; min-height: 100vh; }
        .navbar-main { background: rgba(255,255,255,0.85); backdrop-filter: blur(25px) saturate(180%); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 0.7rem 0; z-index: 1050; position: fixed; top: 0; left: 0; right: 0; }
        .navbar-brand-main { font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: #000 !important; letter-spacing: -1.5px; position: relative; text-decoration: none; }
        .navbar-brand-main::after { content: '.'; color: #ffc63a; font-size: 2.5rem; line-height: 0; position: absolute; bottom: 8px; }
      `}</style>

      <div className="cart-page" style={{ paddingTop: 100 }}>
        <nav className="navbar-main">
          <div className="container-fluid px-lg-5 d-flex align-items-center justify-content-between">
            <Link className="navbar-brand-main" href="/">Flex Market</Link>
            <div className="d-flex align-items-center gap-3">
              <Link href="/buyer/browse" className="btn btn-outline-dark" style={{ borderRadius: 10, fontWeight: 600 }}>
                <i className="bi bi-arrow-left me-1"></i> Continue Shopping
              </Link>
              {user ? (
                <Link href={`/${user.role === 'super_admin' ? 'superadmin' : user.role === 'admin' ? 'admin' : 'buyer'}`} className="btn" style={{ background: '#ffc63a', borderRadius: 10, fontWeight: 600 }}>
                  <i className="bi bi-person me-1"></i> My Portal
                </Link>
              ) : (
                <Link href="/login" className="btn" style={{ background: '#ffc63a', borderRadius: 10, fontWeight: 600 }}>
                  <i className="bi bi-person me-1"></i> Sign In
                </Link>
              )}
            </div>
          </div>
        </nav>

        <div className="container py-4">
          <h2 style={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            <i className="bi bi-heart me-2" style={{ color: '#ffc63a' }}></i>
            Your Wishlist ({items.length})
          </h2>
          <p className="text-muted mb-4">
            {isAuthenticated ? 'Review your items and proceed to buy or rent.' : 'Sign in when you\'re ready to buy or rent.'}
          </p>

          {items.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-heart" style={{ fontSize: '4rem', color: '#ddd' }}></i>
              <h4 className="mt-3 fw-bold">Your Wishlist is empty</h4>
              <p className="text-muted">Browse our marketplace and add items to your wishlist.</p>
              <Link href="/buyer/browse" className="btn btn-lg" style={{ background: '#ffc63a', borderRadius: 12, fontWeight: 700, padding: '12px 40px' }}>
                Explore Marketplace
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
                          <img
                            src={item.image.startsWith('http') ? item.image : item.image.startsWith('uploads/') ? `${BASE_URL}/${item.image}` : `${BASE_URL}/uploads/products/${item.image}`}
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
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
                        <div className="mt-auto d-flex flex-column gap-2">
                          <div className="d-flex gap-2">
                            <button
                              className="btn flex-grow-1"
                              style={{ background: '#ffc63a', borderRadius: 10, fontWeight: 700 }}
                              onClick={() => handleCheckout(item)}
                            >
                              {item.listing_type === 'rent' ? 'Rent Now' : 'Buy Now'}
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              style={{ borderRadius: 10 }}
                              onClick={() => handleRemove(item.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            style={{ borderRadius: 10, fontSize: '0.8rem', fontWeight: 600 }}
                            onClick={() => {
                              addToWishlist(item);
                              handleRemove(item.id);
                              toast.success('Moved to wishlist');
                            }}
                          >
                            <i className="bi bi-heart me-1"></i> Move to Wishlist
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex justify-content-between align-items-center mt-4 p-3 bg-white rounded-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <button
                  className="btn btn-outline-secondary"
                  style={{ borderRadius: 10 }}
                  onClick={() => {
                    confirmToast('Are you sure you want to clear your cart?', () => {
                      clearCart();
                      setItems([]);
                    });
                  }}
                >
                  <i className="bi bi-x-circle me-1"></i> Clear Wishlist
                </button>
                {!isAuthenticated && (
                  <Link href="/login" className="btn" style={{ background: '#ffc63a', borderRadius: 10, fontWeight: 700, padding: '10px 30px' }}>
                    <i className="bi bi-box-arrow-in-right me-2"></i> Sign In to Checkout
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
