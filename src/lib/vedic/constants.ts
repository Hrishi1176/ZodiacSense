/** Shared Vedic astrology constants — single source of truth for rule-based analysis. */

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export type Sign = (typeof SIGNS)[number];

export const SIGN_LORDS: Record<Sign, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

export type NakshatraName = (typeof NAKSHATRA_NAMES)[number];

export function signIndex(sign: string): number {
  const idx = SIGNS.indexOf(sign as Sign);
  return idx >= 0 ? idx : 0;
}

export function nakshatraIndex(name: string): number {
  const idx = NAKSHATRA_NAMES.indexOf(name as NakshatraName);
  return idx >= 0 ? idx : 0;
}

export function houseDistance(fromSign: string, toSign: string): number {
  const from = signIndex(fromSign);
  const to = signIndex(toSign);
  return ((to - from + 12) % 12) + 1;
}

// ─── Planetary dignities ─────────────────────────────────────────────────────

export type Dignity = 'Exalted' | 'Debilitated' | 'Own Sign' | 'Moolatrikona' | 'Neutral';

const EXALTATION: Record<string, Sign> = {
  Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn', Mercury: 'Virgo',
  Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra',
};

const DEBILITATION: Record<string, Sign> = {
  Sun: 'Libra', Moon: 'Scorpio', Mars: 'Cancer', Mercury: 'Pisces',
  Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries',
};

const OWN_SIGNS: Record<string, Sign[]> = {
  Sun: ['Leo'],
  Moon: ['Cancer'],
  Mars: ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Venus: ['Taurus', 'Libra'],
  Saturn: ['Capricorn', 'Aquarius'],
};

const MOOLATRIKONA: Record<string, Sign> = {
  Sun: 'Leo', Moon: 'Taurus', Mars: 'Aries', Mercury: 'Virgo',
  Jupiter: 'Sagittarius', Venus: 'Libra', Saturn: 'Aquarius',
};

export function getDignity(planet: string, sign: string): Dignity {
  if (EXALTATION[planet] === sign) return 'Exalted';
  if (DEBILITATION[planet] === sign) return 'Debilitated';
  if (MOOLATRIKONA[planet] === sign) return 'Moolatrikona';
  if (OWN_SIGNS[planet]?.includes(sign as Sign)) return 'Own Sign';
  return 'Neutral';
}

// ─── Natural (Naisargika) planetary friendship ───────────────────────────────

export type Friendship = 'Friend' | 'Enemy' | 'Neutral';

const NATURAL_FRIENDSHIP: Record<string, Record<string, Friendship>> = {
  Sun:     { Moon: 'Enemy', Mars: 'Friend', Mercury: 'Friend', Jupiter: 'Friend', Venus: 'Enemy', Saturn: 'Enemy' },
  Moon:    { Sun: 'Friend', Mars: 'Neutral', Mercury: 'Friend', Jupiter: 'Neutral', Venus: 'Neutral', Saturn: 'Neutral' },
  Mars:    { Sun: 'Friend', Moon: 'Friend', Mercury: 'Enemy', Jupiter: 'Friend', Venus: 'Neutral', Saturn: 'Neutral' },
  Mercury: { Sun: 'Friend', Moon: 'Enemy', Mars: 'Neutral', Jupiter: 'Neutral', Venus: 'Friend', Saturn: 'Neutral' },
  Jupiter: { Sun: 'Friend', Moon: 'Friend', Mars: 'Friend', Mercury: 'Enemy', Venus: 'Enemy', Saturn: 'Neutral' },
  Venus:   { Sun: 'Enemy', Moon: 'Enemy', Mars: 'Neutral', Mercury: 'Friend', Jupiter: 'Neutral', Saturn: 'Friend' },
  Saturn:  { Sun: 'Enemy', Moon: 'Enemy', Mars: 'Enemy', Mercury: 'Friend', Jupiter: 'Neutral', Venus: 'Friend' },
};

