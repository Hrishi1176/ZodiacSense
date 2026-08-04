'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import CameraCapture from '@/components/CameraCapture';
import AuthModal from '@/components/AuthModal';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';

export default function PalmReading() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [leftHand, setLeftHand] = useState<string | null>(null);
  const [rightHand, setRightHand] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const generatePDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFillColor(5, 5, 26);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('ZodiacSense Report', 105, 25, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('Palm Reading Analysis', 20, 60);

    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(result, 170);
    doc.text(splitText, 20, 80);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280);
    doc.save('palm_reading_report.pdf');
    showToast('PDF Report downloaded successfully!', 'success', 'PDF Export');
  };

  const analyzeHands = async () => {
    if (!session) {
      showToast('Please Sign In to access AI Palm Reading and daily quotas.', 'warning', 'Authentication Required');
      setIsAuthModalOpen(true);
      return;
    }
    if (!leftHand || !rightHand) {
      showToast('Please show both palms to the camera first.', 'info', 'Missing Hands');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('/api/analyze-palm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leftHand, rightHand }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to analyze palms', 'error', 'Analysis Failed');
      } else {
        setResult(data.result);
        if (data.remainingQuota !== undefined) {
          setRemainingQuota(data.remainingQuota);
        }
        showToast('Palm reading analysis complete!', 'success', 'Cosmic Insight');
      }
    } catch (error) {
      console.error(error);
      showToast('The cosmic energies are currently unclear. Please try again.', 'error', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className={`glow-text ${styles.title}`}>{t('palm_reading')}</h1>
        <p className={styles.description}>
          Show both your hands to the camera. Our AI will auto-detect your palms and reveal insights about your life, career, and love.
        </p>

        {remainingQuota !== null && (
          <div style={{ marginBottom: '1.5rem', fontSize: '0.95rem', color: '#38bdf8', fontWeight: 600 }}>
            ✦ Remaining Palm Readings Today: {remainingQuota}
          </div>
        )}

        <div className={styles.cameraGrid}>
          <CameraCapture label="Left Hand (Past & Potential)" onCapture={setLeftHand} />
          <CameraCapture label="Right Hand (Present & Action)" onCapture={setRightHand} />
        </div>

        <div className={styles.actionContainer}>
          <button
            className={styles.analyzeBtn}
            disabled={(!leftHand || !rightHand) && Boolean(session)}
            onClick={analyzeHands}
          >
            {!session
              ? 'Sign In to Reveal Destiny'
              : loading
              ? 'Analyzing Cosmic Lines...'
              : 'Reveal My Destiny'}
          </button>
        </div>

        {result && (
          <motion.div
            className={`glass-panel ${styles.resultCard}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Cosmic Insights</h2>
              <button
                onClick={generatePDF}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(to right, #8b5cf6, #3b82f6)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📥 Download PDF
              </button>
            </div>
            <div className={styles.resultText}>{result}</div>
          </motion.div>
        )}
      </motion.div>

      {/* Auth Modal Popup */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
