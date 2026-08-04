'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import i18nConfig from '../../i18nConfig';
import styles from './Navbar.module.css';
import { Star, User as UserIcon, LogOut, LayoutDashboard } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import AuthModal from './AuthModal';

export default function Navbar({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const currentPathname = usePathname();
  const currentLocale = locale;
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const changeLocale = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    const days = 30;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = date.toUTCString();
    document.cookie = `NEXT_LOCALE=${newLocale};expires=${expires};path=/`;

    if (currentLocale === i18nConfig.defaultLocale && !(i18nConfig as any).prefixDefault) {
      router.push('/' + newLocale + currentPathname);
    } else {
      router.push(currentPathname.replace(`/${currentLocale}`, `/${newLocale}`));
    }
    router.refresh();
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoPlanetContainer}>
              <div className={styles.logoPlanetOrb} />
              <div className={styles.logoPlanetRing} />
            </div>
            <span>ZodiacSense</span>
          </Link>

          <div className={styles.navLinks}>
            <Link href="/palm-reading">{t('palm_reading')}</Link>
            <Link href="/birth-chart">{t('birth_chart')}</Link>
            <Link href="/marriage-bichar">{t('marriage_bichar')}</Link>
            {session && (
              <Link href="/dashboard" className={styles.dashboardLink}>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
            )}
          </div>

          <div className={styles.actions}>
            {/* Pill Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={styles.themeToggle}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className={styles.toggleKnob}>
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </button>

            <select
              value={currentLocale}
              onChange={changeLocale}
              className={styles.langSelect}
            >
              <option value="en">EN</option>
              <option value="hi">हिं</option>
              <option value="bn">বাং</option>
            </select>

            {session ? (
              <div className={styles.userMenu}>
                <span className={styles.userName}>
                  <UserIcon size={16} />
                  <span>{session.user?.name?.split(' ')[0] || 'User'}</span>
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={styles.signOutBtn}
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => setIsAuthOpen(true)} className={styles.signInBtn}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Auth Modal Popup */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
