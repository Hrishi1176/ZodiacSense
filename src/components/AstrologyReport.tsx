'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './AstrologyReport.module.css';
import GoldDefs from './GoldDefs';
import ZodiacWheelChart, { PLANET_ICONS, PLANET_ICON_COLORS } from './ZodiacWheelChart';
import { SignIcon, DashaIcon } from './ZodiacIcons';
// ─── Types ──────────────────────────────────────────────────────────────────

interface YogaData { name: string; strength: string; confidence: number; description?: string }
interface DoshaData { name: string; severity: string; description?: string; cancellation?: string[]; remedy?: string }

export interface ReportMetadata {
  ascendant?: string;
  sunSign?: string;
  moonSign?: string;
  nakshatra?: string;
  currentDasha?: string;
  ayanamsha?: number;
  geocodedLocation?: string;
  timezone?: string;
  planets?: Array<{ planet: string; sign: string; house: number; dignity?: string; isRetrograde?: boolean }>;
  yogas?: YogaData[];
  doshas?: DoshaData[];
  ratings?: Record<string, number>;
  confidenceScores?: Record<string, number>;
  verified?: boolean;
}

interface AstrologyReportProps {
  result: string;
  metadata: ReportMetadata | null;
  birthData: { name: string; date: string; time: string; location: string };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

const SOUTH_INDIAN_LAYOUT = [
  11, 0, 1, 2,
  10, -1, -1, 3,
  9, -1, -1, 4,
  8, 7, 6, 5,
];

function signIndex(sign: string): number {
  return SIGNS.indexOf(sign);
}


function DignityBadge({ dignity }: { dignity?: string }) {
  const { t } = useTranslation();
  const cls =
    dignity === 'Exalted' ? styles.badgeExalted :
    dignity === 'Own Sign' ? styles.badgeOwnSign :
    dignity === 'Moolatrikona' ? styles.badgeMoolatrikona :
    dignity === 'Debilitated' ? styles.badgeDebilitated :
    styles.badgeNeutral;
  const label =
    dignity === 'Exalted' ? t('dignity_exalted') :
    dignity === 'Own Sign' ? t('dignity_own_sign') :
    dignity === 'Moolatrikona' ? t('dignity_moolatrikona') :
    dignity === 'Debilitated' ? t('dignity_debilitated') :
    dignity || t('dignity_neutral');
  return <span className={`${styles.badge} ${cls}`}>{label}</span>;
}

function StrengthMeter({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#f87171';
  return (
    <div className={styles.strengthBar}>
      <div className={styles.strengthTrack}>
        <div className={styles.strengthFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className={styles.strengthValue} style={{ color }}>{value}</span>
    </div>
  );
}

void StrengthMeter; // reserved for planet strength rows in a future iteration

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className={styles.yogaConfidence}>
      <span>{value}%</span>
      <div className={styles.confidenceBar}>
        <div className={styles.confidenceFill} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ─── Chart Grid Renderer ────────────────────────────────────────────────────

function ChartGrid({ ascendant, planets, isMini = false }: {
  ascendant: string;
  planets: Array<{ planet: string; sign: string; house: number; dignity?: string; isRetrograde?: boolean }>;
  isMini?: boolean;
}) {
  const { t } = useTranslation();
  const ascIdx = signIndex(ascendant);

  // Group planets by sign
  const planetsBySign = new Map<string, typeof planets>();
  for (const p of planets) {
    const list = planetsBySign.get(p.sign) || [];
    list.push(p);
    planetsBySign.set(p.sign, list);
  }

  const gridClass = isMini ? styles.miniChartGrid : styles.chartGrid;
  const cellClass = isMini ? styles.miniCell : styles.chartCell;
  const signClass = isMini ? styles.miniCellSign : styles.chartCellSign;
  const planetClass = isMini ? styles.miniCellPlanets : styles.chartCellPlanets;
  const centerClass = isMini ? styles.miniCellCenter : styles.chartCellCenter;

  return (
    <div className={gridClass}>
      {SOUTH_INDIAN_LAYOUT.map((signIdx, i) => {
        if (signIdx === -1) {
          // Center cells
          if (i === 5) {
            return (
              <div key={i} className={`${cellClass} ${centerClass}`}>
                {!isMini && (
                  <div className={styles.centerLabel}>
                    <SignIcon sign={ascendant} size={28} className={styles.signIconCenter} /><br />
                    <span className={styles.centerLabelSmall}>{t('report_lagna')}</span>
                  </div>
                )}
              </div>
            );
          }
          return <div key={i} className={`${cellClass} ${centerClass}`} />;
        }

        const sign = SIGNS[signIdx];
        const house = ((signIdx - ascIdx + 12) % 12) + 1;
        const signPlanets = planetsBySign.get(sign) || [];

        return (
          <div key={i} className={cellClass}>
            {!isMini && <span className={styles.chartCellHouse}>{house}</span>}
            <span className={signClass} title={t(`signs.${sign}`, sign)}>
              <SignIcon sign={sign} size={isMini ? 16 : 22} />
            </span>

            <span className={planetClass}>
              {signPlanets.map((p) => {
                const PlanetIcon = PLANET_ICONS[p.planet];
                const dignityCls = p.dignity === 'Exalted' ? styles.exalted
                  : p.dignity === 'Debilitated' ? styles.debilitated
                  : p.dignity === 'Own Sign' || p.dignity === 'Moolatrikona' ? styles.ownSign : '';
                return (
                  <span
                    key={p.planet}
                    className={`${styles.gridPlanetChip} ${dignityCls}`}
                    title={`${t(`planets.${p.planet}`, p.planet)}${p.isRetrograde ? ` — ${t('report_retrograde')}` : ''}`}
                  >
                    {PlanetIcon && <PlanetIcon className={styles.gridPlanetIcon} aria-hidden="true" />}
                    {p.isRetrograde && !isMini && <span className={styles.retrograde}>R</span>}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Parse planets from AI markdown (fallback) ──────────────────────────────

function parsePlanetsFromMarkdown(md: string): Array<{ planet: string; sign: string; house: number; dignity: string; isRetrograde: boolean }> {
  const planets: Array<{ planet: string; sign: string; house: number; dignity: string; isRetrograde: boolean }> = [];
  const lines = md.split('\n');
  for (const line of lines) {
    // Match table rows like: | Sun | Aries | 5 | Exalted |
    const match = line.match(/^\|\s*(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\s*\|\s*(\w+)\s*\|\s*(\d+)\s*\|\s*([\w\s]+?)(?:\s*\(R\))?\s*\|/i);
    if (match) {
      planets.push({
        planet: match[1],
        sign: match[2],
        house: parseInt(match[3]),
        dignity: match[4].trim(),
        isRetrograde: /\(R\)/i.test(line),
      });
    }
  }
  return planets;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AstrologyReport({ result, metadata, birthData }: AstrologyReportProps) {
  const { t } = useTranslation();
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [chartView, setChartView] = useState<'wheel' | 'grid'>('wheel');

  if (!metadata) {
    // Fallback: just render markdown
    return (
      <div className={styles.report}>
        <GoldDefs />
        <div className={`${styles.section}`}>
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  const yogas = metadata.yogas || [];
  const doshas = metadata.doshas || [];
  const ratings = metadata.ratings || {};
  const confidence = metadata.confidenceScores || {};

  // Build planet data — prefer deterministic data from the API, fall back to markdown parsing
  const chartPlanets = metadata.planets && metadata.planets.length > 0
    ? metadata.planets
    : parsePlanetsFromMarkdown(result);

  const ascendant = metadata.ascendant || '';
  const moonSign = metadata.moonSign || '';
  const sunSign = metadata.sunSign || '';

  const signName = (s: string) => t(`signs.${s}`, s);
  const planetName = (p: string) => t(`planets.${p}`, p);

  const starsFor = (n: number) => '⭐'.repeat(Math.min(5, Math.max(1, n)));

  return (
    <div className={styles.report}>
      <GoldDefs />

      {/* ═══ Report Header ═══ */}
      <div className={`${styles.section} ${styles.reportHeader}`}>
        <h2 className={styles.sectionTitle}><span className={styles.icon}>📜</span> {t('report_title')}</h2>
        <div className={styles.birthDetails}>
          <div className={styles.birthDetail}>
            <span className={styles.birthLabel}>{t('report_name')}</span>
            <span className={styles.birthValue}>{birthData.name}</span>
          </div>
          <div className={styles.birthDetail}>
            <span className={styles.birthLabel}>{t('report_dob')}</span>
            <span className={styles.birthValue}>{birthData.date}</span>
          </div>
          <div className={styles.birthDetail}>
            <span className={styles.birthLabel}>{t('report_tob')}</span>
            <span className={styles.birthValue}>{birthData.time}</span>
          </div>
          <div className={styles.birthDetail}>
            <span className={styles.birthLabel}>{t('report_place')}</span>
            <span className={styles.birthValue}>{metadata.geocodedLocation || birthData.location}</span>
          </div>
        </div>
      </div>

      {/* ═══ Core Overview ═══ */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><span className={styles.icon}>🌟</span> {t('report_core_overview')}</h2>
        <div className={styles.overviewGrid}>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>{t('report_ascendant')}</span>
            <span className={styles.overviewValue}><SignIcon sign={ascendant} size={28} /> {signName(ascendant)}</span>
          </div>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>{t('report_moon_sign')}</span>
            <span className={styles.overviewValue}><SignIcon sign={moonSign} size={28} /> {signName(moonSign)}</span>
          </div>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>{t('report_sun_sign')}</span>
            <span className={styles.overviewValue}><SignIcon sign={sunSign} size={28} /> {signName(sunSign)}</span>
          </div>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>{t('report_nakshatra')}</span>
            <span className={styles.overviewValue}>{metadata.nakshatra || '—'}</span>
          </div>
          <div className={styles.overviewItem}>
            <span className={styles.overviewLabel}>{t('report_current_dasha')}</span>
            <span className={styles.overviewValue}>
              {metadata.currentDasha ? (
                <>
                  <DashaIcon dasha={metadata.currentDasha} size={28} /> {planetName(metadata.currentDasha)}
                </>
              ) : '—'}
            </span>
          </div>

          {metadata.verified !== undefined && (
            <div className={styles.overviewItem}>
              <span className={styles.overviewLabel}>{t('report_verification')}</span>
              <span className={styles.overviewValue} style={{ color: metadata.verified ? '#34d399' : '#fbbf24' }}>
                {metadata.verified ? t('report_verified') : t('report_with_notes')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Birth Chart (circular wheel / South Indian grid) ═══ */}
      {ascendant && chartPlanets.length > 0 && (
        <div className={`${styles.section} ${styles.chartSection}`}>
          <div className={styles.chartHeaderRow}>
            <h2 className={styles.sectionTitle}><span className={styles.icon}>🔮</span> {t('report_chart_title')}</h2>
            <div className={styles.chartViewTabs} role="tablist" aria-label="Chart view">
              <button
                role="tab"
                aria-selected={chartView === 'wheel'}
                className={`${styles.chartViewTab} ${chartView === 'wheel' ? styles.chartViewTabActive : ''}`}
                onClick={() => setChartView('wheel')}
              >
                {t('report_wheel')}
              </button>
              <button
                role="tab"
                aria-selected={chartView === 'grid'}
                className={`${styles.chartViewTab} ${chartView === 'grid' ? styles.chartViewTabActive : ''}`}
                onClick={() => setChartView('grid')}
              >
                {t('report_south_indian')}
              </button>
            </div>
          </div>
          <div className={styles.chartGridWrapper}>
            {chartView === 'wheel' ? (
              <ZodiacWheelChart ascendant={ascendant} planets={chartPlanets} />
            ) : (
              <ChartGrid ascendant={ascendant} planets={chartPlanets} />
            )}
          </div>
          <p className={styles.chartHint}>
            {t(
              'report_chart_hint',
              'This wheel maps where each planet was sitting in your sky at the moment you were born. Hover (or tap) any planet to see its sign, house and strength — green means the planet is comfortable there, red means it struggles a little.'
            )}
          </p>
        </div>
      )}

      {/* ═══ Planet Positions ═══ */}
      {chartPlanets.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span className={styles.icon}>🪐</span> {t('report_planetary_positions')}</h2>
          <div className={styles.tableScroll}>
          <table className={styles.planetTable}>
            <thead>
              <tr>
                <th>{t('report_planet')}</th>
                <th>{t('report_sign')}</th>
                <th>{t('report_house')}</th>
                <th>{t('report_status')}</th>
              </tr>
            </thead>
            <tbody>
              {chartPlanets.map((p) => {
                const PlanetIcon = PLANET_ICONS[p.planet];
                return (
                <tr key={p.planet}>
                  <td className={styles.planetName}>
                    {PlanetIcon && (
                      <PlanetIcon
                        className={styles.planetIconSm}
                        style={{ color: PLANET_ICON_COLORS[p.planet] }}
                        aria-hidden="true"
                      />
                    )}
                    {planetName(p.planet)}
                    {p.isRetrograde && <span className={styles.badgeRetrograde} title={t('report_retrograde')}>℞</span>}
                  </td>
                  <td><SignIcon sign={p.sign} size={22} /> {signName(p.sign)}</td>
                  <td>{p.house}</td>

                  <td><DignityBadge dignity={p.dignity} /></td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
      
      {/* ═══ Yogas ═══ */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.icon}>📿</span> {t('report_yogas')} ({yogas.length})
        </h2>
        {yogas.length > 0 ? (
          <div className={styles.yogaGrid}>
            {yogas.map((y, i) => (
              <div key={i} className={styles.yogaCard}>
                <div className={styles.yogaCardHeader}>
                  <span className={styles.yogaName}>{y.name}</span>
                  <span className={`${styles.yogaStrength} ${
                    y.strength === 'Strong' ? styles.yogaStrong :
                    y.strength === 'Moderate' ? styles.yogaModerate : styles.yogaWeak
                  }`}>{t(`strength_${y.strength.toLowerCase()}`, y.strength)}</span>
                </div>
                {y.description && <div className={styles.yogaDesc}>{y.description}</div>}
                {y.confidence > 0 && <ConfidenceBar value={y.confidence} />}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noIssues}>{t('report_no_yogas')}</div>
        )}
      </div>

      {/* ═══ Doshas ═══ */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.icon}>⚠️</span> {t('report_doshas')}
        </h2>
        {doshas.length > 0 ? (
          <div className={styles.doshaGrid}>
            {doshas.map((d, i) => (
              <div key={i} className={`${styles.doshaCard} ${
                d.severity === 'Severe' ? styles.doshaSevere :
                d.severity === 'Moderate' ? styles.doshaModerate : styles.doshaMild
              }`}>
                <div className={styles.doshaHeader}>
                  <span className={styles.doshaName}>{d.name}</span>
                  <span className={`${styles.doshaSeverity} ${
                    d.severity === 'Severe' ? styles.sevSevere :
                    d.severity === 'Moderate' ? styles.sevModerate : styles.sevMild
                  }`}>{t(`severity_${d.severity.toLowerCase()}`, d.severity)}</span>
                </div>
                {d.description && <div className={styles.doshaDesc}>{d.description}</div>}
                {d.cancellation && d.cancellation.length > 0 && (
                  <div className={styles.doshaCancellation}>
                    ✓ {t('report_cancellation')}: {d.cancellation.join('; ')}
                  </div>
                )}
                {d.remedy && <div className={styles.doshaRemedy}>🙏 {d.remedy}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noIssues}>{t('report_no_doshas')}</div>
        )}
      </div>

      {/* ═══ Life Area Ratings ═══ */}
      {Object.keys(ratings).length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span className={styles.icon}>📊</span> {t('report_ratings')}</h2>
          <div className={styles.ratingsGrid}>
            {Object.entries(ratings).map(([area, score]) => (
              <div key={area} className={styles.ratingCard}>
                <div className={styles.ratingHeader}>
                  <span className={styles.ratingArea}>{t(`areas.${area}`, area.charAt(0).toUpperCase() + area.slice(1))}</span>
                  <span className={styles.ratingStars}>{starsFor(score)}</span>
                </div>
                {confidence[area] !== undefined && (
                  <div className={styles.ratingConfidence}>
                    <span>{t('report_confidence', { value: confidence[area] })}</span>
                    <div className={styles.ratingConfBar}>
                      <div className={styles.ratingConfFill} style={{ width: `${confidence[area]}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Current Dasha ═══ */}
      {metadata.currentDasha && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}><span className={styles.icon}>⏳</span> {t('report_mahadasha_title')}</h2>
          <div className={styles.dashaCard}>
            <span className={styles.dashaTitle}>{t('report_mahadasha', { planet: planetName(metadata.currentDasha) })}</span>
            <span className={styles.dashaPeriod}>{t('report_dasha_note')}</span>
          </div>
        </div>
      )}

      {/* ═══ Full AI Analysis (toggleable) ═══ */}
      <div className={styles.section}>
        <button className={styles.aiToggle} onClick={() => setShowFullAnalysis(!showFullAnalysis)}>
          {showFullAnalysis ? t('report_hide_analysis') : t('report_show_analysis')}
        </button>
        {showFullAnalysis && (
          <div className={styles.aiContent}>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
