import { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from './ProductCard';

// --- ISR: Revalidate the products listing every 30 seconds ---
export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Browse Products — FlexMarket',
  description: 'Browse and discover luxury fashion, electronics, and lifestyle products to buy or rent on FlexMarket.',
  openGraph: {
    title: 'Browse Products — FlexMarket',
    description: 'Discover curated products to buy or rent.',
    type: 'website',
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

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

interface ListingType {
  id: number;
  type_name: string;
}

async function getProducts(page = 1, listingType?: string): Promise<{
  products: Product[];
  pagination: { page: number; total: number; total_pages: number };
} | null> {
  try {
    const params = new URLSearchParams({ page: String(page) });
    if (listingType) params.set('listing_type', listingType);
    const res = await fetch(`${API_BASE}/browse?${params}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

async function getListingTypes(): Promise<ListingType[]> {
  try {
    const res = await fetch(`${API_BASE}/shared/listing-types`, {
      next: { revalidate: 120 },
    });
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return [];
  } catch {
    return [];
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { page?: string; listing_type?: string };
}) {
  const page = parseInt(searchParams.page || '1', 10);
  const listingType = searchParams.listing_type;

  const [data, listingTypes] = await Promise.all([
    getProducts(page, listingType),
    getListingTypes(),
  ]);

  const products = data?.products || [];
  const pagination = data?.pagination || { page: 1, total: 0, total_pages: 1 };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #eee',
        padding: '1.2rem 0',
        position: 'sticky',
        top: 0,
        zIndex: 1030,
      }}>
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <Link
              href="/buyer"
              style={{ fontFamily: '"Maven Pro", sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#000', textDecoration: 'none' }}
            >
              <i className="bi bi-intersect"></i> FlexMarket
            </Link>
            <div className="d-flex align-items-center gap-3">
              <Link href="/buyer/browse" className="fw-semibold text-decoration-none text-dark">
                <i className="bi bi-search me-1"></i> Search
              </Link>
              <Link href="/login" className="btn btn-dark rounded-pill px-4" style={{ fontFamily: '"Maven Pro", sans-serif' }}>
                Join Community
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container py-5">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="display-4 fw-bold" style={{ fontFamily: '"Maven Pro", sans-serif' }}>
            Discover Products
          </h1>
          <p className="text-muted fs-5">
            {pagination.total} curated products available
          </p>
          {/* ISR indicator */}
          <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill px-3 py-2">
            <i className="bi bi-lightning-charge-fill me-1"></i>
            ISR — Static page, revalidates every 30s
          </span>
        </div>

        {/* Listing Type Filter */}
        {listingTypes.length > 0 && (
          <div className="d-flex justify-content-center gap-2 mb-4 flex-wrap">
            <Link
              href="/buyer/products"
              className={`btn rounded-pill px-4 ${!listingType ? 'btn-dark' : 'btn-outline-dark'}`}
            >
              All
            </Link>
            {listingTypes.map((lt) => (
              <Link
                key={lt.id}
                href={`/buyer/products?listing_type=${lt.id}`}
                className={`btn rounded-pill px-4 ${listingType === String(lt.id) ? 'btn-dark' : 'btn-outline-dark'}`}
              >
                {lt.type_name}
              </Link>
            ))}
          </div>
        )}

        {/* Product Grid */}
        {products.length > 0 ? (
          <div className="row g-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <i className="bi bi-inbox" style={{ fontSize: 64, color: '#ccc' }}></i>
            <h4 className="mt-3 text-muted">No products found</h4>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <nav className="d-flex justify-content-center mt-5">
            <ul className="pagination">
              {page > 1 && (
                <li className="page-item">
                  <Link
                    href={`/buyer/products?page=${page - 1}${listingType ? `&listing_type=${listingType}` : ''}`}
                    className="page-link rounded-pill me-1"
                    style={{ border: 'none', background: '#f0f0f0' }}
                  >
                    &laquo; Previous
                  </Link>
                </li>
              )}
              {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <Link
                      href={`/buyer/products?page=${p}${listingType ? `&listing_type=${listingType}` : ''}`}
                      className="page-link rounded-pill mx-1"
                      style={{
                        border: 'none',
                        background: p === page ? '#000' : '#f0f0f0',
                        color: p === page ? '#ffc63a' : '#000',
                      }}
                    >
                      {p}
                    </Link>
                  </li>
                );
              })}
              {page < pagination.total_pages && (
                <li className="page-item">
                  <Link
                    href={`/buyer/products?page=${page + 1}${listingType ? `&listing_type=${listingType}` : ''}`}
                    className="page-link rounded-pill ms-1"
                    style={{ border: 'none', background: '#f0f0f0' }}
                  >
                    Next &raquo;
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
