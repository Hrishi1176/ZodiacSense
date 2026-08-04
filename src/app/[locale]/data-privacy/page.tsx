'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Database, Lock, Cpu, CheckCircle } from 'lucide-react';
import styles from '../legal.module.css';

export default function DataPrivacyPage() {
  return (
    <div className={styles.container}>
      <motion.h1
        className={styles.title}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Data Privacy &amp; Security
      </motion.h1>

      <motion.p
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Detailed commitment to zero-data monetization and camera security.
      </motion.p>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2>
          <Database size={20} />
          1. Palm Image Handling
        </h2>
        <p>
          ZodiacSense uses on-device MediaPipe detection to guide hand alignment. When an image is captured for palm line analysis:
        </p>
        <ul>
          <li>The image is sent over encrypted HTTPS connections directly to our secure AI processing endpoint.</li>
          <li>Features like the Life Line, Heart Line, and Head Line are extracted for analysis.</li>
          <li>Palm images are not indexed by public search engines or used to train public generative AI models.</li>
        </ul>

        <h2>
          <Lock size={20} />
          2. Astronomical Calculation Privacy
        </h2>
        <p>
          Your exact birth date, time, and location coordinates are passed to our internal Swiss Ephemeris engine (`sweph`). This data is strictly used to retrieve real planetary positions and is never made public or accessible to other users.
        </p>

        <h2>
          <Cpu size={20} />
          3. AI Infrastructure
        </h2>
        <p>
          Our AI integration operates under enterprise privacy agreements that prevent the provider from using customer prompt data for base model training.
        </p>

        <h2>
          <CheckCircle size={20} />
          4. Zero Third-Party Selling
        </h2>
        <p>
          ZodiacSense operates on an ad-free, product-first principle. We do not sell user data to data brokers, ad networks, or marketing firms.
        </p>

        <div className={styles.lastUpdated}>
          Last Updated: August 2026 • ZodiacSense Data Governance
        </div>
      </motion.div>
    </div>
  );
}
