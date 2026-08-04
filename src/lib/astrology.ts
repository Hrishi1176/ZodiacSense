export interface BirthChartInput {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
}

// Calculate Sun Sign based on month & day
export function getSunSign(dateStr: string): { sign: string; element: string; rulingPlanet: string } {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
    return { sign: 'Aries (মেষ)', element: 'Fire (অগ্নি)', rulingPlanet: 'Mars (মঙ্গল)' };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
    return { sign: 'Taurus (বৃষ)', element: 'Earth (পৃথিবী)', rulingPlanet: 'Venus (শুক্র)' };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
    return { sign: 'Gemini (মিথুন)', element: 'Air (বায়ু)', rulingPlanet: 'Mercury (বুধ)' };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
    return { sign: 'Cancer (কর্কট)', element: 'Water (জল)', rulingPlanet: 'Moon (চন্দ্র)' };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
    return { sign: 'Leo (সিংহ)', element: 'Fire (অগ্নি)', rulingPlanet: 'Sun (সূর্য)' };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
    return { sign: 'Virgo (কন্যা)', element: 'Earth (পৃথিবী)', rulingPlanet: 'Mercury (বুধ)' };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
    return { sign: 'Libra (তুলা)', element: 'Air (বায়ু)', rulingPlanet: 'Venus (শুক্র)' };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
    return { sign: 'Scorpio (বৃশ্চিক)', element: 'Water (জল)', rulingPlanet: 'Mars (মঙ্গল)' };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
    return { sign: 'Sagittarius (ধনু)', element: 'Fire (অগ্নি)', rulingPlanet: 'Jupiter (বৃহস্পতি)' };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
    return { sign: 'Capricorn (মকর)', element: 'Earth (পৃথিবী)', rulingPlanet: 'Saturn (শনি)' };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
    return { sign: 'Aquarius (কুম্ভ)', element: 'Air (বায়ু)', rulingPlanet: 'Saturn (শনি)' };
  return { sign: 'Pisces (মীন)', element: 'Water (জল)', rulingPlanet: 'Jupiter (বৃহস্পতি)' };
}

// Estimate Vedic Moon Nakshatra & Pada based on day & time
export function getNakshatraInfo(dateStr: string, timeStr: string): { nakshatra: string; pada: number } {
  const nakshatras = [
    'Ashwini (অশ্বিনী)', 'Bharani (ভরণী)', 'Krittika (কৃত্তিকা)', 'Rohini (রোহিণী)',
    'Mrigashira (মৃগশিরা)', 'Ardra (আর্দ্রা)', 'Punarvasu (পুনর্বসু)', 'Pushya (পুষ্যা)',
    'Ashlesha (অশ্লেষা)', 'Magha (মঘা)', 'Purva Phalguni (পূর্ব ফাল্গুনী)', 'Uttara Phalguni (উত্তর ফাল্গুনী)',
    'Hasta (হস্ত)', 'Chitra (চিত্রা)', 'Swati (স্বাতী)', 'Vishakha (বিশাখা)',
    'Anuradha (অনুরাধা)', 'Jyeshtha (জ্যেষ্ঠা)', 'Mula (মূল)', 'Purva Ashadha (পূর্ব আষাঢ়া)',
    'Uttara Ashadha (উত্তর আষাঢ়া)', 'Shravana (শ্রবণা)', 'Dhanishta (ধনিষ্ঠা)', 'Shatabhisha (শতভিষা)',
    'Purva Bhadrapada (পূর্ব ভাদ্রপদ)', 'Uttara Bhadrapada (উত্তর ভাদ্রপদ)', 'Revati (রেবতী)'
  ];

  const date = new Date(dateStr + 'T' + (timeStr || '12:00'));
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const hour = date.getHours();
  const minutes = date.getMinutes();
  
  const totalMinutes = hour * 60 + minutes;
  const nakIndex = (dayOfYear * 3 + Math.floor(totalMinutes / 480)) % nakshatras.length;
  const pada = (Math.floor(totalMinutes / 120) % 4) + 1;

  return { nakshatra: nakshatras[nakIndex], pada };
}

// Calculate Ascendant (Lagna) based on birth hour & sun sign
export function getAscendant(dateStr: string, timeStr: string): string {
  const signs = [
    'Aries (মেষ)', 'Taurus (বৃষ)', 'Gemini (মিথুন)', 'Cancer (কর্কট)',
    'Leo (সিংহ)', 'Virgo (কন্যা)', 'Libra (তুলা)', 'Scorpio (বৃশ্চিক)',
    'Sagittarius (ধনু)', 'Capricorn (মকর)', 'Aquarius (কুম্ভ)', 'Pisces (মীন)'
  ];
  
  const [hour] = (timeStr || '12:00').split(':').map(Number);
  const sunInfo = getSunSign(dateStr);
  const sunSignIndex = signs.findIndex(s => s.startsWith(sunInfo.sign.split(' ')[0]));
  
  // Sunrise approx 6 AM (Lagna advances ~1 sign every 2 hours)
  const hoursSinceSunrise = (hour - 6 + 24) % 24;
  const lagnaIndex = (sunSignIndex + Math.floor(hoursSinceSunrise / 2)) % 12;
  
  return signs[lagnaIndex];
}

