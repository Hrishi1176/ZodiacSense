/** Shared Vedic astrology constants — BPHS single source of truth for deterministic analysis. */

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

// ─── Planetary Dignities (BPHS Standard) ─────────────────────────────────────

export type Dignity = 'Exalted' | 'Debilitated' | 'Own Sign' | 'Moolatrikona' | 'Great Friend' | 'Friend' | 'Neutral' | 'Enemy' | 'Great Enemy';

export const EXALTATION: Record<string, { sign: Sign; degree: number }> = {
  Sun: { sign: 'Aries', degree: 10 },
  Moon: { sign: 'Taurus', degree: 3 },
  Mars: { sign: 'Capricorn', degree: 28 },
  Mercury: { sign: 'Virgo', degree: 15 },
  Jupiter: { sign: 'Cancer', degree: 5 },
  Venus: { sign: 'Pisces', degree: 27 },
  Saturn: { sign: 'Libra', degree: 20 },
  Rahu: { sign: 'Taurus', degree: 15 },
  Ketu: { sign: 'Scorpio', degree: 15 },
};

export const DEBILITATION: Record<string, { sign: Sign; degree: number }> = {
  Sun: { sign: 'Libra', degree: 10 },
  Moon: { sign: 'Scorpio', degree: 3 },
  Mars: { sign: 'Cancer', degree: 28 },
  Mercury: { sign: 'Pisces', degree: 15 },
  Jupiter: { sign: 'Capricorn', degree: 5 },
  Venus: { sign: 'Virgo', degree: 27 },
  Saturn: { sign: 'Aries', degree: 20 },
  Rahu: { sign: 'Scorpio', degree: 15 },
  Ketu: { sign: 'Taurus', degree: 15 },
};

export const OWN_SIGNS: Record<string, Sign[]> = {
  Sun: ['Leo'],
  Moon: ['Cancer'],
  Mars: ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Venus: ['Taurus', 'Libra'],
  Saturn: ['Capricorn', 'Aquarius'],
  Rahu: ['Aquarius'],
  Ketu: ['Scorpio'],
};

export const MOOLATRIKONA: Record<string, { sign: Sign; fromDeg: number; toDeg: number }> = {
  Sun: { sign: 'Leo', fromDeg: 0, toDeg: 20 },
  Moon: { sign: 'Taurus', fromDeg: 3, toDeg: 30 },
  Mars: { sign: 'Aries', fromDeg: 0, toDeg: 12 },
  Mercury: { sign: 'Virgo', fromDeg: 15, toDeg: 20 },
  Jupiter: { sign: 'Sagittarius', fromDeg: 0, toDeg: 10 },
  Venus: { sign: 'Libra', fromDeg: 0, toDeg: 15 },
  Saturn: { sign: 'Aquarius', fromDeg: 0, toDeg: 20 },
};

export function getDignity(planet: string, sign: string, degInSign = 15): Dignity {
  if (EXALTATION[planet]?.sign === sign) return 'Exalted';
  if (DEBILITATION[planet]?.sign === sign) return 'Debilitated';
  
  const mt = MOOLATRIKONA[planet];
  if (mt && mt.sign === sign && degInSign >= mt.fromDeg && degInSign <= mt.toDeg) {
    return 'Moolatrikona';
  }
  if (OWN_SIGNS[planet]?.includes(sign as Sign)) return 'Own Sign';

  const signLord = SIGN_LORDS[sign as Sign];
  if (signLord) {
    const rel = getNaturalFriendship(planet, signLord);
    if (rel === 'Friend') return 'Friend';
    if (rel === 'Enemy') return 'Enemy';
  }
  return 'Neutral';
}

// ─── Natural (Naisargika) Planetary Friendship (BPHS Standard) ───────────────

export type Friendship = 'Friend' | 'Enemy' | 'Neutral';

