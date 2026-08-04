import React from 'react';
import { motion } from 'framer-motion';
import styles from './Loader.module.css';

interface LoaderProps {
  text?: string;
}

export default function Loader({ text = 'Consulting the stars...' }: LoaderProps) {
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
      {text && <p className={styles.text}>{text}</p>}
    </motion.div>
  );
}
