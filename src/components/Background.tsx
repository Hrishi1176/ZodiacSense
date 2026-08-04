'use client';

import React, { useEffect, useRef } from 'react';
import styles from './Background.module.css';
import { motion, useScroll, useTransform } from 'framer-motion';
import CosmicCollisionCanvas from './CosmicCollisionCanvas';

export default function Background() {
  const blobRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  // Apple-style scroll-triggered background video transforms with full-screen coverage
  const videoScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1.25, 1.4]);
  const videoRotate = useTransform(scrollYProgress, [0, 1], [0, 4]);
  const videoBlur = useTransform(scrollYProgress, [0, 0.5, 1], ['blur(0px)', 'blur(2px)', 'blur(5px)']);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.55, 0.65, 0.75]);

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
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <div className={styles.backgroundContainer}>
      {/* Full Screen Apple-style Scroll-Driven Transforming Background Video */}
      <motion.video
        autoPlay
        loop
        muted
        playsInline
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

      <div id="blob" ref={blobRef} className={styles.blob}></div>

      {/* Cosmic Physics Canvas: 9 3D Planets with Real-Time Scroll Parallax & Collision Fireworks */}
      <CosmicCollisionCanvas />

      {/* Floating Astrology Badges */}
      <motion.div
        className={styles.floatingWidget}
        style={{ top: '18%', left: '10%' }}
        animate={{ y: [0, -18, 0], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span>✧ Cosmic Energy</span>
      </motion.div>

      <motion.div
        className={styles.floatingWidget}
        style={{ bottom: '34%', right: '14%' }}
        animate={{ y: [0, 22, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <span>✦ Aligning Stars</span>
      </motion.div>
    </div>
  );
}
