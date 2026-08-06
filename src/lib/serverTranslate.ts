/**
 * Shared server-side translation via google-translate-api-x (no LLM involved).
 * Used by /api/translate (live report translation) and by the report routes,
 * which generate in English and translate to the user's locale before saving.
 */

import translate from 'google-translate-api-x';

/** Canonical language name (from resolveLanguage) → Google Translate code */
export const LANGUAGE_CODES: Record<string, string> = {
  English: 'en',
  Hindi: 'hi',
  Bengali: 'bn',
};

// Keep every request comfortably below the endpoint's ~5000 char limit
const CHUNK_SIZE = 4000;
const BATCH_CHAR_BUDGET = 4500;
const BATCH_MAX_CHUNKS = 25;

/** Split long text into paragraph-aware chunks that fit the endpoint limits */
export function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let current = '';
  for (const para of text.split('\n')) {
    const candidate = current ? `${current}\n${para}` : para;
    if (candidate.length > CHUNK_SIZE && current) {
      chunks.push(current);
      current = para;
    } else {
      current = candidate;
    }
    // Hard-split a single paragraph that is still too large
    while (current.length > CHUNK_SIZE) {
      chunks.push(current.slice(0, CHUNK_SIZE));
      current = current.slice(CHUNK_SIZE);
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Translate chunks, batching small ones together to reduce network calls */
export async function translateChunks(chunks: string[], to: string): Promise<string[]> {
  const results: string[] = [];
  let i = 0;

  while (i < chunks.length) {
    const batch: string[] = [];
    let chars = 0;
    while (
      i < chunks.length &&
      batch.length < BATCH_MAX_CHUNKS &&
      chars + chunks[i].length <= BATCH_CHAR_BUDGET
    ) {
      chars += chunks[i].length;
      batch.push(chunks[i]);
      i++;
    }
    // Oversized chunk → send it alone
    if (batch.length === 0) {
      batch.push(chunks[i]);
      i++;
    }

    const translated =
      batch.length === 1
        ? [await translate(batch[0], { to })]
        : await translate(batch, { to });

    for (const r of translated) results.push(r.text);
  }

  return results;
}

/**
 * Translate a full markdown report to a locale code ('en' | 'hi' | 'bn').
 * No-op for English. Reassembles multi-chunk texts preserving paragraph breaks.
 */
export async function translateToLocale(text: string, locale: string): Promise<string> {
  const to = LANGUAGE_CODES[locale] ?? locale;
  if (!to || to === 'en' || !text.trim()) return text;

  const chunks = chunkText(text);
  const translated = await translateChunks(chunks, to);
  return translated.join('\n');
}
