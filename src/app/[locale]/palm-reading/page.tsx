'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CameraCapture from '@/components/CameraCapture';
import AuthModal from '@/components/AuthModal';
import Loader from '@/components/Loader';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';

export default function PalmReading() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [leftHand, setLeftHand] = useState<string | null>(null);
  const [rightHand, setRightHand] = useState<string | null>(null);
  const [activeMobileHand, setActiveMobileHand] = useState<'left' | 'right'>('left');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const analyzeHands = async () => {
    if (!session) {
      showToast('Please sign in to access AI Palm Reading.', 'warning', 'Sign In Required');
      setIsAuthModalOpen(true);
      return;
    }
    if (!leftHand || !rightHand) {
      showToast('Please capture both palms first.', 'info', 'Missing Images');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const langMap: Record<string, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali' };
      const selectedLang = langMap[i18n.language] || 'English';

      const res = await fetch('/api/analyze-palm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftHand,
          rightHand,
          language: selectedLang
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to analyze palms', 'error', 'Analysis Failed');
      } else {
        setResult(data.result);
        if (data.remainingQuota !== undefined) setRemainingQuota(data.remainingQuota);
        showToast('Palm reading complete!', 'success', 'Cosmic Insight Unlocked');
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error('Palm Reading Error:', error);
      showToast(`Network error: ${error.message || 'Please try again.'}`, 'error', 'Connection Error');
    } finally {
      setLoading(false);
    }
  };

  const bothCaptured = !!leftHand && !!rightHand;

  return (
    <div className={styles.container}>
      <motion.h1
        className={styles.title}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {t('palm_reading')}
      </motion.h1>

      <motion.p
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Show both palms to the camera. Our AI analyzes your Life Line, Heart Line, Head Line, and more to reveal insights about your destiny.
      </motion.p>

      {remainingQuota !== null && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600 }}>
          ✦ Remaining readings today: {remainingQuota}
        </div>
      )}

      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Mobile Tab Toggle */}
        <div className={styles.mobileTabs}>
          <button
            className={`${styles.mobileTabBtn} ${activeMobileHand === 'left' ? styles.active : ''}`}
            onClick={() => setActiveMobileHand('left')}
          >
            {leftHand ? '✓ Left Palm' : '🤚 Left Palm'}
          </button>
          <button
            className={`${styles.mobileTabBtn} ${activeMobileHand === 'right' ? styles.active : ''}`}
            onClick={() => setActiveMobileHand('right')}
          >
            {rightHand ? '✓ Right Palm' : '✋ Right Palm'}
          </button>
        </div>

        {/* Camera captures */}
        <div className={styles.cameraGrid}>
          <div className={`${styles.cameraSlot} ${activeMobileHand !== 'left' ? styles.hideMobile : ''}`}>
            <CameraCapture label="Left Hand (Past &amp; Potential)" onCapture={setLeftHand} />
          </div>
          <div className={`${styles.cameraSlot} ${activeMobileHand !== 'right' ? styles.hideMobile : ''}`}>
            <CameraCapture label="Right Hand (Present &amp; Destiny)" onCapture={setRightHand} />
          </div>
        </div>

        {/* Status row */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <span style={{
            padding: '0.35rem 0.9rem',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            fontWeight: 600,
            background: leftHand ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${leftHand ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
            color: leftHand ? '#34d399' : 'var(--text-muted)',
          }}>
            {leftHand ? '✓ Left Palm Captured' : '○ Left Palm'}
          </span>
          <span style={{
            padding: '0.35rem 0.9rem',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            fontWeight: 600,
            background: rightHand ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${rightHand ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`,
            color: rightHand ? '#34d399' : 'var(--text-muted)',
          }}>
            {rightHand ? '✓ Right Palm Captured' : '○ Right Palm'}
          </span>
        </div>

        <button
          className={styles.button}
          disabled={loading || (!bothCaptured && !!session)}
          onClick={analyzeHands}
        >
          {!session
            ? '🔒 Sign In to Reveal Destiny'
            : loading
              ? '🔮 Reading Your Palm Lines...'
              : !bothCaptured
                ? '📸 Capture Both Palms First'
                : '✨ Reveal My Destiny'}
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading && (
          <Loader key="loader" text="Reading Your Palm Lines..." />
        )}
        {!loading && result && (
          <motion.div
            key="result"
            className={styles.result}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ marginTop: '2rem' }}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color-strong)', margin: 0 }}>
                🖐️ Your Palm Reading
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
