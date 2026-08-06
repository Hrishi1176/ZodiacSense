'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Background.module.css';
import { motion, useScroll, useTransform } from 'framer-motion';
import CosmicCollisionCanvas from './CosmicCollisionCanvas';
import ZodiacOverlay from './ZodiacOverlay';

const SOUND_PREF_KEY = 'zs_bg_sound';
// Single ambient soundtrack shared by every UI language (en/hi/bn) on the home screen
const SOUNDTRACK = '/audio/glass-horizon.mp3';

export default function Background() {
  const { t } = useTranslation();
  const blobRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const { scrollYProgress } = useScroll();

  // Resume the soundtrack if the user previously turned it on (browsers may block it — stay silent then)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(SOUND_PREF_KEY) !== 'on') return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setSoundOn(true)).catch(() => setSoundOn(false));
  }, []);

  // Keep the soundtrack roughly in sync with the looping video (only when the
  // track length matches the video loop duration)
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !soundOn) return;
    const sync = () => {
      if (!audio.duration || Math.abs(audio.duration - video.duration) > 2) return;
      if (Math.abs(video.currentTime - audio.currentTime) > 1.5) {
        audio.currentTime = video.currentTime;
      }
    };
    video.addEventListener('timeupdate', sync);
    return () => video.removeEventListener('timeupdate', sync);
  }, [soundOn]);

  const toggleSound = useCallback(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio) return;
    if (soundOn) {
      audio.pause();
      setSoundOn(false);
      localStorage.setItem(SOUND_PREF_KEY, 'off');
    } else {
      if (video) audio.currentTime = video.currentTime;
      audio.volume = 0.65;
      audio
        .play()
        .then(() => {
          setSoundOn(true);
          localStorage.setItem(SOUND_PREF_KEY, 'on');
        })
        .catch(() => setSoundOn(false));
    }
  }, [soundOn]);

  // Apple-style scroll-triggered background video transforms with full-screen coverage
  const videoScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.05, 1.18, 1.3]);
  const videoRotate = useTransform(scrollYProgress, [0, 1], [0, 3]);
  const videoBlur = useTransform(scrollYProgress, [0, 0.5, 1], ['blur(0px)', 'blur(1.5px)', 'blur(3px)']);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.5, 0.6, 0.7]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const { clientX, clientY } = e;
      if (blobRef.current) {
        blobRef.current.animate(
          {
            left: `${clientX}px`,
            top: `${clientY}px`,
          },
          { duration: 3000, fill: 'forwards' }
        );
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <>
    <div className={styles.backgroundContainer}>
      {/* Full Screen Apple-style Scroll-Driven Transforming Background Video */}
      <motion.video
        autoPlay
        loop
        muted
        playsInline
        ref={videoRef}
        className={styles.videoBg}
        poster="/bg-poster.jpg"
        src="/bg.mp4?v=2"
        style={{
          scale: videoScale,
          rotate: videoRotate,
          filter: videoBlur,
          transformOrigin: 'center center',
        }}
      />

      <motion.div
        className={styles.videoOverlay}
        style={{ opacity: overlayOpacity }}
      />

      {/* Ambient soundtrack — the same track plays for every UI language */}
      <audio ref={audioRef} src={SOUNDTRACK} loop preload="auto" />

      <div id="blob" ref={blobRef} className={styles.blob}></div>

      {/* Cosmic Physics Canvas: 9 3D Planets with Real-Time Scroll Parallax & Collision Fireworks */}
      <CosmicCollisionCanvas />

      {/* 12 Zodiac Constellation Wheel with Twinkling Stars (Astrology Live Animation) */}
      <ZodiacOverlay />

      {/* Floating Astrology Badges */}
      <motion.div
        className={styles.floatingWidget}
        style={{ top: '18%', left: '10%' }}
        animate={{ y: [0, -18, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span>{t('bg_widget_energy')}</span>
      </motion.div>

      <motion.div
        className={styles.floatingWidget}
        style={{ bottom: '34%', right: '14%' }}
        animate={{ y: [0, 22, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <span>{t('bg_widget_stars')}</span>
      </motion.div>

      <motion.div
        className={`${styles.floatingWidget} ${styles.floatingWidgetHidden}`}
        style={{ top: '50%', right: '8%' }}
        animate={{ y: [0, -14, 0], opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      >
        <span>{t('bg_widget_wisdom')}</span>
      </motion.div>
    </div>

    {/* Soundtrack toggle — rendered outside the z-index:-1 container,
        otherwise .main-content (z-index:10) covers it and clicks never land */}
    <button
      suppressHydrationWarning
      type="button"
      className={styles.soundToggle}
      onClick={toggleSound}
      title={soundOn ? t('bg_sound_off') : t('bg_sound_on')}
      aria-label={soundOn ? t('bg_sound_off') : t('bg_sound_on')}
      aria-pressed={soundOn}
    >
      {soundOn ? '🔊' : '🔇'}
    </button>
    </>
  );
}
