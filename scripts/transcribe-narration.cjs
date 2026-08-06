/**
 * One-time helper: transcribes the English background narration
 * (public/audio/bg-en.mp3) using Gemini and saves the transcript to
 * src/config/narration.json. The runtime narration pipeline uses this text to
 * auto-generate Hindi/Bengali versions (translate + text-to-speech).
 *
 * Usage: node scripts/transcribe-narration.cjs
 */
const fs = require('fs');
const path = require('path');

// Load .env.local without extra dependencies
const envPath = path.join(__dirname, '..', '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m && !line.startsWith('#')) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('[transcribe] GEMINI_API_KEY missing in .env.local');
  process.exit(1);
}

const audioPath = path.join(__dirname, '..', 'public', 'audio', 'bg-en.mp3');
const audioBase64 = fs.readFileSync(audioPath).toString('base64');

(async () => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          {
            text: 'Transcribe the speech in this audio exactly, word for word. Output ONLY the transcript text, nothing else. If there is no speech, output exactly: NO_SPEECH',
          },
          {
            inline_data: { mime_type: 'audio/mpeg', data: audioBase64 },
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('[transcribe] Gemini error', res.status, await res.text());
    process.exit(1);
  }

  const json = await res.json();
  const text = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
  if (!text) {
    console.error('[transcribe] Empty response');
    process.exit(1);
  }

  console.log('[transcribe] Transcript:', JSON.stringify(text));

  if (text === 'NO_SPEECH') {
    console.log('[transcribe] No speech detected — nothing to save.');
    return;
  }

  const out = { en: text };
  const outPath = path.join(__dirname, '..', 'src', 'config', 'narration.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log('[transcribe] Saved →', path.relative(process.cwd(), outPath));
})().catch((err) => {
  console.error('[transcribe] Failed:', err);
  process.exit(1);
});
