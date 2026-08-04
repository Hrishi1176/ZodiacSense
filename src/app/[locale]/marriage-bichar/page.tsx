'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import AuthModal from '@/components/AuthModal';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';

export default function MarriageBichar() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [partner1, setPartner1] = useState({ name: '', date: '' });
  const [partner2, setPartner2] = useState({ name: '', date: '' });
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
    doc.text('Marriage Bichar Compatibility', 20, 60);

    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(result, 170);
    doc.text(splitText, 20, 80);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280);
    doc.save('marriage_bichar_report.pdf');
    showToast('Marriage Compatibility PDF report downloaded!', 'success', 'PDF Export');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      showToast('Please Sign In to check Marriage Compatibility and daily quotas.', 'warning', 'Authentication Required');
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/marriage-bichar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner1, partner2 }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to check compatibility', 'error', 'Calculation Error');
      } else {
        setResult(data.result);
        if (data.remainingQuota !== undefined) {
          setRemainingQuota(data.remainingQuota);
        }
        showToast('Marriage compatibility report calculated successfully!', 'success', 'Guna Milan Complete');
      }
    } catch (error) {
      console.error(error);
      showToast('Cosmic connection error. Please try again.', 'error', 'Network Error');
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
        <h1 className={`glow-text ${styles.title}`}>{t('marriage_bichar')}</h1>
        <p className={styles.description}>Discover cosmic compatibility and marriage prospects based on astrological alignments.</p>

        {remainingQuota !== null && (
          <div style={{ marginBottom: '1.5rem', fontSize: '0.95rem', color: '#38bdf8', fontWeight: 600 }}>
            ✦ Remaining Marriage Bichar Today: {remainingQuota}
          </div>
        )}

        <form onSubmit={handleSubmit} className={`glass-panel ${styles.form}`}>
          <div className={styles.partnerSection}>
            <h3>Partner 1</h3>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input
                type="text"
                required
                placeholder="Name"
                value={partner1.name}
                onChange={(e) => setPartner1({ ...partner1, name: e.target.value })}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Date of Birth</label>
              <input
                type="date"
                required
                value={partner1.date}
                onChange={(e) => setPartner1({ ...partner1, date: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.partnerSection}>
            <h3>Partner 2</h3>
            <div className={styles.inputGroup}>
              <label>Name</label>
              <input
                type="text"
                required
                placeholder="Name"
                value={partner2.name}
                onChange={(e) => setPartner2({ ...partner2, name: e.target.value })}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Date of Birth</label>
              <input
                type="date"
                required
                value={partner2.date}
                onChange={(e) => setPartner2({ ...partner2, date: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {!session
              ? 'Sign In to Check Compatibility'
              : loading
              ? 'Analyzing Synergy & Gunas...'
              : 'Calculate Compatibility'}
          </button>
        </form>

        {result && (
          <motion.div
            className={`glass-panel ${styles.resultCard}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Compatibility Breakdown</h2>
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
