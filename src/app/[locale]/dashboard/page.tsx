'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Hand, Compass, Heart, Calendar, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import {
  TbZodiacAries, TbZodiacTaurus, TbZodiacGemini, TbZodiacCancer,
  TbZodiacLeo, TbZodiacVirgo, TbZodiacLibra, TbZodiacScorpio,
  TbZodiacSagittarius, TbZodiacCapricorn, TbZodiacAquarius, TbZodiacPisces,
} from 'react-icons/tb';
import type { IconType } from 'react-icons';
import GoldDefs from '@/components/GoldDefs';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatbotComponent from '@/components/ChatbotComponent';
import styles from './page.module.css';

// Premium gold rashi strip shown under the welcome header
const ZODIAC_STRIP: { key: string; Icon: IconType }[] = [
  { key: 'Aries', Icon: TbZodiacAries },
  { key: 'Taurus', Icon: TbZodiacTaurus },
  { key: 'Gemini', Icon: TbZodiacGemini },
  { key: 'Cancer', Icon: TbZodiacCancer },
  { key: 'Leo', Icon: TbZodiacLeo },
  { key: 'Virgo', Icon: TbZodiacVirgo },
  { key: 'Libra', Icon: TbZodiacLibra },
  { key: 'Scorpio', Icon: TbZodiacScorpio },
  { key: 'Sagittarius', Icon: TbZodiacSagittarius },
  { key: 'Capricorn', Icon: TbZodiacCapricorn },
  { key: 'Aquarius', Icon: TbZodiacAquarius },
  { key: 'Pisces', Icon: TbZodiacPisces },
];

export default function Dashboard() {
  const { data: session, status } = useSession();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      const fetchData = async () => {
        const langMap: Record<string, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali' };
        const selectedLang = langMap[i18n.language] || 'English';

        try {
          const res = await fetch('/api/dashboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: selectedLang })
          });
          const d = await res.json();
          setData(d);
          setLoading(false);
        } catch (err) {
          console.error(err);
          setLoading(false);
        }
      };
      fetchData();
    }
    // Re-fetch analytics when the UI language changes so AI output matches selection
  }, [status, router, i18n.language]);

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <h2 className="glow-text">{t('dash_loading')}</h2>
      </div>
    );
  }

  const quota = data?.quotaStatus;
  const analytics = data?.analytics;
  const readings = data?.readings || [];

  return (
    <div className={styles.container}>
      <GoldDefs />
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.header}
      >
        <h1 className={styles.title}>
          {t('dash_welcome', { name: session?.user?.name || t('dash_seeker') })}
        </h1>
        <p className={styles.subtitle}>
          {t('dash_subtitle')}
        </p>
        {/* Premium gold rashi strip */}
        <div className={styles.zodiacStrip}>
          {ZODIAC_STRIP.map(({ key, Icon }, i) => (
            <span key={key} className={styles.zodiacStripItem} title={t(`signs.${key}`, key)}>
              <Icon className={styles.zodiacStripIcon} style={{ animationDelay: `${i * 0.28}s` }} />
            </span>
          ))}
        </div>
      </motion.div>

      {/* Daily Quota Cards */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-color)' }}>
        <Zap size={20} style={{ display: 'inline', color: '#38bdf8', verticalAlign: 'middle', marginRight: '0.4rem' }} />
        {t('dash_quota_title')}
      </h2>

      <div className={styles.quotaGrid}>
        {/* Palm Reading Quota */}
        <motion.div className={`glass-panel ${styles.quotaCard}`} whileHover={{ y: -4 }}>
          <div>
            <div className={styles.quotaHeader}>
              <span className={styles.quotaTitle}>
                <Hand size={20} color="#8b5cf6" />
                <span>{t('palm_reading')}</span>
              </span>
              <span className={styles.quotaBadge}>
                {t('dash_left', { count: quota?.remaining?.palm_reading ?? 3 })}
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
              <span>{t('dash_used', { count: quota?.usage?.palm_reading ?? 0 })}</span>
              <span>{t('dash_max', { count: quota?.limits?.palm_reading ?? 3 })}</span>
            </div>
          </div>
          <Link href="/palm-reading" className={styles.actionBtn}>
            {t('dash_palm_action')}
          </Link>
        </motion.div>

        {/* Birth Chart Quota */}
        <motion.div className={`glass-panel ${styles.quotaCard}`} whileHover={{ y: -4 }}>
          <div>
            <div className={styles.quotaHeader}>
              <span className={styles.quotaTitle}>
                <Compass size={20} color="#38bdf8" />
                <span>{t('birth_chart')}</span>
              </span>
              <span className={styles.quotaBadge}>
                {t('dash_left', { count: quota?.remaining?.birth_chart ?? 2 })}
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
              <span>{t('dash_used', { count: quota?.usage?.birth_chart ?? 0 })}</span>
              <span>{t('dash_max', { count: quota?.limits?.birth_chart ?? 2 })}</span>
            </div>
          </div>
          <Link href="/birth-chart" className={styles.actionBtn}>
            {t('dash_bc_action')}
          </Link>
        </motion.div>

        {/* Marriage Bichar Quota */}
        <motion.div className={`glass-panel ${styles.quotaCard}`} whileHover={{ y: -4 }}>
          <div>
            <div className={styles.quotaHeader}>
              <span className={styles.quotaTitle}>
                <Heart size={20} color="#ec4899" />
                <span>{t('marriage_bichar')}</span>
              </span>
              <span className={styles.quotaBadge}>
                {t('dash_left', { count: quota?.remaining?.marriage_bichar ?? 2 })}
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
              <span>{t('dash_used', { count: quota?.usage?.marriage_bichar ?? 0 })}</span>
              <span>{t('dash_max', { count: quota?.limits?.marriage_bichar ?? 2 })}</span>
            </div>
          </div>
          <Link href="/marriage-bichar" className={styles.actionBtn}>
            {t('dash_mb_action')}
          </Link>
        </motion.div>
      </div>

      {/* AI Life Analytics */}
      <motion.div className={`glass-panel ${styles.analyticsCard}`}>
        <div className={styles.analyticsHeader}>
          <Sparkles size={24} color="#a78bfa" />
          <h2>{t('dash_analytics_title')}</h2>
        </div>
        <div className={`${styles.analyticsText} markdown-body`}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{analytics?.summary || ''}</ReactMarkdown>
        </div>
      </motion.div>

      {/* Reading History */}
      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>{t('dash_history_title')}</h2>

        {readings.length === 0 ? (
          <div className={`glass-panel ${styles.emptyState}`}>
            <p>{t('dash_history_empty')}</p>
          </div>
        ) : (
          <div className={styles.historyList}>
            {readings.map((item: any) => {
              const isExpanded = expandedId === item._id;
              const formattedType = t(item.type) !== item.type ? t(item.type) : item.type.replace('_', ' ');
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
                        {new Date(item.createdAt).toLocaleDateString(i18n.language)}
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`${styles.historyContent} markdown-body`}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.result}</ReactMarkdown>
                      {item.type === 'birth_chart' && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <ChatbotComponent
                            readingId={item._id}
                            language={i18n.language === 'hi' ? 'Hindi' : i18n.language === 'bn' ? 'Bengali' : 'English'}
                          />
                        </div>
                      )}
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
