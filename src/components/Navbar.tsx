'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import i18nConfig from '../../i18nConfig';
import styles from './Navbar.module.css';
import { User as UserIcon, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import AuthModal from './AuthModal';
import LogoutModal from './LogoutModal';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ locale }: { locale: string }) {
  const { t, i18n } = useTranslation();
  const currentPathname = usePathname();
  // Live language (may change in-place without navigation); `locale` is the SSR value
  const currentLocale = i18n.language || locale;
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll for nav background
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const changeLocale = (newLocale: string) => {
    if (newLocale === currentLocale) return;

    const days = 30;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = date.toUTCString();
    document.cookie = `NEXT_LOCALE=${newLocale};expires=${expires};path=/`;

    // Switch language in place — no router.push, so already generated results
    // stay on screen and get translated live instead of being lost.
    const prefixDefault = (i18nConfig as { prefixDefault?: boolean }).prefixDefault;
    const basePath = currentPathname.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/';
    const newPath =
      newLocale === i18nConfig.defaultLocale && !prefixDefault
        ? basePath
        : `/${newLocale}${basePath === '/' ? '' : basePath}`;
    window.history.replaceState(null, '', newPath);
    document.documentElement.lang = newLocale;
    i18n.changeLanguage(newLocale);
  };

  const changeLocaleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeLocale(e.target.value);
  };

  const navLinks = [
    { href: '/horoscope', label: t('nav_horoscope', 'Horoscope'), icon: '🔮' },
    { href: '/palm-reading', label: t('palm_reading'), icon: '✋' },
    { href: '/birth-chart', label: t('birth_chart'), icon: '🌌' },
    { href: '/marriage-bichar', label: t('marriage_bichar'), icon: '💍' },
  ];

  return (
    <>
      <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoPlanetContainer}>
              <div className={styles.logoPlanetOrb} />
              <div className={styles.logoPlanetRing} />
            </div>
            <span className={styles.logoText}>ZodiacSense</span>
          </Link>

          <div className={styles.navLinks}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className={styles.navLinkIcon}>{link.icon}</span>
                <span className={styles.navLinkLabel}>{link.label}</span>
              </Link>
            ))}
            {session && (
              <>
                <Link href="/dashboard" className={styles.dashboardLink}>
                  <LayoutDashboard size={16} />
                  <span>{t('nav_dashboard')}</span>
                </Link>
                <Link href="/profile" className={styles.dashboardLink} style={{ marginLeft: '1rem' }}>
                  <UserIcon size={16} />
                  <span>{t('nav_profile')}</span>
                </Link>
              </>
            )}
          </div>

          <div className={styles.actions}>
            {/* Pill Theme Toggle */}
            <button
              suppressHydrationWarning
              onClick={toggleTheme}
              className={styles.themeToggle}
              aria-label="Toggle theme"
              title={theme === 'dark' ? t('nav_theme_light') : t('nav_theme_dark')}
            >
              <span className={styles.toggleKnob}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </button>

            <select
              suppressHydrationWarning
              value={currentLocale}
              onChange={changeLocaleSelect}
              className={styles.langSelect}
              aria-label="Select Language"
            >
              <option value="en">EN</option>
              <option value="hi">हिं</option>
              <option value="bn">বাং</option>
            </select>

            {session ? (
              <div className={styles.userMenu}>
                <span className={styles.userName}>
                  <UserIcon size={16} />
                  <span className={styles.userNameText}>{session.user?.name?.split(' ')[0] || 'User'}</span>
                </span>
                <button
                  suppressHydrationWarning
                  onClick={() => setIsLogoutModalOpen(true)}
                  className={styles.signOutBtn}
                  title={t('nav_signout')}
                  aria-label="Sign Out"
                >
                  <LogOut size={15} />
                  <span className={styles.signOutText}>{t('nav_logout')}</span>
                </button>
              </div>
            ) : (
              <button suppressHydrationWarning onClick={() => setIsAuthOpen(true)} className={styles.signInBtn}>
                {t('nav_signin')}
              </button>
            )}

            {/* Hamburger - mobile only */}
            <button
              className={styles.hamburger}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className={styles.mobileMenu}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className={styles.mobileMenuInner}>
              {/* Language selector — always available on mobile */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className={styles.mobileLangRow} role="radiogroup" aria-label="Select Language">
                  <span className={styles.mobileLangLabel}>🌐 {t('select_language')}</span>
                  <div className={styles.mobileLangBtns}>
                    {[
                      { code: 'en', label: 'English' },
                      { code: 'hi', label: 'हिन्दी' },
                      { code: 'bn', label: 'বাংলা' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        suppressHydrationWarning
                        role="radio"
                        aria-checked={currentLocale === lang.code}
                        className={`${styles.mobileLangBtn} ${currentLocale === lang.code ? styles.mobileLangBtnActive : ''}`}
                        onClick={() => {
                          if (currentLocale !== lang.code) changeLocale(lang.code);
                        }}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {navLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Link href={link.href} className={styles.mobileNavLink}>
                    <span className={styles.mobileNavIcon}>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                </motion.div>
              ))}
              {session && (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: navLinks.length * 0.07 }}
                  >
                    <Link href="/dashboard" className={styles.mobileNavLink}>
                      <LayoutDashboard size={18} />
                      <span>{t('nav_dashboard')}</span>
                    </Link>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: navLinks.length * 0.07 + 0.05 }}
                  >
                    <Link href="/profile" className={styles.mobileNavLink}>
                      <UserIcon size={18} />
                      <span>{t('nav_my_profile')}</span>
                    </Link>
                  </motion.div>
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (navLinks.length + 1) * 0.07 }}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className={styles.mobileNavLink}
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', width: '100%', cursor: 'pointer' }}
                  >
                    <LogOut size={18} />
                    <span>{t('nav_signout')}</span>
                  </motion.button>
                </>
              )}

              {!session && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (navLinks.length + 1) * 0.07 }}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsAuthOpen(true);
                  }}
                  className={`${styles.signInBtn} ${styles.mobileSignIn}`}
                >
                  {t('nav_signin')}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal Popup */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Logout Confirmation Modal Popup */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          signOut({ callbackUrl: '/' });
        }}
      />
    </>
  );
}
