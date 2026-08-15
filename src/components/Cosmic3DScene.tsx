'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { FaSun, FaMoon, FaMars, FaMercury, FaVenus, FaStar } from 'react-icons/fa';
import {
  TbPlanet,
  TbSunMoon,
  TbComet,
} from 'react-icons/tb';
import styles from './Cosmic3DScene.module.css';
import GoldDefs from './GoldDefs';
import { SignIcon } from './ZodiacIcons';


interface PlanetDef {
  key: string;
  Icon: IconType;
  r: number; // orbit radius (px)
  dur: number; // orbit duration (s)
  phase: number; // starting angle (deg)
  size: number; // icon size (px)
  color: string;
  hasRing?: boolean;
}

// Navagraha — Sun stays at the centre; Rahu & Ketu always stay 180° apart
const PLANETS: PlanetDef[] = [
  { key: 'Moon', Icon: FaMoon, r: 78, dur: 16, phase: 40, size: 20, color: '#e2e8f0' },
  { key: 'Mercury', Icon: FaMercury, r: 112, dur: 22, phase: 165, size: 18, color: '#34d399' },
  { key: 'Venus', Icon: FaVenus, r: 148, dur: 30, phase: 275, size: 21, color: '#f472b6' },
  { key: 'Mars', Icon: FaMars, r: 186, dur: 38, phase: 95, size: 20, color: '#ef4444' },
  { key: 'Jupiter', Icon: FaStar, r: 222, dur: 50, phase: 205, size: 22, color: '#f59e0b' },
  { key: 'Saturn', Icon: TbPlanet, r: 258, dur: 64, phase: 320, size: 24, color: '#a78bfa', hasRing: true },
  { key: 'Rahu', Icon: TbSunMoon, r: 292, dur: 82, phase: 130, size: 20, color: '#94a3b8' },
  { key: 'Ketu', Icon: TbComet, r: 292, dur: 82, phase: 310, size: 20, color: '#22d3ee' },
];

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];


const ZODIAC_RADIUS = 344;
const ZODIAC_DUR = 240; // seconds for one full ring rotation

export default function Cosmic3DScene() {
  const { t } = useTranslation();
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Gentle mouse parallax — skipped when the user prefers reduced motion
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onMove = (e: PointerEvent) => {
      const el = parallaxRef.current;
      if (!el) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      el.style.transform = `rotateY(${nx * 14}deg) rotateX(${ny * -10}deg)`;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className={styles.sceneWrap} aria-hidden="true">
      <GoldDefs />
      <div className={styles.parallax} ref={parallaxRef}>
        <div className={styles.scaler}>
          <div className={styles.scene}>
            {/* Static orbit guide rings (live in the tilted plane) */}
            {PLANETS.map((p) => (
              <div
                key={`ring-${p.key}`}
                className={styles.orbitRing}
                style={{ width: p.r * 2, height: p.r * 2, left: -p.r, top: -p.r }}
              />
            ))}

            {/* Outer Rashi (zodiac) ring — slow rotation, icons stay upright */}
            <div
              className={styles.zodiacRingVisual}
              style={{ width: ZODIAC_RADIUS * 2, height: ZODIAC_RADIUS * 2, left: -ZODIAC_RADIUS, top: -ZODIAC_RADIUS }}
            />
            <div className={styles.zodiacRing} style={{ '--dur': `${ZODIAC_DUR}s` } as React.CSSProperties}>
              {SIGNS.map((sign, i) => (
                <div
                  key={sign}
                  className={styles.zodiacArm}
                  style={{ '--phase': `${i * 30}deg`, '--r': `${ZODIAC_RADIUS}px` } as React.CSSProperties}
                >
                  <div className={styles.spinCancel} style={{ '--dur': `${ZODIAC_DUR}s` } as React.CSSProperties}>
                    <div className={styles.upright} style={{ '--phase': `${i * 30}deg` } as React.CSSProperties}>
                      <SignIcon
                        sign={sign}
                        size={34}
                        className={styles.zodiacImg}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>


            {/* Central Sun */}
            <div className={styles.sunHolder}>
              <FaSun className={styles.sunIcon} title={t('planets.Sun', 'Sun')} />
            </div>

            {/* Orbiting Navagraha planets */}
            {PLANETS.map((p) => (
              <div
                key={p.key}
                className={styles.orbit}
                style={
                  {
                    width: p.r * 2,
                    height: p.r * 2,
                    left: -p.r,
                    top: -p.r,
                    '--dur': `${p.dur}s`,
                  } as React.CSSProperties
                }
              >
                <div
                  className={styles.arm}
                  style={{ '--phase': `${p.phase}deg`, '--r': `${p.r}px` } as React.CSSProperties}
                >
                  <div className={styles.spinCancel} style={{ '--dur': `${p.dur}s` } as React.CSSProperties}>
                    <div className={styles.upright} style={{ '--phase': `${p.phase}deg` } as React.CSSProperties}>
                      <span className={styles.planetGlow} style={{ color: p.color }}>
                        {p.hasRing && <span className={styles.saturnRingEl} />}
                        <p.Icon
                          className={styles.planetIcon}
                          style={{ fontSize: p.size }}
                          title={t(`planets.${p.key}`, p.key)}
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
