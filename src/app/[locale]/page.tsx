'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Star, Zap, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import Cosmic3DScene from '@/components/Cosmic3DScene';
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
    icon: '/chart_icon.png',
    key: 'horoscope_title',
    descKey: 'horoscope_subtitle',
    tagKey: 'timeframe_daily',
    href: '/horoscope',
    gradient: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
  },
  {
    icon: '/palm_icon.png',
    key: 'palm_reading',
    descKey: 'home_card_palm_desc',
    tagKey: 'home_card_palm_tag',
    href: '/palm-reading',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  },
  {
    icon: '/chart_icon.png',
    key: 'birth_chart',
    descKey: 'home_card_bc_desc',
    tagKey: 'home_card_bc_tag',
    href: '/birth-chart',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)',
  },
  {
    icon: '/marriage_icon.png',
    key: 'marriage_bichar',
    descKey: 'home_card_mb_desc',
    tagKey: 'home_card_mb_tag',
    href: '/marriage-bichar',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
  },
];

export default function Home() {
  const { t } = useTranslation();
  const [totalReadings, setTotalReadings] = useState<string>('50K+');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(true);
  const sliderRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/stats/global')
      .then(res => res.json())
      .then(data => {
        if (data.totalReadings !== undefined) {
          const count = data.totalReadings;
          if (count > 1000) {
            setTotalReadings((count / 1000).toFixed(1) + 'K+');
          } else {
            setTotalReadings(count.toString());
          }
        }
      })
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  const updateScrollState = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    const cardWidth = scrollWidth / cards.length;
    const current = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(Math.max(current, 0), cards.length - 1));
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (slider) {
      updateScrollState();
      slider.addEventListener('scroll', updateScrollState, { passive: true });
      window.addEventListener('resize', updateScrollState);
      return () => {
        slider.removeEventListener('scroll', updateScrollState);
        window.removeEventListener('resize', updateScrollState);
      };
    }
  }, []);

  const scrollToCard = (index: number) => {
    if (!sliderRef.current) return;
    const slider = sliderRef.current;
    const cardElement = slider.children[index] as HTMLElement;
    if (cardElement) {
      slider.scrollTo({
        left: cardElement.offsetLeft - slider.offsetLeft,
        behavior: 'smooth',
      });
      setActiveIndex(index);
    }
  };

  const handleSlide = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const slider = sliderRef.current;
    const scrollAmount = (slider.children[0] as HTMLElement)?.offsetWidth || 340;
    slider.scrollBy({
      left: direction === 'left' ? -scrollAmount - 24 : scrollAmount + 24,
      behavior: 'smooth',
    });
  };

  const stats = [
    { value: totalReadings, label: t('home_stat_readings'), icon: <Star size={14} /> },
    { value: '98%', label: t('home_stat_accuracy'), icon: <Zap size={14} /> },
    { value: '3', label: t('home_stat_languages'), icon: <Sparkles size={14} /> },
    { value: 'AI', label: t('home_stat_grok'), icon: <Heart size={14} /> },
  ];

  return (
    <div className={styles.container}>
      {/* Live 3D Navagraha + Rashi scene floating over the background video */}
      <div className={styles.cosmicStage}>
        <Cosmic3DScene />
      </div>

      <motion.main className={styles.main} initial="hidden" animate="visible">
        {/* Badge */}
        <motion.div custom={0} variants={fadeUp}>
          <span className={styles.badge}>
            <Sparkles size={14} className={styles.badgeIcon} />
            {t('home_badge')}
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

        {/* Feature Cards Slider Container */}
        <div className={styles.sliderContainer}>
          {/* Navigation Controls */}
          <div className={styles.sliderControls}>
            <button
              className={`${styles.sliderNavBtn} ${!canScrollLeft ? styles.navBtnDisabled : ''}`}
              onClick={() => handleSlide('left')}
              aria-label="Previous Slide"
              disabled={!canScrollLeft}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              className={`${styles.sliderNavBtn} ${!canScrollRight ? styles.navBtnDisabled : ''}`}
              onClick={() => handleSlide('right')}
              aria-label="Next Slide"
              disabled={!canScrollRight}
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Single-line Slider Track */}
          <div className={styles.sliderTrackWrapper}>
            <motion.div ref={sliderRef} className={styles.featuresSliderTrack}>
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
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {/* Accent gradient bar */}
                  <div className={styles.cardAccent} style={{ background: card.gradient }} />

                  <div className={styles.cardHeader}>
                    <span className={styles.cardTag} style={{ background: card.gradient }}>
                      {t(card.tagKey)}
                    </span>
                    <span className={styles.cardArrow}>
                      <ArrowRight size={20} />
                    </span>
                  </div>

                  <div className={styles.cardContent}>
                    <h3>{t(card.key)}</h3>
                    <p>{t(card.descKey)}</p>
                  </div>

                  <div className={styles.cardFooter}>
                    <span className={styles.cardCta}>{t('home_explore')}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Pagination Indicators / Dots */}
          <div className={styles.sliderDots}>
            {cards.map((_, idx) => (
              <button
                key={idx}
                className={`${styles.sliderDot} ${activeIndex === idx ? styles.activeDot : ''}`}
                onClick={() => scrollToCard(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
