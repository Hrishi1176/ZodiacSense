import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';

export default function FeedbackComponent({ readingId }: { readingId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleFeedback = async (isAccurate: boolean) => {
    try {
      const res = await fetch(`/api/readings/${readingId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAccurate })
      });

      if (!res.ok) throw new Error('Failed to submit feedback');

      setSubmitted(true);
      showToast(t('feedback_toast_success'), 'success', t('feedback_toast_title'));
    } catch (err) {
      console.error(err);
      showToast(t('feedback_toast_error'), 'error');
    }
  };

  if (submitted) {
    return (
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#10b981', fontWeight: 'bold' }}>{t('feedback_thanks')}</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#e2e8f0' }}>{t('feedback_question')}</h3>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button
          onClick={() => handleFeedback(true)}
          style={{ padding: '0.5rem 1.5rem', borderRadius: '99px', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {t('feedback_yes')}
        </button>
        <button
          onClick={() => handleFeedback(false)}
          style={{ padding: '0.5rem 1.5rem', borderRadius: '99px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {t('feedback_no')}
        </button>
      </div>
    </div>
  );
}
