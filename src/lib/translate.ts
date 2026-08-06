/**
 * Client-side helper that translates already-generated content via /api/translate.
 * Used when the user switches the UI language after a reading was generated.
 */
export async function translateTexts(texts: string[], targetLocale: string): Promise<string[]> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, targetLanguage: targetLocale }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !Array.isArray(data.translations) || data.translations.length !== texts.length) {
    throw new Error(data.error || 'Translation failed');
  }

  return data.translations;
}
