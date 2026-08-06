'use client';

/**
 * LocationPicker — Leaflet/OpenStreetMap location picker (no API key).
 *
 * Nominatim debounced autocomplete + interactive map with draggable marker
 * + "use my location" button. Reports { lat, lng, displayName } via onPick.
 * Must be loaded via next/dynamic with ssr: false (react-leaflet needs DOM).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationPicker.module.css';

export interface LocationPick {
  lat: number;
  lng: number;
  displayName: string;
}

interface LocationPickerProps {
  onPick: (pick: LocationPick) => void;
  placeholder?: string;
  locateLabel?: string;
  initial?: { lat: number; lng: number } | null;
  /** Pre-filled place name shown in the search box (e.g. saved profile preset) */
  initialName?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const DEFAULT_CENTER: [number, number] = [22.5937, 78.9629]; // India center

const pinIcon = L.divIcon({
  className: styles.pin,
  html: '<div class="pin-dot"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) return [];
  return res.json();
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) throw new Error('reverse geocode failed');
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

function FlyToTarget({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 10), { duration: 0.8 });
  }, [target, map]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ onPick, placeholder, locateLabel, initial, initialName }: LocationPickerProps) {
  const [query, setQuery] = useState(initialName ?? '');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(
    initial ? [initial.lat, initial.lng] : null,
  );
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hide stale results while the query is too short (derived, no setState in effect)
  const visibleResults = query.trim().length >= 3 ? results : [];

  // Profile presets arrive asynchronously after mount — apply them once without
  // overriding anything the user has already typed or picked
  useEffect(() => {
    if (initial) {
      setPosition((prev) => prev ?? [initial.lat, initial.lng]);
      setFlyTarget((prev) => prev ?? [initial.lat, initial.lng]);
    }
    if (initialName) {
      setQuery((prev) => (prev.trim() ? prev : initialName));
    }
  }, [initial, initialName]);

  const commitPick = useCallback(
    async (lat: number, lng: number, displayName?: string) => {
      setPosition([lat, lng]);
      setFlyTarget([lat, lng]);
      const name = displayName || (await reverseGeocode(lat, lng));
      onPick({ lat, lng, displayName: name });
    },
    [onPick],
  );

  // Debounced autocomplete while typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchNominatim(query.trim());
        setResults(found);
        setOpen(found.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSearchPick = (r: NominatimResult) => {
    setOpen(false);
    setQuery(r.display_name);
    commitPick(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => commitPick(pos.coords.latitude, pos.coords.longitude),
      () => { /* user denied or unavailable — ignore */ },
      { timeout: 10000 },
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={placeholder || 'Search for a city or place…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => visibleResults.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
          />
          {searching && <span className={styles.searchSpinner}>⏳</span>}
          {open && visibleResults.length > 0 && (
            <ul className={styles.resultList}>
              {visibleResults.map((r, i) => (
                <li key={`${r.lat}-${r.lon}-${i}`}>
                  <button type="button" onMouseDown={() => handleSearchPick(r)}>
                    {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className={styles.locateBtn} onClick={handleUseMyLocation}>
          📍 {locateLabel || 'Use my location'}
        </button>
      </div>

      <div className={styles.mapBox}>
        <MapContainer
          center={position ?? DEFAULT_CENTER}
          zoom={position ? 10 : 5}
          scrollWheelZoom
          className={styles.map}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={(lat, lng) => commitPick(lat, lng)} />
          <FlyToTarget target={flyTarget} />
          {position && (
            <Marker
              position={position}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const ll = (e.target as L.Marker).getLatLng();
                  commitPick(ll.lat, ll.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className={styles.hint}>
        {position
          ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`
          : '🔍 Search, click the map, or drag the pin to set the exact birth place.'}
      </p>
    </div>
  );
}
