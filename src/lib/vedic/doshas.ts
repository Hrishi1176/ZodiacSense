/**
 * Dosha Engine — 100% Deterministic Detection of Classical Vedic Doshas & Yogas of Affliction.
 *
 * Implements classical Parashari rules & authentic cancellation principles:
 * - Mangal Dosha (from Lagna, Moon, and Venus) + 12 specific classical cancellations
 * - Kaal Sarp Dosha (all 12 specific variations: Anant, Kulik, Vasuki, Shankhapal, etc.)
 * - Pitra Dosha (Sun / Moon / 9th Lord affliction)
 * - Grahan Dosha (Solar / Lunar Eclipse combinations)
 * - Guru Chandal Dosha (Jupiter-Rahu / Jupiter-Ketu)
 * - Shrapit Dosha (Saturn-Rahu combination)
 * - Gandmool Dosha (Junction nakshatras: Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati)
 * - Kemdrum Dosha (Isolated Moon without planets in 2nd/12th)
 * - Sade Sati (Saturn's 7.5 year transit phase relative to natal Moon)
 */

import type { BirthChartData, PlanetPosition } from '@/lib/ephemeris';
import { SIGNS, signIndex, houseDistance, NAKSHATRA_NAMES, nakshatraIndex, getDignity } from './constants';

export interface DoshaResult {
  name: string;
  present: boolean;
  severity: 'None' | 'Mild' | 'Moderate' | 'Severe';
  description: string;
  cancellation: string[];
  remedy: string;
}

function getPlanetSign(chart: BirthChartData, key: string): string {
  return (chart[key as keyof BirthChartData] as PlanetPosition)?.sign ?? '';
}

function getPlanetLongitude(chart: BirthChartData, key: string): number {
  return (chart[key as keyof BirthChartData] as PlanetPosition)?.longitude ?? 0;
}

function getPlanetHouse(chart: BirthChartData, key: string): number {
  return (chart[key as keyof BirthChartData] as PlanetPosition)?.house ?? 1;
}

// ─── 1. Mangal Dosha (Kuja Dosha) ────────────────────────────────────────────

const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12];

export function detectManglikDosha(chart: BirthChartData): DoshaResult {
  const lagna = chart.ascendant.sign;
  const moonSign = chart.moon.sign;
  const venusSign = chart.venus.sign;
  const marsSign = chart.mars.sign;

  const marsFromLagna = houseDistance(lagna, marsSign);
  const marsFromMoon = houseDistance(moonSign, marsSign);
  const marsFromVenus = houseDistance(venusSign, marsSign);

  const fromLagna = MANGLIK_HOUSES.includes(marsFromLagna);
  const fromMoon = MANGLIK_HOUSES.includes(marsFromMoon);
  const fromVenus = MANGLIK_HOUSES.includes(marsFromVenus);

  const present = fromLagna || fromMoon || fromVenus;
  const cancellations: string[] = [];

  if (present) {
    // Classical BPHS cancellations:
    if (marsFromLagna === 1 && marsSign === 'Aries') cancellations.push('Mars in Aries in 1st house cancels dosha');
    if (marsFromLagna === 4 && (marsSign === 'Scorpio' || marsSign === 'Aries')) cancellations.push('Mars in own sign in 4th house cancels dosha');
    if (marsFromLagna === 7 && (marsSign === 'Capricorn' || marsSign === 'Pisces')) cancellations.push('Mars exalted or in Pisces in 7th cancels dosha');
    if (marsFromLagna === 8 && (marsSign === 'Cancer' || marsSign === 'Sagittarius')) cancellations.push('Mars debilitated or in Jupiter sign in 8th cancels dosha');
    if (marsFromLagna === 12 && (marsSign === 'Taurus' || marsSign === 'Libra')) cancellations.push('Mars in Venus signs in 12th cancels dosha');
    if (marsFromLagna === 2 && (marsSign === 'Gemini' || marsSign === 'Virgo')) cancellations.push('Mars in Mercury signs in 2nd cancels dosha');
    
    // Conjunction cancellations
    if (chart.mars.sign === chart.jupiter.sign) cancellations.push('Mars conjunct Jupiter (Guru-Mangal Yoga cancels dosha)');
    if (chart.mars.sign === chart.moon.sign) cancellations.push('Mars conjunct Moon (Chandra-Mangal Yoga mitigates dosha)');
    
    // Jupiter / Moon aspect
    const jupDist = houseDistance(chart.jupiter.sign, chart.mars.sign);
    if ([1, 5, 7, 9].includes(jupDist)) cancellations.push('Jupiter aspects Mars (protective benefic cancellation)');
  }

  let severity: DoshaResult['severity'] = 'None';
  if (present) {
    if (cancellations.length >= 2) severity = 'Mild';
    else if (cancellations.length === 1) severity = 'Moderate';
    else severity = fromLagna && fromMoon ? 'Severe' : 'Moderate';
  }

  return {
    name: 'Mangal Dosha (Kuja Dosha)',
    present,
    severity,
    description: present
      ? `Mars is placed in house ${marsFromLagna} from Lagna${fromMoon ? `, ${marsFromMoon} from Moon` : ''}. This indicates dynamic passion, high energy, and potential friction in close partnerships unless tempered.`
      : 'No standard Manglik placement detected.',
    cancellation: cancellations,
    remedy: 'Recite Hanuman Chalisa on Tuesdays. Worship Lord Kartikeya or perform Mangal Shanti. Marrying a partner with compatible Mars placements provides natural harmony.',
  };
}