export const NATURAL_FRIENDSHIP: Record<string, Record<string, Friendship>> = {
  Sun:     { Moon: 'Friend', Mars: 'Friend', Jupiter: 'Friend', Mercury: 'Neutral', Venus: 'Enemy', Saturn: 'Enemy', Rahu: 'Enemy', Ketu: 'Enemy' },
  Moon:    { Sun: 'Friend', Mercury: 'Friend', Mars: 'Neutral', Jupiter: 'Neutral', Venus: 'Neutral', Saturn: 'Neutral', Rahu: 'Enemy', Ketu: 'Enemy' },
  Mars:    { Sun: 'Friend', Moon: 'Friend', Jupiter: 'Friend', Venus: 'Neutral', Saturn: 'Neutral', Mercury: 'Enemy', Rahu: 'Enemy', Ketu: 'Friend' },
  Mercury: { Sun: 'Friend', Venus: 'Friend', Mars: 'Neutral', Jupiter: 'Neutral', Saturn: 'Neutral', Moon: 'Enemy', Rahu: 'Friend', Ketu: 'Neutral' },
  Jupiter: { Sun: 'Friend', Moon: 'Friend', Mars: 'Friend', Saturn: 'Neutral', Mercury: 'Enemy', Venus: 'Enemy', Rahu: 'Enemy', Ketu: 'Friend' },
  Venus:   { Mercury: 'Friend', Saturn: 'Friend', Mars: 'Neutral', Jupiter: 'Neutral', Sun: 'Enemy', Moon: 'Enemy', Rahu: 'Friend', Ketu: 'Neutral' },
  Saturn:  { Mercury: 'Friend', Venus: 'Friend', Jupiter: 'Neutral', Sun: 'Enemy', Moon: 'Enemy', Mars: 'Enemy', Rahu: 'Friend', Ketu: 'Neutral' },
  Rahu:    { Mercury: 'Friend', Venus: 'Friend', Saturn: 'Friend', Jupiter: 'Neutral', Mars: 'Enemy', Sun: 'Enemy', Moon: 'Enemy' },
  Ketu:    { Mars: 'Friend', Jupiter: 'Friend', Mercury: 'Neutral', Venus: 'Neutral', Saturn: 'Neutral', Sun: 'Enemy', Moon: 'Enemy' },
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

// ─── Gana (Deva / Manushya / Rakshasa) by Nakshatra Index ───────────────────

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
  Cancer: 4, Scorpio: 4, Pisces: 4,        // Brahmin (Water)
  Aries: 3, Leo: 3, Sagittarius: 3,        // Kshatriya (Fire)
  Taurus: 2, Virgo: 2, Capricorn: 2,       // Vaishya (Earth)
  Gemini: 1, Libra: 1, Aquarius: 1,        // Shudra (Air)
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

// ─── Tara (Dina) Koot ─────────────────────────────────────────────────────────

export const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Param Mitra'];
const MALEFIC_TARA = new Set([3, 5, 7]); // Vipat, Pratyari, Vadha

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

// ─── Yoni Koot ────────────────────────────────────────────────────────────────

export type YoniAnimal = 'Horse' | 'Elephant' | 'Sheep' | 'Serpent' | 'Dog' | 'Cat' | 'Rat' | 'Cow' | 'Buffalo' | 'Tiger' | 'Deer' | 'Monkey' | 'Mongoose' | 'Lion';

export const YONI_BY_NAK: YoniAnimal[] = [
  'Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog',
  'Cat', 'Sheep', 'Cat', 'Rat', 'Rat', 'Cow',
  'Buffalo', 'Tiger', 'Buffalo', 'Tiger', 'Deer', 'Deer',
  'Dog', 'Monkey', 'Mongoose', 'Monkey', 'Lion', 'Horse',
  'Lion', 'Cow', 'Elephant',
];

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

// ─── Bhakoot Koot ─────────────────────────────────────────────────────────────

export function bhakootScore(boyMoonSign: string, girlMoonSign: string): { score: number; distance: number; dosha: boolean } {
  const dist = houseDistance(girlMoonSign, boyMoonSign);
  const diff = Math.min(dist - 1, 12 - (dist - 1));
  const doshaPairs = new Set([1, 5]); // 2/12 and 6/8 positions (diff 1 and 5)
  const isNineFive = dist === 5 || dist === 9; // 5/9 position
  const dosha = doshaPairs.has(diff) || isNineFive;
  return { score: dosha ? 0 : 7, distance: dist, dosha };
}

// ─── Nadi Koot ────────────────────────────────────────────────────────────────

export type Nadi = 'Adi' | 'Madhya' | 'Antya';

export const NADI_BY_NAK: Nadi[] = [
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

// ─── House Themes & Planetary Remedies ────────────────────────────────────────

export const HOUSE_THEMES: Record<number, string> = {
  1: 'Self, personality, physical body, vitality, and life direction',
  2: 'Wealth, financial reserves, family values, speech, and food habits',
  3: 'Courage, willpower, younger siblings, short journeys, communication, and skills',
  4: 'Home environment, mother, landed assets, vehicles, peace of mind, and domestic happiness',
  5: 'Intellect, children, past life merits (Purvapunya), creative expression, and education',
  6: 'Daily routine, service, overcoming enemies/debts, health resilience, and litigation',
  7: 'Spouse, marriage, business partnerships, open interactions, and public dealings',
  8: 'Longevity, transformations, deep research, hidden assets, occult, and sudden shifts',
  9: 'Dharma, fortune, father, spiritual preceptors (Guru), higher learning, and pilgrimages',
  10: 'Career, profession, social authority, government honors, reputation, and public status',
  11: 'Gains, liquid wealth, fulfilling desires, elder siblings, and elite networks',
  12: 'Moksha, spirituality, foreign residence/travels, investments, and expenditure',
};

export const PLANET_REMEDIES: Record<string, string[]> = {
  Sun: [
    'Offer water to the rising Sun (Surya Arghya) daily with Gayatri or Aditya Hridayam Stotra',
    'Donate copper, wheat, jaggery, or ruby-colored items on Sundays',
    'Show deep respect to father, mentors, and elders',
    'Wear authentic Ruby (Manikya) in gold on ring finger only if Sun is a functional benefic',
  ],
  Moon: [
    'Chant "Om Som Somaya Namah" or recite Shiva Panchakshara Stotra on Mondays',
    'Donate rice, milk, silver, white sweets, or water to travelers',
    'Practice mindful breathing, meditation, and seek the blessings of mother',
    'Wear natural Pearl (Moti) or Moonstone in silver on little finger',
  ],
  Mars: [
    'Recite Hanuman Chalisa or Sundarkand every Tuesday',
    'Donate red lentils (masoor dal), copper, or red flowers on Tuesdays',
    'Channel physical energy through martial arts, gym, or sports rather than impulsive anger',
    'Wear Red Coral (Moonga) in copper/gold on ring finger after verifying Manglik factors',
  ],
  Mercury: [
    'Chant "Om Budhaya Namah" or recite Vishnu Sahasranama on Wednesdays',
    'Donate green moong dal, green vegetables, or stationery to underprivileged students',
    'Cultivate analytical writing, continuous learning, and clear transparent speech',
    'Wear untreated Emerald (Panna) in gold/silver on little finger',
  ],
  Jupiter: [
    'Recite Guru Stotram or chant "Om Brihaspataye Namah" on Thursdays',
    'Donate chana dal, turmeric, yellow cloth, or support spiritual schools/Gurus',
    'Cultivate righteous conduct (Dharma), humility, and generosity',
    'Wear natural Yellow Sapphire (Pukhraj) or Topaz in gold on index finger',
  ],
  Venus: [
    'Worship Goddess Lakshmi or chant Shri Suktam on Fridays',
    'Donate white items (curd, sugar, ghee, silk clothing) on Fridays',
    'Maintain artistic cleanliness, respect partner/women, and appreciate aesthetics',
    'Wear natural Diamond or White Sapphire/Opal in silver/platinum on middle/index finger',
  ],
  Saturn: [
    'Recite Hanuman Chalisa, Dasharatha Shani Stotra, or chant "Om Sham Shanicharaya Namah" on Saturdays',
    'Donate mustard oil, black sesame seeds, iron, or black umbrellas to laborers/elderly',
    'Cultivate discipline, perseverance, punctuality, and help underprivileged workers',
    'Wear Blue Sapphire (Neelam) or Amethyst in silver only after trial and expert recommendation',
  ],
  Rahu: [
    'Chant Durga Chalisa or "Om Bhram Bhreem Bhroum Sah Rahave Namah" on Saturdays/Wednesdays',
    'Donate dark blankets, radish, or feed birds and stray animals',
    'Stay grounded, avoid deceit/gambling, and practice clarity in worldly pursuits',
    'Wear Hessonite Garnet (Gomed) in silver on middle finger if Rahu is well-placed in Kendra/Trikona',
  ],
  Ketu: [
    'Worship Lord Ganesha and recite Ganesha Atharvashirsha on Tuesdays',
    'Feed stray dogs, donate sesame seeds or multi-colored blankets',
    'Practice introspective meditation, non-attachment, and study spiritual philosophy',
    'Wear Cat\'s Eye (Chrysoberyl) in silver on little/middle finger under guidance',
  ],
};
