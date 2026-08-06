import type { BirthChartData } from '@/lib/ephemeris';
import { analyzeChart, getNakshatraGana } from './chart-analysis';
import {
  NAKSHATRA_NAMES, nakshatraIndex, SIGN_LORDS, getVarna, varnaScore,
  vashyaScore, taraScore, yoniScore, grahaMaitriScore, ganaScore,
  bhakootScore, nadiScore, getGana,
} from './constants';

export interface KootaResult {
  name: string;
  maxPoints: number;
  score: number;
  assessment: string;
}

export interface AshtakootResult {
  kootas: KootaResult[];
  totalScore: number;
  maxScore: 36;
  verdict: 'Excellent' | 'Good' | 'Moderate' | 'Challenging';
  verdictDetail: string;
  nadiDosha: boolean;
  bhakootDosha: boolean;
  manglik: {
    partner1: { isManglik: boolean; marsHouseFromLagna: number; severity: string };
    partner2: { isManglik: boolean; marsHouseFromLagna: number; severity: string };
    compatible: boolean;
    note: string;
  };
}

function verdictFromScore(total: number): AshtakootResult['verdict'] {
  if (total >= 33) return 'Excellent';
  if (total >= 25) return 'Good';
  if (total >= 18) return 'Moderate';
  return 'Challenging';
}

function verdictDetail(score: number): string {
  if (score >= 33) return 'Highly auspicious match (33+ guns) — strong foundation for marriage.';
  if (score >= 25) return 'Good compatibility (25–32 guns) — favorable with minor adjustments.';
  if (score >= 18) return 'Moderate compatibility (18–24 guns) — workable with conscious effort and remedies.';
  return 'Below traditional minimum (under 18 guns) — significant differences; remedies and expert consultation advised.';
}

export function computeAshtakoot(
  chart1: BirthChartData,
  chart2: BirthChartData,
  partner1Name: string,
  partner2Name: string,
): AshtakootResult {
  const boy = chart1;
  const girl = chart2;
  const boyNakIdx = nakshatraIndex(boy.nakshatra.name);
  const girlNakIdx = nakshatraIndex(girl.nakshatra.name);

  const varna = varnaScore(boy.moon.sign, girl.moon.sign);
  const vashya = vashyaScore(boy.moon.sign, girl.moon.sign);
  const tara = taraScore(boyNakIdx, girlNakIdx);
  const yoni = yoniScore(boyNakIdx, girlNakIdx);
  const boyLord = SIGN_LORDS[boy.moon.sign as keyof typeof SIGN_LORDS];
  const girlLord = SIGN_LORDS[girl.moon.sign as keyof typeof SIGN_LORDS];
  const grahaMaitri = grahaMaitriScore(boyLord, girlLord);
  const boyGana = getGana(boyNakIdx);
  const girlGana = getGana(girlNakIdx);
  const gana = ganaScore(boyGana, girlGana);
  const bhakoot = bhakootScore(boy.moon.sign, girl.moon.sign);
  const nadi = nadiScore(boyNakIdx, girlNakIdx);

  const kootas: KootaResult[] = [
    {
      name: 'Varna (Spiritual)',
      maxPoints: 1,
      score: varna,
      assessment: `${partner1Name} varna rank ${getVarna(boy.moon.sign)} vs ${partner2Name} ${getVarna(girl.moon.sign)} — ${varna ? 'compatible' : 'mismatch'}.`,
    },
    {
      name: 'Vashya (Mutual Attraction)',
      maxPoints: 2,
      score: vashya,
      assessment: `Moon signs ${boy.moon.sign} & ${girl.moon.sign} — vashya coefficient ${vashya}/2.`,
    },
    {
      name: 'Tara (Health & Longevity)',
      maxPoints: 3,
      score: tara.score,
      assessment: `Tara: ${partner1Name}→${partner2Name}: ${tara.boyToGirl}; reverse: ${tara.girlToBoy}.`,
    },
    {
      name: 'Yoni (Temperament)',
      maxPoints: 4,
      score: yoni.score,
      assessment: `${partner1Name} (${yoni.boyYoni}) & ${partner2Name} (${yoni.girlYoni}) — ${yoni.score}/4.`,
    },
    {
      name: 'Graha Maitri (Mental)',
      maxPoints: 5,
      score: grahaMaitri,
      assessment: `Moon lords ${boyLord} & ${girlLord} — friendship score ${grahaMaitri}/5.`,
    },
    {
      name: 'Gana (Temperament Nature)',
      maxPoints: 6,
      score: gana,
      assessment: `${partner1Name} (${boyGana}) & ${partner2Name} (${girlGana}) — ${gana}/6.`,
    },
    {
      name: 'Bhakoot (Emotional)',
      maxPoints: 7,
      score: bhakoot.score,
      assessment: bhakoot.dosha
        ? `Bhakoot dosha — Moons ${bhakoot.distance} houses apart (0/7).`
        : `No Bhakoot dosha — Moons harmoniously placed (${bhakoot.score}/7).`,
    },
    {
      name: 'Nadi (Health & Progeny)',
      maxPoints: 8,
      score: nadi.score,
      assessment: nadi.dosha
        ? `Nadi dosha — both ${nadi.boyNadi} nadi (0/8). Remedies recommended.`
        : `Different nadis (${nadi.boyNadi} & ${nadi.girlNadi}) — ${nadi.score}/8.`,
    },
  ];

  const totalScore = kootas.reduce((sum, k) => sum + k.score, 0);

  const analysis1 = analyzeChart(chart1);
  const analysis2 = analyzeChart(chart2);

  const bothManglik = analysis1.manglik.isManglik && analysis2.manglik.isManglik;
  const oneManglik = analysis1.manglik.isManglik !== analysis2.manglik.isManglik;
  let manglikNote = 'Neither partner has Mangal dosha.';
  if (bothManglik) manglikNote = 'Both partners are Manglik — dosha mutually cancelled per classical rules.';
  else if (oneManglik) manglikNote = 'One partner is Manglik — partial dosha; remedies or matching consultation advised.';

  return {
    kootas,
    totalScore: Math.round(totalScore * 10) / 10,
    maxScore: 36,
    verdict: verdictFromScore(totalScore),
    verdictDetail: verdictDetail(totalScore),
    nadiDosha: nadi.dosha,
    bhakootDosha: bhakoot.dosha,
    manglik: {
      partner1: {
        isManglik: analysis1.manglik.isManglik,
        marsHouseFromLagna: analysis1.manglik.marsHouseFromLagna,
        severity: analysis1.manglik.severity,
      },
      partner2: {
        isManglik: analysis2.manglik.isManglik,
        marsHouseFromLagna: analysis2.manglik.marsHouseFromLagna,
        severity: analysis2.manglik.severity,
      },
      compatible: !oneManglik || bothManglik,
      note: manglikNote,
    },
  };
}

export { getNakshatraGana, NAKSHATRA_NAMES };
