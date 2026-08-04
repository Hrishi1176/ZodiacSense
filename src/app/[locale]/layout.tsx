import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import i18nConfig from '../../../i18nConfig';
import { dir } from 'i18next';
import TranslationsProvider from '@/components/TranslationsProvider';
import initTranslations from '../i18n';
import Background from '@/components/Background';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';
import SessionProvider from '@/components/SessionProvider';
import { ToastProvider } from '@/context/ToastContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ZodiacSense - Discover Your Cosmic Destiny',
  description: 'AI-powered palm reading, birth charts, and marriage compatibility analytics. Unlock the secrets of the stars with advanced Vedic & Western astrology.',
  keywords: ['astrology', 'palm reading', 'birth chart', 'kundali', 'marriage compatibility', 'horoscope', 'zodiac', 'vedic astrology', 'western astrology'],
  authors: [{ name: 'ZodiacSense' }],
  creator: 'ZodiacSense',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'ZodiacSense - Discover Your Cosmic Destiny',
    description: 'AI-powered astrology, palm reading, and birth chart analysis.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZodiacSense - Discover Your Cosmic Destiny',
    description: 'AI-powered astrology, palm reading, and birth chart analysis.',
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#05051a' },
    { media: '(prefers-color-scheme: light)', color: '#f5f3ff' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export function generateStaticParams() {
  return i18nConfig.locales.map((locale: string) => ({ locale }));
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const { locale } = params;
  const { children } = props;
  const { resources } = await initTranslations(locale, ['common']);

  return (
    <html lang={locale} dir={dir(locale)} data-scroll-behavior="smooth" data-theme="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider>
            <ToastProvider>
              <TranslationsProvider
                namespaces={['common']}
                locale={locale}
                resources={resources}
              >
                <Background />
                <Navbar locale={locale} />
                <div className="main-content">
                  {children}
                </div>
                <Footer />
              </TranslationsProvider>
            </ToastProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
