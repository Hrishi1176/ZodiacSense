import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import styles from './Loader.module.css';

interface LoaderProps {
  text?: string;
}

export default function Loader({ text }: LoaderProps) {
  const { t } = useTranslation();
  const displayText = text ?? t('loader_default');

  return (
    <motion.div 
      className={styles.loaderContainer}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.spinner}>
        <div className={styles.orbit2}></div>
        <div className={styles.orbit1}></div>
        <div className={styles.core}></div>
      </div>
      {displayText && <p className={styles.text}>{displayText}</p>}
    </motion.div>
  );
}
