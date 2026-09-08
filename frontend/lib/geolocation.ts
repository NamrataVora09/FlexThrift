export interface IPLocationResult {
  lat: string;
  lng: string;
  state?: string;
  city?: string;
}

/**
 * IP-Based Geolocation Helper
 * Fetches user location using ip-api.com (with fallback to ipapi.co)
 * Useful when user denies or ignores browser GPS permission.
 */
export async function getIPLocationCoords(): Promise<IPLocationResult | null> {
  // Try ip-api.com first (HTTPS)
  try {
    const res = await fetch('https://ip-api.com/json/').then((r) => r.json());
    if (res && res.status === 'success' && res.lat && res.lon) {
      return {
        lat: String(res.lat),
        lng: String(res.lon),
        state: res.regionName || res.region,
        city: res.city,
      };
    }
  } catch {
    // Ignore error and try HTTP / fallback
  }

  // Try ip-api.com (HTTP)
  try {
    const res = await fetch('http://ip-api.com/json/').then((r) => r.json());
    if (res && res.status === 'success' && res.lat && res.lon) {
      return {
        lat: String(res.lat),
        lng: String(res.lon),
        state: res.regionName || res.region,
        city: res.city,
      };
    }
  } catch {
    // Ignore error
  }

  // Fallback to ipapi.co
  try {
    const res = await fetch('https://ipapi.co/json/').then((r) => r.json());
    if (res && res.latitude && res.longitude) {
      return {
        lat: String(res.latitude),
        lng: String(res.longitude),
        state: res.region,
        city: res.city,
      };
    }
  } catch {
    // Ignore error
  }

  return null;
}
