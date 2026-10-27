const https = require('https');

// Coordinate precision: 4 decimal places (~11 meters), ideal for neighborhood/street level reverse geocoding
function getCoordKey(lat, lng) {
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  if (isNaN(nLat) || isNaN(nLng)) return null;
  return `${nLat.toFixed(4)},${nLng.toFixed(4)}`;
}

// In-memory cache for resolved locations
const geocodeCache = new Map();

// Seed initial known location for headquarters / depot in Faisalabad
geocodeCache.set('31.4468,73.0959', {
  road: '',
  society: '',
  locality: 'Madina Town',
  city: 'Faisalabad',
  formatted: 'Madina Town, Faisalabad',
  full_display: 'Madina Town, Faisalabad City Tehsil, Faisalabad District, Punjab, Pakistan'
});
geocodeCache.set('31.4468,73.0955', {
  road: '',
  society: '',
  locality: 'Madina Town',
  city: 'Faisalabad',
  formatted: 'Madina Town, Faisalabad',
  full_display: 'Madina Town, Faisalabad City Tehsil, Faisalabad District, Punjab, Pakistan'
});
geocodeCache.set('31.4467,73.0959', {
  road: '',
  society: '',
  locality: 'Madina Town',
  city: 'Faisalabad',
  formatted: 'Madina Town, Faisalabad',
  full_display: 'Madina Town, Faisalabad City Tehsil, Faisalabad District, Punjab, Pakistan'
});
geocodeCache.set('31.4467,73.0957', {
  road: '',
  society: '',
  locality: 'Madina Town',
  city: 'Faisalabad',
  formatted: 'Madina Town, Faisalabad',
  full_display: 'Madina Town, Faisalabad City Tehsil, Faisalabad District, Punjab, Pakistan'
});

// Rate limiting queue: Nominatim allows max 1 request/second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function throttleRequest() {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - timeSinceLast;
    await wait(delay);
  }
  lastRequestTime = Date.now();
}

function formatOsmAddress(json) {
  if (!json || !json.address) {
    return {
      road: '',
      society: '',
      locality: '',
      city: '',
      formatted: json?.display_name ? json.display_name.split(',').slice(0, 3).join(', ').trim() : 'Address unavailable',
      full_display: json?.display_name || 'Address unavailable'
    };
  }

  const a = json.address;
  const road = a.road || a.street || a.residential || a.pedestrian || a.footway || a.path || '';
  const society = a.suburb || a.neighbourhood || a.subdivision || a.housing_estate || a.residential_area || a.quarter || '';
  const locality = a.town || a.village || a.city_district || a.hamlet || a.commercial || '';
  const rawCity = a.city || a.town || a.municipality || a.district || '';
  const cleanCity = rawCity.replace(/\s*(City\s*Tehsil|Tehsil|District)/gi, '').trim() || rawCity;

  const parts = [];
  if (road) parts.push(road);
  if (society && society !== road) parts.push(society);
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
    formatted: formatted || 'Address unavailable',
    full_display: json.display_name || formatted || 'Address unavailable'
  };
}

function fetchNominatim(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
    const options = {
      headers: {
        'User-Agent': 'SafeSolutionsSmartFleet/1.0 (operations@safesolutions.com)',
        'Accept': 'application/json'
      },
      timeout: 4500
    };

    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            const formatted = formatOsmAddress(parsed);
            resolve(formatted);
          } else {
            resolve({ formatted: 'Address unavailable' });
          }
        } catch {
          resolve({ formatted: 'Address unavailable' });
        }
      });
    });

    req.on('error', () => {
      resolve({ formatted: 'Address unavailable' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ formatted: 'Address unavailable' });
    });
  });
}

async function reverseGeocode(lat, lng) {
  const key = getCoordKey(lat, lng);
  if (!key) {
    return { formatted: 'Address unavailable' };
  }

  // Check cache
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }

  try {
    await throttleRequest();
    const result = await fetchNominatim(parseFloat(lat), parseFloat(lng));
    if (result && result.formatted && result.formatted !== 'Address unavailable') {
      geocodeCache.set(key, result);
    }
    return result;
  } catch {
    return { formatted: 'Address unavailable' };
  }
}

function getCachedGeocode(lat, lng) {
  const key = getCoordKey(lat, lng);
  if (!key) return null;
  return geocodeCache.get(key) || null;
}

module.exports = {
  reverseGeocode,
  getCachedGeocode,
  formatOsmAddress,
  getCoordKey
};
