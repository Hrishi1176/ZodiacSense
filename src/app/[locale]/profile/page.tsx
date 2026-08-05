'use client';

import React, { useState, useEffect } from 'react';
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
      
      showToast('Profile presets saved successfully!', 'success', 'Saved');
    } catch (err) {
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === 'loading') {
    return <Loader text="Loading Profile..." />;
  }

  return (
    <div className={styles.container}>
      <motion.h1 
        className={styles.title}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        My Profile
      </motion.h1>
      <motion.p 
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Set your default birth details to auto-fill the forms.
      </motion.p>

      <motion.div 
        className={styles.card}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input 
              type="text" 
              required 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Arjun Sharma"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Date of Birth</label>
            <input 
              type="date" 
              required 
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Time of Birth</label>
            <input 
              type="time" 
              required 
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Place of Birth</label>
            <input 
              type="text" 
              required 
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Kolkata, India"
            />
          </div>

          <button type="submit" className={styles.button} disabled={saving}>
            {saving ? 'Saving...' : 'Save Presets'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