export function getNaturalFriendship(lord1: string, lord2: string): Friendship {
  if (lord1 === lord2) return 'Friend';
  return NATURAL_FRIENDSHIP[lord1]?.[lord2] ?? 'Neutral';
}

export function grahaMaitriScore(lord1: string, lord2: string): number {
  if (lord1 === lord2) return 5;
  const f1 = getNaturalFriendship(lord1, lord2);
  const f2 = getNaturalFriendship(lord2, lord1);
  if (f1 === 'Friend' && f2 === 'Friend') return 5;
  if ((f1 === 'Friend' && f2 === 'Neutral') || (f1 === 'Neutral' && f2 === 'Friend')) return 4;
  if (f1 === 'Neutral' && f2 === 'Neutral') return 3;
  if ((f1 === 'Friend' && f2 === 'Enemy') || (f1 === 'Enemy' && f2 === 'Friend')) return 1;
  if ((f1 === 'Neutral' && f2 === 'Enemy') || (f1 === 'Enemy' && f2 === 'Neutral')) return 0.5;
  return 0;
}

// ─── Gana (Deva / Manushya / Rakshasa) by nakshatra index ───────────────────

export function getGana(nakIdx: number): 'Deva' | 'Manushya' | 'Rakshasa' {
  const deva = [0, 4, 6, 7, 12, 14, 16, 21, 26];
  const manushya = [1, 3, 5, 10, 11, 19, 20, 24, 25];
  if (deva.includes(nakIdx)) return 'Deva';
  if (manushya.includes(nakIdx)) return 'Manushya';
  return 'Rakshasa';
}

export function ganaScore(g1: string, g2: string): number {
  if (g1 === g2) return 6;
  if ((g1 === 'Deva' && g2 === 'Manushya') || (g1 === 'Manushya' && g2 === 'Deva')) return 5;
  if ((g1 === 'Deva' && g2 === 'Rakshasa') || (g1 === 'Rakshasa' && g2 === 'Deva')) return 1;
  if ((g1 === 'Manushya' && g2 === 'Rakshasa') || (g1 === 'Rakshasa' && g2 === 'Manushya')) return 0;
  return 6;
}

// ─── Varna by Moon sign (Ashtakoot) ──────────────────────────────────────────

const VARNA_BY_SIGN: Record<Sign, number> = {
  Cancer: 4, Scorpio: 4, Pisces: 4,
  Aries: 3, Leo: 3, Sagittarius: 3,
  Taurus: 2, Virgo: 2, Capricorn: 2,
  Gemini: 1, Libra: 1, Aquarius: 1,
};

export function getVarna(moonSign: string): number {
  return VARNA_BY_SIGN[moonSign as Sign] ?? 1;
}

export function varnaScore(boyMoonSign: string, girlMoonSign: string): number {
  return getVarna(boyMoonSign) >= getVarna(girlMoonSign) ? 1 : 0;
}

// ─── Vashya by Moon sign ─────────────────────────────────────────────────────

type VashyaGroup = 'Chatushpada' | 'Manava' | 'Jalachara' | 'Vanachara' | 'Keeta';

const VASHYA_BY_SIGN: Record<Sign, VashyaGroup> = {
  Aries: 'Chatushpada', Taurus: 'Chatushpada', Gemini: 'Manava', Cancer: 'Jalachara',
  Leo: 'Vanachara', Virgo: 'Manava', Libra: 'Manava', Scorpio: 'Keeta',
  Sagittarius: 'Chatushpada', Capricorn: 'Chatushpada', Aquarius: 'Manava', Pisces: 'Jalachara',
};

/** Standard vashya compatibility matrix (max 2 points). */
const VASHYA_MATRIX: Record<VashyaGroup, Partial<Record<VashyaGroup, number>>> = {
  Chatushpada: { Chatushpada: 2, Manava: 1, Jalachara: 1, Vanachara: 1.5, Keeta: 1 },
  Manava:      { Chatushpada: 1, Manava: 2, Jalachara: 1.5, Vanachara: 0, Keeta: 1 },
  Jalachara:   { Chatushpada: 1, Manava: 1.5, Jalachara: 2, Vanachara: 1, Keeta: 1 },
  Vanachara:   { Chatushpada: 1.5, Manava: 0, Jalachara: 1, Vanachara: 2, Keeta: 0 },
  Keeta:       { Chatushpada: 1, Manava: 1, Jalachara: 1, Vanachara: 0, Keeta: 2 },
};

