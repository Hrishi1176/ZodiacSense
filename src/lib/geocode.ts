/**
 * Geocoding helper — converts city/location strings to lat/lng + UTC offset
 * Uses Nominatim (OpenStreetMap) — completely free, no API key required.
 * Timezone resolution uses @vvo/tzdb offline database.
 */

import { getTimeZones } from '@vvo/tzdb';

export interface GeoLocation {
  lat: number;
  lng: number;
  displayName: string;
  timezone: string;       // IANA timezone e.g. "Asia/Kolkata"
  utcOffsetMinutes: number; // e.g. 330 for IST (+5:30)
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT   = 'ZodiacSense/1.0 (contact@zodiacsense.app)';

// Default fallback: India geographic center (covers most Indian users)
const DEFAULT_LOCATION: GeoLocation = {
  lat: 20.5937,
  lng: 78.9629,
  displayName: 'India',
  timezone: 'Asia/Kolkata',
  utcOffsetMinutes: 330,
};

/**
 * Find the IANA timezone name closest to a given lat/lng using the offline tzdb.
 * Picks the timezone whose largest city is geographically nearest.
 *
 * Note: `lat` is accepted for API stability; the current heuristic uses only lng.
 */
export function getTimezoneForCoords(lat: number, lng: number): { timezone: string; utcOffsetMinutes: number } {
  const timezones = getTimeZones();

  let bestTz = 'UTC';
  let bestOffset = 0;
  let bestDist = Infinity;

  for (const tz of timezones) {
    // tzdb doesn't expose a single lat/lng — use rawOffsetInMinutes as a rough
    // proxy to pick the timezone with the closest offset when we can't compute
    // distance. For better accuracy we find the nearest by city coordinates
    // embedded in the name (e.g. "Asia/Kolkata" → India) through country code.
    // Since tzdb doesn't give city coords, we do a simple UTC-offset heuristic:
    // pick the timezone whose current offset best matches (lng / 15) degrees → hours.
    const approxOffsetFromLng = lng / 15 * 60; // minutes
    const diff = Math.abs(tz.rawOffsetInMinutes - approxOffsetFromLng);
    if (diff < bestDist) {
      bestDist = diff;
      bestTz = tz.name;
      bestOffset = tz.rawOffsetInMinutes;
    }
  }

  return { timezone: bestTz, utcOffsetMinutes: bestOffset };
}

/**
 * Geocode a free-text location string to lat/lng + timezone.
 * Falls back to India defaults if geocoding fails.
 */
export async function geocodeCity(location: string): Promise<GeoLocation> {
  if (!location || location.trim().length < 2) {
    return DEFAULT_LOCATION;
  }

  try {
    const params = new URLSearchParams({
      q: location,
      format: 'json',
      limit: '1',
      addressdetails: '0',
    });

    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

    const results: Array<{ lat: string; lon: string; display_name: string }> = await res.json();

    if (!results.length) return DEFAULT_LOCATION;

    const { lat: latStr, lon: lngStr, display_name } = results[0];
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    const { timezone, utcOffsetMinutes } = getTimezoneForCoords(lat, lng);

    return { lat, lng, displayName: display_name, timezone, utcOffsetMinutes };
  } catch (err) {
    console.warn(`[geocode] Failed for "${location}":`, err);
    return DEFAULT_LOCATION;
  }
}
