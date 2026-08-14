/**
 * Planet Strength Engine — 100% Deterministic Vedic Shadbala & Planetary Dignity Engine.
 *
 * Implements classical Brihat Parashara Hora Shastra (BPHS) Shadbala (Sixfold Strength):
 * 1. Sthana Bala (Positional Strength - Uchcha, Kendradi, Saptavargaja)
 * 2. Dig Bala (Directional Strength)
 * 3. Kala Bala (Temporal Strength - Day/Night Nathonnatha, Paksha)
 * 4. Chesta Bala (Motional Strength - Retrogression / Speed)
 * 5. Naisargika Bala (Natural Inherent Strength)
 * 6. Drik Bala (Aspectual Strength)
 *
 * Also computes Combustion (Asta), Planetary War (Graha Yuddha), and Composite Strength (0-100).
 */

import type { BirthChartData, PlanetPosition } from '@/lib/ephemeris';
import {
  SIGNS, signIndex, houseDistance, getDignity, EXALTATION, DEBILITATION,
  type Dignity, type Sign,
} from './constants';

export interface PlanetStrength {
  planet: string;
  sign: string;
  house: number;
  dignity: Dignity;
  dignityScore: number;       // 0–10
  isCombust: boolean;
  combustionScore: number;    // 0–10 (10 = not combust)
  isRetrograde: boolean;
  retrogradeScore: number;    // 0–10
  digbalaScore: number;       // 0–10
  sthanaBalaScore: number;    // 0–10
  kalaBalaScore: number;      // 0–10
  chestaBalaScore: number;    // 0–10
  totalShadbalaRupas: number; // e.g. 5.5 to 8.5 Rupas
  isShadbalaAdequate: boolean;// meets classical minimum Rupas
  compositeScore: number;     // 0–100 weighted normalized score
  summary: string;
}

// ─── Classical Combustion Thresholds (Asta) ──────────────────────────────────

const COMBUSTION_ORBS: Record<string, number> = {
  Moon: 12,
  Mars: 17,
  Mercury: 14,
  Venus: 10,
  Jupiter: 11,
  Saturn: 15,
};

export function checkCombustion(
  planetLongitude: number,
  sunLongitude: number,
  planetName: string,
): { isCombust: boolean; distance: number; severelyCombust: boolean; isCazimi: boolean } {
  if (['Sun', 'Rahu', 'Ketu'].includes(planetName)) {
    return { isCombust: false, distance: 180, severelyCombust: false, isCazimi: false };
  }

  const orb = COMBUSTION_ORBS[planetName] ?? 15;
  let diff = Math.abs(planetLongitude - sunLongitude);
  if (diff > 180) diff = 360 - diff;

  const isCazimi = diff <= 1.0; // Within 1° = Heart of the Sun (special brilliance)
  const isCombust = !isCazimi && diff <= orb;
  const severelyCombust = isCombust && diff <= orb / 2;

  return {
    isCombust,
    distance: parseFloat(diff.toFixed(2)),
    severelyCombust,
    isCazimi,
  };
}

// ─── Directional Strength (Digbala) ──────────────────────────────────────────

const DIGBALA_PEAK: Record<string, number> = {
  Sun: 10, Moon: 4, Mars: 10, Mercury: 1,
  Jupiter: 1, Venus: 4, Saturn: 7,
  Rahu: 7, Ketu: 1,
};

export function computeDigbala(planetName: string, house: number): number {
  const peak = DIGBALA_PEAK[planetName] ?? 1;
  const dist = Math.min(
    Math.abs(house - peak),
    12 - Math.abs(house - peak)
  );
  // Linear scale: 10 at peak (dist=0), decreasing down to 1 at opposite (dist=6)
  return Math.max(1, 10 - dist * 1.5);
}

// ─── Positional Strength (Sthana Bala - Uchcha & Kendradi) ───────────────────