export function vashyaScore(boyMoon: string, girlMoon: string): number {
  const b = VASHYA_BY_SIGN[boyMoon as Sign] ?? 'Manava';
  const g = VASHYA_BY_SIGN[girlMoon as Sign] ?? 'Manava';
  return VASHYA_MATRIX[b]?.[g] ?? 1;
}

// ─── Tara (Dina) koot ─────────────────────────────────────────────────────────

const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Param Mitra'];
const MALEFIC_TARA = new Set([3, 5, 7]); // Vipat, Pratyari, Vadha (1-indexed remainder)

function taraRemainder(fromNak: number, toNak: number): number {
  let count = toNak - fromNak;
  if (count <= 0) count += 27;
  return ((count - 1) % 9) + 1;
}

export function taraScore(boyNakIdx: number, girlNakIdx: number): { score: number; boyToGirl: string; girlToBoy: string } {
  const b2g = taraRemainder(girlNakIdx, boyNakIdx);
  const g2b = taraRemainder(boyNakIdx, girlNakIdx);
  const bOk = !MALEFIC_TARA.has(b2g);
  const gOk = !MALEFIC_TARA.has(g2b);
  let score = 0;
  if (bOk && gOk) score = 3;
  else if (bOk || gOk) score = 1.5;
  return {
    score,
    boyToGirl: TARA_NAMES[b2g - 1],
    girlToBoy: TARA_NAMES[g2b - 1],
  };
}

// ─── Yoni koot ────────────────────────────────────────────────────────────────

type YoniAnimal = 'Horse' | 'Elephant' | 'Sheep' | 'Serpent' | 'Dog' | 'Cat' | 'Rat' | 'Cow' | 'Buffalo' | 'Tiger' | 'Deer' | 'Monkey' | 'Mongoose' | 'Lion';

const YONI_BY_NAK: YoniAnimal[] = [
  'Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog',
  'Cat', 'Sheep', 'Cat', 'Rat', 'Rat', 'Cow',
  'Buffalo', 'Tiger', 'Buffalo', 'Tiger', 'Deer', 'Deer',
  'Dog', 'Monkey', 'Mongoose', 'Monkey', 'Lion', 'Horse',
  'Lion', 'Cow', 'Elephant',
];

/** Yoni enmity pairs (score 0); same = 4; friendly = 3; neutral = 2; enemy = 1; sworn = 0 */
const YONI_ENEMIES: [YoniAnimal, YoniAnimal][] = [
  ['Horse', 'Buffalo'], ['Elephant', 'Lion'], ['Sheep', 'Monkey'],
  ['Serpent', 'Mongoose'], ['Dog', 'Deer'], ['Cat', 'Rat'],
  ['Cow', 'Tiger'], ['Buffalo', 'Horse'],
];

function yoniCompatibility(a: YoniAnimal, b: YoniAnimal): number {
  if (a === b) return 4;
  for (const [x, y] of YONI_ENEMIES) {
    if ((a === x && b === y) || (a === y && b === x)) return 0;
  }
  const friendly: [YoniAnimal, YoniAnimal][] = [
    ['Horse', 'Elephant'], ['Cow', 'Buffalo'], ['Deer', 'Monkey'],
  ];
  for (const [x, y] of friendly) {
    if ((a === x && b === y) || (a === y && b === x)) return 3;
  }
  return 2;
}

export function yoniScore(boyNakIdx: number, girlNakIdx: number): { score: number; boyYoni: YoniAnimal; girlYoni: YoniAnimal } {
  const boyYoni = YONI_BY_NAK[boyNakIdx];
  const girlYoni = YONI_BY_NAK[girlNakIdx];
  return { score: yoniCompatibility(boyYoni, girlYoni), boyYoni, girlYoni };
}

