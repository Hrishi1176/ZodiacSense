/**
 * Extracts the English narration audio from public/bg.mp4 into public/audio/bg-en.mp3.
 *
 * The app plays this English recording for English, and auto-generates the
 * Hindi/Bengali versions at runtime (/api/narration: translate + text-to-speech).
 * The transcript lives in src/config/narration.json (see scripts/transcribe-narration.cjs).
 *
 * Usage: node scripts/extract-bg-audio.cjs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const input = path.join(__dirname, '..', 'public', 'bg.mp4');
const outDir = path.join(__dirname, '..', 'public', 'audio');
const output = path.join(outDir, 'bg-en.mp3');

if (!fs.existsSync(input)) {
  console.error(`[extract-bg-audio] Input video not found: ${input}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

// -vn: drop video, keep only audio; encode as MP3 (VBR quality 4 ≈ 165 kbps)
execFileSync(
  ffmpegPath,
  ['-y', '-i', input, '-vn', '-codec:a', 'libmp3lame', '-q:a', '4', output],
  { stdio: 'inherit' }
);

const size = (fs.statSync(output).size / 1024).toFixed(0);
console.log(`[extract-bg-audio] Done → ${path.relative(process.cwd(), output)} (${size} KB)`);
