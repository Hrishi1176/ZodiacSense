'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateTexts } from '@/lib/translate';

/** Extra short texts (e.g. yoga/dosha descriptions) translated together with the report */
export interface TranslationExtras {
  texts: string[];
  /** Receives the translations of `texts` in the same order */
  apply: (translations: string[]) => void;
}

/**
 * Keeps an already-generated reading readable when the user switches the UI language.
 *
 * When `i18n.language` changes, the current result (plus any extras) is sent to
 * /api/translate and committed back via `setResult` in place — no regeneration,
 * no page refresh, existing data is preserved.
 *
 * @returns true while a translation request is in flight
 */
export default function useLiveTranslation(
  result: string | null,
  setResult: (value: string) => void,
  getExtras?: () => TranslationExtras | null,
): boolean {
  const { i18n } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);

  // Language the currently displayed result was written in
  const langRef = useRef(i18n.language);
  // Mirror of the committed result so stale responses never overwrite a newer one
  const resultRef = useRef(result);
  const runIdRef = useRef(0);

  // A freshly generated result is written in the currently active language
  useEffect(() => {
    resultRef.current = result;
    if (result) langRef.current = i18n.language;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    const lang = i18n.language;
    const source = resultRef.current;
    if (!source || langRef.current === lang) return;

    const runId = ++runIdRef.current;
    const extras = getExtras?.() ?? null;
    const texts = extras ? [source, ...extras.texts] : [source];

    setIsTranslating(true);
    translateTexts(texts, lang)
      .then((translations) => {
        // Drop stale responses and results that were regenerated meanwhile
        if (runId !== runIdRef.current || resultRef.current !== source) return;
        langRef.current = lang;
        resultRef.current = translations[0];
        setResult(translations[0]);
        if (extras) extras.apply(translations.slice(1));
      })
      .catch((err) => console.error('Live translation failed:', err))
      .finally(() => {
        if (runId === runIdRef.current) setIsTranslating(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  return isTranslating;
}
