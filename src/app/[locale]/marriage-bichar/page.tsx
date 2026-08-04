'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AuthModal from '@/components/AuthModal';
import Loader from '@/components/Loader';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';

export default function MarriageBichar() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [partner1, setPartner1] = useState({ name: '', date: '' });
  const [partner2, setPartner2] = useState({ name: '', date: '' });
  const [result, setResult] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      showToast('Please sign in to check Marriage Compatibility.', 'warning', 'Sign In Required');
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
          partner1,
          partner2,
          language: selectedLang
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to check compatibility', 'error', 'Calculation Error');
      } else {
        setResult(data.result);
        setMetadata(data.metadata ?? null);
        if (data.remainingQuota !== undefined) setRemainingQuota(data.remainingQuota);
        showToast('Compatibility report generated!', 'success', 'Gun Milan Complete');
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch {
      showToast('Network error. Please try again.', 'error', 'Connection Error');
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
        Discover your cosmic compatibility through Vedic Gun Milan (Ashtakoota), Mangalik analysis, and planetary synastry.
      </motion.p>

      {remainingQuota !== null && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600 }}>
          ✦ Remaining checks today: {remainingQuota}
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
              <h3>Partner 1</h3>
              <div className={styles.formGroup}>
                <label htmlFor="p1-name">Full Name</label>
                <input
                  id="p1-name"
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={partner1.name}
                  onChange={(e) => setPartner1({ ...partner1, name: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="p1-date">Date of Birth</label>
                <input
                  id="p1-date"
                  type="date"
                  required
                  value={partner1.date}
                  onChange={(e) => setPartner1({ ...partner1, date: e.target.value })}
                />
              </div>
            </div>

            {/* Partner 2 */}
            <div className={styles.partnerCard}>
              <h3>Partner 2</h3>
              <div className={styles.formGroup}>
                <label htmlFor="p2-name">Full Name</label>
                <input
                  id="p2-name"
                  type="text"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={partner2.name}
                  onChange={(e) => setPartner2({ ...partner2, name: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="p2-date">Date of Birth</label>
                <input
                  id="p2-date"
                  type="date"
                  required
                  value={partner2.date}
                  onChange={(e) => setPartner2({ ...partner2, date: e.target.value })}
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
              ? '🔒 Sign In to Check Compatibility'
              : loading
                ? '💫 Analyzing Cosmic Synergy...'
                : '💑 Calculate Compatibility'}
          </button>
        </form>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading && (
          <Loader key="loader" text="Analyzing Cosmic Synergy..." />
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
                      <div>☀ Sun: {p.sunSign}</div>
                      <div>🌙 Moon: {p.moonSign}</div>
                      <div>⭐ Nakshatra: {p.nakshatra}</div>
                      {p.timeAssumed && (
                        <div style={{ color: '#f59e0b', marginTop: '0.3rem', fontSize: '0.75rem' }}>
                          ⚠ Time not provided — noon assumed
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color-strong)', margin: 0 }}>
                💑 Compatibility Report
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
