'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Hand, Compass, Heart, Calendar, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import styles from './page.module.css';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetch('/api/dashboard')
        .then((res) => res.json())
        .then((d) => {
          setData(d);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <h2 className="glow-text">Aligning Your Cosmic Data...</h2>
      </div>
    );
  }

  const quota = data?.quotaStatus;
  const analytics = data?.analytics;
  const readings = data?.readings || [];

  return (
    <div className={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.header}
      >
        <h1 className={styles.title}>
          Welcome, {session?.user?.name || 'Cosmic Seeker'} ✦
        </h1>
        <p className={styles.subtitle}>
          Track your daily AI astrology quotas, life analytics, and history.
        </p>
      </motion.div>

      {/* Daily Quota Cards */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-color)' }}>
        <Zap size={20} style={{ display: 'inline', color: '#38bdf8', verticalAlign: 'middle', marginRight: '0.4rem' }} />
        Daily AI Quota Status (Reset Daily)
      </h2>

      <div className={styles.quotaGrid}>
        {/* Palm Reading Quota */}
        <motion.div className={`glass-panel ${styles.quotaCard}`} whileHover={{ y: -4 }}>
          <div>
            <div className={styles.quotaHeader}>
              <span className={styles.quotaTitle}>
                <Hand size={20} color="#8b5cf6" />
                <span>হস্তরেখা বিচার (Palm Reading)</span>
              </span>
              <span className={styles.quotaBadge}>
                {quota?.remaining?.palm_reading ?? 3} Left
              </span>
            </div>
            <div className={styles.quotaProgressTrack} style={{ marginTop: '1rem' }}>
              <div
                className={styles.quotaProgressBar}
                style={{
                  width: `${((quota?.usage?.palm_reading ?? 0) / (quota?.limits?.palm_reading ?? 3)) * 100}%`,
                }}
              />
            </div>
            <div className={styles.quotaStats} style={{ marginTop: '0.5rem' }}>
              <span>Used: {quota?.usage?.palm_reading ?? 0}</span>
              <span>Daily Max: {quota?.limits?.palm_reading ?? 3}</span>
            </div>
          </div>
          <Link href="/palm-reading" className={styles.actionBtn}>
            Start Palm Scan →
          </Link>
        </motion.div>

        {/* Birth Chart Quota */}
        <motion.div className={`glass-panel ${styles.quotaCard}`} whileHover={{ y: -4 }}>
          <div>
            <div className={styles.quotaHeader}>
              <span className={styles.quotaTitle}>
                <Compass size={20} color="#38bdf8" />
                <span>জন্ম কুণ্ডলী (Birth Chart)</span>
              </span>
              <span className={styles.quotaBadge}>
                {quota?.remaining?.birth_chart ?? 2} Left
              </span>
            </div>
            <div className={styles.quotaProgressTrack} style={{ marginTop: '1rem' }}>
              <div
                className={styles.quotaProgressBar}
                style={{
                  width: `${((quota?.usage?.birth_chart ?? 0) / (quota?.limits?.birth_chart ?? 2)) * 100}%`,
                }}
              />
            </div>
            <div className={styles.quotaStats} style={{ marginTop: '0.5rem' }}>
              <span>Used: {quota?.usage?.birth_chart ?? 0}</span>
              <span>Daily Max: {quota?.limits?.birth_chart ?? 2}</span>
            </div>
          </div>
          <Link href="/birth-chart" className={styles.actionBtn}>
            Generate Chart →
          </Link>
        </motion.div>

        {/* Marriage Bichar Quota */}
        <motion.div className={`glass-panel ${styles.quotaCard}`} whileHover={{ y: -4 }}>
          <div>
            <div className={styles.quotaHeader}>
              <span className={styles.quotaTitle}>
                <Heart size={20} color="#ec4899" />
                <span>বিবাহ বিচার (Marriage Bichar)</span>
              </span>
              <span className={styles.quotaBadge}>
                {quota?.remaining?.marriage_bichar ?? 2} Left
              </span>
            </div>
            <div className={styles.quotaProgressTrack} style={{ marginTop: '1rem' }}>
              <div
                className={styles.quotaProgressBar}
                style={{
                  width: `${((quota?.usage?.marriage_bichar ?? 0) / (quota?.limits?.marriage_bichar ?? 2)) * 100}%`,
                }}
              />
            </div>
            <div className={styles.quotaStats} style={{ marginTop: '0.5rem' }}>
              <span>Used: {quota?.usage?.marriage_bichar ?? 0}</span>
              <span>Daily Max: {quota?.limits?.marriage_bichar ?? 2}</span>
            </div>
          </div>
          <Link href="/marriage-bichar" className={styles.actionBtn}>
            Check Compatibility →
          </Link>
        </motion.div>
      </div>

      {/* AI Life Analytics */}
      <motion.div className={`glass-panel ${styles.analyticsCard}`}>
        <div className={styles.analyticsHeader}>
          <Sparkles size={24} color="#a78bfa" />
          <h2>AI Life Analytics & Cosmic Synthesis</h2>
        </div>
        <p className={styles.analyticsText}>{analytics?.summary}</p>
      </motion.div>

      {/* Reading History */}
      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>Your Cosmic Reading History</h2>

        {readings.length === 0 ? (
          <div className={`glass-panel ${styles.emptyState}`}>
            <p>No readings recorded yet. Choose a feature above to get your first AI reading!</p>
          </div>
        ) : (
          <div className={styles.historyList}>
            {readings.map((item: any) => {
              const isExpanded = expandedId === item._id;
              const formattedType = item.type.replace('_', ' ');
              return (
                <div key={item._id} className={`glass-panel ${styles.historyCard}`}>
                  <div
                    className={styles.historyHeader}
                    onClick={() => setExpandedId(isExpanded ? null : item._id)}
                  >
                    <span className={styles.historyType}>
                      {item.type === 'palm_reading' && <Hand size={18} color="#8b5cf6" />}
                      {item.type === 'birth_chart' && <Compass size={18} color="#38bdf8" />}
                      {item.type === 'marriage_bichar' && <Heart size={18} color="#ec4899" />}
                      <span>{formattedType}</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={styles.historyDate}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={styles.historyContent}
                    >
                      {item.result}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
