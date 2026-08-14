/**
 * Structured Astrology Analysis Builder
 *
 * Combines ALL deterministic Vedic engines into a single structured JSON-ready output.
 * This is the central orchestrator that the AI pipeline consumes:
 *
 *   Birth Data → Swiss Ephemeris → Rule Engines → Structured Analysis → AI Explanation Only
 *
 * The AI should NEVER invent yogas, doshas, or positions — it only explains this data.
 */

import type { BirthChartData } from '@/lib/ephemeris';
import { analyzeChart, type ChartAnalysis, type YogaResult } from './chart-analysis';
import {
  computeAllDivisionalCharts,
  getVargottamaPlanets,
  getPushkaraPlanets,
  navamsaMarriageStrength,
  dashamsaCareerStrength,
  formatDivisionalChart,
  type DivisionalChart,
} from './divisional-charts';
import {
  computeAllPlanetStrengths,
  formatPlanetStrengths,
  type PlanetStrength,
} from './planet-strength';
import {
  detectAllDoshas,
  getActiveDoshas,
  formatDoshas,
  type DoshaResult,
} from './doshas';
import { HOUSE_THEMES } from './constants';

export interface StructuredAstrologyAnalysis {
  // Core chart
  ascendant: string;
  moonSign: string;
  sunSign: string;
  nakshatra: { name: string; pada: number; lord: string; percentageElapsed?: number };
  gana: string;
  currentDasha: string;
  currentAntardasha?: string;
  currentPratyantardasha?: string;
  dashaEndsAt: string;

  // Planetary positions with strength
  planets: Array<{
    planet: string;
    sign: string;
    house: number;
    dignity: string;
    isRetrograde: boolean;
    degree: string;
    compositeStrength: number; // 0-100
  }>;

  // Yogas detected
  yogas: Array<{
    name: string;
    description: string;
    strength: string;
    confidence: number;
  }>;

  // Doshas detected
  doshas: Array<{
    name: string;
    severity: string;
    description: string;
    cancellation: string[];
    remedy: string;
  }>;

  // Manglik
  manglik: {
    isManglik: boolean;
    severity: string;
    marsHouseFromLagna: number;
    marsHouseFromMoon: number;
    cancellation: string;
  };

  // Divisional chart highlights
  navamsa: {
    ascendant: string;
    vargottamaPlanets: string[];
    pushkaraPlanets: string[];
    marriageStrength: { venusDignity: string; seventhLordDignity: string; score: number };
  };
  dashamsa: {
    ascendant: string;
    careerStrength: { sunDignity: string; tenthLordDignity: string; saturnDignity: string; score: number };
  };

  // Life area ratings (1-5) with confidence (0-100)
  ratings: Record<string, number>;
  confidenceScores: Record<string, number>;

  // House lords
  houseLords: Record<number, string>;

  // Remedies
  remedies: string[];

  // Formatted sections for prompt injection
  formatted: {
    planetStrengthTable: string;
    yogaSection: string;
    doshaSection: string;
    divisionalSections: string;
    houseTable: string;
    confidenceTable: string;
  };
}

