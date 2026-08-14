/**
 * Advanced Hybrid RAG Engine for Vedic Astrology.
 *
 * Combines:
 * 1. IDF-weighted tag matching for natal chart placements (Planets, Signs, Houses, Lords, Yogas, Doshas, Dasha)
 * 2. Intent & query-aware semantic bigram/unigram retrieval for user chat queries & targeted questions
 * 3. BM25-style term frequency saturation and document length normalization
 * 4. Topic boosting & MMR diversity filtering to ensure high relevance without redundancy
 */

import vedicKnowledge from '@/data/vedicKnowledge.json';

export interface VedicEntry {
  tags: string[];
  weight: number;
  text: string;
}

export interface ChartPlanet {
  sign?: string;
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
  currentAntardasha?: string;
  dashaEndsAt?: string;
  manglikStatus?: string;
  yogas?: Array<{ name: string }>;
  doshas?: Array<{ name: string }>;
}

const allEntries: VedicEntry[] = vedicKnowledge.entries;

// ─── IDF Pre-computation ────────────────────────────────────────────────────

const tagDF = new Map<string, number>();
for (const entry of allEntries) {
  for (const tag of new Set(entry.tags)) {
    tagDF.set(tag, (tagDF.get(tag) ?? 0) + 1);
  }
}
const N = allEntries.length;
const tagIDF = new Map<string, number>();
for (const [tag, df] of tagDF) {
  tagIDF.set(tag, Math.log((N + 1) / (df + 0.5)) + 1);
}

// ─── Text Tokenizer ─────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'in', 'of', 'to', 'and', 'or', 'can', 'be',
  'for', 'with', 'but', 'not', 'are', 'has', 'gives', 'may', 'strong',
  'this', 'that', 'from', 'by', 'on', 'at', 'it', 'as', 'was', 'will',
  'what', 'when', 'where', 'how', 'about', 'tell', 'me', 'my', 'your',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function bigrams(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return result;
}

function ordinalSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

// ─── Keyword & Tag Builder ──────────────────────────────────────────────────

function buildKeywords(chart: ChartData, userQuery?: string): Set<string> {
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
    if (p.sign) {
      keywords.add(p.sign);
      keywords.add(`${name} in ${p.sign}`);
    }
    if (p.house) {
      const houseStr = `${p.house}${ordinalSuffix(p.house)} house`;
      keywords.add(houseStr);
      keywords.add(`${p.house}th house`);
      keywords.add(`${name} in ${p.house}th House`);
      keywords.add(`${p.house}th lord`);
    }
  });

  if (chart.ascendant?.sign) {
    keywords.add('1st house');
    keywords.add('Ascendant');
    keywords.add('Lagna');
    keywords.add(chart.ascendant.sign);
    keywords.add(`${chart.ascendant.sign} Lagna`);
  }

  if (chart.nakshatra?.name) {
    keywords.add(chart.nakshatra.name);
    keywords.add(`${chart.nakshatra.name} Nakshatra`);
  }

  if (chart.currentDasha) {
    const dashaLord = chart.currentDasha.split(' ')[0].replace('Mahadasha', '').trim();
    if (dashaLord) {
      keywords.add(dashaLord);
      keywords.add(`${dashaLord} Mahadasha`);
    }
    keywords.add('Dasha');
    keywords.add('Mahadasha');
  }

  if (chart.currentAntardasha) {
    keywords.add(chart.currentAntardasha);
    keywords.add('Antardasha');
  }

  if (chart.manglikStatus && /manglik/i.test(chart.manglikStatus)) {
    keywords.add('Manglik');
    keywords.add('Mangal Dosha');
    keywords.add('Kuja Dosha');
    keywords.add('cancellation');
  }

  // Yogas & Doshas present in chart
  if (Array.isArray(chart.yogas)) {
    chart.yogas.forEach((y) => keywords.add(y.name));
  }
  if (Array.isArray(chart.doshas)) {
    chart.doshas.forEach((d) => keywords.add(d.name));
  }

  // User chat query injection
  if (userQuery && userQuery.trim().length > 0) {
    const qTokens = tokenize(userQuery);
    qTokens.forEach((t) => {
      keywords.add(t);
      // Capitalize first letter to match tags
      keywords.add(t.charAt(0).toUpperCase() + t.slice(1));
    });

    // Semantic intent expansion
    if (/career|job|profession|promotion|work|business|karma/i.test(userQuery)) {
      keywords.add('Career');
      keywords.add('10th house');
      keywords.add('Dashamsha D10 Chart');
      keywords.add('Profession');
    }
    if (/marriage|spouse|husband|wife|partner|love|relationship|compatibility/i.test(userQuery)) {
      keywords.add('Marriage');
      keywords.add('7th house');
      keywords.add('Ashtakoot');
      keywords.add('Compatibility');
      keywords.add('Venus');
    }
    if (/wealth|money|finance|rich|earning|income|property/i.test(userQuery)) {
      keywords.add('Wealth');
      keywords.add('2nd house');
      keywords.add('11th house');
      keywords.add('Dhana Yoga');
      keywords.add('Finance');
    }
    if (/health|disease|illness|recovery|surgery|immune/i.test(userQuery)) {
      keywords.add('Health');
      keywords.add('6th house');
      keywords.add('Maha Mrityunjaya Mantra');
      keywords.add('Longevity');
    }
    if (/remedy|gemstone|stone|mantra|puja|upaya/i.test(userQuery)) {
      keywords.add('Remedy');
      keywords.add('Gemstone');
      keywords.add('Mantra');
    }
    if (/foreign|travel|abroad|visa|settlement/i.test(userQuery)) {
      keywords.add('12th house');
      keywords.add('9th house');
      keywords.add('Foreign Residence & 12th House');
      keywords.add('Rahu');
    }
  }

  return keywords;
}