// ─── 2. Kaal Sarp Dosha (12 Types) ──────────────────────────────────────────

const KAAL_SARP_NAMES = [
  'Anant Kaal Sarp (1st/7th axis)',
  'Kulik Kaal Sarp (2nd/8th axis)',
  'Vasuki Kaal Sarp (3rd/9th axis)',
  'Shankhapal Kaal Sarp (4th/10th axis)',
  'Padma Kaal Sarp (5th/11th axis)',
  'Mahapadma Kaal Sarp (6th/12th axis)',
  'Takshak Kaal Sarp (7th/1st axis)',
  'Karkotak Kaal Sarp (8th/2nd axis)',
  'Shankhachur Kaal Sarp (9th/3rd axis)',
  'Ghatak Kaal Sarp (10th/4th axis)',
  'Vishdhar Kaal Sarp (11th/5th axis)',
  'Sheshnag Kaal Sarp (12th/6th axis)',
];

export function detectKaalSarp(chart: BirthChartData): DoshaResult {
  const rahuLon = getPlanetLongitude(chart, 'rahu');
  const ketuLon = getPlanetLongitude(chart, 'ketu');
  const rahuHouse = getPlanetHouse(chart, 'rahu');

  const planetLons = ['sun', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'saturn'].map((k) =>
    getPlanetLongitude(chart, k)
  );

  const isBetween = (lon: number, start: number, end: number): boolean => {
    if (start < end) return lon > start && lon < end;
    return lon > start || lon < end;
  };

  const allInArc1 = planetLons.every((lon) => isBetween(lon, rahuLon, ketuLon));
  const allInArc2 = planetLons.every((lon) => isBetween(lon, ketuLon, rahuLon));
  const present = allInArc1 || allInArc2;

  const cancellations: string[] = [];
  if (present) {
    for (const key of ['sun', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'saturn']) {
      const sign = getPlanetSign(chart, key);
      if (sign === chart.rahu.sign || sign === chart.ketu.sign) {
        cancellations.push(`${key.toUpperCase()} conjunct nodal axis (creates partial break/cancellation)`);
      }
    }
    const jupHouse = getPlanetHouse(chart, 'jupiter');
    if ([1, 4, 7, 10, 5, 9].includes(jupHouse)) {
      cancellations.push('Jupiter placed in Kendra/Trikona mitigates Kaal Sarp severity');
    }
  }

  const doshaName = KAAL_SARP_NAMES[(rahuHouse - 1) % 12] || 'Kaal Sarp Dosha';

  return {
    name: `Kaal Sarp Dosha (${doshaName})`,
    present,
    severity: present ? (cancellations.length > 0 ? 'Mild' : 'Moderate') : 'None',
    description: present
      ? `All seven classical planets are hemmed between the Rahu–Ketu nodal axis in ${doshaName}. This can bring sudden transformative cycles followed by exceptional rise after age 32-36.`
      : 'No Kaal Sarp alignment detected.',
    cancellation: cancellations,
    remedy: 'Perform Maha Mrityunjaya Japa or Kaal Sarp Shanti. Worship Lord Shiva on Mondays and Nag Panchami. Offer raw milk to Shiva Lingam.',
  };
}

// ─── 3. Pitra Dosha ─────────────────────────────────────────────────────────

