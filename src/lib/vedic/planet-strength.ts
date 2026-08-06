/**
 * Planet Strength Engine — deterministic strength calculations for Vedic astrology.
 *
 * Computes:
 * - Combustion (astangata) — planet too close to Sun
 * - Retrogression strength (vakra bala)
 * - Directional strength (digbala) — simplified by house
 * - Overall composite strength score per planet
 */

import type { BirthChartData, PlanetPosition } from '@/lib/ephemeris';
import { getDignity, houseDistance, signIndex, type Dignity } from './constants';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlanetStrength {
  planet: string;
  sign: string;
  house: number;
  dignity: Dignity;
  dignityScore: number;       // 0–10 based on dignity
  isCombust: boolean;
  combustionScore: number;    // 0–10 (10 = not combust)
  isRetrograde: boolean;
  retrogradeScore: number;    // 0–10
  digbalaScore: number;       // 0–10 based on directional strength
  compositeScore: number;     // 0–100 weighted composite
  summary: string;
}

// ─── Combustion (Asta / Astangata) ──────────────────────────────────────────

/**
 * Orb distances (in degrees) within which a planet is considered combust.
 * Rahu and Ketu are never combust. Mercury has special rules.
 */
const COMBUSTION_ORBS: Record<string, number> = {
  Moon: 12,
  Mars: 17,
  Mercury: 14,   // Mercury is combust within 14° but NOT if within 2° (special strength)
  Venus: 10,
  Jupiter: 11,
  Saturn: 15,
};

/**
 * Check if a planet is combust based on Sun-planet distance.
 * Returns { isCombust, distance, severelyCombust }
 */
export function checkCombustion(
  planetLongitude: number,
  sunLongitude: number,
  planetName: string,
): { isCombust: boolean; distance: number; severelyCombust: boolean } {
  if (planetName === 'Sun' || planetName === 'Rahu' || planetName === 'Ketu') {
    return { isCombust: false, distance: 180, severelyCombust: false };
  }

  const orb = COMBUSTION_ORBS[planetName] ?? 15;
  let diff = Math.abs(planetLongitude - sunLongitude);
  if (diff > 180) diff = 360 - diff;

  const isCombust = diff <= orb;
  const severelyCombust = diff <= orb / 2;

  return { isCombust, distance: parseFloat(diff.toFixed(2)), severelyCombust };
}

/**
 * Mercury special rule: within 2° of Sun = not combust but gains strength (Cazimi-like).
 */
function mercuryCombustionSpecial(planetLon: number, sunLon: number): { isCombust: boolean; isCazimi: boolean } {
  let diff = Math.abs(planetLon - sunLon);
  if (diff > 180) diff = 360 - diff;
  if (diff <= 2) return { isCombust: false, isCazimi: true };
  if (diff <= 14) return { isCombust: true, isCazimi: false };
  return { isCombust: false, isCazimi: false };
}

// ─── Directional Strength (Digbala) — simplified ────────────────────────────

/**
 * Each planet has a direction (house) where it gains maximum strength.
 * Digbala is maximum at the peak house and decreases proportionally.
 *
 *  - Sun, Mars: 10th house (South / zenith)
 *  - Moon, Venus: 4th house (North / nadir)
 *  - Mercury, Jupiter: 1st house (East / ascendant)
 *  - Saturn: 7th house (West / descendant)
 */
const DIGBALA_PEAK: Record<string, number> = {
  Sun: 10, Moon: 4, Mars: 10, Mercury: 1,
  Jupiter: 1, Venus: 4, Saturn: 7,
  Rahu: 7, Ketu: 1,
};

export function computeDigbala(planetName: string, house: number): number {
  const peak = DIGBALA_PEAK[planetName] ?? 1;
  // Distance from peak house (0 = at peak, 6 = opposite)
  const dist = Math.min(
    Math.abs(house - peak),
    12 - Math.abs(house - peak),
  );
  // Score: 10 at peak, 0 at opposite (6 houses away)
  return Math.round(10 * (1 - dist / 6));
}

// ─── Retrogression Strength ─────────────────────────────────────────────────

/**
 * Retrograde planets gain chesta bala (motional strength).
 * In Vedic astrology, retrograde benefic planets give enhanced results,
 * while retrograde malefics can give intensified (sometimes negative) results.
 */