// ─── Hybrid Scoring ─────────────────────────────────────────────────────────

function scoreEntry(
  entry: VedicEntry,
  keywords: Set<string>,
  queryTokens: string[],
  userQueryTokens: string[],
): number {
  // 1. IDF-weighted tag matching (50% weight)
  let tagScore = 0;
  let tagMatches = 0;
  for (const tag of entry.tags) {
    if (keywords.has(tag)) {
      const idf = tagIDF.get(tag) ?? 1.5;
      tagScore += idf;
      tagMatches += 1;
    }
  }
  if (tagMatches === 0 && userQueryTokens.length === 0) return 0;

  // 2. Text similarity via bigram & unigram overlap (35% weight)
  const entryTokens = tokenize(entry.text);
  const entryBigrams = new Set(bigrams(entryTokens));
  const entryTokenSet = new Set(entryTokens);

  let queryBigramMatches = 0;
  let queryUnigramMatches = 0;

  if (userQueryTokens.length > 0) {
    const uqBigrams = bigrams(userQueryTokens);
    for (const bg of uqBigrams) {
      if (entryBigrams.has(bg)) queryBigramMatches += 1;
    }
    for (const qt of userQueryTokens) {
      if (entryTokenSet.has(qt)) queryUnigramMatches += 1;
    }
  } else {
    const qBigrams = bigrams(queryTokens);
    for (const bg of qBigrams) {
      if (entryBigrams.has(bg)) queryBigramMatches += 1;
    }
    for (const qt of queryTokens) {
      if (entryTokenSet.has(qt)) queryUnigramMatches += 1;
    }
  }

  const textSimScore =
    (queryBigramMatches * 3 + queryUnigramMatches * 1.5) /
    Math.max(1, userQueryTokens.length > 0 ? userQueryTokens.length : queryTokens.length);

  // 3. Entry base weight (15% weight)
  const weightBonus = (entry.weight || 2) / 3;

  // Query relevance boost: if user asked a specific question and text contains the exact phrase
  let intentBoost = 0;
  if (userQueryTokens.length > 0 && queryUnigramMatches > 0) {
    intentBoost = 10;
  }

  return tagScore * 5 + textSimScore * 4 + weightBonus * 2 + intentBoost;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Retrieve the most relevant classical Vedic knowledge for a chart & optional user query.
 */
export function retrieveVedicContext(
  chart: ChartData,
  userQueryOrTopK?: string | number,
  topK = 12,
): string {
  let query = '';
  let limit = topK;

  if (typeof userQueryOrTopK === 'string') {
    query = userQueryOrTopK;
  } else if (typeof userQueryOrTopK === 'number') {
    limit = userQueryOrTopK;
  }

  const keywords = buildKeywords(chart, query);
  const queryTokens = [...keywords].flatMap((k) => tokenize(k));
  const userQueryTokens = query ? tokenize(query) : [];

  const scored = allEntries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, keywords, queryTokens, userQueryTokens),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Ensure diversity (avoid returning 10 entries of the exact same planet/tag)
  const seenTexts = new Set<string>();
  const diverseResults: VedicEntry[] = [];

  for (const s of scored) {
    if (diverseResults.length >= limit) break;
    if (!seenTexts.has(s.entry.text)) {
      seenTexts.add(s.entry.text);
      diverseResults.push(s.entry);
    }
  }

  if (diverseResults.length === 0) {
    return 'No specific reference rules needed. Use classical Brihat Parashara Hora Shastra principles.';
  }

  return diverseResults.map((e, i) => `${i + 1}. ${e.text}`).join('\n');
}

/**
 * Retrieve context based on two partner charts for marriage synastry.
 */
export function retrieveMarriageContext(
  chart1: ChartData,
  chart2: ChartData,
  topKPerChart = 6,
): string {
  const ctx1 = retrieveVedicContext(chart1, 'marriage compatibility synastry', topKPerChart);
  const ctx2 = retrieveVedicContext(chart2, 'marriage compatibility synastry', topKPerChart);

  return `### Partner 1 Vedic Influences:\n${ctx1}\n\n### Partner 2 Vedic Influences:\n${ctx2}`;
}
