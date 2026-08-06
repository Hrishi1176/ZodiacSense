/**
 * Dosha Engine — deterministic detection of classical Vedic doshas.
 *
 * Detects:
 * - Kaal Sarp Dosha (all planets between Rahu and Ketu)
 * - Pitra Dosha (Sun/Moon afflicted by Rahu/Ketu)
 * - Grahan Dosha (eclipse-forming Sun-Moon-Rahu/Ketu)
 * - Guru Chandal Dosha (Jupiter with Rahu or Ketu)
 * - Shrapit Dosha (Saturn + Rahu conjunction)
 * - Gandmool Dosha (Moon in specific nakshatras at junctions)
 * - Shakata Yoga (Jupiter 6/8/12 from Moon — technically a yoga, not dosha)
 * - Daridra Yoga (11th lord in 6/8/12)
 * - Manglik Dosha (already exists in chart-analysis, imported here for reference)
 */

import type { BirthChartData, PlanetPosition } from '@/lib/ephemeris';
import { signIndex, houseDistance, NAKSHATRA_NAMES, nakshatraIndex } from './constants';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DoshaResult {
  name: string;
  present: boolean;
  severity: 'None' | 'Mild' | 'Moderate' | 'Severe';
  description: string;
  cancellation: string[];
  remedy: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPlanetSign(chart: BirthChartData, key: string): string {
  return (chart[key as keyof BirthChartData] as PlanetPosition)?.sign ?? '';
}

function getPlanetLongitude(chart: BirthChartData, key: string): number {
  return (chart[key as keyof BirthChartData] as PlanetPosition)?.longitude ?? 0;
}

function areConjunct(sign1: string, sign2: string): boolean {
  return sign1 === sign2;
}

function signDistance12(fromSign: string, toSign: string): number {
  return ((signIndex(toSign) - signIndex(fromSign) + 12) % 12) + 1;
}

// ─── Kaal Sarp Dosha ───────────────────────────────────────────────────────

/**
 * Kaal Sarp: All 7 traditional planets (Sun–Saturn) are on one side
 * of the Rahu–Ketu axis. Checked by longitude.
 */
function detectKaalSarp(chart: BirthChartData): DoshaResult {
  const rahuLon = getPlanetLongitude(chart, 'rahu');
  const ketuLon = getPlanetLongitude(chart, 'ketu');

  const planetLons = ['sun', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'saturn']
    .map((k) => getPlanetLongitude(chart, k));

  // Normalize: check if all planets fall in the arc from Rahu → Ketu (one direction)
  const isBetween = (lon: number, start: number, end: number): boolean => {
    if (start < end) return lon > start && lon < end;
    // Arc crosses 0°
    return lon > start || lon < end;
  };

  // Check direction 1: Rahu → Ketu
  const allInArc1 = planetLons.every((lon) => isBetween(lon, rahuLon, ketuLon));
  // Check direction 2: Ketu → Rahu
  const allInArc2 = planetLons.every((lon) => isBetween(lon, ketuLon, rahuLon));

  const present = allInArc1 || allInArc2;

  // Partial cancellation: if any planet is conjunct Rahu or Ketu
  const cancellations: string[] = [];
  if (present) {
    for (const key of ['sun', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'saturn']) {
      const sign = getPlanetSign(chart, key);
      if (sign === chart.rahu.sign || sign === chart.ketu.sign) {
        cancellations.push(`${key.charAt(0).toUpperCase() + key.slice(1)} conjunct Rahu/Ketu (partial cancellation)`);
      }
    }
    // Jupiter aspect on Rahu or Ketu
    const jupSign = chart.jupiter.sign;
    const jupHouseToRahu = signDistance12(jupSign, chart.rahu.sign);
    if ([5, 7, 9].includes(jupHouseToRahu)) {
      cancellations.push('Jupiter aspects Rahu (partial cancellation)');
    }
  }

  return {
    name: 'Kaal Sarp Dosha',
    present,
    severity: present ? (cancellations.length > 0 ? 'Mild' : 'Moderate') : 'None',
    description: present
      ? 'All planets are positioned between Rahu and Ketu on one side of the nodal axis. This can create periodic upheavals and a sense of being trapped in karmic patterns.'
      : 'No Kaal Sarp configuration detected.',
    cancellation: cancellations,
    remedy: 'Perform Kaal Sarp Shanti puja. Worship Lord Shiva, especially on Nag Panchami. Donate on Saturdays.',
  };
}

// ─── Pitra Dosha ────────────────────────────────────────────────────────────

/**
 * Pitra Dosha: Sun or Moon is afflicted by Rahu/Ketu conjunction or aspect.
 */
function detectPitraDosha(chart: BirthChartData): DoshaResult {
  const lagna = chart.ascendant.sign;
  const cancellations: string[] = [];
  let afflicted: string[] = [];

  // Check Sun
  const sunSign = chart.sun.sign;
  if (areConjunct(sunSign, chart.rahu.sign) || areConjunct(sunSign, chart.ketu.sign)) {
    afflicted.push('Sun');
  }
  // Rahu/Ketu aspect on Sun (5th, 7th, 9th from Rahu)
  const rahuToSun = signDistance12(chart.rahu.sign, sunSign);
  if ([5, 7, 9].includes(rahuToSun)) afflicted.push('Sun (by Rahu aspect)');

  // Check Moon
  const moonSign = chart.moon.sign;
  if (areConjunct(moonSign, chart.rahu.sign) || areConjunct(moonSign, chart.ketu.sign)) {
    afflicted.push('Moon');
  }
  const rahuToMoon = signDistance12(chart.rahu.sign, moonSign);
  if ([5, 7, 9].includes(rahuToMoon)) afflicted.push('Moon (by Rahu aspect)');

  // Check if Sun or Moon are in dusthana houses (6, 8, 12)
  const sunHouse = signDistance12(lagna, sunSign);
  const moonHouse = signDistance12(lagna, moonSign);
  if ([6, 8, 12].includes(sunHouse)) afflicted.push('Sun in dusthana');
  if ([6, 8, 12].includes(moonHouse)) afflicted.push('Moon in dusthana');

  // Unique afflicted
  afflicted = [...new Set(afflicted)];

  // Cancellations
  const jupHouseToSun = signDistance12(chart.jupiter.sign, sunSign);
  if ([5, 7, 9].includes(jupHouseToSun)) cancellations.push('Jupiter aspects Sun');
  const jupHouseToMoon = signDistance12(chart.jupiter.sign, moonSign);
  if ([5, 7, 9].includes(jupHouseToMoon)) cancellations.push('Jupiter aspects Moon');

  const present = afflicted.length >= 2; // Need at least 2 affliction indicators

  return {
    name: 'Pitra Dosha',
    present,
    severity: present ? (afflicted.length >= 3 ? 'Severe' : 'Moderate') : 'None',
    description: present
      ? `Ancestral karma indicated through affliction of ${afflicted.join(', ')}. May cause obstacles in progeny, family harmony, or career stability.`
      : 'No Pitra Dosha detected.',
    cancellation: cancellations,
    remedy: 'Perform Pitra Tarpan and Shraddha rituals. Donate to Brahmins on Amavasya. Feed crows and dogs regularly.',
  };
}

// ─── Grahan Dosha (Eclipse) ─────────────────────────────────────────────────

/**
 * Grahan Dosha: Sun or Moon conjunct Rahu or Ketu (eclipse configuration).
 */
function detectGrahanDosha(chart: BirthChartData): DoshaResult {
  const sunSign = chart.sun.sign;
  const moonSign = chart.moon.sign;
  const rahuSign = chart.rahu.sign;
  const ketuSign = chart.ketu.sign;

  const sunRahu = areConjunct(sunSign, rahuSign);
  const sunKetu = areConjunct(sunSign, ketuSign);
  const moonRahu = areConjunct(moonSign, rahuSign);
  const moonKetu = areConjunct(moonSign, ketuSign);

  const present = sunRahu || sunKetu || moonRahu || moonKetu;

  const cancellations: string[] = [];
  if (present) {
    const jupSign = chart.jupiter.sign;
    const jupToSun = signDistance12(jupSign, sunSign);
    const jupToMoon = signDistance12(jupSign, moonSign);
    if ([5, 7, 9].includes(jupToSun)) cancellations.push('Jupiter aspects Sun');
    if ([5, 7, 9].includes(jupToMoon)) cancellations.push('Jupiter aspects Moon');
    if (areConjunct(jupSign, sunSign) || areConjunct(jupSign, moonSign)) {
      cancellations.push('Jupiter conjunct luminary');
    }
  }

  // Severity: Sun eclipse (solar) is stronger than lunar
  const severity = present
    ? ((sunRahu || sunKetu) && (moonRahu || moonKetu) ? 'Severe' : (sunRahu || sunKetu) ? 'Moderate' : 'Mild')
    : 'None';

  let desc = 'No Grahan (eclipse) configuration detected.';
  if (present) {
    const parts: string[] = [];
    if (sunRahu) parts.push('Sun conjunct Rahu (Solar eclipse)');
    if (sunKetu) parts.push('Sun conjunct Ketu (partial Solar eclipse)');
    if (moonRahu) parts.push('Moon conjunct Rahu (Lunar eclipse)');
    if (moonKetu) parts.push('Moon conjunct Ketu (partial Lunar eclipse)');
    desc = `${parts.join('; ')}. This eclipse formation can create confusion, identity challenges, and karmic lessons related to the afflicted luminary.`;
  }

  return {
    name: 'Grahan Dosha',
    present,
    severity,
    description: desc,
    cancellation: cancellations,
    remedy: 'Chant Surya/Chandra mantra during eclipses. Donate on eclipse days. Perform Surya/Chandra Shanti puja.',
  };
}

// ─── Guru Chandal Dosha ────────────────────────────────────────────────────

/**
 * Guru Chandal: Jupiter conjunct Rahu or Ketu.
 */
function detectGuruChandal(chart: BirthChartData): DoshaResult {
  const jupSign = chart.jupiter.sign;
  const rahuSign = chart.rahu.sign;
  const ketuSign = chart.ketu.sign;

  const withRahu = areConjunct(jupSign, rahuSign);
  const withKetu = areConjunct(jupSign, ketuSign);
  const present = withRahu || withKetu;

  const cancellations: string[] = [];
  if (present) {
    const jupHouse = signDistance12(chart.ascendant.sign, jupSign);
    if ([1, 4, 7, 10].includes(jupHouse)) {
      cancellations.push('Jupiter in Kendra (partial strength offsets dosha)');
    }
    if (chart.jupiter.isRetrograde) {
      cancellations.push('Jupiter retrograde (reduces malefic conjunction effect)');
    }
  }

  return {
    name: 'Guru Chandal Dosha',
    present,
    severity: present ? 'Moderate' : 'None',
    description: present
      ? `Jupiter is conjunct ${withRahu ? 'Rahu' : 'Ketu'}. This can distort wisdom, create unconventional beliefs, and lead to conflicts with teachers, elders, or spiritual guides. May also indicate unconventional spiritual path.`
      : 'No Guru Chandal configuration detected.',
    cancellation: cancellations,
    remedy: 'Chant Guru mantra (Om Gram Greem Groum Sah Gurave Namah). Respect teachers. Donate yellow items on Thursdays.',
  };
}

// ─── Shrapit Dosha ──────────────────────────────────────────────────────────

/**
 * Shrapit Dosha: Saturn conjunct Rahu in the same sign.
 */
function detectShrapitDosha(chart: BirthChartData): DoshaResult {
  const satSign = chart.saturn.sign;
  const rahuSign = chart.rahu.sign;
  const present = areConjunct(satSign, rahuSign);

  const cancellations: string[] = [];
  if (present) {
    const house = signDistance12(chart.ascendant.sign, satSign);
    if ([3, 6, 11].includes(house)) {
      cancellations.push(`Saturn-Rahu in upachaya house (${house}th) — malefic energy channeled productively`);
    }
    const jupToSat = signDistance12(chart.jupiter.sign, satSign);
    if ([5, 7, 9].includes(jupToSat)) {
      cancellations.push('Jupiter aspects Saturn-Rahu conjunction');
    }
  }

  return {
    name: 'Shrapit Dosha',
    present,
    severity: present ? 'Moderate' : 'None',
    description: present
      ? `Saturn and Rahu are conjunct in ${satSign}. This "cursed combination" can create chronic obstacles, delays, and persistent challenges requiring karmic resolution.`
      : 'No Shrapit Dosha detected.',
    cancellation: cancellations,
    remedy: 'Chant Shani and Rahu mantras. Serve the elderly and underprivileged. Avoid shortcuts and maintain ethical conduct.',
  };
}

// ─── Gandmool Dosha ─────────────────────────────────────────────────────────

/**
 * Gandmool Dosha: Moon in nakshatras at Rashi/Nakshatra junctions.
 * Affected nakshatras: Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati.
 */
const GANDMOOL_NAKSHATRAS = new Set(['Ashwini', 'Ashlesha', 'Magha', 'Jyeshtha', 'Mula', 'Revati']);

function detectGandmoolDosha(chart: BirthChartData): DoshaResult {
  const moonNak = chart.nakshatra.name;
  const present = GANDMOOL_NAKSHATRAS.has(moonNak);

  const cancellations: string[] = [];
  if (present) {
    // Check if Moon is strong (exalted, own sign, or with benefic)
    const moonDignity = getMoonDignitySimple(chart.moon.sign);
    if (moonDignity === 'Exalted' || moonDignity === 'Own Sign') {
      cancellations.push(`Moon is ${moonDignity.toLowerCase()} — dosha significantly weakened`);
    }
    // Jupiter aspect on Moon
    const jupToMoon = signDistance12(chart.jupiter.sign, chart.moon.sign);
    if ([5, 7, 9].includes(jupToMoon)) {
      cancellations.push('Jupiter aspects Moon');
    }
  }

  return {
    name: 'Gandmool Dosha',
    present,
    severity: present ? 'Mild' : 'None',
    description: present
      ? `Moon in ${moonNak} nakshatra at a junction point. Traditionally associated with health challenges in childhood and periodic disruptions. Usually self-corrects with age.`
      : 'No Gandmool Dosha detected.',
    cancellation: cancellations,
    remedy: 'Perform Gandmool Shanti puja. Chant Moon mantra. Donate white items on Mondays.',
  };
}

function getMoonDignitySimple(sign: string): string {
  if (sign === 'Taurus') return 'Exalted';
  if (sign === 'Scorpio') return 'Debilitated';
  if (sign === 'Cancer') return 'Own Sign';
  return 'Neutral';
}

// ─── Shakata Yoga ───────────────────────────────────────────────────────────

/**
 * Shakata Yoga: Jupiter in 6th, 8th, or 12th from Moon.
 * Technically an unfavorable yoga, included here as a dosha-like indicator.
 */
function detectShakataYoga(chart: BirthChartData): DoshaResult {
  const moonSign = chart.moon.sign;
  const jupSign = chart.jupiter.sign;
  const dist = signDistance12(moonSign, jupSign);

  const present = [6, 8, 12].includes(dist);
  const cancellations: string[] = [];

  if (present) {
    // Cancellation: Jupiter in kendra from Lagna
    const jupFromLagna = signDistance12(chart.ascendant.sign, jupSign);
    if ([1, 4, 7, 10].includes(jupFromLagna)) {
      cancellations.push('Jupiter in Kendra from Lagna (partial cancellation)');
    }
    // Jupiter exalted or own sign
    const jupDignity = getJupiterDignitySimple(jupSign);
    if (jupDignity === 'Exalted' || jupDignity === 'Own Sign') {
      cancellations.push(`Jupiter is ${jupDignity.toLowerCase()} (strength offsets yoga)`);
    }
  }

  return {
    name: 'Shakata Yoga',
    present,
    severity: present ? 'Mild' : 'None',
    description: present
      ? `Jupiter is ${dist} houses from Moon. This "cart-wheel" yoga indicates ups and downs in fortune — gains followed by losses, requiring patience and discipline.`
      : 'No Shakata Yoga detected.',
    cancellation: cancellations,
    remedy: 'Chant Guru mantra. Maintain consistent spiritual practice. Avoid speculative investments during Jupiter transit challenges.',
  };
}

function getJupiterDignitySimple(sign: string): string {
  if (sign === 'Cancer') return 'Exalted';
  if (sign === 'Capricorn') return 'Debilitated';
  if (sign === 'Sagittarius' || sign === 'Pisces') return 'Own Sign';
  return 'Neutral';
}

// ─── Daridra Yoga ───────────────────────────────────────────────────────────

/**
 * Daridra Yoga: 11th lord in 6th, 8th, or 12th house.
 * Indicates potential financial challenges.
 */
function detectDaridraYoga(chart: BirthChartData): DoshaResult {
  const lagna = chart.ascendant.sign;
  const ascIdx = signIndex(lagna);
  const eleventhSign = chart.houses[10]; // 11th house (0-indexed)
  // Find the lord of the 11th house
  const SIGN_LORDS_MAP: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
  };
  const eleventhLord = SIGN_LORDS_MAP[eleventhSign] ?? 'Jupiter';

  // Find where the 11th lord is placed
  const PLANET_KEYS_MAP: Record<string, string> = {
    Sun: 'sun', Moon: 'moon', Mars: 'mars', Mercury: 'mercury',
    Jupiter: 'jupiter', Venus: 'venus', Saturn: 'saturn',
  };
  const lordKey = PLANET_KEYS_MAP[eleventhLord];
  if (!lordKey) {
    return {
      name: 'Daridra Yoga',
      present: false,
      severity: 'None',
      description: 'Unable to determine (Rahu/Ketu as 11th lord — check separately).',
      cancellation: [],
      remedy: '',
    };
  }

  const lordSign = getPlanetSign(chart, lordKey);
  const lordHouse = signDistance12(lagna, lordSign);
  const present = [6, 8, 12].includes(lordHouse);

  const cancellations: string[] = [];
  if (present) {
    // Check if 11th lord is strong (exalted or own sign)
    const dignity = getPlanetDignitySimple(eleventhLord, lordSign);
    if (dignity === 'Exalted' || dignity === 'Own Sign') {
      cancellations.push(`${eleventhLord} is ${dignity.toLowerCase()} in ${lordHouse}th house (strength mitigates yoga)`);
    }
    // Benefic aspect on 11th lord
    const jupToLord = signDistance12(chart.jupiter.sign, lordSign);
    if ([5, 7, 9].includes(jupToLord)) {
      cancellations.push('Jupiter aspects 11th lord');
    }
  }

  return {
    name: 'Daridra Yoga',
    present,
    severity: present ? 'Mild' : 'None',
    description: present
      ? `11th lord ${eleventhLord} is in the ${lordHouse}th house (${['', '', '', '', '', '', '6th (service)', '', '8th (obstacles)', '', '', '', '12th (losses)'][lordHouse]}). Gains may require extra effort and disciplined financial management.`
      : 'No Daridra Yoga detected.',
    cancellation: cancellations,
    remedy: 'Donate on Saturdays. Practice financial discipline. Worship Lakshmi on Fridays.',
  };
}

