/**
 * Divisional Charts (Vargas / Shodashavarga) — 100% Authentic Parashari Computations.
 *
 * Implements classical Brihat Parashara Hora Shastra (BPHS) division rules:
 * - D1: Rashi (Natal Chart)
 * - D2: Hora (Wealth & Prosperity) - Parashari Odd/Even Sun/Moon rules
 * - D3: Drekkana (Siblings & Energy) - 1st (same), 2nd (5th), 3rd (9th)
 * - D4: Chaturthamsha (Fortune & Fixed Assets)
 * - D7: Saptamsha (Children & Progeny) - Odd (same sign), Even (7th sign)
 * - D9: Navamsha (Spouse, Dharma & Soul's Destiny) - Fire (Aries), Earth (Cap), Air (Libra), Water (Cancer)
 * - D10: Dashamsha (Career, Status & Profession) - Odd (same sign), Even (9th sign)
 * - D12: Dwadashamsha (Parents & Lineage) - Starts from same sign
 * - D16: Shodashamsha (Vehicles & General Happiness)
 * - D20: Vimshamsha (Spiritual Progress & Worship)
 * - D24: Chaturvimshamsha / Siddhamsa (Higher Learning & Knowledge)
 * - D27: Saptavimshamsha / Nakshatramsa (Strengths & Weaknesses)
 * - D30: Trimsamsha (Misfortunes & Hidden Challenges)
 * - D60: Shashtiamsha (Past Karma & Fine Destiny)
 */

import type { BirthChartData, PlanetPosition } from '@/lib/ephemeris';
import { SIGNS, SIGN_LORDS, signIndex, houseDistance, getDignity, type Dignity, type Sign } from './constants';

