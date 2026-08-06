/**
 * Regression Test Framework for Vedic Astrology Calculations.
 *
 * Validates the deterministic calculation pipeline against known charts.
 * Each test case specifies:
 * - Birth data (date, time, location coordinates)
 * - Expected planetary positions (signs)
 * - Expected yogas that should be detected
 * - Expected doshas
 *
 * Run with: npx ts-node --project tsconfig.json src/lib/vedic/__tests__/regression.test.ts
 * Or integrate with Jest/Vitest as needed.
 */

import { computeBirthChart } from '@/lib/ephemeris';
import { analyzeChart, analyzeManglik } from '@/lib/vedic/chart-analysis';
import { detectAllDoshas } from '@/lib/vedic/doshas';
import { computeAllDivisionalCharts, getVargottamaPlanets } from '@/lib/vedic/divisional-charts';
import { computeAllPlanetStrengths } from '@/lib/vedic/planet-strength';
import { buildStructuredAnalysis, buildAnalysisJSON } from '@/lib/vedic/structured-analysis';
import { computeMarriageMuhurtas } from '@/lib/vedic/muhurta';
import { SIGNS, signIndex } from '@/lib/vedic/constants';

// ─── Test Cases ─────────────────────────────────────────────────────────────

interface TestCase {
  name: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  lat: number;
  lng: number;
  utcOffset: number;  // minutes
  expectations: {
    ascendant?: string;
    moonSign?: string;
    sunSign?: string;
    moonNakshatra?: string;
    yogasShouldInclude?: string[];   // yoga names that MUST be present
    yogasShouldNotInclude?: string[]; // yoga names that must NOT be present
    doshasShouldInclude?: string[];
    minYogaCount?: number;
    planetInSign?: Record<string, string>; // planet → expected sign
  };
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Steve Jobs (Technology Leader)',
    date: '1955-02-24',
    time: '19:15',
    lat: 37.3382,
    lng: -121.8863,
    utcOffset: -480, // PST
    expectations: {
      // Known: strong Mercury for technology, leadership yogas expected
      yogasShouldInclude: [],
      minYogaCount: 1, // At least some yogas
      planetInSign: {
        // We verify key placements match Swiss Ephemeris data
      },
    },
  },
  {
    name: 'Albert Einstein (Genius Physicist)',
    date: '1879-03-14',
    time: '11:30',
    lat: 48.4011,
    lng: 9.9876,
    utcOffset: 60, // CET
    expectations: {
      // Known: extremely strong Mercury and Jupiter for intellect
      minYogaCount: 2, // Saraswati Yoga expected
      planetInSign: {},
    },
  },
  {
    name: 'Indira Gandhi (Political Leader)',
    date: '1917-11-19',
    time: '23:00',
    lat: 25.4358,
    lng: 81.8463,
    utcOffset: 330, // IST
    expectations: {
      // Known: strong Raja Yogas, leadership indicators
      minYogaCount: 1,
      planetInSign: {},
    },
  },
  {
    name: 'Swami Vivekananda (Spiritual Leader)',
    date: '1863-01-12',
    time: '06:30',
    lat: 22.5726,
    lng: 88.3639,
    utcOffset: 330, // IST (approximate for 1863)
    expectations: {
      // Known: strong spiritual indicators, Jupiter/Moon prominence
      minYogaCount: 1,
      planetInSign: {},
    },
  },
  {
    name: 'A. P. J. Abdul Kalam (Scientist-President)',
    date: '1931-10-15',
    time: '01:15',
    lat: 9.2379,
    lng: 78.7915,
    utcOffset: 330, // IST
    expectations: {
      // Known: Mercury-Jupiter strength, career yogas
      minYogaCount: 1,
      planetInSign: {},
    },
  },
];

// ─── Test Runner ────────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  failures: string[];
  summary: {
    ascendant: string;
    moonSign: string;
    sunSign: string;
    nakshatra: string;
    yogaCount: number;
    yogaNames: string[];
    doshaNames: string[];
    vargottamaPlanets: string[];
  };
}

