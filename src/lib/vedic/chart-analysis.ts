import type { BirthChartData, PlanetPosition } from '@/lib/ephemeris';
import {
  SIGNS, signIndex, houseDistance, getDignity, getGana, nakshatraIndex,
  HOUSE_THEMES, PLANET_REMEDIES, type Dignity,
} from './constants';

export interface PlanetAnalysis {
  planet: string;
  sign: string;
  house: number;
  dignity: Dignity;
  isRetrograde: boolean;
  degree: string;
}

export interface ManglikAnalysis {
  isManglik: boolean;
  marsHouseFromLagna: number;
  marsHouseFromMoon: number;
  cancellation: string;
  severity: 'None' | 'Partial' | 'Full';
}

export interface YogaResult {
  name: string;
  description: string;
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number; // 0–100
}

export interface ChartAnalysis {
  planets: PlanetAnalysis[];
  manglik: ManglikAnalysis;
  yogas: YogaResult[];
  houseLords: Record<number, string>;
  kendraPlanets: string[];
  trikonaPlanets: string[];
  afflictedPlanets: string[];
  remedies: string[];
  ratings: Record<string, number>;
  confidenceScores: Record<string, number>; // life area confidence 0-100
}

const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'venus', 'jupiter', 'saturn', 'rahu', 'ketu'] as const;
const PLANET_LABELS: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
  venus: 'Venus', jupiter: 'Jupiter', saturn: 'Saturn', rahu: 'Rahu', ketu: 'Ketu',
};

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];

function getHouseFromLagna(planetSign: string, lagnaSign: string): number {
  return houseDistance(lagnaSign, planetSign);
}

function isKendra(house: number): boolean {
  return KENDRA.includes(house);
}

function isTrikona(house: number): boolean {
  return TRIKONA.includes(house);
}

export function analyzeManglik(chart: BirthChartData): ManglikAnalysis {
  const lagna = chart.ascendant.sign;
  const moonSign = chart.moon.sign;
  const marsFromLagna = getHouseFromLagna(chart.mars.sign, lagna);
  const marsFromMoon = getHouseFromLagna(chart.mars.sign, moonSign);
  const manglikHouses = [1, 4, 7, 8, 12];
  const fromLagna = manglikHouses.includes(marsFromLagna);
  const fromMoon = manglikHouses.includes(marsFromMoon);
  const isManglik = fromLagna || fromMoon;

  let cancellation = 'Not applicable';
  let severity: ManglikAnalysis['severity'] = 'None';

  if (isManglik) {
    severity = fromLagna && fromMoon ? 'Full' : 'Partial';
    const jupHouse = getHouseFromLagna(chart.jupiter.sign, lagna);
    const venusHouse = getHouseFromLagna(chart.venus.sign, lagna);
    const cancellations: string[] = [];
    if (chart.mars.sign === chart.jupiter.sign) cancellations.push('Mars conjunct Jupiter');
    if (chart.mars.sign === chart.moon.sign) cancellations.push('Mars conjunct Moon');
    if (getDignity('Mars', chart.mars.sign) === 'Exalted') cancellations.push('Mars exalted');
    if (jupHouse === 1 || jupHouse === 4 || jupHouse === 7 || jupHouse === 8) cancellations.push('Jupiter aspects Mangal dosha houses');
    if (venusHouse === 7) cancellations.push('Venus in 7th house');
    cancellation = cancellations.length > 0
      ? `Partial cancellation: ${cancellations.join('; ')}`
      : 'No standard cancellation factors detected';
  }

  return { isManglik, marsHouseFromLagna: marsFromLagna, marsHouseFromMoon: marsFromMoon, cancellation, severity };
}