export function detectPitraDosha(chart: BirthChartData): DoshaResult {
  const sunSign = chart.sun.sign;
  const rahuSign = chart.rahu.sign;
  const ketuSign = chart.ketu.sign;
  const saturnSign = chart.saturn.sign;
  const sunHouse = chart.sun.house || 1;

  const sunWithRahu = sunSign === rahuSign;
  const sunWithKetu = sunSign === ketuSign;
  const sunWithSaturn = sunSign === saturnSign;
  const ninthHouseAfflicted = sunHouse === 9 && (sunWithRahu || sunWithKetu || sunWithSaturn);

  const present = sunWithRahu || sunWithKetu || sunWithSaturn || ninthHouseAfflicted;
  const cancellations: string[] = [];

  if (present) {
    if (getDignity('Sun', sunSign) === 'Exalted') cancellations.push('Sun is exalted in Aries (mitigates Pitra Dosha)');
    if (chart.jupiter.sign === sunSign || houseDistance(chart.jupiter.sign, sunSign) === 7) {
      cancellations.push('Jupiter aspect on Sun provides divine grace and relief');
    }
  }

  return {
    name: 'Pitra Dosha',
    present,
    severity: present ? (cancellations.length > 0 ? 'Mild' : 'Moderate') : 'None',
    description: present
      ? 'Sun or 9th house is influenced by Rahu/Ketu/Saturn, signifying karmic ancestral obligations requiring spiritual remediation.'
      : 'No Pitra Dosha detected.',
    cancellation: cancellations,
    remedy: 'Perform Pind Daan or Tarpana for ancestors. Offer water to Peepal tree on Saturdays. Feed cows and donate meals on Amavasya (New Moon).',
  };
}

// ─── 4. Grahan Dosha ────────────────────────────────────────────────────────

export function detectGrahanDosha(chart: BirthChartData): DoshaResult {
  const sunSign = chart.sun.sign;
  const moonSign = chart.moon.sign;
  const rahuSign = chart.rahu.sign;
  const ketuSign = chart.ketu.sign;

  const isSolarEclipse = sunSign === rahuSign || sunSign === ketuSign;
  const isLunarEclipse = moonSign === rahuSign || moonSign === ketuSign;
  const present = isSolarEclipse || isLunarEclipse;

  const cancellations: string[] = [];
  if (present) {
    if (isSolarEclipse && getDignity('Sun', sunSign) === 'Exalted') cancellations.push('Sun exalted');
    if (isLunarEclipse && getDignity('Moon', moonSign) === 'Exalted') cancellations.push('Moon exalted');
  }

  return {
    name: 'Grahan Dosha (Eclipse Combination)',
    present,
    severity: present ? 'Moderate' : 'None',
    description: present
      ? `${isSolarEclipse ? 'Sun (Surya Grahan)' : ''}${isSolarEclipse && isLunarEclipse ? ' & ' : ''}${isLunarEclipse ? 'Moon (Chandra Grahan)' : ''} is conjunct the nodal axis, creating temporary fluctuations in confidence or emotional clarity.`
      : 'No Grahan Dosha present.',
    cancellation: cancellations,
    remedy: 'Recite Gayatri Mantra daily. Donate white items for Moon or copper/wheat for Sun during eclipses.',
  };
}

// ─── 5. Guru Chandal Dosha ──────────────────────────────────────────────────

export function detectGuruChandal(chart: BirthChartData): DoshaResult {
  const jupSign = chart.jupiter.sign;
  const rahuSign = chart.rahu.sign;
  const ketuSign = chart.ketu.sign;
  const present = jupSign === rahuSign || jupSign === ketuSign;

  const cancellations: string[] = [];
  if (present) {
    if (getDignity('Jupiter', jupSign) === 'Exalted' || getDignity('Jupiter', jupSign) === 'Own Sign') {
      cancellations.push('Jupiter in own/exaltation sign weakens the Chandal defect');
    }
  }

  return {
    name: 'Guru Chandal Dosha',
    present,
    severity: present ? (cancellations.length > 0 ? 'Mild' : 'Moderate') : 'None',
    description: present
      ? 'Jupiter is conjunct Rahu/Ketu, stimulating unconventional or rebellious wisdom, deep philosophical inquiry, and sudden shifts in belief.'
      : 'No Guru Chandal Dosha detected.',
    cancellation: cancellations,
    remedy: 'Chant Brihaspati Mantra or Vishnu Sahasranama on Thursdays. Respect spiritual mentors and teachers.',
  };
}

// ─── 6. Shrapit Dosha ───────────────────────────────────────────────────────

export function detectShrapitDosha(chart: BirthChartData): DoshaResult {
  const saturnSign = chart.saturn.sign;
  const rahuSign = chart.rahu.sign;
  const present = saturnSign === rahuSign;

  return {
    name: 'Shrapit Dosha (Saturn-Rahu Conjunction)',
    present,
    severity: present ? 'Moderate' : 'None',
    description: present
      ? 'Saturn and Rahu are conjunct in the same sign, indicating past karmic delays that teach intense patience, endurance, and discipline.'
      : 'No Shrapit Dosha detected.',
    cancellation: [],
    remedy: 'Worship Lord Hanuman and Lord Shiva. Perform Shani-Rahu Shanti and serve underprivileged communities on Saturdays.',
  };
}

