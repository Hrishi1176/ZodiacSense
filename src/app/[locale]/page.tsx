'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Star, Zap, Heart } from 'lucide-react';
import styles from './page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.7,
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
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  },
  {
    icon: '/chart_icon.png',
    key: 'birth_chart',
    desc: 'Generate your complete Vedic & Western birth chart based on your exact birth details.',
    tag: '🌌 Planetary Positions',
    href: '/birth-chart',
    alt: 'Birth Chart',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)',
  },
  {
    icon: '/marriage_icon.png',
    key: 'marriage_bichar',
    desc: 'Discover cosmic compatibility and auspicious timing for your marriage.',
    tag: '💍 Cosmic Synergy',
    href: '/marriage-bichar',
    alt: 'Marriage Bichar',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
  },
];

const stats = [
  { value: '50K+', label: 'Readings Done', icon: <Star size={14} /> },
  { value: '98%', label: 'Accuracy Rate', icon: <Zap size={14} /> },
  { value: '3', label: 'Languages', icon: <Sparkles size={14} /> },
  { value: 'AI', label: 'Powered by Grok', icon: <Heart size={14} /> },
];

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <motion.main className={styles.main} initial="hidden" animate="visible">
        {/* Badge */}
        <motion.div custom={0} variants={fadeUp}>
          <span className={styles.badge}>
            <Sparkles size={14} className={styles.badgeIcon} />
            AI-Powered Astrology
          </span>
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
            <span>✋</span>
            {t('start_journey')}
            <ArrowRight size={18} className={styles.btnArrow} />
          </Link>
          <Link href="/birth-chart" className={styles.secondaryButton}>
            <span>🌌</span>
            {t('birth_chart')}
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div custom={4} variants={fadeUp} className={styles.statsRow}>
          {stats.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statNumber}>{s.value}</span>
              <span className={styles.statLabel}>
                <span className={styles.statIcon}>{s.icon}</span>
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Feature Cards */}
        <motion.div className={styles.featuresGrid}>
          {cards.map((card, i) => (
            <motion.div
              key={card.key}
              custom={5 + i}
              variants={fadeUp}
              className={`${styles.featureCard} glass-panel`}
              onClick={() => (window.location.href = card.href)}
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(5, 5, 26, 0.35) 0%, rgba(5, 5, 26, 0.92) 100%), url(${card.icon})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              whileHover={{ y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Accent gradient bar */}
              <div className={styles.cardAccent} style={{ background: card.gradient }} />

              <div className={styles.cardHeader}>
                <span className={styles.cardTag} style={{ background: card.gradient }}>
                  {card.tag}
                </span>
                <span className={styles.cardArrow}>
                  <ArrowRight size={20} />
                </span>
              </div>

              <div className={styles.cardContent}>
                <h3>{t(card.key)}</h3>
                <p>{card.desc}</p>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.cardCta}>Explore Feature</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.main>
    </div>
  );
}