function detectYogas(chart: BirthChartData, planets: PlanetAnalysis[]): YogaResult[] {
  const yogas: YogaResult[] = [];
  const lagna = chart.ascendant.sign;
  const signOf = (p: string) => planets.find((x) => x.planet === p)?.sign ?? '';
  const houseOf = (p: string) => planets.find((x) => x.planet === p)?.house ?? 0;
  const dignityOf = (p: string) => planets.find((x) => x.planet === p)?.dignity ?? 'Neutral';

  // ─── Gaja Kesari Yoga ─────────────────────────────────────────────────
  const moonHouse = houseOf('Moon');
  const jupHouse = houseOf('Jupiter');
  const kendraFromMoon = ((jupHouse - moonHouse + 12) % 12);
  if ([0, 3, 6, 9].includes(kendraFromMoon)) {
    const jupStrong = dignityOf('Jupiter') !== 'Debilitated';
    yogas.push({
      name: 'Gaja Kesari Yoga',
      description: `Jupiter in ${kendraFromMoon === 0 ? 'same house as' : `kendra (${kendraFromMoon / 3 + 1}th) from`} Moon — wisdom, reputation, and stability.`,
      strength: jupStrong ? 'Strong' : 'Moderate',
      confidence: jupStrong ? 85 : 55,
    });
  }

  // ─── Budhaditya Yoga ──────────────────────────────────────────────────
  if (signOf('Sun') === signOf('Mercury')) {
    const mercStrong = dignityOf('Mercury') !== 'Debilitated';
    yogas.push({
      name: 'Budhaditya Yoga',
      description: 'Sun and Mercury in same sign — intelligence, communication skill, and analytical ability.',
      strength: mercStrong ? 'Moderate' : 'Weak',
      confidence: mercStrong ? 75 : 45,
    });
  }

  // ─── Chandra-Mangal Yoga ──────────────────────────────────────────────
  if (signOf('Moon') === signOf('Mars')) {
    yogas.push({
      name: 'Chandra-Mangal Yoga',
      description: 'Moon and Mars conjoined — financial drive, property potential, and decisive action.',
      strength: 'Moderate',
      confidence: 70,
    });
  }

  // ─── Raja Yoga (Kendra-Trikona lord conjunction) ──────────────────────
  const kendraLords = KENDRA.map((h) => chart.houses[h - 1]);
  const trikonaLords = TRIKONA.map((h) => chart.houses[h - 1]);
  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl === tl) continue;
      const klPlanet = planets.find((p) => p.sign === kl && p.house === getHouseFromLagna(kl, lagna));
      const tlPlanet = planets.find((p) => p.sign === tl);
      if (klPlanet && tlPlanet && klPlanet.sign === tlPlanet.sign) {
        yogas.push({
          name: 'Raja Yoga (Kendra-Trikona)',
          description: `Kendra and Trikona lords connected via ${klPlanet.planet} — leadership and success potential.`,
          strength: 'Strong',
          confidence: 80,
        });
        break;
      }
    }
  }

  // ─── Kemadruma Yoga ───────────────────────────────────────────────────
  const moonIdx = signIndex(chart.moon.sign);
  const adjacentSigns = [SIGNS[(moonIdx + 11) % 12], SIGNS[(moonIdx + 1) % 12]];
  const planetsInAdjacent = planets.filter(
    (p) => !['Moon', 'Rahu', 'Ketu'].includes(p.planet) && adjacentSigns.includes(p.sign as typeof SIGNS[number]),
  );
  if (planetsInAdjacent.length === 0) {
    yogas.push({
      name: 'Kemadruma Yoga',
      description: 'No planets adjacent to Moon — may indicate self-reliance; emotional support requires conscious effort.',
      strength: 'Weak',
      confidence: 65,
    });
  }

  // ─── Dusthana Affliction ──────────────────────────────────────────────
  const dusthanaPlanets = planets.filter((p) => DUSTHANA.includes(p.house) && ['Saturn', 'Mars', 'Rahu'].includes(p.planet));
  if (dusthanaPlanets.length >= 2) {
    yogas.push({
      name: 'Dusthana Affliction',
      description: `${dusthanaPlanets.map((p) => p.planet).join(', ')} in dusthana houses — challenges in related life areas require remedies.`,
      strength: 'Moderate',
      confidence: 70,
    });
  }

  // ─── Mahapurusha Yogas (5 types) ──────────────────────────────────────
  // Mars in Kendra + Own/Exalted = Ruchaka
  if (isKendra(houseOf('Mars')) && (dignityOf('Mars') === 'Exalted' || dignityOf('Mars') === 'Own Sign')) {
    yogas.push({
      name: 'Ruchaka Yoga (Mahapurusha)',
      description: 'Mars in Kendra in own/exalted sign — courage, leadership, military/athletic success, and strong willpower.',
      strength: dignityOf('Mars') === 'Exalted' ? 'Strong' : 'Moderate',
      confidence: 88,
    });
  }
  // Mercury in Kendra + Own/Exalted = Bhadra
  if (isKendra(houseOf('Mercury')) && (dignityOf('Mercury') === 'Exalted' || dignityOf('Mercury') === 'Own Sign')) {
    yogas.push({
      name: 'Bhadra Yoga (Mahapurusha)',
      description: 'Mercury in Kendra in own/exalted sign — exceptional intellect, communication, education, and business acumen.',
      strength: dignityOf('Mercury') === 'Exalted' ? 'Strong' : 'Moderate',
      confidence: 88,
    });
  }
  // Jupiter in Kendra + Own/Exalted = Hamsa
  if (isKendra(houseOf('Jupiter')) && (dignityOf('Jupiter') === 'Exalted' || dignityOf('Jupiter') === 'Own Sign')) {
    yogas.push({
      name: 'Hamsa Yoga (Mahapurusha)',
      description: 'Jupiter in Kendra in own/exalted sign — wisdom, spirituality, good fortune, children, and dharma.',
      strength: dignityOf('Jupiter') === 'Exalted' ? 'Strong' : 'Moderate',
      confidence: 90,
    });
  }
  // Venus in Kendra + Own/Exalted = Malavya
  if (isKendra(houseOf('Venus')) && (dignityOf('Venus') === 'Exalted' || dignityOf('Venus') === 'Own Sign')) {
    yogas.push({
      name: 'Malavya Yoga (Mahapurusha)',
      description: 'Venus in Kendra in own/exalted sign — beauty, luxury, artistic talent, happy marriage, and vehicles.',
      strength: dignityOf('Venus') === 'Exalted' ? 'Strong' : 'Moderate',
      confidence: 88,
    });
  }
  // Saturn in Kendra + Own/Exalted = Sasa
  if (isKendra(houseOf('Saturn')) && (dignityOf('Saturn') === 'Exalted' || dignityOf('Saturn') === 'Own Sign')) {
    yogas.push({
      name: 'Sasa Yoga (Mahapurusha)',
      description: 'Saturn in Kendra in own/exalted sign — discipline, authority, longevity, and command over others.',
      strength: dignityOf('Saturn') === 'Exalted' ? 'Strong' : 'Moderate',
      confidence: 88,
    });
  }

  // ─── Vipreet Raj Yoga ─────────────────────────────────────────────────
  // Lords of 6, 8, 12 placed in other dusthana houses
  const dusthanaLords = DUSTHANA.map((h) => ({ house: h, lord: chart.houses[h - 1] }));
  const SIGN_LORDS_MAP: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
  };
  const PLANET_SIGN_MAP: Record<string, string> = {
    Sun: chart.sun.sign, Moon: chart.moon.sign, Mars: chart.mars.sign,
    Mercury: chart.mercury.sign, Jupiter: chart.jupiter.sign,
    Venus: chart.venus.sign, Saturn: chart.saturn.sign,
  };
  for (const dl of dusthanaLords) {
    const lordName = SIGN_LORDS_MAP[dl.lord];
    if (!lordName) continue;
    const lordSign = PLANET_SIGN_MAP[lordName];
    if (!lordSign) continue;
    const lordHouse = getHouseFromLagna(lordSign, lagna);
    // Lord of a dusthana in a *different* dusthana
    if (DUSTHANA.includes(lordHouse) && lordHouse !== dl.house) {
      yogas.push({
        name: 'Vipreet Raj Yoga',
        description: `Lord of ${dl.house}th house (${lordName}) in ${lordHouse}th house — adversity transforms into advantage; gains through others' losses.`,
        strength: 'Moderate',
        confidence: 72,
      });
      break; // Only report once
    }
  }

  // ─── Neech Bhanga Raj Yoga ────────────────────────────────────────────
  // Debilitated planet with its debilitation sign lord in Kendra from Lagna or Moon
  for (const p of planets) {
    if (p.dignity !== 'Debilitated') continue;
    const debSignLord = SIGN_LORDS_MAP[p.sign];
    if (!debSignLord) continue;
    const debLordSign = PLANET_SIGN_MAP[debSignLord];
    if (!debLordSign) continue;
    const debLordHouseFromLagna = getHouseFromLagna(debLordSign, lagna);
    const debLordHouseFromMoon = getHouseFromLagna(debLordSign, chart.moon.sign);
    if (isKendra(debLordHouseFromLagna) || isKendra(debLordHouseFromMoon)) {
      yogas.push({
        name: 'Neech Bhanga Raj Yoga',
        description: `${p.planet} is debilitated in ${p.sign}, but its debilitation sign lord ${debSignLord} is in Kendra — initial weakness transforms into exceptional strength over time.`,
        strength: 'Strong',
        confidence: 78,
      });
    }
  }

  // ─── Parivartana Yoga (Mutual Exchange) ───────────────────────────────
  const planetPairs: [string, string][] = [
    ['Sun', 'Moon'], ['Sun', 'Mars'], ['Sun', 'Mercury'], ['Sun', 'Jupiter'], ['Sun', 'Venus'], ['Sun', 'Saturn'],
    ['Moon', 'Mars'], ['Moon', 'Mercury'], ['Moon', 'Jupiter'], ['Moon', 'Venus'], ['Moon', 'Saturn'],
    ['Mars', 'Mercury'], ['Mars', 'Jupiter'], ['Mars', 'Venus'], ['Mars', 'Saturn'],
    ['Mercury', 'Jupiter'], ['Mercury', 'Venus'], ['Mercury', 'Saturn'],
    ['Jupiter', 'Venus'], ['Jupiter', 'Saturn'],
    ['Venus', 'Saturn'],
  ];
  for (const [p1, p2] of planetPairs) {
    const s1 = signOf(p1);
    const s2 = signOf(p2);
    const lord1 = SIGN_LORDS_MAP[s1];
    const lord2 = SIGN_LORDS_MAP[s2];
    if (lord1 === p2 && lord2 === p1) {
      yogas.push({
        name: `Parivartana Yoga (${p1} ↔ ${p2})`,
        description: `${p1} in ${p2}'s sign and ${p2} in ${p1}'s sign — mutual exchange strengthens both planets and their house significations.`,
        strength: 'Strong',
        confidence: 85,
      });
    }
  }

  // ─── Lakshmi Yoga ─────────────────────────────────────────────────────
  // 9th lord in Kendra/Trikona, strong, with benefic associations
  const ninthLordSign = chart.houses[8]; // 9th house (0-indexed)
  const ninthLord = SIGN_LORDS_MAP[ninthLordSign];
  if (ninthLord) {
    const nlSign = PLANET_SIGN_MAP[ninthLord];
    if (nlSign) {
      const nlHouse = getHouseFromLagna(nlSign, lagna);
      const nlDignity = getDignity(ninthLord, nlSign);
      if ((isKendra(nlHouse) || isTrikona(nlHouse)) && nlDignity !== 'Debilitated') {
        yogas.push({
          name: 'Lakshmi Yoga',
          description: `9th lord ${ninthLord} is strong in ${nlHouse}th house (${nlDignity}) — wealth, fortune, dharma, and divine grace.`,
          strength: (isKendra(nlHouse) && (nlDignity === 'Exalted' || nlDignity === 'Own Sign')) ? 'Strong' : 'Moderate',
          confidence: 75,
        });
      }
    }
  }

  // ─── Amala Yoga ───────────────────────────────────────────────────────
  // Natural benefic (Jupiter, Venus, Mercury, or waxing Moon) in 10th from Moon
  const tenthFromMoon = ((houseOf('Moon') - 1 + 10 - 1) % 12) + 1;
  const planetsIn10thFromMoon = planets.filter((p) => p.house === tenthFromMoon && ['Jupiter', 'Venus', 'Mercury'].includes(p.planet));
  if (planetsIn10thFromMoon.length > 0) {
    yogas.push({
      name: 'Amala Yoga',
      description: `${planetsIn10thFromMoon.map((p) => p.planet).join(', ')} in 10th from Moon — pure character, good reputation, and charitable nature.`,
      strength: 'Moderate',
      confidence: 70,
    });
  }

  // ─── Dhana Yoga (Wealth combinations) ─────────────────────────────────
  // 2nd lord and 11th lord connected, or either in Kendra/Trikona
  const secondLordSign = chart.houses[1]; // 2nd house
  const eleventhLordSign = chart.houses[10]; // 11th house
  const secondLord = SIGN_LORDS_MAP[secondLordSign];
  const eleventhLord = SIGN_LORDS_MAP[eleventhLordSign];
  if (secondLord && eleventhLord && secondLord !== eleventhLord) {
    const s2lSign = PLANET_SIGN_MAP[secondLord];
    const s11lSign = PLANET_SIGN_MAP[eleventhLord];
    if (s2lSign && s11lSign) {
      const s2lHouse = getHouseFromLagna(s2lSign, lagna);
      const s11lHouse = getHouseFromLagna(s11lSign, lagna);
      // Both lords in Kendra or Trikona, or connected
      const s2lStrong = isKendra(s2lHouse) || isTrikona(s2lHouse);
      const s11lStrong = isKendra(s11lHouse) || isTrikona(s11lHouse);
      if (s2lStrong && s11lStrong) {
        yogas.push({
          name: 'Dhana Yoga',
          description: `2nd lord ${secondLord} in ${s2lHouse}th and 11th lord ${eleventhLord} in ${s11lHouse}th — strong wealth accumulation potential through multiple income streams.`,
          strength: 'Moderate',
          confidence: 72,
        });
      }
    }
  }

  // ─── Saraswati Yoga ───────────────────────────────────────────────────
  // Jupiter, Venus, Mercury all in Kendra/Trikona houses
  const saraswatiPlanets = ['Jupiter', 'Venus', 'Mercury'].filter((p) => {
    const h = houseOf(p);
    return isKendra(h) || isTrikona(h);
  });
  if (saraswatiPlanets.length === 3) {
    yogas.push({
      name: 'Saraswati Yoga',
      description: 'Jupiter, Venus, and Mercury all in Kendra/Trikona — exceptional learning, artistic talent, and eloquence.',
      strength: 'Strong',
      confidence: 82,
    });
  }

  return yogas;
}

