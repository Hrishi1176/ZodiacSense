'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, Sparkles, Shield, Globe } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      {/* Decorative top border with gradient line */}
      <div className={styles.gradientLine} />

      <div className={styles.container}>
        <motion.div
          className={styles.brand}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/" className={styles.logo}>
            <div className={styles.logoOrb}>
              <div className={styles.logoOrbInner} />
              <div className={styles.logoOrbRing} />
            </div>
            <span>ZodiacSense</span>
          </Link>
          <p className={styles.brandDesc}>
            {t('footer_desc')}
          </p>
          <div className={styles.aiBadge}>
            <Sparkles size={14} />
            <span>{t('footer_powered_ai')}</span>
          </div>
        </motion.div>

        <motion.div
          className={styles.column}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h4 className={styles.columnTitle}>
            <Star size={14} className={styles.columnIcon} />
            {t('footer_features')}
          </h4>
          <Link href="/palm-reading" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            {t('palm_reading')}
          </Link>
          <Link href="/birth-chart" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            {t('birth_chart')}
          </Link>
          <Link href="/marriage-bichar" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            {t('marriage_bichar')}
          </Link>
          <Link href="/dashboard" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            {t('footer_cosmic_dashboard')}
          </Link>
        </motion.div>

        <motion.div
          className={styles.column}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h4 className={styles.columnTitle}>
            <Shield size={14} className={styles.columnIcon} />
            {t('footer_legal')}
          </h4>
          <Link href="/privacy-policy" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            {t('footer_privacy_policy')}
          </Link>
          <Link href="/data-privacy" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            {t('footer_data_privacy')}
          </Link>
          <Link href="/terms-of-service" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            {t('footer_terms')}
          </Link>
        </motion.div>

        <motion.div
          className={styles.column}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h4 className={styles.columnTitle}>
            <Globe size={14} className={styles.columnIcon} />
            {t('footer_languages')}
          </h4>
          <span className={styles.link}>
            <span className={styles.flagEmoji}>🇮🇳</span>
            English(US)
          </span>
          <span className={styles.link}>
            <span className={styles.flagEmoji}>🇮🇳</span>
            हिंदी (Hindi)
          </span>
          <span className={styles.link}>
            <span className={styles.flagEmoji}>🇮🇳</span>
            বাংলা (Bengali)
          </span>
        </motion.div>
      </div>

      <motion.div
        className={styles.bottom}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <p className={styles.copyright}>
          © {new Date().getFullYear()} <span className={styles.brandName}>ZodiacSense</span>. {t('footer_rights')}
        </p>
        <p className={styles.tagline}>
          {t('footer_tagline')}
        </p>
      </motion.div>
    </footer>
  );
}