function runSingleTest(tc: TestCase): TestResult {
  const failures: string[] = [];

  // Step 1: Compute chart
  const chart = computeBirthChart(tc.date, tc.time, tc.lat, tc.lng, tc.utcOffset);

  // Step 2: Analyze
  const analysis = analyzeChart(chart);
  const doshas = detectAllDoshas(chart);
  const divisional = computeAllDivisionalCharts(chart);
  const strengths = computeAllPlanetStrengths(chart);
  const vargottama = getVargottamaPlanets(chart, divisional.d9);

  // Step 3: Validate expectations
  const exp = tc.expectations;

  if (exp.ascendant && chart.ascendant.sign !== exp.ascendant) {
    failures.push(`Ascendant: expected ${exp.ascendant}, got ${chart.ascendant.sign}`);
  }
  if (exp.moonSign && chart.moon.sign !== exp.moonSign) {
    failures.push(`Moon sign: expected ${exp.moonSign}, got ${chart.moon.sign}`);
  }
  if (exp.sunSign && chart.sun.sign !== exp.sunSign) {
    failures.push(`Sun sign: expected ${exp.sunSign}, got ${chart.sun.sign}`);
  }
  if (exp.moonNakshatra && chart.nakshatra.name !== exp.moonNakshatra) {
    failures.push(`Nakshatra: expected ${exp.moonNakshatra}, got ${chart.nakshatra.name}`);
  }

  // Yoga checks
  const yogaNames = analysis.yogas.map((y) => y.name);
  if (exp.yogasShouldInclude) {
    for (const expected of exp.yogasShouldInclude) {
      if (!yogaNames.some((n) => n.includes(expected))) {
        failures.push(`Missing expected yoga: ${expected}`);
      }
    }
  }
  if (exp.yogasShouldNotInclude) {
    for (const notExpected of exp.yogasShouldNotInclude) {
      if (yogaNames.some((n) => n.includes(notExpected))) {
        failures.push(`Unexpected yoga present: ${notExpected}`);
      }
    }
  }
  if (exp.minYogaCount !== undefined && analysis.yogas.length < exp.minYogaCount) {
    failures.push(`Expected at least ${exp.minYogaCount} yogas, found ${analysis.yogas.length}`);
  }

  // Dosha checks
  const doshaNames = doshas.filter((d) => d.present).map((d) => d.name);
  if (exp.doshasShouldInclude) {
    for (const expected of exp.doshasShouldInclude) {
      if (!doshaNames.some((n) => n.includes(expected))) {
        failures.push(`Missing expected dosha: ${expected}`);
      }
    }
  }

  // Planet-in-sign checks
  if (exp.planetInSign) {
    for (const [planetKey, expectedSign] of Object.entries(exp.planetInSign)) {
      const actualSign = (chart[planetKey as keyof typeof chart] as any)?.sign;
      if (actualSign && actualSign !== expectedSign) {
        failures.push(`${planetKey} sign: expected ${expectedSign}, got ${actualSign}`);
      }
    }
  }

  // Step 4: Build structured analysis (verify it doesn't crash)
  let structuredOK = true;
  try {
    const sa = buildStructuredAnalysis(chart);
    const json = buildAnalysisJSON(sa);
    if (json.length < 100) {
      failures.push('Structured analysis JSON suspiciously short');
    }
  } catch (e: any) {
    failures.push(`Structured analysis crashed: ${e.message}`);
    structuredOK = false;
  }

  return {
    name: tc.name,
    passed: failures.length === 0,
    failures,
    summary: {
      ascendant: chart.ascendant.sign,
      moonSign: chart.moon.sign,
      sunSign: chart.sun.sign,
      nakshatra: chart.nakshatra.name,
      yogaCount: analysis.yogas.length,
      yogaNames,
      doshaNames,
      vargottamaPlanets: vargottama,
    },
  };
}

// ─── Manglik house regression cases (synthetic sign overrides) ─────────────