export function computeRetrogradeScore(planetName: string, isRetrograde: boolean, dignity: Dignity): number {
  if (!isRetrograde) return 5; // Neutral baseline

  const benefics = new Set(['Jupiter', 'Venus', 'Mercury', 'Moon']);
  const isBenefic = benefics.has(planetName);

  if (isBenefic) {
    // Retrograde benefics: stronger if well-placed
    if (dignity === 'Exalted' || dignity === 'Own Sign' || dignity === 'Moolatrikona') return 9;
    if (dignity === 'Debilitated') return 6; // Still some strength from retrogression
    return 7;
  }

  // Retrograde malefics: intensified
  if (dignity === 'Exalted' || dignity === 'Own Sign') return 8; // Very strong malefic
  if (dignity === 'Debilitated') return 4; // Weakened malefic retrograde
  return 6;
}

// ─── Dignity Score ──────────────────────────────────────────────────────────

export function dignityToScore(dignity: Dignity): number {
  switch (dignity) {
    case 'Exalted': return 10;
    case 'Moolatrikona': return 9;
    case 'Own Sign': return 8;
    case 'Neutral': return 5;
    case 'Debilitated': return 2;
    default: return 5;
  }
}

// ─── Composite Strength ────────────────────────────────────────────────────

function computeComposite(dignity: number, combustion: number, retro: number, digbala: number): number {
  // Weighted: dignity 40%, combustion 25%, digbala 20%, retrograde 15%
  return Math.round(dignity * 4 + combustion * 2.5 + digbala * 2 + retro * 1.5);
}

// ─── Public API ─────────────────────────────────────────────────────────────

const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'saturn', 'rahu', 'ketu'] as const;
const PLANET_LABELS: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
  venus: 'Venus', jupiter: 'Jupiter', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu',
};

export function computeAllPlanetStrengths(chart: BirthChartData): PlanetStrength[] {
  const lagna = chart.ascendant.sign;
  const strengths: PlanetStrength[] = [];

  for (const key of PLANET_KEYS) {
    const data = chart[key] as PlanetPosition & { isRetrograde?: boolean };
    const planetName = PLANET_LABELS[key];
    const house = houseDistance(lagna, data.sign);
    const dignity = getDignity(planetName, data.sign);
    const isRetrograde = !!data.isRetrograde;

    // Combustion
    let isCombust = false;
    let combustionScore = 10;
    let combNote = '';

    if (planetName === 'Mercury') {
      const mercComb = mercuryCombustionSpecial(data.longitude, chart.sun.longitude);
      isCombust = mercComb.isCombust;
      if (mercComb.isCazimi) {
        combustionScore = 10; // Cazimi = heart of Sun, special strength
        combNote = 'Cazimi (in heart of Sun)';
      } else if (mercComb.isCombust) {
        combustionScore = 3;
        combNote = 'Combust';
      } else {
        combustionScore = 10;
      }
    } else if (planetName !== 'Sun' && planetName !== 'Rahu' && planetName !== 'Ketu') {
      const comb = checkCombustion(data.longitude, chart.sun.longitude, planetName);
      isCombust = comb.isCombust;
      if (comb.severelyCombust) {
        combustionScore = 2;
        combNote = 'Severely combust';
      } else if (comb.isCombust) {
        combustionScore = 5;
        combNote = 'Combust';
      } else {
        combustionScore = 10;
      }
    }

    // Digbala
    const digbala = computeDigbala(planetName, house);

    // Retrograde score
    const retro = computeRetrogradeScore(planetName, isRetrograde, dignity);

    // Dignity score
    const digScore = dignityToScore(dignity);

    // Composite
    const composite = computeComposite(digScore, combustionScore, retro, digbala);

    // Summary
    const parts: string[] = [];
    if (dignity !== 'Neutral') parts.push(dignity);
    if (isCombust) parts.push(combNote || 'Combust');
    if (isRetrograde) parts.push('Retrograde');
    if (digbala >= 8) parts.push('Strong digbala');
    const summary = parts.length > 0 ? parts.join(', ') : 'Average strength';

    strengths.push({
      planet: planetName,
      sign: data.sign,
      house,
      dignity,
      dignityScore: digScore,
      isCombust,
      combustionScore,
      isRetrograde,
      retrogradeScore: retro,
      digbalaScore: digbala,
      compositeScore: composite,
      summary,
    });
  }

  return strengths;
}

/**
 * Format planet strengths for prompt inclusion.
 */
export function formatPlanetStrengths(strengths: PlanetStrength[]): string {
  return `| Planet | Dignity | Combustion | Retro | Digbala | Strength |
|---|---|---|---|---|---|
${strengths.map((s) => `| ${s.planet} | ${s.dignity} | ${s.isCombust ? 'Yes' : 'No'} | ${s.isRetrograde ? 'Yes' : 'No'} | ${s.digbalaScore}/10 | ${s.compositeScore}/100 |`).join('\n')}`;
}
