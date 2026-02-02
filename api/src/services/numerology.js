/**
 * Numerology calculator — all numbers derived from real numerology methods.
 * No LLM guessing. Pure math.
 */

// Reduce to single digit (or master number 11, 22, 33)
function reduce(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((sum, d) => sum + parseInt(d), 0);
  }
  return n;
}

// Sum all digits of a string/number
function digitSum(str) {
  return String(str).split('').filter(c => /\d/.test(c)).reduce((sum, d) => sum + parseInt(d), 0);
}

// Letter → number mapping (Pythagorean system)
const LETTER_MAP = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function nameToNumbers(name) {
  const letters = name.toLowerCase().replace(/[^a-z]/g, '');
  let allSum = 0, vowelSum = 0, consonantSum = 0;

  for (const ch of letters) {
    const val = LETTER_MAP[ch] || 0;
    allSum += val;
    if (VOWELS.has(ch)) vowelSum += val;
    else consonantSum += val;
  }

  return {
    expression: reduce(allSum),       // Destiny/Expression number
    soulUrge: reduce(vowelSum),       // Heart's Desire / Soul Urge
    personality: reduce(consonantSum), // Personality number
  };
}

/**
 * Life Path Number — the most important number in numerology.
 * Calculated from full birth date.
 */
export function lifePathNumber(year, month, day) {
  // Proper method: reduce each component separately, then sum
  const y = reduce(digitSum(year));
  const m = reduce(digitSum(month));
  const d = reduce(digitSum(day));
  return reduce(y + m + d);
}

/**
 * Birthday Number — natural talents, from just the day.
 */
export function birthdayNumber(day) {
  return reduce(day);
}

/**
 * Personal Year Number — the theme of the current year.
 * Birth month + birth day + current year.
 */
export function personalYear(birthMonth, birthDay, currentYear) {
  const m = reduce(digitSum(birthMonth));
  const d = reduce(digitSum(birthDay));
  const y = reduce(digitSum(currentYear));
  return reduce(m + d + y);
}

/**
 * Personal Month Number — monthly energy.
 * Personal Year + current calendar month.
 */
export function personalMonth(birthMonth, birthDay, currentYear, currentMonth) {
  const py = personalYear(birthMonth, birthDay, currentYear);
  const cm = reduce(digitSum(currentMonth));
  return reduce(py + cm);
}

/**
 * Personal Day Number — today's personal energy.
 * Personal Month + current calendar day.
 */
export function personalDay(birthMonth, birthDay, currentYear, currentMonth, currentDay) {
  const pm = personalMonth(birthMonth, birthDay, currentYear, currentMonth);
  const cd = reduce(digitSum(currentDay));
  return reduce(pm + cd);
}

/**
 * Universal Day Number — collective energy for everyone.
 * Just today's full date reduced.
 */
export function universalDay(year, month, day) {
  return reduce(digitSum(year) + digitSum(month) + digitSum(day));
}

/**
 * All fixed numbers from birth data + name.
 * Used in welcome email.
 */
export function birthProfile(name, year, month, day) {
  const nameNums = nameToNumbers(name);
  return {
    lifePath: lifePathNumber(year, month, day),
    birthday: birthdayNumber(day),
    expression: nameNums.expression,
    soulUrge: nameNums.soulUrge,
    personality: nameNums.personality,
  };
}

/**
 * Daily numbers for a specific person on a specific date.
 * Used in daily email.
 */
export function dailyNumbers(birthMonth, birthDay, todayYear, todayMonth, todayDay) {
  return {
    personalDay: personalDay(birthMonth, birthDay, todayYear, todayMonth, todayDay),
    universalDay: universalDay(todayYear, todayMonth, todayDay),
    personalMonth: personalMonth(birthMonth, birthDay, todayYear, todayMonth),
    personalYear: personalYear(birthMonth, birthDay, todayYear),
  };
}

// Short meaning labels for numbers 1-9 + master numbers
export const NUMBER_MEANINGS = {
  1: 'New beginnings, initiative',
  2: 'Partnership, balance',
  3: 'Creativity, expression',
  4: 'Structure, discipline',
  5: 'Change, freedom',
  6: 'Harmony, responsibility',
  7: 'Reflection, inner wisdom',
  8: 'Power, abundance',
  9: 'Completion, compassion',
  11: 'Intuition, spiritual insight',
  22: 'Master Builder, big vision',
  33: 'Master Teacher, healing',
};

export const NUMBER_MEANINGS_LT = {
  1: 'Nauja pradžia, iniciatyva',
  2: 'Partnerystė, pusiausvyra',
  3: 'Kūrybiškumas, išraiška',
  4: 'Struktūra, disciplina',
  5: 'Pokyčiai, laisvė',
  6: 'Harmonija, atsakomybė',
  7: 'Apmąstymai, vidinė išmintis',
  8: 'Galia, gausa',
  9: 'Užbaigimas, atjauta',
  11: 'Intuicija, dvasinis įžvalgumas',
  22: 'Didysis Statytojas, didelė vizija',
  33: 'Didysis Mokytojas, gydymas',
};