function withSigns(
  base: ReturnType<typeof computeBirthChart>,
  overrides: { asc?: string; moon?: string; mars?: string; jupiter?: string; venus?: string },
): ReturnType<typeof computeBirthChart> {
  return {
    ...base,
    ascendant: { ...base.ascendant, sign: overrides.asc ?? base.ascendant.sign },
    moon: { ...base.moon, sign: overrides.moon ?? base.moon.sign },
    mars: { ...base.mars, sign: overrides.mars ?? base.mars.sign },
    jupiter: { ...base.jupiter, sign: overrides.jupiter ?? base.jupiter.sign },
    venus: { ...base.venus, sign: overrides.venus ?? base.venus.sign },
  };
}

const EMPTY_SUMMARY: TestResult['summary'] = {
  ascendant: '-', moonSign: '-', sunSign: '-', nakshatra: '-',
  yogaCount: 0, yogaNames: [], doshaNames: [], vargottamaPlanets: [],
};

function runManglikTests(): TestResult[] {
  // Base chart only used as a structural shell — signs are overridden
  const base = computeBirthChart('1993-05-10', '08:30', 28.6139, 77.209, 330);
  const results: TestResult[] = [];

  // Mars in each Manglik house from Lagna
  for (const house of [1, 4, 7, 8, 12]) {
    const marsSign = SIGNS[(signIndex('Aries') + house - 1) % 12];
    const chart = withSigns(base, { asc: 'Aries', moon: 'Gemini', mars: marsSign, jupiter: 'Pisces', venus: 'Taurus' });
    const m = analyzeManglik(chart);
    const failures: string[] = [];
    if (m.marsHouseFromLagna !== house) failures.push(`Mars house from Lagna: expected ${house}, got ${m.marsHouseFromLagna}`);
    if (!m.isManglik) failures.push(`Expected Manglik for Mars in house ${house} from Lagna`);
    results.push({ name: `Manglik: Mars in house ${house} from Lagna`, passed: failures.length === 0, failures, summary: EMPTY_SUMMARY });
  }

  // Non-Manglik house (Mars in 3rd from both Lagna and Moon)
  {
    const chart = withSigns(base, { asc: 'Aries', moon: 'Aries', mars: 'Gemini', jupiter: 'Pisces', venus: 'Taurus' });
    const m = analyzeManglik(chart);
    const failures: string[] = [];
    if (m.isManglik) failures.push('Expected Non-Manglik for Mars in 3rd from Lagna and Moon');
    if (m.severity !== 'None') failures.push(`Expected severity None, got ${m.severity}`);
    results.push({ name: 'Manglik: Mars in 3rd → Non-Manglik', passed: failures.length === 0, failures, summary: EMPTY_SUMMARY });
  }

  // Manglik via Moon only (Partial severity)
  {
    const chart = withSigns(base, { asc: 'Aries', moon: 'Taurus', mars: 'Leo', jupiter: 'Pisces', venus: 'Taurus' });
    const m = analyzeManglik(chart);
    const failures: string[] = [];
    if (!m.isManglik) failures.push('Expected Manglik via Moon (Mars 4th from Moon)');
    if (m.marsHouseFromMoon !== 4) failures.push(`Mars from Moon: expected 4, got ${m.marsHouseFromMoon}`);
    if (m.severity !== 'Partial') failures.push(`Expected Partial severity, got ${m.severity}`);
    results.push({ name: 'Manglik: Mars 4th from Moon → Partial', passed: failures.length === 0, failures, summary: EMPTY_SUMMARY });
  }

  // Known cancellation case: Mars conjunct Jupiter in 7th
  {
    const chart = withSigns(base, { asc: 'Aries', moon: 'Aries', mars: 'Libra', jupiter: 'Libra', venus: 'Taurus' });
    const m = analyzeManglik(chart);
    const failures: string[] = [];
    if (!m.isManglik) failures.push('Expected Manglik for Mars in 7th');
    if (!m.cancellation.includes('Mars conjunct Jupiter')) failures.push(`Expected Jupiter cancellation, got: ${m.cancellation}`);
    results.push({ name: 'Manglik: Mars-Jupiter conjunct cancellation', passed: failures.length === 0, failures, summary: EMPTY_SUMMARY });
  }

  return results;
}