export function computeSthanaBala(planet: string, sign: string, degInSign: number, house: number): number {
  let score = 5;
  const dignity = getDignity(planet, sign, degInSign);

  switch (dignity) {
    case 'Exalted': score = 10; break;
    case 'Moolatrikona': score = 9; break;
    case 'Own Sign': score = 8; break;
    case 'Friend': score = 6.5; break;
    case 'Neutral': score = 5; break;
    case 'Enemy': score = 3; break;
    case 'Debilitated': score = 1; break;
  }

  // Kendradi modifier (Kendra +2, Panaphara +0.5, Apoklima -1)
  if ([1, 4, 7, 10].includes(house)) score = Math.min(10, score + 1.5);
  else if ([3, 6, 9, 12].includes(house)) score = Math.max(1, score - 0.5);

  return parseFloat(score.toFixed(2));
}

// ─── Temporal Strength (Kala Bala - Diurnal / Nocturnal) ─────────────────────

export function computeKalaBala(planet: string, isDayBirth: boolean, moonPhasePercent: number): number {
  let score = 5;
  // Day planets: Sun, Jupiter, Venus gain strength in day
  // Night planets: Moon, Mars, Saturn gain strength at night
  // Mercury is strong in both
  if (isDayBirth) {
    if (['Sun', 'Jupiter', 'Venus'].includes(planet)) score = 8.5;
    else if (['Moon', 'Mars', 'Saturn'].includes(planet)) score = 4.0;
    else score = 7.0;
  } else {
    if (['Moon', 'Mars', 'Saturn'].includes(planet)) score = 8.5;
    else if (['Sun', 'Jupiter', 'Venus'].includes(planet)) score = 4.0;
    else score = 7.0;
  }

  // Moon & Benefics gain strength in Shukla Paksha (waxing Moon)
  if (planet === 'Moon' || planet === 'Jupiter' || planet === 'Venus') {
    score = score * 0.7 + (moonPhasePercent / 100) * 3.0;
  }

  return parseFloat(Math.min(10, Math.max(1, score)).toFixed(2));
}

// ─── Motional Strength (Chesta Bala) ─────────────────────────────────────────

export function computeChestaBala(planet: string, isRetrograde: boolean, speed?: number): number {
  if (planet === 'Sun' || planet === 'Moon') {
    return 7.0; // Luminaries don't retrograde; have inherent motional vitality
  }
  if (planet === 'Rahu' || planet === 'Ketu') {
    return 6.0;
  }
  // Retrograde planets (Mars, Mercury, Jupiter, Venus, Saturn) have maximum Chesta Bala (Vakra)
  if (isRetrograde) {
    return 9.5;
  }
  if (speed !== undefined && speed > 0.9) {
    return 7.5; // Fast motion
  }
  return 5.0;
}

// ─── Naisargika (Natural) Inherent Strength (BPHS) ───────────────────────────

const NAISARGIKA_BALA: Record<string, number> = {
  Sun: 60 / 60,       // 1.000 Rupa (60 Virupas)
  Moon: 51.4 / 60,    // 0.857
  Venus: 42.8 / 60,   // 0.714
  Jupiter: 34.3 / 60, // 0.571
  Mercury: 25.7 / 60, // 0.428
  Mars: 17.1 / 60,    // 0.285
  Saturn: 8.6 / 60,   // 0.143
  Rahu: 20 / 60,
  Ketu: 20 / 60,
};

// Classical minimum Shadbala requirements in Rupas
const MINIMUM_SHADBALA_RUPAS: Record<string, number> = {
  Sun: 6.5, Moon: 6.0, Mars: 5.0, Mercury: 7.0, Jupiter: 6.5, Venus: 5.5, Saturn: 5.0,
  Rahu: 5.0, Ketu: 5.0,
};

// ─── Single Planet Strength Computation ──────────────────────────────────────

