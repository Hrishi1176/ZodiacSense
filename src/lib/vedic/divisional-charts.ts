/**
 * Divisional Charts (Varga) — deterministic computation from planetary longitudes.
 *
 * Each varga divides the 30° sign into N equal parts and maps the planet
 * to a new sign based on its position within that division.
 */

import type { BirthChartData, PlanetPosition } from '@/lib/ephemeris';
import { SIGNS, SIGN_LORDS, signIndex, houseDistance, getDignity, type Dignity } from './constants';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DivisionalPlanet {
  planet: string;
  sign: string;
  house: number;
  dignity: Dignity;
  isRetrograde: boolean;
}

export interface DivisionalChart {
  name: string;
  division: number;
  ascendant: string;
  planets: DivisionalPlanet[];
  houses: string[];
}

const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'saturn', 'rahu', 'ketu'] as const;
const PLANET_LABELS: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
  venus: 'Venus', jupiter: 'Jupiter', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu',
};

// ─── Core Division Calculation ──────────────────────────────────────────────

/**
 * Compute the sign a planet occupies in a given divisional chart (varga).
 * @param longitude Planet's sidereal longitude (0–360)
 * @param division  The varga number (e.g. 9 for Navamsa)
 */
function divisionalSign(longitude: number, division: number): string {
  // Each division within a sign spans 30/N degrees
  const signIdx = Math.floor(longitude / 30);
  const posInSign = longitude - signIdx * 30;
  const divSpan = 30 / division;
  const divIdx = Math.floor(posInSign / divSpan);

  // For Parashari varga, the mapping follows specific rules.
  // The general "Kalpanik" method: sign = (signIdx * division + divIdx) % 12
  const newSignIdx = (signIdx * division + divIdx) % 12;
  return SIGNS[newSignIdx];
}

/**
 * Compute divisional ascendant sign.
 */
function divisionalAscendant(ascLongitude: number, division: number): string {
  return divisionalSign(ascLongitude, division);
}

// ─── Build a Divisional Chart ───────────────────────────────────────────────

function buildDivisionalChart(
  chart: BirthChartData,
  name: string,
  division: number,
): DivisionalChart {
  const ascSign = divisionalAscendant(chart.ascendant.longitude, division);
  const ascIdx = signIndex(ascSign);
  const houses = SIGNS.map((_, i) => SIGNS[(ascIdx + i) % 12]);

  const planets: DivisionalPlanet[] = PLANET_KEYS.map((key) => {
    const data = chart[key] as PlanetPosition & { isRetrograde?: boolean };
    const sign = divisionalSign(data.longitude, division);
    const house = houseDistance(ascSign, sign);
    return {
      planet: PLANET_LABELS[key],
      sign,
      house,
      dignity: getDignity(PLANET_LABELS[key], sign),
      isRetrograde: !!data.isRetrograde,
    };
  });

  return { name, division, ascendant: ascSign, planets, houses };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function computeNavamsa(chart: BirthChartData): DivisionalChart {
  return buildDivisionalChart(chart, 'D9 (Navamsa)', 9);
}

export function computeDashamsa(chart: BirthChartData): DivisionalChart {
  return buildDivisionalChart(chart, 'D10 (Dashamsa)', 10);
}

export function computeSaptamsa(chart: BirthChartData): DivisionalChart {
  return buildDivisionalChart(chart, 'D7 (Saptamsa)', 7);
}

export function computeDwadashamsa(chart: BirthChartData): DivisionalChart {
  return buildDivisionalChart(chart, 'D12 (Dwadashamsa)', 12);
}

export function computeAllDivisionalCharts(chart: BirthChartData) {
  return {
    d9: computeNavamsa(chart),
    d10: computeDashamsa(chart),
    d7: computeSaptamsa(chart),
    d12: computeDwadashamsa(chart),
  };
}

// ─── Analysis helpers for divisional charts ─────────────────────────────────

/**
 * Check if a planet is Vargottama (same sign in D1 and D9).
 */
export function isVargottama(chart: BirthChartData, d9: DivisionalChart, planetKey: string): boolean {
  const d1Sign = (chart[planetKey as keyof BirthChartData] as PlanetPosition)?.sign;
  const d9Planet = d9.planets.find((p) => p.planet === PLANET_LABELS[planetKey]);
  return d1Sign !== undefined && d9Planet !== undefined && d1Sign === d9Planet.sign;
}

/**
 * Get all vargottama planets.
 */
export function getVargottamaPlanets(chart: BirthChartData, d9: DivisionalChart): string[] {
  return PLANET_KEYS.filter((key) => isVargottama(chart, d9, key)).map((k) => PLANET_LABELS[k]);
}

/**
 * Navamsa-based marriage strength: Venus and 7th lord in D9.
 */
export function navamsaMarriageStrength(d9: DivisionalChart): { venusDignity: Dignity; seventhLordDignity: Dignity; score: number } {
  const venus = d9.planets.find((p) => p.planet === 'Venus');
  const seventhSign = d9.houses[6]; // 7th house sign
  const seventhLord = SIGN_LORDS[seventhSign as keyof typeof SIGN_LORDS];
  const seventhLordPlanet = d9.planets.find((p) => p.planet === seventhLord);

  const vDignity = venus?.dignity ?? 'Neutral';
  const sDignity = seventhLordPlanet?.dignity ?? 'Neutral';

  const dignityScore = (d: Dignity) => {
    if (d === 'Exalted' || d === 'Own Sign' || d === 'Moolatrikona') return 5;
    if (d === 'Debilitated') return 1;
    return 3;
  };

  return {
    venusDignity: vDignity,
    seventhLordDignity: sDignity,
    score: Math.round((dignityScore(vDignity) + dignityScore(sDignity)) / 2),
  };
}

/**
 * Dashamsa career strength: Sun, 10th lord, and Saturn in D10.
 */
export function dashamsaCareerStrength(d10: DivisionalChart): { sunDignity: Dignity; tenthLordDignity: Dignity; saturnDignity: Dignity; score: number } {
  const sun = d10.planets.find((p) => p.planet === 'Sun');
  const saturn = d10.planets.find((p) => p.planet === 'Saturn');
  const tenthSign = d10.houses[9]; // 10th house sign
  const tenthLord = SIGN_LORDS[tenthSign as keyof typeof SIGN_LORDS];
  const tenthLordPlanet = d10.planets.find((p) => p.planet === tenthLord);

  const dignityScore = (d: Dignity) => {
    if (d === 'Exalted' || d === 'Own Sign' || d === 'Moolatrikona') return 5;
    if (d === 'Debilitated') return 1;
    return 3;
  };

  const sD = sun?.dignity ?? 'Neutral';
  const tD = tenthLordPlanet?.dignity ?? 'Neutral';
  const satD = saturn?.dignity ?? 'Neutral';

  return {
    sunDignity: sD,
    tenthLordDignity: tD,
    saturnDignity: satD,
    score: Math.round((dignityScore(sD) + dignityScore(tD) + dignityScore(satD)) / 3),
  };
}

/**
 * Format a divisional chart for prompt inclusion.
 */
export function formatDivisionalChart(dChart: DivisionalChart): string {
  const planetRows = dChart.planets
    .map((p) => `| ${p.planet} | ${p.sign} | ${p.house} | ${p.dignity}${p.isRetrograde ? ' (R)' : ''} |`)
    .join('\n');

  return `### ${dChart.name}
Ascendant: ${dChart.ascendant}
| Planet | Sign | House | Dignity |
|---|---|---|---|
${planetRows}`;
}
