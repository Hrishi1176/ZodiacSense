/**
 * AI Self-Verification Layer
 *
 * After the main AI generates an interpretation, a second AI call validates
 * the response against the structured astrology data to catch hallucinations
 * and contradictions.
 *
 * Example: if the AI says "Jupiter is exalted" but the chart shows Jupiter
 * in Capricorn (debilitated), this validator flags the error.
 */

import { callGrokText } from './ai';
import { noteHeaderFor, resolveLanguage } from './language';

/**
 * Verify AI response against structured data.
 * Returns the original text if valid, or appends a correction note.
 */
export async function verifyResponse(
  aiResponse: string,
  structuredDataJSON: string,
  language: string,
): Promise<{ verified: boolean; correctedText?: string; issues: string[] }> {
  const systemPrompt = `You are a Vedic astrology fact-checker. Your ONLY job is to compare the AI-generated interpretation against the structured ground-truth data and flag any contradictions or hallucinations.

RULES:
1. Check if any planet positions, signs, houses, yogas, or doshas mentioned in the interpretation contradict the ground-truth data.
2. Check if the interpretation invents yogas or doshas that are NOT in the ground-truth data.
3. Check if ratings or confidence scores are misrepresented.
4. If everything matches, respond with exactly: VERIFIED
5. If there are issues, list them as bullet points starting with "ISSUE:"
6. The markers "VERIFIED" and "ISSUE:" must always be written exactly like that (in English) so they can be parsed. The description text after "ISSUE:" must be written in ${language}.

Ground-truth data:
${structuredDataJSON}`;

  const userPrompt = `Verify this interpretation against the ground-truth data above:\n\n${aiResponse.substring(0, 3000)}`;

  try {
    const result = await callGrokText(
      'verification-model',
      systemPrompt,
      userPrompt,
      500,
      { temperature: 0.2, topP: 0.9 }
    );

    const text = result.text.trim();

    // If verified, return as-is
    if (text.startsWith('VERIFIED') || text.includes('VERIFIED')) {
      return { verified: true, issues: [] };
    }

    // Extract issues
    const issues = text
      .split('\n')
      .filter((line) => line.trim().startsWith('ISSUE:'))
      .map((line) => line.replace('ISSUE:', '').trim());

    if (issues.length === 0) {
      return { verified: true, issues: [] };
    }

    // Build correction note (header localized to the user's language)
    const noteHeader = noteHeaderFor(resolveLanguage(language));
    const correctionNote = `\n\n---\n${noteHeader}\n${issues.map((i) => `* ${i}`).join('\n')}`;

    return {
      verified: false,
      correctedText: aiResponse + correctionNote,
      issues,
    };
  } catch {
    // If verification fails, return original (don't block the user)
    return { verified: true, issues: ['Verification skipped due to error'] };
  }
}