function getPlanetDignitySimple(planet: string, sign: string): string {
  const exalt: Record<string, string> = { Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn', Mercury: 'Virgo', Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra' };
  const own: Record<string, string[]> = { Sun: ['Leo'], Moon: ['Cancer'], Mars: ['Aries', 'Scorpio'], Mercury: ['Gemini', 'Virgo'], Jupiter: ['Sagittarius', 'Pisces'], Venus: ['Taurus', 'Libra'], Saturn: ['Capricorn', 'Aquarius'] };
  if (exalt[planet] === sign) return 'Exalted';
  if (own[planet]?.includes(sign)) return 'Own Sign';
  return 'Neutral';
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function detectAllDoshas(chart: BirthChartData): DoshaResult[] {
  return [
    detectKaalSarp(chart),
    detectPitraDosha(chart),
    detectGrahanDosha(chart),
    detectGuruChandal(chart),
    detectShrapitDosha(chart),
    detectGandmoolDosha(chart),
    detectShakataYoga(chart),
    detectDaridraYoga(chart),
  ];
}

/**
 * Get only active (present) doshas.
 */
export function getActiveDoshas(chart: BirthChartData): DoshaResult[] {
  return detectAllDoshas(chart).filter((d) => d.present);
}

/**
 * Format doshas for prompt inclusion.
 */
export function formatDoshas(doshas: DoshaResult[]): string {
  const active = doshas.filter((d) => d.present);
  if (active.length === 0) return 'No major doshas detected in this chart.';

  return active.map((d) => {
    const cancelText = d.cancellation.length > 0
      ? ` Cancellation: ${d.cancellation.join('; ')}.`
      : '';
    return `**${d.name}** (${d.severity}): ${d.description}${cancelText} Remedy: ${d.remedy}`;
  }).join('\n');
}