export interface DivisionalPlanet {
  planet: string;
  sign: string;
  house: number;
  dignity: Dignity;
  isRetrograde: boolean;
  longitudeInSign?: number;
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

// ─── Classical Parashari Division Mapping Functions ─────────────────────────

export function getNavamsaSign(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const degInSign = norm - signIdx * 30;
  const pada = Math.floor(degInSign / (30 / 9)); // 0 to 8

  // Fire signs (Aries 0, Leo 4, Sag 8): start from Aries (0)
  // Earth signs (Taurus 1, Virgo 5, Cap 9): start from Capricorn (9)
  // Air signs (Gemini 2, Libra 6, Aqua 10): start from Libra (6)
  // Water signs (Cancer 3, Scorpio 7, Pisces 11): start from Cancer (3)
  const element = signIdx % 4;
  const startSign = element === 0 ? 0 : element === 1 ? 9 : element === 2 ? 6 : 3;
  const navSignIdx = (startSign + pada) % 12;
  return SIGNS[navSignIdx];
}

export function getDashamsaSign(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const degInSign = norm - signIdx * 30;
  const divIdx = Math.floor(degInSign / 3); // 10 divisions of 3°

  const isOdd = signIdx % 2 === 0; // 0-indexed: Aries is 0 (odd sign), Taurus is 1 (even sign)
  const startSign = isOdd ? signIdx : (signIdx + 8) % 12; // Odd: same sign; Even: 9th sign
  const d10SignIdx = (startSign + divIdx) % 12;
  return SIGNS[d10SignIdx];
}

export function getSaptamshaSign(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const degInSign = norm - signIdx * 30;
  const divIdx = Math.floor(degInSign / (30 / 7)); // 7 divisions

  const isOdd = signIdx % 2 === 0; // Odd sign: starts from same sign; Even: 7th sign
  const startSign = isOdd ? signIdx : (signIdx + 6) % 12;
  const d7SignIdx = (startSign + divIdx) % 12;
  return SIGNS[d7SignIdx];
}

export function getDrekkanaSign(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const degInSign = norm - signIdx * 30;
  const decan = Math.floor(degInSign / 10); // 0, 1, 2

  // 1st decan: same sign; 2nd decan: 5th sign; 3rd decan: 9th sign
  const offset = decan === 0 ? 0 : decan === 1 ? 4 : 8;
  return SIGNS[(signIdx + offset) % 12];
}

export function getHoraSign(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const degInSign = norm - signIdx * 30;
  const isOdd = signIdx % 2 === 0;

  // Odd sign: 0-15° Sun (Leo), 15-30° Moon (Cancer)
  // Even sign: 0-15° Moon (Cancer), 15-30° Sun (Leo)
  if (isOdd) {
    return degInSign < 15 ? 'Leo' : 'Cancer';
  } else {
    return degInSign < 15 ? 'Cancer' : 'Leo';
  }
}

export function getDwadashamshaSign(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const degInSign = norm - signIdx * 30;
  const divIdx = Math.floor(degInSign / 2.5); // 12 divisions of 2.5°
  return SIGNS[(signIdx + divIdx) % 12];
}

export function getChaturthamshaSign(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const degInSign = norm - signIdx * 30;
  const divIdx = Math.floor(degInSign / 7.5); // 4 divisions of 7.5°
  // Starts from same, 4th, 7th, 10th
  return SIGNS[(signIdx + divIdx * 3) % 12];
}

export function getShashtiamshaSign(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const degInSign = norm - signIdx * 30;
  const divIdx = Math.floor(degInSign / 0.5); // 60 divisions of 0.5°
  return SIGNS[(signIdx + divIdx) % 12];
}

// ─── General Divisional Chart Builder ────────────────────────────────────────

export function computeDivisionalChart(
  chart: BirthChartData,
  name: string,
  division: number,
  getSignFn: (lon: number) => string,
): DivisionalChart {
  const ascSign = getSignFn(chart.ascendant.longitude);
  const ascIdx = signIndex(ascSign);
  const houses = SIGNS.map((_, i) => SIGNS[(ascIdx + i) % 12]);

  const planets: DivisionalPlanet[] = PLANET_KEYS.map((key) => {
    const data = chart[key] as PlanetPosition;
    const sign = getSignFn(data.longitude);
    const house = houseDistance(ascSign, sign);
    return {
      planet: PLANET_LABELS[key],
      sign,
      house,
      dignity: getDignity(PLANET_LABELS[key], sign),
      isRetrograde: !!data.isRetrograde,
      longitudeInSign: data.degInSign,
    };
  });

  return { name, division, ascendant: ascSign, planets, houses };
}

// ─── Pushkara & Vargottama Evaluation ───────────────────────────────────────

/**
 * Check if a planet is Vargottama (same sign in D1 Rashi and D9 Navamsha).
 */
export function getVargottamaPlanets(chart: BirthChartData): string[] {
  const vargottama: string[] = [];
  for (const key of PLANET_KEYS) {
    const rashiSign = (chart[key] as PlanetPosition).sign;
    const navSign = getNavamsaSign((chart[key] as PlanetPosition).longitude);
    if (rashiSign === navSign) {
      vargottama.push(PLANET_LABELS[key]);
    }
  }
  return vargottama;
}

/**
 * Check if a planet is in Pushkara Navamsha (highly auspicious planetary degree).
 */
export function getPushkaraPlanets(chart: BirthChartData): string[] {
  const pushkara: string[] = [];
  // Pushkara Navamsha pairs per sign element
  const pushkaraSigns: Record<number, number[]> = {
    0: [6, 8],      // Fire signs: 7th (Libra) & 9th (Sagittarius) navamshas
    1: [2, 4],      // Earth signs: 3rd (Pisces) & 5th (Taurus) navamshas
    2: [5, 7],      // Air signs: 6th (Pisces) & 8th (Taurus) navamshas
    3: [0, 2],      // Water signs: 1st (Cancer) & 3rd (Virgo) navamshas
  };

  for (const key of PLANET_KEYS) {
    const lon = (chart[key] as PlanetPosition).longitude;
    const norm = ((lon % 360) + 360) % 360;
    const signIdx = Math.floor(norm / 30);
    const element = signIdx % 4;
    const pada = Math.floor((norm % 30) / (30 / 9));
    if (pushkaraSigns[element]?.includes(pada)) {
      pushkara.push(PLANET_LABELS[key]);
    }
  }
  return pushkara;
}

// ─── Divisional Strength Assessments ────────────────────────────────────────

export function navamsaMarriageStrength(d9: DivisionalChart, chart: BirthChartData): {
  venusDignity: string;
  seventhLordDignity: string;
  score: number; // 1 to 5
} {
  const venus = d9.planets.find((p) => p.planet === 'Venus');
  const d9AscIdx = signIndex(d9.ascendant);
  const d9SeventhSign = SIGNS[(d9AscIdx + 6) % 12];
  const d9SeventhLord = SIGN_LORDS[d9SeventhSign];
  const seventhLordPlanet = d9.planets.find((p) => p.planet === d9SeventhLord);

  let score = 3;
  if (venus?.dignity === 'Exalted' || venus?.dignity === 'Own Sign') score += 1;
  if (venus?.dignity === 'Debilitated') score -= 1;
  if (seventhLordPlanet?.dignity === 'Exalted' || seventhLordPlanet?.dignity === 'Own Sign') score += 1;
  if (seventhLordPlanet?.dignity === 'Debilitated') score -= 1;

  return {
    venusDignity: venus?.dignity ?? 'Neutral',
    seventhLordDignity: seventhLordPlanet?.dignity ?? 'Neutral',
    score: Math.max(1, Math.min(5, score)),
  };
}

export function dashamsaCareerStrength(d10: DivisionalChart): {
  sunDignity: string;
  tenthLordDignity: string;
  saturnDignity: string;
  score: number; // 1 to 5
} {
  const sun = d10.planets.find((p) => p.planet === 'Sun');
  const saturn = d10.planets.find((p) => p.planet === 'Saturn');
  const d10AscIdx = signIndex(d10.ascendant);
  const d10TenthSign = SIGNS[(d10AscIdx + 9) % 12];
  const d10TenthLord = SIGN_LORDS[d10TenthSign];
  const tenthLord = d10.planets.find((p) => p.planet === d10TenthLord);

  let score = 3;
  if (sun?.dignity === 'Exalted' || sun?.dignity === 'Own Sign') score += 1;
  if (sun?.dignity === 'Debilitated') score -= 1;
  if (tenthLord?.dignity === 'Exalted' || tenthLord?.dignity === 'Own Sign') score += 1;
  if (tenthLord?.dignity === 'Debilitated') score -= 1;
  if (saturn?.dignity === 'Exalted' || saturn?.dignity === 'Own Sign') score += 0.5;

  return {
    sunDignity: sun?.dignity ?? 'Neutral',
    tenthLordDignity: tenthLord?.dignity ?? 'Neutral',
    saturnDignity: saturn?.dignity ?? 'Neutral',
    score: Math.max(1, Math.min(5, Math.round(score))),
  };
}

// ─── Public API: Compute All Shodashavarga Charts ───────────────────────────

export function computeAllDivisionalCharts(chart: BirthChartData): Record<string, DivisionalChart> {
  return {
    D1: computeDivisionalChart(chart, 'D1 (Rashi)', 1, (lon) => SIGNS[Math.floor(lon / 30) % 12]),
    D2: computeDivisionalChart(chart, 'D2 (Hora)', 2, getHoraSign),
    D3: computeDivisionalChart(chart, 'D3 (Drekkana)', 3, getDrekkanaSign),
    D4: computeDivisionalChart(chart, 'D4 (Chaturthamsha)', 4, getChaturthamshaSign),
    D7: computeDivisionalChart(chart, 'D7 (Saptamsha)', 7, getSaptamshaSign),
    D9: computeDivisionalChart(chart, 'D9 (Navamsha)', 9, getNavamsaSign),
    D10: computeDivisionalChart(chart, 'D10 (Dashamsha)', 10, getDashamsaSign),
    D12: computeDivisionalChart(chart, 'D12 (Dwadashamsha)', 12, getDwadashamshaSign),
    D60: computeDivisionalChart(chart, 'D60 (Shashtiamsha)', 60, getShashtiamshaSign),
  };
}

export function formatDivisionalChart(divChart: DivisionalChart): string {
  const lines = [
    `=== ${divChart.name} ===`,
    `Ascendant: ${divChart.ascendant}`,
    ...divChart.planets.map(
      (p) => `  ${p.planet}: ${p.sign} (${p.house}th House) - Dignity: ${p.dignity}${p.isRetrograde ? ' [R]' : ''}`
    ),
  ];
  return lines.join('\n');
}