function computeRatings(chart: BirthChartData, planets: PlanetAnalysis[], manglik: ManglikAnalysis, yogas: YogaResult[]): Record<string, number> {
  const score = (factors: number[]) => Math.min(5, Math.max(1, Math.round(factors.reduce((a, b) => a + b, 0) / factors.length)));

  const dignityBonus = (p: string) => {
    const d = planets.find((x) => x.planet === p)?.dignity;
    if (d === 'Exalted' || d === 'Own Sign' || d === 'Moolatrikona') return 5;
    if (d === 'Debilitated') return 2;
    return 3;
  };

  const houseOf = (p: string) => planets.find((x) => x.planet === p)?.house ?? 6;

  const career = score([
    dignityBonus('Sun'),
    dignityBonus('Saturn'),
    isKendra(houseOf('Sun')) ? 5 : 3,
    isKendra(houseOf('Saturn')) ? 5 : 3,
    yogas.some((y) => y.name.includes('Raja')) ? 5 : 3,
  ]);

  const finance = score([
    dignityBonus('Venus'),
    dignityBonus('Jupiter'),
    [2, 11].includes(houseOf('Venus')) ? 5 : 3,
    [2, 11].includes(houseOf('Jupiter')) ? 5 : 3,
  ]);

  const marriage = score([
    dignityBonus('Venus'),
    isKendra(houseOf('Venus')) || houseOf('Venus') === 7 ? 5 : 3,
    manglik.isManglik ? 2 : 4,
    houseOf('Moon') === 7 ? 5 : 3,
  ]);

  const health = score([
    dignityBonus('Moon'),
    dignityBonus('Mars'),
    DUSTHANA.includes(houseOf('Moon')) ? 2 : 4,
    DUSTHANA.includes(houseOf('Mars')) ? 2 : 4,
  ]);

  const education = score([
    dignityBonus('Mercury'),
    dignityBonus('Jupiter'),
    [4, 5, 9].includes(houseOf('Mercury')) ? 5 : 3,
  ]);

  const fortune = score([
    dignityBonus('Jupiter'),
    [1, 5, 9, 10, 11].includes(houseOf('Jupiter')) ? 5 : 3,
    yogas.filter((y) => y.strength === 'Strong').length >= 1 ? 5 : 3,
  ]);

  return { career, finance, marriage, health, education, fortune };
}

