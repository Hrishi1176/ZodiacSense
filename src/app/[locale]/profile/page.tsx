'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import styles from './page.module.css';
import Loader from '@/components/Loader';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({ name: '', date: '', time: '', location: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetch('/api/user/profile')
        .then(res => res.json())
        .then(data => {
          if (data.birthDetails) {
            setFormData(data.birthDetails);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) throw new Error('Failed to save profile');
      
      showToast(t('profile_toast_saved'), 'success', t('profile_toast_saved_title'));
    } catch (err) {
      showToast(t('profile_toast_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return <Loader text={t('profile_loading')} />;
  }

  return (
    <div className={styles.container}>
      <motion.h1 
        className={styles.title}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {t('profile_title')}
      </motion.h1>
      <motion.p 
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {t('profile_subtitle')}
      </motion.p>

      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>{t('profile_full_name')}</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('profile_name_ph')}
            />
          </div>
          <div className={styles.formGroup}>
            <label>{t('profile_dob')}</label>
            <input 
              type="date" 
              required 
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>{t('profile_tob')}</label>
            <input 
              type="time" 
              required 
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>{t('profile_pob')}</label>
            <input 
              type="text" 
              required 
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              placeholder={t('profile_pob_ph')}
            />
          </div>

          <button type="submit" className={styles.button} disabled={saving}>
            {saving ? t('profile_saving') : t('profile_save')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