// ─── Bhakoot koot ─────────────────────────────────────────────────────────────

export function bhakootScore(boyMoonSign: string, girlMoonSign: string): { score: number; distance: number; dosha: boolean } {
  const dist = houseDistance(girlMoonSign, boyMoonSign);
  const diff = Math.min(dist - 1, 12 - (dist - 1));
  const doshaPairs = new Set([2, 5, 6]); // 2/12, 5/9, 6/8 bhakoot dosha
  const dosha = doshaPairs.has(diff);
  return { score: dosha ? 0 : 7, distance: dist, dosha };
}

// ─── Nadi koot ────────────────────────────────────────────────────────────────

type Nadi = 'Adi' | 'Madhya' | 'Antya';

const NADI_BY_NAK: Nadi[] = [
  'Adi', 'Madhya', 'Antya', 'Adi', 'Madhya', 'Antya',
  'Adi', 'Madhya', 'Antya', 'Adi', 'Madhya', 'Antya',
  'Adi', 'Madhya', 'Antya', 'Adi', 'Madhya', 'Antya',
  'Adi', 'Madhya', 'Antya', 'Adi', 'Madhya', 'Antya',
  'Adi', 'Madhya', 'Antya',
];

export function nadiScore(boyNakIdx: number, girlNakIdx: number): { score: number; boyNadi: Nadi; girlNadi: Nadi; dosha: boolean } {
  const boyNadi = NADI_BY_NAK[boyNakIdx];
  const girlNadi = NADI_BY_NAK[girlNakIdx];
  const dosha = boyNadi === girlNadi;
  return { score: dosha ? 0 : 8, boyNadi, girlNadi, dosha };
}

// ─── House significations (for interpretive text) ────────────────────────────

export const HOUSE_THEMES: Record<number, string> = {
  1: 'Self, personality, vitality',
  2: 'Wealth, family, speech',
  3: 'Courage, siblings, communication',
  4: 'Home, mother, emotional foundation',
  5: 'Creativity, children, intelligence',
  6: 'Health, enemies, service',
  7: 'Marriage, partnerships',
  8: 'Longevity, transformation, obstacles',
  9: 'Fortune, dharma, higher learning',
  10: 'Career, status, public life',
  11: 'Gains, aspirations, networks',
  12: 'Losses, spirituality, foreign lands',
};

// ─── Remedies by planet ───────────────────────────────────────────────────────

export const PLANET_REMEDIES: Record<string, string[]> = {
  Sun: ['Offer water to Sun at sunrise (Surya Arghya)', 'Recite Aditya Hridayam on Sundays', 'Wear ruby only after Jyotish consultation'],
  Moon: ['Chant Chandra mantra on Mondays', 'Donate white items (rice, milk) on Mondays', 'Practice meditation for emotional balance'],
  Mars: ['Recite Hanuman Chalisa on Tuesdays', 'Donate red lentils on Tuesdays', 'Perform Mangal Shanti if Manglik dosha is present'],
  Mercury: ['Chant Budh mantra on Wednesdays', 'Donate green items or books', 'Practice clear written communication daily'],
  Jupiter: ['Chant Guru mantra on Thursdays', 'Donate yellow items or support education', 'Respect teachers and elders'],
  Venus: ['Chant Shukra mantra on Fridays', 'Donate white sweets or artistic supplies', 'Cultivate harmony in relationships'],
  Saturn: ['Chant Shani mantra on Saturdays', 'Serve the elderly and underprivileged', 'Practice discipline and patience'],
  Rahu: ['Chant Rahu mantra; avoid impulsive decisions', 'Donate on Saturdays to reduce confusion', 'Maintain ethical boundaries in ambition'],
  Ketu: ['Chant Ketu mantra; practice spiritual discipline', 'Donate blankets or support spiritual causes', 'Reduce attachment to outcomes'],
};
