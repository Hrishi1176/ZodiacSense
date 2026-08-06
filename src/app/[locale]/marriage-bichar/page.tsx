'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AuthModal from '@/components/AuthModal';
import Loader from '@/components/Loader';
import useLiveTranslation from '@/hooks/useLiveTranslation';
import { useToast } from '@/context/ToastContext';
import type { LocationPick } from '@/components/LocationPicker';
import styles from './page.module.css';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

type PartnerForm = { name: string; date: string; time: string; location: string };

interface PartnerMeta {
  name?: string;
  sunSign?: string;
  moonSign?: string;
  nakshatra?: string;
  timeAssumed?: boolean;
  locationAssumed?: boolean;
}

interface MuhurtaMeta {
  date: string;
  weekday: string;
  tithi: string;
  nakshatra: string;
  score: number;
  reasons?: string[];
}

interface MarriageMetadata {
  partner1?: PartnerMeta;
  partner2?: PartnerMeta;
  ashtakoot?: { totalScore: number; maxScore: number; verdict: string };
  manglik?: {
    partner1?: { isManglik: boolean; marsHouseFromLagna: number; severity: string };
    partner2?: { isManglik: boolean; marsHouseFromLagna: number; severity: string };
  };
  muhurtaDates?: MuhurtaMeta[];
}