function buildRemedies(planets: PlanetAnalysis[]): string[] {
  const remedies: string[] = [];
  for (const p of planets) {
    if (p.dignity === 'Debilitated' || DUSTHANA.includes(p.house)) {
      const planetRemedies = PLANET_REMEDIES[p.planet];
      if (planetRemedies?.[0]) remedies.push(`${p.planet}: ${planetRemedies[0]}`);
    }
  }
  if (remedies.length === 0) {
    remedies.push('Maintain regular spiritual practice aligned with your current Mahadasha lord.');
  }
  return remedies.slice(0, 5);
}

export function analyzeChart(chart: BirthChartData): ChartAnalysis {
  const lagna = chart.ascendant.sign;

  const planets: PlanetAnalysis[] = PLANET_KEYS.map((key) => {
    const data = chart[key] as PlanetPosition & { isRetrograde?: boolean };
    const label = PLANET_LABELS[key];
    const house = getHouseFromLagna(data.sign, lagna);
    return {
      planet: label,
      sign: data.sign,
      house,
      dignity: getDignity(label, data.sign),
      isRetrograde: !!data.isRetrograde,
      degree: data.degree,
    };
  });

  const manglik = analyzeManglik(chart);
  const yogas = detectYogas(chart, planets);

  const houseLords: Record<number, string> = {};
  for (let h = 1; h <= 12; h++) {
    houseLords[h] = chart.houses[h - 1];
  }

  const kendraPlanets = planets.filter((p) => isKendra(p.house)).map((p) => p.planet);
  const trikonaPlanets = planets.filter((p) => isTrikona(p.house)).map((p) => p.planet);
  const afflictedPlanets = planets
    .filter((p) => p.dignity === 'Debilitated' || DUSTHANA.includes(p.house))
    .map((p) => p.planet);

  const remedies = buildRemedies(planets);
  const ratings = computeRatings(chart, planets, manglik, yogas);

  // Confidence scores: how many deterministic factors support each area rating
  const yogaCount = yogas.filter((y) => y.strength === 'Strong').length;
  const confidenceScores: Record<string, number> = {
    career: Math.min(95, 60 + yogaCount * 5 + (afflictedPlanets.includes('Sun') || afflictedPlanets.includes('Saturn') ? -10 : 10)),
    finance: Math.min(95, 60 + yogaCount * 5 + (yogas.some((y) => y.name.includes('Dhana')) ? 10 : 0)),
    marriage: Math.min(95, 55 + (manglik.isManglik ? -10 : 10) + yogaCount * 3),
    health: Math.min(95, 60 + (afflictedPlanets.includes('Moon') ? -15 : 5) + (afflictedPlanets.includes('Mars') ? -5 : 5)),
    education: Math.min(95, 60 + yogaCount * 5 + (yogas.some((y) => y.name.includes('Saraswati')) ? 15 : 0)),
    fortune: Math.min(95, 55 + yogaCount * 8),
    overall: 0, // computed below
  };
  const confValues = Object.values(confidenceScores).filter((v) => v > 0);
  confidenceScores.overall = Math.round(confValues.reduce((a, b) => a + b, 0) / confValues.length);

  return {
    planets,
    manglik,
    yogas,
    houseLords,
    kendraPlanets,
    trikonaPlanets,
    afflictedPlanets,
    remedies,
    ratings,
    confidenceScores,
  };
}

export function getNakshatraGana(nakshatraName: string): 'Deva' | 'Manushya' | 'Rakshasa' {
  return getGana(nakshatraIndex(nakshatraName));
}

export { HOUSE_THEMES };
