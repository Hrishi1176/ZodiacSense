export const maxDuration = 90; // Long reports get chunked into several requests

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveLanguage } from '@/lib/language';
import { chunkText, translateChunks, LANGUAGE_CODES } from '@/lib/serverTranslate';

const MAX_ITEMS = 40;
const MAX_ITEM_LENGTH = 30000;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as { id?: string })?.id) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { texts, targetLanguage } = await req.json();

    if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_ITEMS) {
      return NextResponse.json({ error: `texts must be an array of 1–${MAX_ITEMS} strings.` }, { status: 400 });
    }
    if (texts.some((t) => typeof t !== 'string' || !t.trim() || t.length > MAX_ITEM_LENGTH)) {
      return NextResponse.json({ error: 'Each text must be a non-empty string.' }, { status: 400 });
    }

    const to = LANGUAGE_CODES[resolveLanguage(targetLanguage)];

    // Chunk every text, remembering where each text's chunks start/end
    const chunks: string[] = [];
    const boundaries: Array<{ start: number; count: number }> = [];
    for (const text of texts) {
      const parts = chunkText(text);
      boundaries.push({ start: chunks.length, count: parts.length });
      chunks.push(...parts);
    }

    const translatedChunks = await translateChunks(chunks, to);

    // Reassemble each original text from its translated chunks
    const translations = boundaries.map(({ start, count }) =>
      translatedChunks.slice(start, start + count).join('\n')
    );

    return NextResponse.json({ translations });
  } catch (error: unknown) {
    console.error('Translation Error:', error);
    const message = error instanceof Error ? error.message : 'Translation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
