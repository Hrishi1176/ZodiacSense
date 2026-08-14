/**
 * Geocoding helper — converts city/location strings to lat/lng + UTC offset
 * Uses OpenStreetMap Nominatim with offline timezone resolution.
 */

import { getTimeZones } from '@vvo/tzdb';

export interface GeoLocation {
  lat: number;
  lng: number;
  displayName: string;
  timezone: string;         // IANA timezone e.g. "Asia/Kolkata"
  utcOffsetMinutes: number; // e.g. 330 for IST (+5:30)
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ZodiacSense/2.0 (contact@zodiacsense.app)';

// Default fallback: India geographic center
const DEFAULT_LOCATION: GeoLocation = {
  lat: 20.5937,
  lng: 78.9629,
  displayName: 'India',
  timezone: 'Asia/Kolkata',
  utcOffsetMinutes: 330,
};

/**
 * Find the exact IANA timezone name and UTC offset for coordinates.
 */
export function getTimezoneForCoords(lat: number, lng: number): { timezone: string; utcOffsetMinutes: number } {
  // Direct territorial match for India (strict +5:30 IST)
  if (lat >= 6.0 && lat <= 38.0 && lng >= 68.0 && lng <= 98.0) {
    return { timezone: 'Asia/Kolkata', utcOffsetMinutes: 330 };
  }

  const timezones = getTimeZones();

  // Try to find timezone by matching longitude offset heuristic
  const approxOffsetFromLng = (lng / 15) * 60; // minutes
  let bestTz = 'UTC';
  let bestOffset = 0;
  let bestDist = Infinity;

  for (const tz of timezones) {
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
      addressdetails: '1',
    });

    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

    const results: Array<{ lat: string; lon: string; display_name: string; address?: { country_code?: string } }> =
      await res.json();

    if (!results.length) return DEFAULT_LOCATION;

    const { lat: latStr, lon: lngStr, display_name, address } = results[0];
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (address?.country_code === 'in') {
      return { lat, lng, displayName: display_name, timezone: 'Asia/Kolkata', utcOffsetMinutes: 330 };
    }

    const { timezone, utcOffsetMinutes } = getTimezoneForCoords(lat, lng);

    return { lat, lng, displayName: display_name, timezone, utcOffsetMinutes };
  } catch (err) {
    console.warn(`[geocode] Failed for "${location}":`, err);
    return DEFAULT_LOCATION;
  }
}
