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
  description: 'AI-powered palm reading, birth charts, and marriage compatibility analytics.',
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