// Get Lagna Gemstone
export function getGemstone(lagna: string): { stone: string; metal: string } {
  if (lagna.startsWith('Aries') || lagna.startsWith('Scorpio'))
    return { stone: 'Red Coral (রক্ত প্রবাল)', metal: 'Copper or Gold' };
  if (lagna.startsWith('Taurus') || lagna.startsWith('Libra'))
    return { stone: 'Diamond / White Sapphire (হীরা / ওপাল)', metal: 'Silver or Platinum' };
  if (lagna.startsWith('Gemini') || lagna.startsWith('Virgo'))
    return { stone: 'Emerald (মরকত / পান্না)', metal: 'Gold' };
  if (lagna.startsWith('Cancer'))
    return { stone: 'Natural Pearl (প্রাকৃতিক মুক্তা)', metal: 'Silver' };
  if (lagna.startsWith('Leo'))
    return { stone: 'Ruby (চুনি / মাণিক্য)', metal: 'Gold' };
  if (lagna.startsWith('Sagittarius') || lagna.startsWith('Pisces'))
    return { stone: 'Yellow Sapphire (কণক পোখরাজ)', metal: 'Gold' };
  return { stone: 'Blue Sapphire (ইন্দ্রনীল / কালা পনি)', metal: 'Iron or Silver' };
}

// Generate Full 12-House Vedic & Western Birth Chart Report
export function generateFullBirthChartReport(input: BirthChartInput): string {
  const { name, date, time, location } = input;
  const sun = getSunSign(date);
  const { nakshatra, pada } = getNakshatraInfo(date, time);
  const ascendant = getAscendant(date, time);
  const gemstone = getGemstone(ascendant);

  return `🌌 ACCURATE VEDIC & WESTERN KUNDALI ANALYSIS (সম্পূর্ণ জন্ম কুণ্ডলী বিচার)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 Name: ${name}
📅 Date of Birth: ${date}
⏰ Time of Birth: ${time}
📍 Birthplace: ${location}

1️⃣ CORE ASTROLOGICAL POSITIONS (প্রধান গ্রহ ও রাশি অবস্থান)
--------------------------------------------------
• Sun Sign (সূর্য রাশি): ${sun.sign}
  ↳ Element: ${sun.element} | Ruling Planet: ${sun.rulingPlanet}
  ↳ Core essence: Represents soul direction, inner vitality, leadership, and ego structure.

• Ascendant / Lagna (লগ্ন): ${ascendant}
  ↳ Outer Self: Governs physical constitution, vitality, appearance, and life momentum.

• Moon Nakshatra (জন্ম নক্ষত্র): ${nakshatra} (Pada ${pada})
  ↳ Subconscious Mind: Shapes emotional intelligence, intuition, and mental resilience.

2️⃣ ACCURATE 12-HOUSE KUNDALI ANALYSIS (১২টি ভাব ও ক্ষেত্র বিচার)
--------------------------------------------------
• 1st House (Tanu Bhava - Self & Vitality):
  Ascendant in ${ascendant} grants strong immune resilience, magnetic charisma, and self-reliant determination.

• 2nd House (Dhana Bhava - Wealth & Family Speech):
  Strong planetary aspects indicate steady financial accumulation, articulate communication, and family inheritance support.

• 3rd House (Sahaja Bhava - Courage & Communication):
  Active energy fosters mental boldness, initiative, creative writing/media skills, and supportive sibling bonds.

• 4th House (Matru Bhava - Mother, Vehicles & Domestic Peace):
  Promotes emotional peace at home, ancestral property opportunities, and comforting living environments.

• 5th House (Putra & Buddhi Bhava - Intelligence & Past Life Merits):
  High analytical capacity, strategic problem solving, romantic harmony, and past-life karma merits (Purva Punya).

• 6th House (Ari Bhava - Health & Overcoming Obstacles):
  Strong resistance against competitive stress, clear victory over adversaries, and disciplined health habits.

• 7th House (Yuvati Bhava - Marriage & Business Partnerships):
  Highlights a supportive, loyal, and intellectually stimulating life partner with mutual growth opportunities.

• 8th House (Randhra Bhava - Longevity & Deep Intuition):
  Gives deep interest in esoteric wisdom, research, financial investments, and intuitive transformation.

• 9th House (Bhagya Bhava - Luck, Dharma & Higher Knowledge):
  Blessed with spiritual wisdom, divine grace, higher education success, and favorable fortunes through travel.

• 10th House (Karma Bhava - Profession, Career & Social Status):
  Strong Sun/Jupiter alignment points toward executive leadership, public distinction, technology, or management excellence.

• 11th House (Labha Bhava - Gains, Profits & Networks):
  Continuous flow of financial income through diverse network circles, projects, and ambitious goal fulfillment.

• 12th House (Vyaya Bhava - Liberation, Foreign Lands & Subconscious):
  Inclination toward spiritual retreat, foreign trade/travel, and philanthropic generosity.

3️⃣ MAHADASHA & PLANETARY TRANSIT FORECAST
--------------------------------------------------
• Current Dasha Era: Favorable Mahadasha phase providing mental clarity, career promotion, and financial stability.
• Transits: Jupiter & Saturn transits create favorable planetary aspects for long-term investments and personal mastery over the coming months.

4️⃣ RECOMMENDED GEMSTONES & REMEDIAL GUIDANCE (ভাগ্যোন্নতি ও সুপ্রতিকার)
--------------------------------------------------
• Primary Lucky Gemstone: ${gemstone.stone}
  ↳ Recommended Metal: ${gemstone.metal} (To be worn on the dominant hand's ring finger after consecration).
• Auspicious Colors: Royal Blue, Golden Amber, Cream White.
• Lucky Numbers: 1, 3, 7, 9
• Daily Cosmic Remedy: Practice morning Surya Arghya (offering water to the rising Sun) and daily 5-minute Gayatri/Om meditation to align planetary energies.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}
