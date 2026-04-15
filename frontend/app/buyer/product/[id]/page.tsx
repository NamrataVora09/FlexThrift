import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

// --- ISR: Revalidate every 60 seconds ---
export const revalidate = 60;

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');

interface ProductData {
  product: {
    id: number;
    product_number?: string;
    title: string;
    description: string;
    listing_type: string;
    original_price: string;
    selling_price: string;
    price?: string;
    rental_cost: string;
    rental_deposit: string;
    brand: string;
    brand_name?: string;
    size?: string;
    color?: string;
    used_times?: string;
    times_used?: string;
    condition_description: string;
    category?: string;
    category_id?: string;
    gender?: string;
    gender_ids?: string;
    specifications?: string;
    has_bill?: number;
    views_count?: number;
    seller_name: string;
    seller_email: string;
    seller_mobile: string;
    seller_rating_avg: string;
    seller_rating_count: string;
    status: string;
    seller_id?: number;
  };
  images: { id: number; image_path: string }[];
  min_rental_days?: number;
}

// Extract numeric ID from slug (e.g. "ssas-1" → "1", "1" → "1")
function extractId(slug: string): string {
  const match = slug.match(/-(\d+)$/);
  if (match) return match[1];
  return slug.replace(/\D/g, '') || slug;
}

interface SimilarProduct {
  id: number;
  title: string;
  listing_type: string;
  original_price: string;
  selling_price: string;
  price?: string;
  rental_cost: string;
  brand_name?: string;
  seller_name: string;
  seller_rating_avg: string;
  image?: string;
  category?: string;
}

async function getProduct(slug: string): Promise<ProductData | null> {
  try {
    const id = extractId(slug);
    const res = await fetch(`${API_BASE}/product/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

async function getSimilarProducts(slug: string): Promise<SimilarProduct[]> {
  try {
    const id = extractId(slug);
    const res = await fetch(`${API_BASE}/product/${id}/similar`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return [];
  } catch {
    return [];
  }
}

// Dynamic metadata for SEO — generated at build/revalidation time
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const data = await getProduct(params.id);
  if (!data) {
    return { title: 'Product Not Found — FlexMarket' };
  }
  const p = data.product;
  const price =
    p.listing_type === 'sell'
      ? p.selling_price || p.price || p.original_price
      : p.rental_cost;
  return {
    title: `${p.title} — FlexMarket`,
    description: `${p.listing_type === 'sell' ? 'Buy' : 'Rent'} ${p.title} for ₹${price}. ${p.description?.slice(0, 150) || ''}`,
    openGraph: {
      title: p.title,
      description: p.description?.slice(0, 200) || '',
      type: 'website',
    },
  };
}

// Generate static params for known products (optional — for full SSG + ISR)
function toSlug(title: string, id: number): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${slug}-${id}`;
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_BASE}/browse?page=1`, {
      next: { revalidate: 120 },
    });
    const json = await res.json();
    if (json.success && json.data?.products) {
      return json.data.products.map((p: { id: number; title: string }) => ({
        id: toSlug(p.title, p.id),
      }));
    }
  } catch {
    // Fallback: no pre-generated pages, all will be ISR on-demand
  }
  return [];
}

// Server Component — fetches data at build time, revalidates via ISR
export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, similarProducts] = await Promise.all([
    getProduct(params.id),
    getSimilarProducts(params.id),
  ]);

  if (!data) {
    notFound();
  }

  return <ProductDetailClient product={data.product} images={data.images} similarProducts={similarProducts} minRentalDays={data.min_rental_days} />;
}
