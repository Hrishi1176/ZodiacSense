'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.8,
      ease: [0.25, 0.4, 0.25, 1] as const,
    },
  }),
};

const cards = [
  {
    icon: '/palm_icon.png',
    key: 'palm_reading',
    desc: 'AI scans both palms via camera to reveal your life path, heart line, and fate line.',
    tag: '✋ Real-Time Camera',
    href: '/palm-reading',
    alt: 'Palm Reading',
  },
  {
    icon: '/chart_icon.png',
    key: 'birth_chart',
    desc: 'Generate your complete Vedic & Western birth chart based on your exact birth details.',
    tag: '🌌 Planetary Positions',
    href: '/birth-chart',
    alt: 'Birth Chart',
  },
  {
    icon: '/marriage_icon.png',
    key: 'marriage_bichar',
    desc: 'Discover cosmic compatibility and auspicious timing for your marriage.',
    tag: '💍 Cosmic Synergy',
    href: '/marriage-bichar',
    alt: 'Marriage Bichar',
  },
];

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <motion.main className={styles.main} initial="hidden" animate="visible">
        {/* Badge */}
        <motion.div custom={0} variants={fadeUp}>
          <span className={styles.badge}>✦ AI-Powered Astrology</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1 custom={1} variants={fadeUp} className={styles.title}>
          {t('hero_title')}
        </motion.h1>

        {/* Subtitle */}
        <motion.p custom={2} variants={fadeUp} className={styles.subtitle}>
          {t('hero_subtitle')}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div custom={3} variants={fadeUp} className={styles.actions}>
          <Link href="/palm-reading" className={styles.glowingButton}>
            ✋ {t('start_journey')}
          </Link>
          <Link href="/birth-chart" className={styles.secondaryButton}>
            🌌 {t('birth_chart')}
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div custom={4} variants={fadeUp} className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>50K+</span>
            <span className={styles.statLabel}>Readings Done</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>98%</span>
            <span className={styles.statLabel}>Accuracy Rate</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>3</span>
            <span className={styles.statLabel}>Languages</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>AI</span>
            <span className={styles.statLabel}>Powered by Grok</span>
          </div>
        </motion.div>

        {/* Feature Cards with Image as Card Background - No Animations */}
        <motion.div className={styles.featuresGrid}>
          {cards.map((card, i) => (
            <motion.div
              key={card.key}
              custom={5 + i}
              variants={fadeUp}
              className={`glass-panel ${styles.featureCard}`}
              onClick={() => (window.location.href = card.href)}
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(5, 5, 26, 0.4), rgba(5, 5, 26, 0.92)), url(${card.icon})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardTag}>{card.tag}</span>
                <span className={styles.cardArrow}>→</span>
              </div>
              <div className={styles.cardContent}>
                <h3>{t(card.key)}</h3>
                <p>{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.main>
    </div>
  );
}