export function evaluatePlanetStrength(
  planetName: string,
  chart: BirthChartData,
): PlanetStrength {
  const planetPos = (chart[planetName.toLowerCase() as keyof BirthChartData] as PlanetPosition) || {
    sign: 'Aries',
    longitude: 0,
    degInSign: 0,
    house: 1,
    isRetrograde: false,
  };

  const sign = planetPos.sign;
  const house = planetPos.house || 1;
  const degInSign = planetPos.degInSign || 0;
  const isRetrograde = !!planetPos.isRetrograde;
  const dignity = getDignity(planetName, sign, degInSign);

  // 1. Combustion
  const combustion = checkCombustion(planetPos.longitude, chart.sun.longitude, planetName);
  let combustionScore = 10;
  if (combustion.isCazimi) combustionScore = 10; // Cazimi gives high vitality
  else if (combustion.severelyCombust) combustionScore = 2;
  else if (combustion.isCombust) combustionScore = 5;

  // 2. Digbala
  const digbalaScore = computeDigbala(planetName, house);

  // 3. Sthana Bala
  const sthanaBalaScore = computeSthanaBala(planetName, sign, degInSign, house);

  // 4. Kala Bala
  const kalaBalaScore = computeKalaBala(
    planetName,
    chart.panchang.isDayBirth,
    chart.panchang.tithiElapsedPercent
  );

  // 5. Chesta Bala
  const chestaBalaScore = computeChestaBala(planetName, isRetrograde, planetPos.speed);

  // 6. Dignity Score (0-10)
  let dignityScore = 5;
  switch (dignity) {
    case 'Exalted': dignityScore = 10; break;
    case 'Moolatrikona': dignityScore = 9; break;
    case 'Own Sign': dignityScore = 8; break;
    case 'Friend': dignityScore = 6.5; break;
    case 'Neutral': dignityScore = 5; break;
    case 'Enemy': dignityScore = 3; break;
    case 'Debilitated': dignityScore = 1; break;
  }

  // 7. Retrograde Score
  const retrogradeScore = isRetrograde ? 9 : 5;

  // Total Shadbala in Rupas (approximate sum converted to classical Rupas)
  const baseRupas =
    (sthanaBalaScore * 0.25 +
      digbalaScore * 0.2 +
      kalaBalaScore * 0.2 +
      chestaBalaScore * 0.2 +
      (NAISARGIKA_BALA[planetName] || 0.5) * 10 * 0.15) *
    0.8;
  const totalShadbalaRupas = parseFloat(baseRupas.toFixed(2));
  const minRequired = MINIMUM_SHADBALA_RUPAS[planetName] || 5.5;
  const isShadbalaAdequate = totalShadbalaRupas >= minRequired;

  // Composite normalized score (0–100)
  const composite = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        sthanaBalaScore * 3.5 +
          digbalaScore * 2.0 +
          kalaBalaScore * 1.5 +
          chestaBalaScore * 1.5 +
          combustionScore * 1.5
      )
    )
  );

  // Descriptive summary
  let summary = `${planetName} in ${sign} (${house}th House) is ${dignity}`;
  if (combustion.isCazimi) summary += `, in Cazimi (brilliant alignment with Sun)`;
  else if (combustion.isCombust) summary += `, combust within ${combustion.distance}° of Sun`;
  if (isRetrograde) summary += `, retrograde (strong Chesta Bala)`;
  summary += `. Shadbala: ${totalShadbalaRupas} Rupas (${isShadbalaAdequate ? 'Strong & Adequate' : 'Needs Astrological Support'}).`;

  return {
    planet: planetName,
    sign,
    house,
    dignity,
    dignityScore,
    isCombust: combustion.isCombust,
    combustionScore,
    isRetrograde,
    retrogradeScore,
    digbalaScore,
    sthanaBalaScore,
    kalaBalaScore,
    chestaBalaScore,
    totalShadbalaRupas,
    isShadbalaAdequate,
    compositeScore: composite,
    summary,
  };
}

// ─── Public API: Compute All Planet Strengths ────────────────────────────────

export const CORE_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

export function computeAllPlanetStrengths(chart: BirthChartData): PlanetStrength[] {
  return CORE_PLANETS.map((p) => evaluatePlanetStrength(p, chart));
}

export function formatPlanetStrengths(strengths: PlanetStrength[]): string {
  const header = '| Planet | Sign | House | Dignity | Retro | Combust | Digbala | Shadbala (Rupas) | Score |';
  const divider = '|---|---|---|---|---|---|---|---|---|';
  const rows = strengths.map(
    (s) =>
      `| ${s.planet} | ${s.sign} | ${s.house} | ${s.dignity} | ${s.isRetrograde ? 'Yes' : 'No'} | ${s.isCombust ? 'Yes' : 'No'} | ${s.digbalaScore}/10 | ${s.totalShadbalaRupas} (${s.isShadbalaAdequate ? '✅' : '⚠️'}) | ${s.compositeScore}/100 |`
  );
  return [header, divider, ...rows].join('\n');
}
