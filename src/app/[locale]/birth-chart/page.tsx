'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import jsPDF from 'jspdf';
import AuthModal from '@/components/AuthModal';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';

export default function BirthChart() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ name: '', date: '', time: '', location: '' });
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
    doc.text('Birth Chart Breakdown', 20, 60);

    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(result, 170);
    doc.text(splitText, 20, 80);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 280);
    doc.save('birth_chart_report.pdf');
    showToast('Birth Chart PDF report downloaded!', 'success', 'PDF Export');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      showToast('Please Sign In to generate your Birth Chart and daily quota.', 'warning', 'Authentication Required');
      setIsAuthModalOpen(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/birth-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to generate birth chart', 'error', 'Calculation Error');
      } else {
        setResult(data.result);
        if (data.remainingQuota !== undefined) {
          setRemainingQuota(data.remainingQuota);
        }
        showToast('Birth Chart calculation generated successfully!', 'success', 'Kundali Complete');
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
        <h1 className={`glow-text ${styles.title}`}>{t('birth_chart')}</h1>
        <p className={styles.description}>Enter your birth details to generate your comprehensive astrological birth chart.</p>

        {remainingQuota !== null && (
          <div style={{ marginBottom: '1.5rem', fontSize: '0.95rem', color: '#38bdf8', fontWeight: 600 }}>
            ✦ Remaining Birth Chart Readings Today: {remainingQuota}
          </div>
        )}

        <form onSubmit={handleSubmit} className={`glass-panel ${styles.form}`}>
          <div className={styles.inputGroup}>
            <label>Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Date of Birth</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Time of Birth</label>
            <input
              type="time"
              required
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Place of Birth</label>
            <input
              type="text"
              required
              placeholder="e.g. London, UK"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {!session
              ? 'Sign In to Generate Chart'
              : loading
              ? 'Calculating Planetary Alignment...'
              : 'Generate Chart'}
          </button>
        </form>

        {result && (
          <motion.div
            className={`glass-panel ${styles.resultCard}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Vedic & Western Synthesis</h2>
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
