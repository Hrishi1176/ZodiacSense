'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import AuthModal from '@/components/AuthModal';
import Loader from '@/components/Loader';
import FeedbackComponent from '@/components/FeedbackComponent';
import ChatbotComponent from '@/components/ChatbotComponent';
import AstrologyReport, { type ReportMetadata } from '@/components/AstrologyReport';
import useLiveTranslation from '@/hooks/useLiveTranslation';
import { useToast } from '@/context/ToastContext';
import type { LocationPick } from '@/components/LocationPicker';
import styles from './page.module.css';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

export default function BirthChart() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const langMap: Record<string, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali' };
  const selectedLang = langMap[i18n.language] || 'English';

  const [formData, setFormData] = useState({ name: '', date: '', time: '', location: '' });
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ReportMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Live-translate the generated report + metadata texts when the UI language changes
  const isTranslating = useLiveTranslation(result, setResult, () => {
    if (!metadata) return null;
    const texts: string[] = [];
    const take = (s?: string) => {
      if (s && s.trim()) {
        texts.push(s);
        return texts.length - 1;
      }
      return -1;
    };
    const yogaSlots = (metadata.yogas || []).map((y) => take(y.description));
    const doshaSlots = (metadata.doshas || []).map((d) => ({
      desc: take(d.description),
      cancels: (d.cancellation || []).map((c) => take(c)),
      remedy: take(d.remedy),
    }));
    if (texts.length === 0) return null;
    return {
      texts,
      apply: (translations) => {
        setMetadata((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            yogas: (prev.yogas || []).map((y, i) =>
              yogaSlots[i] >= 0 ? { ...y, description: translations[yogaSlots[i]] } : y
            ),
            doshas: (prev.doshas || []).map((d, i) => {
              const s = doshaSlots[i];
              if (!s) return d;
              return {
                ...d,
                description: s.desc >= 0 ? translations[s.desc] : d.description,
                cancellation: (d.cancellation || []).map((c, j) =>
                  s.cancels[j] >= 0 ? translations[s.cancels[j]] : c
                ),
                remedy: s.remedy >= 0 ? translations[s.remedy] : d.remedy,
              };
            }),
          };
        });
      },
    };
  });

  useEffect(() => {
    if (session) {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.birthDetails) {
            setFormData(prev => ({
              ...prev,
              name: data.birthDetails.name ?? prev.name,
              date: data.birthDetails.date ?? prev.date,
              time: data.birthDetails.time ?? prev.time,
              location: data.birthDetails.location ?? prev.location,
            }));
            if (typeof data.birthDetails.lat === 'number' && typeof data.birthDetails.lng === 'number') {
              setPicked({ lat: data.birthDetails.lat, lng: data.birthDetails.lng });
            }
          }
        })
        .catch(err => console.error('Failed to load presets:', err));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      showToast(t('bc_toast_signin'), 'warning', t('bc_toast_signin_title'));
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setReadingId(null);
    setMetadata(null);

    try {
      const res = await fetch('/api/birth-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, lat: picked?.lat, lng: picked?.lng, language: selectedLang }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || t('bc_toast_error'), 'error', t('bc_toast_error_title'));
      } else {
        setResult(data.result);
        setReadingId(data.id);
        setMetadata(data.metadata ?? null);
        if (data.remainingQuota !== undefined) setRemainingQuota(data.remainingQuota);
        showToast(t('bc_toast_success'), 'success', t('bc_toast_success_title'));
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch (error: unknown) {
      console.error('Birth Chart Error:', error);
      const message = error instanceof Error ? error.message : t('bc_try_again');
      showToast(t('bc_toast_network', { message }), 'error', t('bc_toast_network_title'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <motion.h1
        className={styles.title}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {t('birth_chart')}
      </motion.h1>

      <motion.p
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {t('bc_subtitle')}
      </motion.p>

      {remainingQuota !== null && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600 }}>
          {t('bc_remaining', { count: remainingQuota })}
        </div>
      )}

      <motion.div
        className={styles.formCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="bc-name">{t('bc_full_name')}</label>
              <input
                suppressHydrationWarning
                id="bc-name"
                type="text"
                required
                placeholder={t('bc_name_placeholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bc-date">{t('bc_date_of_birth')}</label>
              <input
                suppressHydrationWarning
                id="bc-date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bc-time">{t('bc_time_of_birth')}</label>
              <input
                suppressHydrationWarning
                id="bc-time"
                type="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formGroup} style={{ textAlign: 'left' }}>
            <label>{t('bc_place_of_birth')}</label>
            <LocationPicker
              placeholder={t('lp_search_placeholder')}
              locateLabel={t('lp_use_my_location')}
              initial={picked}
              initialName={formData.location || undefined}
              onPick={(p: LocationPick) => {
                setFormData((prev) => ({ ...prev, location: p.displayName }));
                setPicked({ lat: p.lat, lng: p.lng });
              }}
            />
          </div>

          <button
            suppressHydrationWarning
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {!session
              ? t('bc_btn_signin')
              : loading
                ? t('bc_btn_loading')
                : t('bc_btn_generate')}
          </button>
        </form>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading && (
          <Loader key="loader" text={t('bc_loading')} />
        )}
        {!loading && result && (
          <motion.div
            key="result"
            className={styles.result}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {isTranslating && (
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>
                ⏳ {t('translating_report')}
              </div>
            )}

            {/* Structured Astrology Report */}
            <AstrologyReport
              result={result}
              metadata={metadata}
              birthData={formData}
            />

            {readingId && <FeedbackComponent readingId={readingId} />}
            {readingId && <ChatbotComponent readingId={readingId} language={selectedLang} />}
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
