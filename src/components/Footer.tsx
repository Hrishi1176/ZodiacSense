'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, Sparkles, Shield, Globe } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
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
            AI-powered Vedic &amp; Western astrology, real-time palm reading, and cosmic compatibility analytics.
          </p>
          <div className={styles.aiBadge}>
            <Sparkles size={14} />
            <span>Powered by AI</span>
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
            Features
          </h4>
          <Link href="/palm-reading" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            Palm Reading
          </Link>
          <Link href="/birth-chart" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            Birth Chart
          </Link>
          <Link href="/marriage-bichar" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            Marriage Bichar
          </Link>
          <Link href="/dashboard" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            Cosmic Dashboard
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
            Legal &amp; Privacy
          </h4>
          <Link href="/privacy-policy" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            Privacy Policy
          </Link>
          <Link href="/data-privacy" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            Data Privacy
          </Link>
          <Link href="/terms-of-service" className={styles.link}>
            <span className={styles.linkArrow}>→</span>
            Terms of Service
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
            Languages
          </h4>
          <span className={styles.link}>
            <span className={styles.flagEmoji}>🇮🇳</span>
            English
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
          © {new Date().getFullYear()} <span className={styles.brandName}>ZodiacSense</span>. All rights reserved.
        </p>
        <p className={styles.tagline}>
          Cosmic Guidance powered by Advanced AI Models
        </p>
      </motion.div>
    </footer>
  );
}