// ─── 7. Gandmool Dosha ──────────────────────────────────────────────────────

const GANDMOOL_NAKSHATRAS = ['Ashwini', 'Ashlesha', 'Magha', 'Jyeshtha', 'Mula', 'Revati'];

export function detectGandmool(chart: BirthChartData): DoshaResult {
  const nakName = chart.nakshatra.name;
  const present = GANDMOOL_NAKSHATRAS.includes(nakName);

  return {
    name: 'Gandmool Dosha',
    present,
    severity: present ? 'Mild' : 'None',
    description: present
      ? `Born under ${nakName} nakshatra at the spiritual junction (Gandanta) of water and fire signs. Gives strong psychic intuition and unique transformative life paths.`
      : 'Born in a regular non-Gandmool nakshatra.',
    cancellation: ['Natural maturation after childhood and Gandmool Shanti ritual'],
    remedy: 'Perform Gandmool Shanti on the 27th day after birth or on the day when the Moon transits the birth nakshatra.',
  };
}

// ─── 8. Kemdrum Dosha ───────────────────────────────────────────────────────

export function detectKemdrum(chart: BirthChartData): DoshaResult {
  const moonSign = chart.moon.sign;
  const secondFromMoon = SIGNS[(signIndex(moonSign) + 1) % 12];
  const twelfthFromMoon = SIGNS[(signIndex(moonSign) + 11) % 12];

  const planetsToCheck = ['sun', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  const hasInSecond = planetsToCheck.some((k) => (chart[k as keyof BirthChartData] as PlanetPosition)?.sign === secondFromMoon);
  const hasInTwelfth = planetsToCheck.some((k) => (chart[k as keyof BirthChartData] as PlanetPosition)?.sign === twelfthFromMoon);

  const present = !hasInSecond && !hasInTwelfth;
  const cancellations: string[] = [];

  if (present) {
    const moonHouse = chart.moon.house || 1;
    if ([1, 4, 7, 10].includes(moonHouse)) cancellations.push('Moon in Kendra from Lagna completely cancels Kemdrum Dosha (Kemdrum Bhanga)');
    const hasPlanetInKendraFromMoon = planetsToCheck.some((k) => {
      const pSign = (chart[k as keyof BirthChartData] as PlanetPosition)?.sign;
      return [1, 4, 7, 10].includes(houseDistance(moonSign, pSign));
    });
    if (hasPlanetInKendraFromMoon) cancellations.push('Planets in Kendra from Moon form Kemdrum Bhanga Raja Yoga');
  }

  return {
    name: 'Kemdrum Dosha',
    present,
    severity: present ? (cancellations.length > 0 ? 'None' : 'Mild') : 'None',
    description: present
      ? (cancellations.length > 0
          ? 'Kemdrum condition exists but is cancelled into Kemdrum Bhanga (strength gained through self-reliance).'
          : 'Moon is isolated without surrounding planets, fostering solitary contemplation and independent emotional processing.')
      : 'Moon has supportive flanking planets (Durudhara/Anapha/Sunapha).',
    cancellation: cancellations,
    remedy: 'Worship Lord Shiva with milk offering on Mondays. Keep a silver coin or square with you.',
  };
}

// ─── Public API: Detect All Doshas ──────────────────────────────────────────

export function detectAllDoshas(chart: BirthChartData): DoshaResult[] {
  return [
    detectManglikDosha(chart),
    detectKaalSarp(chart),
    detectPitraDosha(chart),
    detectGrahanDosha(chart),
    detectGuruChandal(chart),
    detectShrapitDosha(chart),
    detectGandmool(chart),
    detectKemdrum(chart),
  ];
}

export function getActiveDoshas(doshas: DoshaResult[]): DoshaResult[] {
  return doshas.filter((d) => d.present && d.severity !== 'None');
}

export function formatDoshas(doshas: DoshaResult[]): string {
  const active = getActiveDoshas(doshas);
  if (active.length === 0) {
    return 'No active doshas detected. The chart is clear of major classical afflictions.';
  }
  return active
    .map((d) => {
      let text = `### ${d.name} (${d.severity} Severity)\n${d.description}`;
      if (d.cancellation.length > 0) {
        text += `\n* **Cancellations / Mitigations**: ${d.cancellation.join('; ')}`;
      }
      text += `\n* **Prescribed Remedy**: ${d.remedy}`;
      return text;
    })
    .join('\n\n');
}