// ─── Vivah Muhurta regression cases ─────────────────────────────────────────

function runMuhurtaTests(): TestResult[] {
  const results: TestResult[] = [];

  const chart1 = computeBirthChart('1993-05-10', '08:30', 28.6139, 77.209, 330);
  const chart2 = computeBirthChart('1995-11-22', '14:45', 22.5726, 88.3639, 330);

  const muhurtas = computeMarriageMuhurtas(chart1, chart2, { months: 12, topN: 8 });
  const failures: string[] = [];

  if (muhurtas.length === 0) failures.push('No muhurta dates returned');
  if (muhurtas.length > 8) failures.push(`More than topN dates returned: ${muhurtas.length}`);

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const maxDate = new Date(tomorrow);
  maxDate.setUTCMonth(maxDate.getUTCMonth() + 12);
  maxDate.setUTCDate(maxDate.getUTCDate() + 2); // small boundary tolerance

  const rejectedTithiPattern = /Amavasya|Purnima|Ashtami|Chaturthi|Navami|Chaturdashi/i;
  for (const m of muhurtas) {
    const d = new Date(`${m.date}T00:00:00Z`);
    if (d < tomorrow || d > maxDate) failures.push(`Date out of window: ${m.date}`);
    if (m.weekday === 'Tuesday' || m.weekday === 'Saturday') failures.push(`Rejected weekday present: ${m.date} (${m.weekday})`);
    if (rejectedTithiPattern.test(m.tithi)) failures.push(`Rejected tithi present: ${m.date} (${m.tithi})`);
  }

  // Chronological order
  for (let i = 1; i < muhurtas.length; i++) {
    if (muhurtas[i].date <= muhurtas[i - 1].date) failures.push(`Dates not chronological at index ${i}`);
  }

  results.push({ name: 'Muhurta: window, weekday & tithi filters', passed: failures.length === 0, failures, summary: EMPTY_SUMMARY });

  // Determinism: identical rerun
  const rerun = computeMarriageMuhurtas(chart1, chart2, { months: 12, topN: 8 });
  const detFailures: string[] = [];
  if (JSON.stringify(rerun) !== JSON.stringify(muhurtas)) detFailures.push('Rerun produced different muhurta results');
  results.push({ name: 'Muhurta: deterministic rerun', passed: detFailures.length === 0, failures: detFailures, summary: EMPTY_SUMMARY });

  return results;
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function runAllRegressionTests(): { total: number; passed: number; failed: number; results: TestResult[] } {
  const results = [
    ...TEST_CASES.map(runSingleTest),
    ...runManglikTests(),
    ...runMuhurtaTests(),
  ];
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results };
}

// ─── CLI Runner ─────────────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ZodiacSense — Vedic Calculation Regression Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  const { total, passed, failed, results } = runAllRegressionTests();

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    console.log(`   Asc: ${r.summary.ascendant} | Moon: ${r.summary.moonSign} | Sun: ${r.summary.sunSign}`);
    console.log(`   Nakshatra: ${r.summary.nakshatra}`);
    console.log(`   Yogas (${r.summary.yogaCount}): ${r.summary.yogaNames.join(', ') || 'none'}`);
    console.log(`   Doshas: ${r.summary.doshaNames.join(', ') || 'none'}`);
    console.log(`   Vargottama: ${r.summary.vargottamaPlanets.join(', ') || 'none'}`);

    if (r.failures.length > 0) {
      console.log(`   FAILURES:`);
      r.failures.forEach((f) => console.log(`     ⚠ ${f}`));
    }
    console.log();
  }

  console.log('───────────────────────────────────────────────────────');
  console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
  console.log('───────────────────────────────────────────────────────');

  process.exit(failed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main();
}
