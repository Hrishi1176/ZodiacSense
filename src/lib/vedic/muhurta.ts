/**
 * Vivah Muhurta engine — deterministic auspicious marriage date scanner.
 *
 * Scans the next N months day by day using the Swiss Ephemeris daily panchang
 * and scores each day with classical marriage-muhurta rules. Pure function of
 * the two birth charts + today's date, so results are reproducible.
 */

import { computeDailyPanchang, type BirthChartData } from '@/lib/ephemeris';
import { houseDistance, nakshatraIndex } from './constants';

export interface MuhurtaDate {
  date: string;       // YYYY-MM-DD
  weekday: string;    // e.g. "Thursday"
  tithi: string;      // e.g. "Shukla Paksha Dwitiya"
  nakshatra: string;  // Moon nakshatra of the day
  score: number;
  reasons: string[];
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Tithi indices (0-based within the 30-tithi cycle) rejected for marriage:
// Rikta (4/9/14 in each paksha), Ashtami, Purnima, Amavasya
const REJECTED_TITHIS = new Set([3, 8, 13, 18, 23, 28, 7, 22, 14, 29]);

// Nitya yogas considered inauspicious for auspicious ceremonies
const REJECTED_YOGAS = new Set(['Vyatipata', 'Vaidhriti']);

// Weekdays: Tuesday and Saturday are avoided for marriage
const REJECTED_WEEKDAYS = new Set([2, 6]);
const FAVORED_WEEKDAYS = new Set([1, 3, 4, 5]); // Mon, Wed, Thu, Fri

// Classical marriage nakshatras
const MARRIAGE_NAKSHATRAS = new Set([
  'Rohini', 'Mrigashira', 'Magha', 'Uttara Phalguni', 'Hasta', 'Swati',
  'Anuradha', 'Mula', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati',
]);

// Chandrabala: day-Moon sign counted from natal Moon sign — these are weak
const WEAK_CHANDRA_BALA = new Set([4, 6, 8, 12]);

// Tara Bala: star counted from birth nakshatra, mod 9 — weak remainders
// (remainder 0 = 9th star)
const WEAK_TARA_REMAINDERS = new Set([0, 2, 4, 6, 8]);

// Guru Bala: Jupiter counted from the bride's (partner 2) Moon sign
const GOOD_GURU_BALA = new Set([2, 5, 7, 9, 11]);

// Venus Bala: Venus counted from the bride's (partner 2) Moon sign
const GOOD_VENUS_BALA = new Set([1, 2, 3, 5, 9, 11]);

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Scan the next `months` months and return the top `topN` auspicious
 * marriage dates for the couple.
 */
export function computeMarriageMuhurtas(
  chart1: BirthChartData,
  chart2: BirthChartData,
  options?: { months?: number; topN?: number },
): MuhurtaDate[] {
  const months = options?.months ?? 12;
  const topN = options?.topN ?? 8;

  const p1MoonSign = chart1.moon.sign;
  const p2MoonSign = chart2.moon.sign;
  const p1NakIdx = nakshatraIndex(chart1.nakshatra.name);
  const p2NakIdx = nakshatraIndex(chart2.nakshatra.name);

  const results: MuhurtaDate[] = [];

  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1); // from tomorrow
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);

  for (const cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const panchang = computeDailyPanchang(toISO(cursor));
    const reasons: string[] = [];
    let score = 0;
    let rejected = false;

    // ── Hard rejects ────────────────────────────────────────────────────
    if (REJECTED_TITHIS.has(panchang.tithiIndex)) rejected = true;
    if (REJECTED_YOGAS.has(panchang.yogaName)) rejected = true;
    if (REJECTED_WEEKDAYS.has(panchang.weekday)) rejected = true;

    // Chandrabala for both partners
    const cb1 = houseDistance(p1MoonSign, panchang.moonSign);
    const cb2 = houseDistance(p2MoonSign, panchang.moonSign);
    if (WEAK_CHANDRA_BALA.has(cb1) || WEAK_CHANDRA_BALA.has(cb2)) rejected = true;

    // Tara Bala for both partners
    const tara1 = ((nakshatraIndex(panchang.moonNakshatra) - p1NakIdx + 27) % 27) + 1;
    const tara2 = ((nakshatraIndex(panchang.moonNakshatra) - p2NakIdx + 27) % 27) + 1;
    if (WEAK_TARA_REMAINDERS.has(tara1 % 9) || WEAK_TARA_REMAINDERS.has(tara2 % 9)) rejected = true;

    if (rejected) continue;

    // ── Positive scoring ────────────────────────────────────────────────
    if (MARRIAGE_NAKSHATRAS.has(panchang.moonNakshatra)) {
      score += 3;
      reasons.push(`Marriage nakshatra ${panchang.moonNakshatra}`);
    }
    if (FAVORED_WEEKDAYS.has(panchang.weekday)) {
      score += 2;
      reasons.push(`Favorable weekday (${WEEKDAY_NAMES[panchang.weekday]})`);
    }
    if (panchang.tithiIndex < 15) {
      score += 1;
      reasons.push('Shukla Paksha (waxing Moon)');
    }

    const guruBala = houseDistance(p2MoonSign, panchang.jupiterSign);
    if (GOOD_GURU_BALA.has(guruBala)) {
      score += 2;
      reasons.push(`Guru Bala — Jupiter ${guruBala}th from Partner 2's Moon`);
    }
    const venusBala = houseDistance(p2MoonSign, panchang.venusSign);
    if (GOOD_VENUS_BALA.has(venusBala)) {
      score += 1;
      reasons.push(`Venus Bala — Venus ${venusBala}th from Partner 2's Moon`);
    }
    reasons.push(`Strong Chandrabala (${cb1}th & ${cb2}th from Moons) and Tara Bala for both partners`);

    results.push({
      date: panchang.date,
      weekday: WEEKDAY_NAMES[panchang.weekday],
      tithi: panchang.tithiName,
      nakshatra: panchang.moonNakshatra,
      score,
      reasons,
    });
  }

  // Best score first; earliest date wins ties
  results.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return results.slice(0, topN).sort((a, b) => a.date.localeCompare(b.date));
}
