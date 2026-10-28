import api from './api';

const CACHE_STORAGE_KEY = 'sf_geocoded_locations_v2';
const memoryCache = new Map();

// Helper: Normalize coordinates into a 4-decimal place key (~11m granularity)
export function getCoordKey(lat, lng) {
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  if (isNaN(nLat) || isNaN(nLng)) return null;
  return `${nLat.toFixed(4)},${nLng.toFixed(4)}`;
}

// Load cached locations from localStorage into memory on startup
(function initCache() {
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([k, v]) => {
        if (v && v.formatted && v.formatted !== 'Address unavailable' && v.formatted !== 'Area unavailable') {
          memoryCache.set(k, v);
        }
      });
    }
  } catch (err) {
    console.warn('Geocoding cache load warning:', err.message);
  }
})();

// Save updated memory cache to localStorage (debounced)
let saveTimer = null;
function persistCache() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const obj = {};
      memoryCache.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (err) {
      console.warn('Geocoding cache persist warning:', err.message);
    }
  }, 1000);
}

// Format raw Nominatim response into readable parts
export function formatOsmAddress(json) {
  if (!json || !json.address) {
    return {
      road: '',
      society: '',
      locality: '',
      city: '',
      formatted: json?.display_name ? json.display_name.split(',').slice(0, 3).join(', ').trim() : 'Area unavailable',
      full_display: json?.display_name || 'Area unavailable'
    };
  }

  const a = json.address;
  const poi = a.industrial || a.amenity || a.building || a.office || a.shop || a.retail || '';
  const road = a.road || a.street || a.residential || a.pedestrian || a.footway || a.path || '';
  const society = a.suburb || a.neighbourhood || a.subdivision || a.housing_estate || a.residential_area || a.quarter || '';
  const locality = a.town || a.village || a.city_district || a.hamlet || a.commercial || '';
  const rawCity = a.city || a.town || a.municipality || a.district || '';
  const cleanCity = rawCity.replace(/\s*(City\s*Tehsil|Tehsil|District)/gi, '').trim() || rawCity;

  const parts = [];
  if (poi) parts.push(poi);
  if (road && road !== poi) parts.push(road);
  if (society && society !== road && society !== poi) parts.push(society);
  if (locality && locality !== society && locality !== cleanCity) parts.push(locality);
  if (cleanCity && cleanCity !== locality) parts.push(cleanCity);

  let formatted = parts.join(', ');
  if (!formatted && json.display_name) {
    formatted = json.display_name.split(',').slice(0, 3).join(', ').trim();
  }

  return {
    road,
    society,
    locality,
    city: cleanCity,
    formatted: formatted || 'Area unavailable',
    full_display: json.display_name || formatted || 'Area unavailable'
  };
}

// Active request deduping to avoid parallel fetches for the same key
const activeRequests = new Map();

/**
 * Get readable location details for coordinates
 * Returns cached value if available, or queries backend/provider
 */
export async function getReadableAddress(lat, lng) {
  const key = getCoordKey(lat, lng);
  if (!key) return { formatted: 'Area unavailable' };

  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  if (activeRequests.has(key)) {
    return activeRequests.get(key);
  }

  const reqPromise = (async () => {
    try {
      // 1. Try backend proxy endpoint first (which has server-side caching & rate-limiting)
      const res = await api.get(`/field-tracking/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res && res.success && res.data && res.data.formatted && res.data.formatted !== 'Area unavailable' && res.data.formatted !== 'Address unavailable') {
        memoryCache.set(key, res.data);
        persistCache();
        return res.data;
      }
      if (res && res.formatted && res.formatted !== 'Area unavailable' && res.formatted !== 'Address unavailable') {
        const item = { formatted: res.formatted, full_display: res.formatted };
        memoryCache.set(key, item);
        persistCache();
        return item;
      }
    } catch {
      // Backend failed, fallback to direct browser fetch to Nominatim
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1&accept-language=en`;
      const directRes = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (directRes.ok) {
        const json = await directRes.json();
        const formatted = formatOsmAddress(json);
        if (formatted.formatted && formatted.formatted !== 'Area unavailable' && formatted.formatted !== 'Address unavailable') {
          memoryCache.set(key, formatted);
          persistCache();
          return formatted;
        }
      }
    } catch {
      // Direct fetch also failed
    }

    return { formatted: 'Area unavailable' };
  })();

  activeRequests.set(key, reqPromise);
  try {
    const result = await reqPromise;
    return result;
  } finally {
    activeRequests.delete(key);
  }
}

/**
 * Synchronous lookup from memory cache (instant render)
 */
export function getCachedAddress(lat, lng) {
  const key = getCoordKey(lat, lng);
  if (!key) return null;
  return memoryCache.get(key) || null;
}

export default {
  getReadableAddress,
  getCachedAddress,
  getCoordKey,
  formatOsmAddress
};
