'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AuthModal from '@/components/AuthModal';
import Loader from '@/components/Loader';
import ChatbotComponent from '@/components/ChatbotComponent';
import GoldDefs from '@/components/GoldDefs';
import useLiveTranslation from '@/hooks/useLiveTranslation';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';

import {
  Aries, Taurus, Gemini, Cancer,
  Leo, Virgo, Libra, Scorpio,
  Sagittarius, Capricorn, Aquarius, Pisces
} from '@/components/ZodiacIcons';

const RASHI_LIST = [
  { id: 'Aries', icon: Aries },
  { id: 'Taurus', icon: Taurus },
  { id: 'Gemini', icon: Gemini },
  { id: 'Cancer', icon: Cancer },
  { id: 'Leo', icon: Leo },
  { id: 'Virgo', icon: Virgo },
  { id: 'Libra', icon: Libra },
  { id: 'Scorpio', icon: Scorpio },
  { id: 'Sagittarius', icon: Sagittarius },
  { id: 'Capricorn', icon: Capricorn },
  { id: 'Aquarius', icon: Aquarius },
  { id: 'Pisces', icon: Pisces },
];



export default function HoroscopePrediction() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [selectedRashi, setSelectedRashi] = useState<string | null>(null);
  const [rashiFromChart, setRashiFromChart] = useState<string | null>(null);
  const selectedCardRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [result, setResult] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const langMap: Record<string, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali' };
  const selectedLang = langMap[i18n.language] || 'English';

  // ── Auto-select rashi from last birth chart ──────────────────────────────
  useEffect(() => {
    if (!session) return;
    fetch('/api/user/rashi')
      .then((r) => r.json())
      .then((data) => {
        if (data.rashi) {
          setSelectedRashi(data.rashi);
          setRashiFromChart(data.rashi);
        }
      })
      .catch(() => { /* silent fail — user can still pick manually */ });
  }, [session]);

  // ── Scroll pre-selected card into view after mount ────────────────────────
  useEffect(() => {
    if (rashiFromChart && selectedCardRef.current) {
      selectedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [rashiFromChart]);

  const isTranslating = useLiveTranslation(result, setResult);

  const fetchPrediction = async () => {
    if (!session) {
      showToast(t('auth_required', 'Please sign in first'), 'warning', 'Authentication Required');
      setIsAuthModalOpen(true);
      return;
    }
    if (!selectedRashi) {
      showToast(t('select_rashi_req', 'Please select your Zodiac sign'), 'info', 'Required');
      return;
    }

    setLoading(true);
    setResult(null);
    setReadingId(null);

    try {
      const payload = {
        rashi: selectedRashi,
        language: selectedLang,
        timeframe: 'daily',
      };

      const res = await fetch('/api/horoscope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch prediction');
      }

      setResult(data.result);
      if (data.readingId) {
        setReadingId(data.readingId);
      }
      if (data.quotaStatus?.remaining !== undefined) {
        setRemainingQuota(data.quotaStatus.remaining);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message, 'error', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <GoldDefs />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="glow-text">{t('horoscope_title', 'আজকের রাশিফল (Today\'s Horoscope)')}</h1>
        <p className="subtitle" style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
          {t('horoscope_subtitle', 'Select your Zodiac sign to reveal today\'s cosmic guidance.')}
        </p>
        {rashiFromChart && (() => {
          const chartHintMap: Record<string, string> = {
            en: 'Your Moon Sign from your last birth chart is pre-selected',
            hi: 'आपकी आखिरी कुंडली से चंद्र राशि पहले से चुनी गई है',
            bn: 'আপনার শেষ জন্ম কুণ্ডলী থেকে চন্দ্র রাশি আগে থেকে নির্বাচিত হয়েছে',
          };
          return (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.chartHint}
            >
              ✦ {chartHintMap[i18n.language] ?? chartHintMap.en}
            </motion.p>
          );
        })()}

        {remainingQuota !== null && (
          <p className={styles.quotaInfo}>
            {t('horoscope_remaining_today', 'Remaining today\'s predictions: {{count}}', { count: remainingQuota })}
          </p>
        )}
      </motion.div>

      <div className={styles.contentWrapper}>
        <div className={styles.rashiGrid}>
          {RASHI_LIST.map((rashi, index) => {
            const isSelected = selectedRashi === rashi.id;
            const isFromChart = rashiFromChart === rashi.id;
            const signSlug = rashi.id.toLowerCase();
            const localeName = t(`signs.${rashi.id}`, rashi.id);
            return (
              <motion.div
                key={rashi.id}
                ref={isFromChart ? selectedCardRef : null}
                className={`${styles.rashiCard} ${isSelected ? styles.selected : ''} ${isFromChart ? styles.fromChart : ''}`}
                style={{
                  backgroundImage: `url(/zodiacs/${signSlug}.png)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center top',
                }}
                /* Entrance animation */
                initial={{ opacity: 0, scale: isFromChart ? 0.7 : 0.9, y: isFromChart ? 20 : 8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                transition={
                  isFromChart
                    ? { type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }
                    : { duration: 0.35, delay: index * 0.04, ease: 'easeOut' }
                }
                whileHover={{ scale: 1.07, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setSelectedRashi(rashi.id)}
              >
                {isFromChart && (
                  <motion.span
                    className={styles.chartBadge}
                    initial={{ y: -16, opacity: 0, scale: 0.5 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.35 }}
                  >
                    🌙
                  </motion.span>
                )}
                <span className={styles.rashiLabel}>{localeName}</span>
              </motion.div>
            );
          })}
        </div>

        <motion.button
          className="btn-primary"
          style={{ width: '100%', maxWidth: '400px', margin: '2.5rem auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
          onClick={() => {
            fetchPrediction();
            setTimeout(() => {
              loaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }}
          disabled={loading || !selectedRashi}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading && (
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
          )}
          <span>
            {loading ? t('loader_default', 'Consulting the stars...') : t('horoscope_btn_reveal_today', 'Reveal Today\'s Prediction')}
          </span>
        </motion.button>

        <div ref={loaderRef}>
          <AnimatePresence>
            {(loading || isTranslating) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={styles.loaderContainer}
              >
                <Loader text={isTranslating ? t('translating_report', "Translating...") : t('loader_default', "Consulting the stars...")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {result && !loading && !isTranslating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-panel markdown-body ${styles.resultContainer}`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              {readingId && (
                <div style={{ marginTop: '2.5rem' }}>
                  <ChatbotComponent readingId={readingId} language={selectedLang} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

