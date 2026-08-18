/**
 * Server-side data fetching utilities for ISR (Incremental Static Regeneration).
 * These functions run on the server during build/revalidation and provide
 * pre-fetched data to client components, reducing client-side API calls.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

async function safeFetch<T = any>(
  endpoint: string,
  revalidateSeconds: number = 60
): Promise<T | null> {
  try {
    const fetchOptions: RequestInit = revalidateSeconds === 0
      ? { cache: 'no-store' }
      : { next: { revalidate: revalidateSeconds } };

    const res = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.data !== undefined) return json.data;
    return json;
  } catch {
    return null;
  }
}

// Shared/public data that can be pre-fetched via ISR
export async function getTaxonomy() {
  return safeFetch('/taxonomy', 120);
}

export async function getListingTypes() {
  return safeFetch('/listing-types', 120);
}

export async function getSubscriptionPlans(userType: string) {
  return safeFetch(`/subscriptions/${userType}`, 120);
}

export async function getAdminSubscriptionPlans() {
  return safeFetch('/admin-subscription-plans', 120);
}

export async function getBusinessSettings() {
  return safeFetch('/business-settings', 60);
}

export async function getCoupons() {
  return safeFetch('/coupons', 60);
}

export async function getBrowseProducts(page = 1, listingType?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (listingType) params.set('listing_type', listingType);
  return safeFetch(`/browse?${params}`, 30);
}

export async function getFeaturedProducts() {
  const data = await safeFetch('/featured-products', 60);
  if (data && Array.isArray(data) && data.length > 0) return data;
  // Fallback
  const browse = await safeFetch('/browse?page=1', 60);
  return browse?.products?.slice(0, 8) || [];
}

export async function getProductDetail(id: string) {
  return safeFetch(`/product/${id}`, 60);
}

export async function getLandingContent() {
  return safeFetch('/landing-content', 0);
}

/**
 * Fetch the configured SEO settings for a specific page key from the DB.
 * Used by server-side generateMetadata() to serve correct meta tags on initial HTML load.
 * Uses no-store so admin changes to SEO are reflected immediately.
 */
export async function getSeoSetting(pageKey: string) {
  return safeFetch<{
    title: string | null;
    meta_description: string | null;
    meta_keywords: string | null;
    og_title: string | null;
    og_description: string | null;
  }>(`/shared/seo-settings/${pageKey}`, 0);
}
