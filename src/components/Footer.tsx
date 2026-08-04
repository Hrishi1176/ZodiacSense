'use client';

import React from 'react';
import Link from 'next/link';
import { Star, Sparkles } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            <Star className={styles.logoIcon} size={22} />
            <span>ZodiacSense</span>
          </Link>
          <p className={styles.brandDesc}>
            AI-powered Vedic & Western astrology, real-time palm reading, and cosmic compatibility analytics.
          </p>
          <div className={styles.aiBadge}>
            <Sparkles size={14} />
            <span>Powered by AI</span>
          </div>
        </div>

        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Features</h4>
          <Link href="/palm-reading" className={styles.link}>Palm Reading</Link>
          <Link href="/birth-chart" className={styles.link}>Birth Chart</Link>
          <Link href="/marriage-bichar" className={styles.link}>Marriage Bichar</Link>
          <Link href="/dashboard" className={styles.link}>Cosmic Dashboard</Link>
        </div>

        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Languages</h4>
          <span className={styles.link}>English</span>
          <span className={styles.link}>हिंदी (Hindi)</span>
          <span className={styles.link}>বাংলা (Bengali)</span>
        </div>

        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Account</h4>
          <Link href="/auth/login" className={styles.link}>Sign In</Link>
          <Link href="/auth/register" className={styles.link}>Create Account</Link>
          <Link href="/dashboard" className={styles.link}>Daily Quota</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} ZodiacSense. All rights reserved.</p>
        <p>Cosmic Guidance powered by Advanced AI Models</p>
      </div>
    </footer>
  );
}
