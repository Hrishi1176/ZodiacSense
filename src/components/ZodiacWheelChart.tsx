'use client';

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TbPlanet, TbSunMoon, TbComet,
} from 'react-icons/tb';
import { FaSun, FaMoon, FaMars, FaMercury, FaVenus, FaStar } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import GoldDefs from './GoldDefs';
import { SIGN_ICONS } from './ZodiacIcons';
import styles from './ZodiacWheelChart.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WheelPlanet {
  planet: string;
  sign: string;
  house: number;
  dignity?: string;
  isRetrograde?: boolean;
}

interface ZodiacWheelChartProps {
  ascendant: string;
  planets: WheelPlanet[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];


/** Friendly planet icons (shared with the report table / South Indian grid) */
export const PLANET_ICONS: Record<string, IconType> = {
  Sun: FaSun, Moon: FaMoon, Mars: FaMars, Mercury: FaMercury,
  Jupiter: FaStar, Venus: FaVenus, Saturn: TbPlanet, Rahu: TbSunMoon, Ketu: TbComet,
};

/** Brand colours for each planet icon */
export const PLANET_ICON_COLORS: Record<string, string> = {
  Sun: '#fbbf24', Moon: '#e2e8f0', Mars: '#ef4444', Mercury: '#34d399',
  Jupiter: '#f59e0b', Venus: '#f472b6', Saturn: '#a78bfa', Rahu: '#94a3b8', Ketu: '#22d3ee',
};

// Geometry (SVG viewBox 0 0 440 440)
const CX = 220;
const CY = 220;
const R_OUTER_RING = 214;   // decorative spinning dashed ring
const R_TICK_OUT = 209;     // sign boundary tick outer end
const R_TICK_IN = 203;      // sign boundary tick inner end
const R_BAND_OUT = 202;     // sign band outer radius
const R_BAND_IN = 148;      // sign band inner radius
const R_GLYPH = 175;        // rashi name radius
const R_HOUSE = 137;        // house number radius
const R_PLANET = 104;       // primary planet orbit
const R_PLANET_ALT = 80;    // secondary orbit (crowded signs)
const R_CENTER = 60;        // lagna core radius

const DEG = Math.PI / 180;

/** Polar → cartesian. Angle in degrees, 0° = up, increasing = counter-clockwise. */
function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (-90 - angleDeg) * DEG; // rotate so 0 = top, positive = counter-clockwise
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/** Annular sector (wedge) path between two radii and two angles (degrees). */
function wedgePath(a0: number, a1: number, rOut: number, rIn: number): string {
  const p1 = polar(a0, rOut);
  const p2 = polar(a1, rOut);
  const p3 = polar(a1, rIn);
  const p4 = polar(a0, rIn);
  // a1 > a0 means counter-clockwise in our convention → sweep 0 in SVG (y-down)
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 0 0 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 0 1 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** Halo colour coding by dignity (green = comfortable, red = struggling) */
function dignityHaloClass(dignity?: string): string {
  if (dignity === 'Exalted') return styles.plExalted;
  if (dignity === 'Debilitated') return styles.plDebilitated;
  if (dignity === 'Own Sign' || dignity === 'Moolatrikona') return styles.plOwnSign;
  return styles.plNeutral;
}

/** Icon colour coding by dignity */
function dignityIconClass(dignity?: string): string {
  if (dignity === 'Exalted') return styles.piStrong;
  if (dignity === 'Debilitated') return styles.piWeak;
  if (dignity === 'Own Sign' || dignity === 'Moolatrikona') return styles.piOwn;
  return styles.piNeutral;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ZodiacWheelChart({ ascendant, planets }: ZodiacWheelChartProps) {
  const { t } = useTranslation();
  const signName = (s: string) => t(`signs.${s}`, s);
  const planetName = (p: string) => t(`planets.${p}`, p);
  const ascIdx = Math.max(0, SIGNS.indexOf(ascendant));
  const ascSlug = (ascendant || 'aries').toLowerCase().trim();
  const CenterSignIcon = SIGN_ICONS[ascIdx];

  // House k (0-based) → sign index; house 1 = ascendant sign, counter-clockwise
  const sectors = useMemo(() => {
    return Array.from({ length: 12 }, (_, k) => ({
      house: k + 1,
      signIdx: (ascIdx + k) % 12,
      centerAngle: k * 30,
    }));
  }, [ascIdx]);

  // Group planets by sign
  const planetsBySign = useMemo(() => {
    const map = new Map<string, WheelPlanet[]>();
    for (const p of planets) {
      const list = map.get(p.sign) || [];
      list.push(p);
      map.set(p.sign, list);
    }
    return map;
  }, [planets]);

  // Compute planet placements (angle + radius) per sector
  const placements = useMemo(() => {
    const result: Array<{ planet: WheelPlanet; angle: number; radius: number; delay: number; showLabel: boolean }> = [];
    let i = 0;
    for (const sector of sectors) {
      const list = planetsBySign.get(SIGNS[sector.signIdx]) || [];
      const n = list.length;
      list.forEach((p, j) => {
        const spread = Math.min(16, 40 / Math.max(1, n));
        const angle = sector.centerAngle + (j - (n - 1) / 2) * spread;
        const radius = n > 4 ? (j % 2 === 0 ? R_PLANET : R_PLANET_ALT) : R_PLANET;
        // Labels only when the sector is uncrowded, so they never overlap
        result.push({ planet: p, angle, radius, delay: 0.35 + i * 0.07, showLabel: n <= 2 });
        i += 1;
      });
    }
    return result;
  }, [sectors, planetsBySign]);

  return (
    <div className={styles.wheelWrap}>
      <GoldDefs />
      <svg
        viewBox="0 0 440 440"
        className={styles.wheel}
        role="img"
        aria-label={`${t('report_chart_title')}, ${t('report_chart_center', 'Your Rising Sign')} ${signName(ascendant)}`}
      >
        <defs>
          <radialGradient id="zwBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(139,92,246,0.14)" />
            <stop offset="55%" stopColor="rgba(56,189,248,0.05)" />
            <stop offset="100%" stopColor="rgba(5,5,26,0)" />
          </radialGradient>
          <linearGradient id="zwRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="zwAsc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(251,191,36,0.28)" />
            <stop offset="100%" stopColor="rgba(236,72,153,0.16)" />
          </linearGradient>
          <clipPath id="zwCenterClip">
            <circle cx={CX} cy={CY - 16} r={21} />
          </clipPath>
        </defs>

        {/* Opaque dark disc — keeps the wheel readable over the moving video */}
        <circle cx={CX} cy={CY} r={R_OUTER_RING + 6} className={styles.wheelDisc} />

        {/* Ambient background glow */}
        <circle cx={CX} cy={CY} r={R_OUTER_RING + 6} fill="url(#zwBg)" />

        {/* Spinning outer dashed ring — "live" feel */}
        <circle
          className={styles.spinRing}
          cx={CX}
          cy={CY}
          r={R_OUTER_RING}
          fill="none"
          stroke="url(#zwRing)"
          strokeWidth="1.4"
          strokeDasharray="3 9"
          opacity="0.85"
        />
        <circle
          className={styles.spinRingReverse}
          cx={CX}
          cy={CY}
          r={R_TICK_OUT + 2.5}
          fill="none"
          stroke="rgba(139,92,246,0.4)"
          strokeWidth="0.6"
        />

        {/* 12 quiet sign-boundary markers (no technical degree ticks) */}
        <g>
          {Array.from({ length: 12 }, (_, i) => {
            const a = i * 30 + 15;
            const p1 = polar(a, R_TICK_IN);
            const p2 = polar(a, R_TICK_OUT);
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(56,189,248,0.35)"
                strokeWidth="1"
              />
            );
          })}
        </g>

        {/* Sign sectors (house 1 at top, counter-clockwise) */}
        {sectors.map((s, k) => {
          const isAsc = k === 0;
          const a0 = s.centerAngle - 15;
          const a1 = s.centerAngle + 15;
          const glyphPos = polar(s.centerAngle, R_GLYPH);
          const housePos = polar(s.centerAngle, R_HOUSE);
          const separator = polar(a0, R_BAND_IN);
          const separatorOut = polar(a0, R_BAND_OUT);
          return (
            <g key={s.signIdx} className={styles.sector} style={{ animationDelay: `${k * 0.055}s` }}>
              <title>{`${signName(SIGNS[s.signIdx])} — ${t('report_house')} ${s.house}`}</title>
              <path
                d={wedgePath(a0, a1, R_BAND_OUT, R_BAND_IN)}
                className={isAsc ? styles.sectorFillAsc : styles.sectorFill}
              />
              {/* Sector separator line */}
              <line
                x1={separator.x}
                y1={separator.y}
                x2={separatorOut.x}
                y2={separatorOut.y}
                stroke="rgba(139,92,246,0.4)"
                strokeWidth="0.8"
              />
              {/* Rashi name in the user's selected language (text instead of icon) */}
              <text
                x={glyphPos.x}
                y={glyphPos.y}
                className={`${styles.signNameText} ${isAsc ? styles.signNameTextAsc : ''}`}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {signName(SIGNS[s.signIdx])}
              </text>
              {/* House number */}
              <text
                x={housePos.x}
                y={housePos.y}
                className={styles.houseNum}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {s.house}
              </text>
            </g>
          );
        })}

        {/* Orbit guides */}
        <circle cx={CX} cy={CY} r={R_BAND_IN} fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="0.9" />
        <circle cx={CX} cy={CY} r={R_PLANET + 16} fill="none" stroke="rgba(139,92,246,0.14)" strokeWidth="0.7" strokeDasharray="2 6" />
        <circle cx={CX} cy={CY} r={R_CENTER + 8} fill="none" stroke="rgba(139,92,246,0.25)" strokeWidth="0.8" />

        {/* Planets — friendly icons with names + house */}
        {placements.map(({ planet, angle, radius, delay, showLabel }) => {
          const pos = polar(angle, radius);
          const PlanetIcon = PLANET_ICONS[planet.planet] || FaStar;
          const iconSize = showLabel ? 17 : 13;
          return (
            <g key={planet.planet} className={styles.planet} style={{ animationDelay: `${delay}s` }}>
              <title>{`${planetName(planet.planet)} — ${signName(planet.sign)} (${t('report_house')} ${planet.house})${planet.isRetrograde ? ` — ${t('report_retrograde')}` : ''}`}</title>
              <circle cx={pos.x} cy={pos.y} r="13" className={`${styles.planetHalo} ${dignityHaloClass(planet.dignity)}`} />
              <PlanetIcon
                x={pos.x - iconSize / 2}
                y={pos.y - iconSize / 2}
                width={iconSize}
                height={iconSize}
                className={`${styles.planetIcon} ${dignityIconClass(planet.dignity)}`}
                title={planetName(planet.planet)}
              />
              {planet.isRetrograde && (
                <g>
                  <circle cx={pos.x + 12} cy={pos.y - 11} r="4.6" className={styles.retroBadge} />
                  <text
                    x={pos.x + 12}
                    y={pos.y - 11}
                    className={styles.retroBadgeText}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    R
                  </text>
                </g>
              )}
              {showLabel && (
                <>
                  <text x={pos.x} y={pos.y + 21} className={styles.planetLabel} textAnchor="middle" dominantBaseline="central">
                    {planetName(planet.planet)}
                  </text>
                  <text x={pos.x} y={pos.y + 30} className={styles.planetHouse} textAnchor="middle" dominantBaseline="central">
                    {t('report_house')} {planet.house}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Lagna core — friendly "your rising sign" */}
        <g className={styles.centerCore}>
          <circle cx={CX} cy={CY} r={R_CENTER} className={styles.centerFill} />
          <circle cx={CX} cy={CY} r={R_CENTER} fill="none" stroke="url(#zwRing)" strokeWidth="1.2" opacity="0.8" />
          
          {/* Circular sign medallion with gold ring */}
          <circle cx={CX} cy={CY - 16} r={21} className={styles.centerMedallionBg} />
          <image
            href={`/zodiacs/${ascSlug}.png`}
            x={CX - 21}
            y={CY - 37}
            width={42}
            height={42}
            clipPath="url(#zwCenterClip)"
            preserveAspectRatio="xMidYMid slice"
            className={styles.centerGlyphIcon}
          />
          <circle cx={CX} cy={CY - 16} r={21} className={styles.centerMedallionRing} />

          {/* Subtitle & Title */}
          <text x={CX} y={CY + 18} className={styles.centerLabel} textAnchor="middle" dominantBaseline="central">
            {t('report_chart_center', 'Your Rising Sign')}
          </text>
          <text x={CX} y={CY + 33} className={styles.centerSub} textAnchor="middle" dominantBaseline="central">
            {signName(ascendant)}
          </text>
        </g>
      </svg>

      {/* Plain-language legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <i className={`${styles.legendDot} ${styles.lgExalted}`} /> {t('dignity_exalted')}
        </span>
        <span className={styles.legendItem}>
          <i className={`${styles.legendDot} ${styles.lgOwnSign}`} /> {t('dignity_own_sign')}
        </span>
        <span className={styles.legendItem}>
          <i className={`${styles.legendDot} ${styles.lgDebilitated}`} /> {t('dignity_debilitated')}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendRetro}>R</span> {t('report_retrograde')}
        </span>
      </div>
    </div>
  );
}
