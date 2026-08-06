'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Server } from 'lucide-react';
import styles from '../legal.module.css';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <motion.h1
        className={styles.title}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {t('legal_privacy_policy')}
      </motion.h1>

      <motion.p
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {t('legal_privacy_policy_sub')}
      </motion.p>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2>
          <Shield size={20} />
          1. Information We Collect
        </h2>
        <p>
          At ZodiacSense, we prioritize transparency. To generate personalized birth charts, palm readings, and compatibility analysis, we collect:
        </p>
        <ul>
          <li><strong>Account Details:</strong> Name and email address provided during account registration or OAuth sign-in.</li>
          <li><strong>Astrological Birth Data:</strong> Birth date, birth time, and birth location used exclusively for real-time Swiss Ephemeris calculations.</li>
          <li><strong>Palm Images:</strong> Temporary palm scan images uploaded or captured via your camera solely for AI visual feature extraction.</li>
        </ul>

        <h2>
          <Eye size={20} />
          2. How We Use Your Data
        </h2>
        <p>
          Your personal details are processed with strict boundaries:
        </p>
        <ul>
          <li>To compute exact astronomical planetary coordinates (Lahiri Ayanamsa / Tropical).</li>
          <li>To deliver personalized AI readings through secure API integrations.</li>
          <li>To manage your daily reading quota status.</li>
          <li>We <strong>never sell, rent, or trade</strong> your personal information or palm scans to third parties or advertising networks.</li>
        </ul>

        <h2>
          <Lock size={20} />
          3. Security &amp; Encryption
        </h2>
        <p>
          All network communications are encrypted via SSL/TLS. Passwords and session cookies are hashed and stored using industry-standard security protocols.
        </p>

        <h2>
          <Server size={20} />
          4. Data Retention &amp; Rights
        </h2>
        <p>
          Palm images captured during live camera scanning are processed in transient memory and are not permanently archived on public servers. You have the right to request deletion of your account and personal birth details at any time.
        </p>

        <div className={styles.lastUpdated}>
          Last Updated: August 2026 • ZodiacSense Privacy Operations
        </div>
      </motion.div>
    </div>
  );
}
