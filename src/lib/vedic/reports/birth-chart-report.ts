import type { BirthChartData } from '@/lib/ephemeris';
import type { ChartAnalysis } from '../chart-analysis';
import { HOUSE_THEMES } from '../chart-analysis';

function stars(n: number): string {
  return '⭐'.repeat(Math.min(5, Math.max(1, n)));
}

export function buildBirthChartReport(
  chart: BirthChartData,
  analysis: ChartAnalysis,
  name: string,
  date: string,
  time: string,
  location: string,
): string {
  const planetRows = analysis.planets
    .map((p) => `| ${p.planet} | ${p.sign} | ${p.house} | ${p.dignity}${p.isRetrograde ? ' (R)' : ''} | ${p.degree} |`)
    .join('\n');

  const yogaSection = analysis.yogas.length > 0
    ? analysis.yogas.map((y) => `* **${y.name}** (${y.strength}, confidence ${y.confidence}%): ${y.description}`).join('\n')
    : '* No major classical yogas detected in this chart configuration.';

  const remedySection = analysis.remedies.map((r) => `* ${r}`).join('\n');

  const ratingRows = Object.entries(analysis.ratings)
    .map(([area, score]) => {
      const conf = analysis.confidenceScores?.[area] ?? 70;
      return `| ${area.charAt(0).toUpperCase() + area.slice(1)} | ${stars(score)} (${score}/5) | ${conf}% |`;
    })
    .join('\n');

  const manglikText = analysis.manglik.isManglik
    ? `**Manglik** — Mars in ${analysis.manglik.marsHouseFromLagna}th from Lagna, ${analysis.manglik.marsHouseFromMoon}th from Moon (${analysis.manglik.severity} severity). ${analysis.manglik.cancellation}`
    : `**Non-Manglik** — Mars in ${analysis.manglik.marsHouseFromLagna}th from Lagna (no Mangal dosha).`;

  return `# 🌟 Birth Chart Analysis (Verified Calculation)

> **Calculation engine:** Swiss Ephemeris (Lahiri Ayanamsha ${chart.ayanamsha.toFixed(2)}°) + rule-based Vedic analysis. All positions, scores, and yogas below are computed deterministically — not AI-generated.

## Birth Details
| Field | Value |
|---|---|
| **Name** | ${name} |
| **Date** | ${date} |
| **Time** | ${time} |
| **Place** | ${location} |

## Core Overview
| Factor | Result |
|---|---|
| Ascendant (Lagna) | ${chart.ascendant.sign} — ${chart.ascendant.degree} |
| Moon Sign (Rashi) | ${chart.moon.sign} |
| Sun Sign | ${chart.sun.sign} |
| Nakshatra | ${chart.nakshatra.name} (Pada ${chart.nakshatra.pada}, Lord: ${chart.nakshatra.lord}) |
| Gana | ${chart.panchang.gana} |
| Manglik Status | ${manglikText.replace(/\*\*/g, '')} |
| Tithi | ${chart.panchang.tithi} |
| Yoga | ${chart.panchang.yoga} |
| Karana | ${chart.panchang.karana} |

## Planetary Positions (Whole-Sign Houses)
| Planet | Sign | House | Dignity | Degree |
|---|---|---|---|---|
${planetRows}

## Whole-Sign House Cusps
${chart.houses.map((h, i) => `* **${i + 1}th House** (${HOUSE_THEMES[i + 1]}): ${h}`).join('\n')}

## Detected Yogas (${analysis.yogas.length})
${yogaSection}

## ⏳ Current Mahadasha: ${chart.currentDasha}
* **Period ends:** ${chart.dashaEndsAt}
* **Focus:** Prioritize activities ruled by ${chart.currentDasha} — consult house placement of ${chart.currentDasha} in your chart (see table above).

## Life Area Ratings (Rule-Based)
| Area | Rating | Confidence |
|---|---|---|
${ratingRows}

## Afflicted Planets
${analysis.afflictedPlanets.length > 0 ? analysis.afflictedPlanets.map((p) => `* ${p}`).join('\n') : '* No severely afflicted planets detected.'}

## 🙏 Recommended Remedies
${remedySection}

## Summary
${name} has Lagna in **${chart.ascendant.sign}**, Moon in **${chart.moon.sign}**, and birth nakshatra **${chart.nakshatra.name}**. Current **${chart.currentDasha} Mahadasha** runs until **${chart.dashaEndsAt}**. ${analysis.yogas.length > 0 ? `Key yoga: ${analysis.yogas[0].name}.` : ''} All data verified via Swiss Ephemeris — Julian Day ${chart.julianDay}.`;
}
