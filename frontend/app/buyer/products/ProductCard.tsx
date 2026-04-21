'use client';

import Link from 'next/link';
import { addToCart, isInCart } from '@/lib/cart';
import { addToWishlist, removeFromWishlist, isInWishlist } from '@/lib/wishlist';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: number;
  title: string;
  listing_type: string;
  original_price: string;
  selling_price?: string;
  rental_cost?: string;
  price?: string;
  seller_name: string;
  image?: string;
  primary_image?: string;
  brand_name?: string;
  seller_rating_avg?: string;
  status: string;
}

const BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

function getImageUrl(path?: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE_URL}/${path}`;
}

function formatPrice(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function ProductCard({ product }: { product: Product }) {
  const [inCart, setInCart] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Blocked admin check
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('flex_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u.role === 'admin' && Number(u.blocked_buyer) === 1) {
            router.replace('/admin');
            return;
          }
        } catch { /* ignore */ }
      }
    }
    setInCart(isInCart(product.id));
    setInWishlist(isInWishlist(product.id));
  }, [product.id, router]);

  const price =
    product.listing_type === 'sell'
      ? product.selling_price || product.price || product.original_price
      : product.rental_cost || product.price || '0';
  const imgSrc = getImageUrl(product.primary_image || product.image);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      id: product.id,
      title: product.title,
      listing_type: product.listing_type,
      price,
      image: product.primary_image || product.image || '',
      seller_name: product.seller_name,
    });
    setInCart(true);
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inWishlist) {
      removeFromWishlist(product.id);
      setInWishlist(false);
    } else {
      addToWishlist({
        id: product.id,
        title: product.title,
        listing_type: product.listing_type,
        price,
        image: product.primary_image || product.image || '',
        seller_name: product.seller_name,
      });
      setInWishlist(true);
    }
  };

  return (
    <div className="col-sm-6 col-lg-4 col-xl-3">
      <Link
        href={`/buyer/product/${product.id}`}
        className="text-decoration-none"
      >
        <div
          className="card border-0 shadow-sm h-100"
          style={{ borderRadius: '16px', overflow: 'hidden', transition: 'transform 0.2s', position: 'relative' }}
        >
          {/* Wishlist Button */}
          <button
            onClick={handleAddToWishlist}
            className="btn btn-light shadow-sm"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 5,
              borderRadius: '50%',
              width: '35px',
              height: '35px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              color: inWishlist ? '#ff4d4d' : '#888'
            }}
          >
            <i className={`bi ${inWishlist ? 'bi-heart-fill' : 'bi-heart'} fs-6`}></i>
          </button>

          <div style={{ aspectRatio: '4/5', overflow: 'hidden', background: '#f8f9fa' }}>
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={product.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <i className="bi bi-image" style={{ fontSize: 48, color: '#ccc' }}></i>
              </div>
            )}
          </div>
          <div className="card-body p-3">
            <span
              className="badge mb-2"
              style={{
                background: product.listing_type === 'sell' ? '#000' : '#ffc63a',
                color: product.listing_type === 'sell' ? '#ffc63a' : '#000',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 800,
              }}
            >
              {product.listing_type === 'sell' ? 'For Sale' : 'For Rent'}
            </span>
            <h6
              className="fw-bold mb-1 text-dark"
              style={{
                fontFamily: '"Maven Pro", sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {product.title}
            </h6>
            {product.brand_name && (
              <small className="text-muted d-block mb-1">{product.brand_name}</small>
            )}
            <div className="d-flex justify-content-between align-items-center mt-2">
              <span className="fw-bold fs-5 text-dark" style={{ fontFamily: '"Maven Pro", sans-serif' }}>
                &#8377;{formatPrice(price)}
              </span>
              <button
                className="btn btn-sm rounded-pill"
                style={{
                  background: inCart ? '#000' : '#ffc63a',
                  color: inCart ? '#ffc63a' : '#000',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
                onClick={handleAddToCart}
                disabled={inCart}
              >
                <i className={`bi ${inCart ? 'bi-cart-check-fill' : 'bi-cart-plus'} me-1`}></i>
                {inCart ? 'In Cart' : 'Add'}
              </button>
            </div>
            <small className="text-muted mt-1 d-block">
              <i className="bi bi-person-fill me-1"></i>{product.seller_name}
            </small>
          </div>
        </div>
      </Link>
    </div>
  );
}
