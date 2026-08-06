import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertTriangle } from 'lucide-react';
import styles from './LogoutModal.module.css';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  const { t } = useTranslation();
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={onClose}>
          <motion.div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className={styles.topGlow} />

            <div className={styles.iconWrapper}>
              <LogOut size={28} />
            </div>

            <h3 className={styles.title}>{t('logout_title')}</h3>
            <p className={styles.description}>
              {t('logout_desc')}
            </p>

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={onClose}>
                {t('logout_cancel')}
              </button>
              <button className={styles.confirmBtn} onClick={onConfirm}>
                <LogOut size={16} />
                <span>{t('nav_signout')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
