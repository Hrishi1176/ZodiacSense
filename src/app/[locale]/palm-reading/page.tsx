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
      showToast(t('palm_toast_signin'), 'warning', t('palm_toast_signin_title'));
      setIsAuthModalOpen(true);
      return;
    }
    if (!leftHand || !rightHand) {
      showToast(t('palm_toast_missing'), 'info', t('palm_toast_missing_title'));
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

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('[analyze-palm] Non-JSON response:', res.status, text.slice(0, 200));
        data = { error: text };
      }

      if (!res.ok) {
        const msg = data.error || data.message || `Server error ${res.status}`;
        if (res.status === 413 || msg.includes('Entity Too Large') || msg.includes('too large')) {
          showToast(t('palm_toast_large'), 'error', t('palm_toast_large_title'));
        } else {
          showToast(typeof msg === 'string' ? msg : t('palm_toast_fail'), 'error', t('palm_toast_fail_title'));
        }
      } else {
        setResult(data.result);
        if (data.remainingQuota !== undefined) setRemainingQuota(data.remainingQuota);
        showToast(t('palm_toast_success'), 'success', t('palm_toast_success_title'));
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch (error: any) {
      console.error('Palm Reading Error:', error);
      showToast(t('palm_toast_network', { message: error.message || t('bc_try_again') }), 'error', t('palm_toast_network_title'));
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
        {t('palm_subtitle')}
      </motion.p>

      {!('mediaDevices' in navigator) && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', color: '#fbbf24', fontSize: '0.85rem', maxWidth: '500px', textAlign: 'center' }}>
          {t('palm_https_warning')}
        </div>
      )}

      {remainingQuota !== null && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 600 }}>
          {t('palm_remaining', { count: remainingQuota })}
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
            {leftHand ? t('palm_left_tab_done') : t('palm_left_tab')}
          </button>
          <button
            className={`${styles.mobileTabBtn} ${activeMobileHand === 'right' ? styles.active : ''}`}
            onClick={() => setActiveMobileHand('right')}
          >
            {rightHand ? t('palm_right_tab_done') : t('palm_right_tab')}
          </button>
        </div>

        {/* Camera captures */}
        <div className={styles.cameraGrid}>
          <div className={`${styles.cameraSlot} ${activeMobileHand !== 'left' ? styles.hideMobile : ''}`}>
            <CameraCapture label={t('palm_cam_left')} onCapture={setLeftHand} />
          </div>
          <div className={`${styles.cameraSlot} ${activeMobileHand !== 'right' ? styles.hideMobile : ''}`}>
            <CameraCapture label={t('palm_cam_right')} onCapture={setRightHand} />
          </div>
        </div>

        {/* Status row */}
        <div className={styles.statusRow}>
          <span className={`${styles.statusBadge} ${leftHand ? styles.statusBadgeActive : ''}`}>
            {leftHand ? t('palm_left_captured') : t('palm_left_status')}
          </span>
          <span className={`${styles.statusBadge} ${rightHand ? styles.statusBadgeActive : ''}`}>
            {rightHand ? t('palm_right_captured') : t('palm_right_status')}
          </span>
        </div>

        <button
          className={styles.button}
          disabled={loading || (!bothCaptured && !!session)}
          onClick={analyzeHands}
        >
          {!session
            ? t('palm_btn_signin')
            : loading
              ? t('palm_btn_loading')
              : !bothCaptured
                ? t('palm_btn_capture')
                : t('palm_btn_reveal')}
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading && (
          <Loader key="loader" text={t('palm_loader')} />
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
                {t('palm_result_title')}
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