export function buildStructuredAnalysis(chart: BirthChartData): StructuredAstrologyAnalysis {
  // Run all deterministic engines
  const analysis = analyzeChart(chart);
  const divisional = computeAllDivisionalCharts(chart);
  const strengths = computeAllPlanetStrengths(chart);
  const allDoshas = detectAllDoshas(chart);
  const activeDoshas = getActiveDoshas(allDoshas);

  // Divisional insights
  const vargottama = getVargottamaPlanets(chart);
  const pushkara = getPushkaraPlanets(chart);
  const navamsaMarriage = navamsaMarriageStrength(divisional.D9, chart);
  const dashamsaCareer = dashamsaCareerStrength(divisional.D10);

  // Planet strength table
  const planetStrengthTable = formatPlanetStrengths(strengths);

  // Yoga section
  const yogaSection =
    analysis.yogas.length > 0
      ? analysis.yogas
          .map((y) => `* **${y.name}** (${y.strength}, confidence ${y.confidence}%): ${y.description}`)
          .join('\n')
      : '* No major classical yogas detected in this chart configuration.';

  // Dosha section
  const doshaSection = formatDoshas(allDoshas);

  // Divisional chart sections
  const divisionalSections = [
    formatDivisionalChart(divisional.D9),
    formatDivisionalChart(divisional.D10),
  ].join('\n\n');

  // House table
  const houseTable = chart.houses
    .map((h, i) => {
      const lord = analysis.houseLords[i + 1];
      const theme = HOUSE_THEMES[i + 1];
      return `| ${i + 1} | ${h} | ${lord} | ${theme} |`;
    })
    .join('\n');

  // Confidence table
  const confidenceTable = Object.entries(analysis.confidenceScores)
    .map(([area, score]) => `| ${area.charAt(0).toUpperCase() + area.slice(1)} | ${score}% |`)
    .join('\n');

  // Build planets array with composite strength
  const planetsWithStrength = analysis.planets.map((p) => {
    const str = strengths.find((s) => s.planet === p.planet);
    return {
      planet: p.planet,
      sign: p.sign,
      house: p.house,
      dignity: p.dignity,
      isRetrograde: p.isRetrograde,
      degree: p.degree,
      compositeStrength: str?.compositeScore ?? 50,
    };
  });

  return {
    ascendant: chart.ascendant.sign,
    moonSign: chart.moon.sign,
    sunSign: chart.sun.sign,
    nakshatra: chart.nakshatra,
    gana: chart.panchang.gana,
    currentDasha: chart.currentDasha,
    currentAntardasha: chart.currentAntardasha,
    currentPratyantardasha: chart.currentPratyantardasha,
    dashaEndsAt: chart.dashaEndsAt,
    planets: planetsWithStrength,
    yogas: analysis.yogas,
    doshas: activeDoshas,
    manglik: analysis.manglik,
    navamsa: {
      ascendant: divisional.D9.ascendant,
      vargottamaPlanets: vargottama,
      pushkaraPlanets: pushkara,
      marriageStrength: navamsaMarriage,
    },
    dashamsa: {
      ascendant: divisional.D10.ascendant,
      careerStrength: dashamsaCareer,
    },
    ratings: analysis.ratings,
    confidenceScores: analysis.confidenceScores,
    houseLords: analysis.houseLords,
    remedies: analysis.remedies,
    formatted: {
      planetStrengthTable,
      yogaSection,
      doshaSection,
      divisionalSections,
      houseTable,
      confidenceTable,
    },
  };
}

export function buildAnalysisJSON(analysis: StructuredAstrologyAnalysis): string {
  return JSON.stringify(
    {
      Ascendant: analysis.ascendant,
      MoonSign: analysis.moonSign,
      SunSign: analysis.sunSign,
      Nakshatra: `${analysis.nakshatra.name} (Pada ${analysis.nakshatra.pada}, Lord: ${analysis.nakshatra.lord})`,
      Gana: analysis.gana,
      CurrentDasha: `${analysis.currentDasha} Mahadasha / ${analysis.currentAntardasha || 'Self'} Antardasha (ends: ${analysis.dashaEndsAt})`,
      Manglik: analysis.manglik.isManglik
        ? `${analysis.manglik.severity} — Mars ${analysis.manglik.marsHouseFromLagna}th from Lagna, ${analysis.manglik.marsHouseFromMoon}th from Moon. ${analysis.manglik.cancellation}`
        : 'Non-Manglik',
      Yogas: analysis.yogas.map((y) => ({
        name: y.name,
        strength: y.strength,
        confidence: `${y.confidence}%`,
      })),
      Doshas: analysis.doshas.map((d) => ({
        name: d.name,
        severity: d.severity,
        cancellation: d.cancellation,
      })),
      PlanetStrength: analysis.planets.map((p) => ({
        planet: p.planet,
        sign: p.sign,
        house: p.house,
        dignity: p.dignity + (p.isRetrograde ? ' (R)' : ''),
        strength: `${p.compositeStrength}/100`,
      })),
      NavamsaD9: {
        ascendant: analysis.navamsa.ascendant,
        vargottamaPlanets: analysis.navamsa.vargottamaPlanets,
        pushkaraPlanets: analysis.navamsa.pushkaraPlanets,
        marriageStrength: `${analysis.navamsa.marriageStrength.score}/5`,
      },
      DashamsaD10: {
        ascendant: analysis.dashamsa.ascendant,
        careerStrength: `${analysis.dashamsa.careerStrength.score}/5`,
      },
      LifeRatings: analysis.ratings,
      Confidence: analysis.confidenceScores,
      Remedies: analysis.remedies,
    },
    null,
    2
  );
}
