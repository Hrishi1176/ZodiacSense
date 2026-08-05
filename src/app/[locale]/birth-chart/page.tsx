'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AuthModal from '@/components/AuthModal';
import Loader from '@/components/Loader';
import FeedbackComponent from '@/components/FeedbackComponent';
import ChatbotComponent from '@/components/ChatbotComponent';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';

export default function BirthChart() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const langMap: Record<string, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali' };
  const selectedLang = langMap[i18n.language] || 'English';

  const [formData, setFormData] = useState({ name: '', date: '', time: '', location: '' });
  const [result, setResult] = useState<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (session) {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.birthDetails) {
            setFormData(prev => ({ ...prev, ...data.birthDetails }));
          }
        })
        .catch(err => console.error('Failed to load presets:', err));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      showToast('Please sign in to generate your Birth Chart.', 'warning', 'Sign In Required');
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
        body: JSON.stringify({ ...formData, language: selectedLang }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to generate birth chart', 'error', 'Calculation Error');
      } else {
        setResult(data.result);
        setReadingId(data.id);
        setMetadata(data.metadata ?? null);
        if (data.remainingQuota !== undefined) setRemainingQuota(data.remainingQuota);
        showToast('Your Kundali has been generated!', 'success', 'Kundali Complete');
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch (error: unknown) {
      console.error('Birth Chart Error:', error);
      const message = error instanceof Error ? error.message : 'Please try again.';
      showToast(`Network error: ${message}`, 'error', 'Connection Error');
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
        Enter your birth details to generate an accurate Vedic &amp; Western birth chart powered by real astronomical calculations.
      </motion.p>

      {remainingQuota !== null && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600 }}>
          ✦ Remaining readings today: {remainingQuota}
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
              <label htmlFor="bc-name">Full Name</label>
              <input
                suppressHydrationWarning
                id="bc-name"
                type="text"
                required
                placeholder="e.g. Arjun Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bc-location">Place of Birth</label>
              <input
                suppressHydrationWarning
                id="bc-location"
                type="text"
                required
                placeholder="e.g. Kolkata, India"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="bc-date">Date of Birth</label>
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
              <label htmlFor="bc-time">Time of Birth</label>
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

          <button
            suppressHydrationWarning
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {!session
              ? '🔒 Sign In to Generate Chart'
              : loading
                ? '⏳ Calculating Planetary Positions...'
                : '🌌 Generate My Birth Chart'}
          </button>
        </form>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading && (
          <Loader key="loader" text="Calculating Planetary Positions..." />
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
            {/* Metadata chips */}
            {metadata && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {Object.entries(metadata).slice(0, 6).map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      padding: '0.3rem 0.75rem',
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.35)',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      color: '#a78bfa',
                      fontWeight: 600,
                    }}
                  >
                    {k.replace(/([A-Z])/g, ' $1').trim()}: {v}
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color-strong)', margin: 0 }}>
                🌌 Your Vedic &amp; Western Kundali
              </h2>
            </div>

            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            </div>

            {readingId && <FeedbackComponent readingId={readingId} />}
            {readingId && <ChatbotComponent readingId={readingId} language={selectedLang} />}
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
