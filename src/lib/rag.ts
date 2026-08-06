/**
 * Hybrid RAG: local JSON knowledge base + keyword matching + TF-IDF semantic scoring.
 * No vector DB, no embedding API, no external costs.
 *
 * Improvement over v1:
 * - Exact tag matching (v1 behavior, preserved)
 * - Text-content similarity scoring (new): bigram overlap between query terms and entry text
 * - IDF-weighted tags: rare tags score higher
 * - Topic-aware retrieval: boosts entries matching chart-specific topics (career, marriage, health)
 */

import vedicKnowledge from '@/data/vedicKnowledge.json';

export interface VedicEntry {
  tags: string[];
  weight: number;
  text: string;
}

export interface ChartPlanet {
  sign: string;
  house?: number;
  degree?: string | number;
  isRetrograde?: boolean;
}

export interface ChartData {
  ascendant?: ChartPlanet;
  sun?: ChartPlanet;
  moon?: ChartPlanet;
  mars?: ChartPlanet;
  mercury?: ChartPlanet;
  jupiter?: ChartPlanet;
  venus?: ChartPlanet;
  saturn?: ChartPlanet;
  rahu?: ChartPlanet;
  ketu?: ChartPlanet;
  nakshatra?: { name?: string; pada?: number; lord?: string };
  currentDasha?: string;
  dashaEndsAt?: string;
  manglikStatus?: string;
}

const allEntries: VedicEntry[] = vedicKnowledge.entries;

// ─── IDF Pre-computation ────────────────────────────────────────────────────

/** Pre-compute IDF for each unique tag across all entries. Rare tags are more informative. */
const tagDF = new Map<string, number>();
for (const entry of allEntries) {
  for (const tag of new Set(entry.tags)) {
    tagDF.set(tag, (tagDF.get(tag) ?? 0) + 1);
  }
}
const N = allEntries.length;
const tagIDF = new Map<string, number>();
for (const [tag, df] of tagDF) {
  tagIDF.set(tag, Math.log(N / df));
}

// ─── Text Tokenizer ─────────────────────────────────────────────────────────

/** Lowercase, split into words, filter stopwords. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'in', 'of', 'to', 'and', 'or', 'can', 'be',
  'for', 'with', 'but', 'not', 'are', 'has', 'gives', 'may', 'strong',
  'this', 'that', 'from', 'by', 'on', 'at', 'it', 'as', 'was',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Build bigrams from token list. */
function bigrams(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return result;
}

// ─── Keyword Building ───────────────────────────────────────────────────────

function buildKeywords(chart: ChartData): Set<string> {
  const keywords = new Set<string>();

  const planets: Array<[string, ChartPlanet | undefined]> = [
    ['Sun', chart.sun],
    ['Moon', chart.moon],
    ['Mars', chart.mars],
    ['Mercury', chart.mercury],
    ['Jupiter', chart.jupiter],
    ['Venus', chart.venus],
    ['Saturn', chart.saturn],
    ['Rahu', chart.rahu],
    ['Ketu', chart.ketu],
  ];

  planets.forEach(([name, p]) => {
    if (!p) return;
    keywords.add(name);
    if (p.sign) keywords.add(p.sign);
    if (p.house) keywords.add(`${p.house}${ordinalSuffix(p.house)} house`);
    if (p.house) keywords.add(`${p.house}th house`);
    if (p.house === 1) keywords.add('1st house');
  });

  if (chart.ascendant?.sign) {
    keywords.add('1st house');
    keywords.add(chart.ascendant.sign);
  }

  if (chart.nakshatra?.name) {
    keywords.add(chart.nakshatra.name);
  }

  if (chart.currentDasha) {
    const dashaLord = chart.currentDasha.split('-')[0].trim();
    if (dashaLord) keywords.add(dashaLord);
    if (dashaLord) keywords.add(`${dashaLord} Mahadasha`);
    keywords.add('Vimshottari');
    keywords.add('Mahadasha');
  }

  if (chart.manglikStatus && /manglik/i.test(chart.manglikStatus)) {
    keywords.add('Manglik');
    keywords.add('Mangal Dosha');
    keywords.add('cancellation');
  }

  // Add topic keywords based on house placements for better retrieval
  const topicKeywords: Record<string, string[]> = {
    '10': ['career', 'profession', 'status', 'Karma'],
    '7': ['marriage', 'partnership', 'spouse'],
    '2': ['wealth', 'finance', 'family', 'speech'],
    '5': ['children', 'education', 'creativity', 'intelligence'],
    '6': ['health', 'disease', 'enemies', 'service'],
    '8': ['longevity', 'transformation', 'occult'],
    '4': ['home', 'mother', 'vehicle', 'emotional'],
    '9': ['fortune', 'dharma', 'spirituality', 'guru'],
    '11': ['gains', 'income', 'aspirations'],
    '12': ['losses', 'foreign', 'spirituality', 'moksha'],
  };

  planets.forEach(([name, p]) => {
    if (!p?.house) return;
    const topics = topicKeywords[String(p.house)];
    if (topics) {
      topics.forEach((t) => keywords.add(t));
      // Also add planet+topic combination
      keywords.add(`${name.toLowerCase()} ${topics[0]}`);
    }
  });

  return keywords;
}

function ordinalSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

// ─── Hybrid Scoring ─────────────────────────────────────────────────────────

/**
 * Score an entry using a hybrid approach:
 * 1. IDF-weighted tag matching (50% weight)
 * 2. Text similarity via bigram overlap (30% weight)
 * 3. Entry weight bonus (20% weight)
 */
function scoreEntry(entry: VedicEntry, keywords: Set<string>, queryTokens: string[]): number {
  // 1. IDF-weighted tag matching
  let tagScore = 0;
  let tagMatches = 0;
  for (const tag of entry.tags) {
    if (keywords.has(tag)) {
      const idf = tagIDF.get(tag) ?? 1;
      tagScore += idf;
      tagMatches += 1;
    }
  }
  if (tagMatches === 0) return 0; // Must have at least one tag match

  // 2. Text similarity (bigram overlap with query)
  const entryTokens = tokenize(entry.text);
  const entryBigrams = new Set(bigrams(entryTokens));
  const queryBigrams = bigrams(queryTokens);

  let bigramMatches = 0;
  for (const bg of queryBigrams) {
    if (entryBigrams.has(bg)) bigramMatches += 1;
  }

  // Also check unigram overlap
  const entryTokenSet = new Set(entryTokens);
  let unigramMatches = 0;
  for (const qt of queryTokens) {
    if (entryTokenSet.has(qt)) unigramMatches += 1;
  }

  const textSimScore = (bigramMatches * 2 + unigramMatches) / Math.max(1, queryTokens.length);

  // 3. Weight bonus
  const weightBonus = entry.weight / 3; // Normalize 1-3 to 0.33-1.0

  // Composite score
  const composite = tagScore * 5 + textSimScore * 3 + weightBonus * 2;
  return composite;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Retrieve the most relevant Vedic knowledge for a given chart.
 * Returns a formatted string ready to inject into prompts.
 */
export function retrieveVedicContext(chart: ChartData, topK = 10): string {
  const keywords = buildKeywords(chart);
  const queryTokens = [...keywords].flatMap((k) => tokenize(k));

  const scored = allEntries
    .map((entry) => ({ entry, score: scoreEntry(entry, keywords, queryTokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (scored.length === 0) {
    return 'No specific reference rules needed. Use general Vedic astrology principles.';
  }

  return scored
    .map((s, i) => `${i + 1}. ${s.entry.text}`)
    .join('\n');
}

/**
 * Simple helper for marriage compatibility: retrieve context based on two charts.
 */
export function retrieveMarriageContext(
  chart1: ChartData,
  chart2: ChartData,
  topKPerChart = 5,
): string {
  const ctx1 = retrieveVedicContext(chart1, topKPerChart);
  const ctx2 = retrieveVedicContext(chart2, topKPerChart);

  return `Partner 1 references:\n${ctx1}\n\nPartner 2 references:\n${ctx2}`;
}
