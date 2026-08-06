/**
 * Centralized language resolution & enforcement for all AI endpoints.
 *
 * Small LLMs frequently ignore bare "write in Hindi" instructions, so every
 * prompt is filled with an explicit directive that names the target language
 * AND its native script. All routes must use resolveLanguage() +
 * languageDirective() instead of passing the raw client value.
 */

/** Locale code → canonical language name */
const LOCALE_TO_NAME: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
};

/** Free-text aliases (case-insensitive) → canonical language name */
const NAME_ALIASES: Record<string, string> = {
  english: 'English',
  hindi: 'Hindi',
  bengali: 'Bengali',
  bangla: 'Bengali',
  'हिन्दी': 'Hindi',
  'हिंदी': 'Hindi',
  'বাংলা': 'Bengali',
};

/** Language → strict directive injected into {{language}} placeholders */
const LANGUAGE_DIRECTIVES: Record<string, string> = {
  English: 'English',
  Hindi:
    'Hindi (हिन्दी) — you MUST write every heading, table entry, and sentence in Hindi using Devanagari script (देवनागरी)',
  Bengali:
    'Bengali (বাংলা) — you MUST write every heading, table entry, and sentence in Bengali using the Bengali script (বাংলা লিপি)',
};

/** Localized labels used for user-facing notes appended to AI output */
export const LOCALIZED_NOTE_HEADERS: Record<string, string> = {
  English: '⚠️ **Auto-Verification Notes:**',
  Hindi: '⚠️ **स्वतः सत्यापन नोट्स:**',
  Bengali: '⚠️ **স্বয়ং-যাচাইকরণ নোট:**',
};

/**
 * Normalize any client-provided language value (locale code or name)
 * into a canonical language name. Falls back to English.
 */
export function resolveLanguage(input?: string | null): string {
  if (!input || typeof input !== 'string') return 'English';
  const trimmed = input.trim();
  if (!trimmed) return 'English';
  const lower = trimmed.toLowerCase();
  return LOCALE_TO_NAME[lower] || NAME_ALIASES[lower] || NAME_ALIASES[trimmed] || 'English';
}

/**
 * Strict prompt directive for the resolved language.
 * Pass the result as the {{language}} template variable.
 */
export function languageDirective(language: string): string {
  const resolved = resolveLanguage(language);
  return LANGUAGE_DIRECTIVES[resolved] || LANGUAGE_DIRECTIVES.English;
}

/** Localized note header for verification corrections appended to output */
export function noteHeaderFor(language: string): string {
  const resolved = resolveLanguage(language);
  return LOCALIZED_NOTE_HEADERS[resolved] || LOCALIZED_NOTE_HEADERS.English;
}