export default function MarriageBichar() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [partner1, setPartner1] = useState<PartnerForm>({ name: '', date: '', time: '', location: '' });
  const [partner2, setPartner2] = useState<PartnerForm>({ name: '', date: '', time: '', location: '' });
  const [pick1, setPick1] = useState<{ lat: number; lng: number } | null>(null);
  const [pick2, setPick2] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MarriageMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Live-translate the generated report when the UI language changes
  const isTranslating = useLiveTranslation(result, setResult);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      showToast(t('mb_toast_signin'), 'warning', t('mb_toast_signin_title'));
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setMetadata(null);

    try {
      const langMap: Record<string, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali' };
      const selectedLang = langMap[i18n.language] || 'English';

      const res = await fetch('/api/marriage-bichar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner1: { ...partner1, lat: pick1?.lat, lng: pick1?.lng },
          partner2: { ...partner2, lat: pick2?.lat, lng: pick2?.lng },
          language: selectedLang
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || t('mb_toast_err'), 'error', t('mb_toast_err_title'));
      } else {
        setResult(data.result);
        setMetadata(data.metadata ?? null);
        if (data.remainingQuota !== undefined) setRemainingQuota(data.remainingQuota);
        showToast(t('mb_toast_success'), 'success', t('mb_toast_success_title'));
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch (error: unknown) {
      console.error('Marriage Bichar Error:', error);
      const message = error instanceof Error ? error.message : t('bc_try_again');
      showToast(t('mb_toast_network', { message }), 'error', t('mb_toast_network_title'));
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
        {t('marriage_bichar')}
      </motion.h1>

      <motion.p
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {t('mb_subtitle')}
      </motion.p>

      {remainingQuota !== null && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600 }}>
          {t('mb_remaining', { count: remainingQuota })}
        </div>
      )}

      <motion.div
        className={styles.formCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <form onSubmit={handleSubmit}>
          <div className={styles.partnerRow}>
            {/* Partner 1 */}
            <div className={styles.partnerCard}>
              <h3>{t('mb_partner1')}</h3>
              <div className={styles.formGroup}>
                <label htmlFor="p1-name">{t('mb_full_name')}</label>
                <input
                  id="p1-name"
                  type="text"
                  required
                  placeholder={t('mb_name_ph1')}
                  value={partner1.name}
                  onChange={(e) => setPartner1({ ...partner1, name: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="p1-date">{t('mb_dob')}</label>
                <input
                  id="p1-date"
                  type="date"
                  required
                  value={partner1.date}
                  onChange={(e) => setPartner1({ ...partner1, date: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="p1-time">{t('mb_time')}</label>
                <input
                  id="p1-time"
                  type="time"
                  value={partner1.time}
                  onChange={(e) => setPartner1({ ...partner1, time: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('mb_location')}</label>
                <LocationPicker
                  placeholder={t('lp_search_placeholder')}
                  locateLabel={t('lp_use_my_location')}
                  onPick={(p: LocationPick) => {
                    setPartner1((prev) => ({ ...prev, location: p.displayName }));
                    setPick1({ lat: p.lat, lng: p.lng });
                  }}
                />
              </div>
            </div>

            {/* Partner 2 */}
            <div className={styles.partnerCard}>
              <h3>{t('mb_partner2')}</h3>
              <div className={styles.formGroup}>
                <label htmlFor="p2-name">{t('mb_full_name')}</label>
                <input
                  id="p2-name"
                  type="text"
                  required
                  placeholder={t('mb_name_ph2')}
                  value={partner2.name}
                  onChange={(e) => setPartner2({ ...partner2, name: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="p2-date">{t('mb_dob')}</label>
                <input
                  id="p2-date"
                  type="date"
                  required
                  value={partner2.date}
                  onChange={(e) => setPartner2({ ...partner2, date: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="p2-time">{t('mb_time')}</label>
                <input
                  id="p2-time"
                  type="time"
                  value={partner2.time}
                  onChange={(e) => setPartner2({ ...partner2, time: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{t('mb_location')}</label>
                <LocationPicker
                  placeholder={t('lp_search_placeholder')}
                  locateLabel={t('lp_use_my_location')}
                  onPick={(p: LocationPick) => {
                    setPartner2((prev) => ({ ...prev, location: p.displayName }));
                    setPick2({ lat: p.lat, lng: p.lng });
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {!session
              ? t('mb_btn_signin')
              : loading
                ? t('mb_btn_loading')
                : t('mb_btn_calc')}
          </button>
        </form>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading && (
          <Loader key="loader" text={t('mb_loader')} />
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
            {/* Partner summary chips */}
            {isTranslating && (
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>
                ⏳ {t('translating_report')}
              </div>
            )}
            {metadata && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {(['partner1', 'partner2'] as const).map((pKey) => {
                  const p = metadata[pKey];
                  if (!p) return null;
                  return (
                    <div
                      key={pKey}
                      style={{
                        padding: '1rem',
                        background: 'rgba(139,92,246,0.08)',
                        border: '1px solid rgba(139,92,246,0.25)',
                        borderRadius: '12px',
                        fontSize: '0.82rem',
                        color: 'var(--text-color-soft)',
                        lineHeight: 1.6,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text-color)', marginBottom: '0.4rem' }}>
                        {p.name}
                      </div>
                      <div>☀ {t('mb_sun')}: {p.sunSign}</div>
                      <div>🌙 {t('mb_moon')}: {p.moonSign}</div>
                      <div>⭐ {t('mb_nakshatra')}: {p.nakshatra}</div>
                      {p.timeAssumed && (
                        <div style={{ color: '#f59e0b', marginTop: '0.3rem', fontSize: '0.75rem' }}>
                          {t('mb_time_assumed')}
                        </div>
                      )}
                      {p.locationAssumed && (
                        <div style={{ color: '#f59e0b', marginTop: '0.3rem', fontSize: '0.75rem' }}>
                          {t('mb_location_assumed')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Deterministic Manglik + Gun Milan badges (engine output, not AI) */}
            {metadata?.manglik && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                {(['partner1', 'partner2'] as const).map((pKey) => {
                  const m = metadata.manglik?.[pKey];
                  const name = metadata[pKey]?.name;
                  if (!m) return null;
                  return (
                    <div
                      key={`manglik-${pKey}`}
                      style={{
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: m.isManglik ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.10)',
                        border: `1px solid ${m.isManglik ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.35)'}`,
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ fontWeight: 700, color: 'var(--text-color)' }}>{name}</span>
                      <span
                        style={{
                          padding: '0.2rem 0.65rem',
                          borderRadius: '999px',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          color: '#fff',
                          background: m.isManglik ? 'linear-gradient(135deg,#ef4444,#f59e0b)' : 'linear-gradient(135deg,#22c55e,#14b8a6)',
                        }}
                      >
                        {m.isManglik ? t('mb_manglik') : t('mb_non_manglik')}
                      </span>
                      <span style={{ color: 'var(--text-color-soft)', fontSize: '0.78rem' }}>
                        {t('mb_mars_house', { house: m.marsHouseFromLagna })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {metadata?.ashtakoot && (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  background: 'rgba(139,92,246,0.10)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--text-color)',
                }}
              >
                💞 {t('mb_gun_total', { total: metadata.ashtakoot.totalScore })} — {metadata.ashtakoot.verdict}
              </div>
            )}

            {/* Auspicious marriage dates (deterministic muhurta engine) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-color-strong)', marginBottom: '0.75rem' }}>
                📅 {t('mb_muhurta_title')}
              </h3>
              {Array.isArray(metadata?.muhurtaDates) && metadata.muhurtaDates.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.9rem' }}>
                  {metadata.muhurtaDates.map((m) => {
                    const fmt = new Intl.DateTimeFormat(
                      i18n.language === 'en' ? 'en-US' : i18n.language,
                      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
                    );
                    return (
                      <div
                        key={m.date}
                        style={{
                          padding: '0.9rem 1rem',
                          background: 'rgba(245,158,11,0.08)',
                          border: '1px solid rgba(245,158,11,0.3)',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          lineHeight: 1.6,
                          color: 'var(--text-color-soft)',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#fbbf24' }}>{fmt.format(new Date(`${m.date}T00:00:00`))}</div>
                        <div>🌙 {m.tithi}</div>
                        <div>⭐ {m.nakshatra}</div>
                        {m.reasons?.[0] && (
                          <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', opacity: 0.85 }}>{m.reasons[0]}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-color-soft)' }}>{t('mb_muhurta_empty')}</div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color-strong)', margin: 0 }}>
                {t('mb_report_title')}
              </h2>
            </div>

            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
