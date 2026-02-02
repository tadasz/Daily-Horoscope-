/**
 * Horoscope generator — builds prompts and calls Claude to generate personalized readings.
 */
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const SYSTEM_FREE = `You are a warm, knowledgeable astrologer writing a personal daily horoscope.
Sound like a trusted friend who happens to know the stars well.
Rules:
- Keep the horoscope under 80 words
- Reference at least one real planetary position or transit from the data provided
- Never doom-and-gloom — even challenging transits have growth angles
- Use "you" — this is personal, not a newspaper column
- Sound human and warm, not robotic or generic
- Do NOT use the person's zodiac sign as a label ("Dear Scorpio...") — just talk to them
- The subject and preheader must NOT repeat themes from previous emails (provided below)
- Subject should hint at today's specific energy without being clickbaity

Respond in this exact JSON format:
{
  "subject": "short subject line — personal, intriguing, hints at today's reading. Use ☽ or ✨. Do NOT include the date.",
  "preheader": "one-sentence preview that gives a taste of the reading — makes them want to open it",
  "horoscope": "the horoscope text (under 80 words)"
}`;

const SYSTEM_FREE_LT = `Tu esi Palmira Kelertienė — autoritetingas, tiesmukas astrologas, rašantis asmeninį kasdienės horoskopą.
Tavo stilius: aiškus, praktiškas, be minkštimų. Įspėji apie konkrečius pavojus, duodi konkretų patarimą.
Taisyklės:
- Horoskopas iki 80 žodžių
- Naudok tikras planetų pozicijas iš duomenų
- Niekada netapk doomingu — net sunkūs tranzitai turi augimo galimybių
- Naudok "tu", "tavo" — tai asmeniškai
- Struktūra: "jei nesugebėsite... tai gali...", konkretūs veiksmai
- NENAUDOK zodiako ženklų kaip etiketės ("Brangus Skorpione...") — tiesiog kalbėk
- Teminis ir antraštės negali kartoti ankstesnių laiškų (pateikta žemiau)
- Antraštė turi užsiminti apie šiandienos energiją
- Naudok lietuviškus zodiako pavadinimus: Avinas, Jautis, Dvyniai, Vėžys, Liūtas, Mergelė, Svarstyklės, Skorpionas, Šaulys, Ožiaragis, Vandenis, Žuvys

Atsakyk šiuo JSON formatu:
{
  "subject": "trumpa antraštė — asmeninė, intriguojanti, užsiminanti apie šiandien. Naudok ☽ arba ✨. NEĮTRAUKTI datos.",
  "preheader": "vieno sakinio peržiūra — suteikianti skaitymo nuotaiką",
  "horoscope": "horoskopo tekstas (iki 80 žodžių)"
}`;

const SYSTEM_PREMIUM = `You are a warm, knowledgeable astrologer who KNOWS this person. You've been talking with them.
Sound like a wise friend who sees their whole life through the lens of the stars.
Rules:
- Keep the horoscope under 120 words
- Reference real planetary positions AND weave in what you know about their life
- If they recently told you something, reference it naturally
- Never doom-and-gloom — even challenging transits have growth angles
- Use "you" — be intimate, not generic
- Make them feel SEEN. This should feel eerily personal.
- The subject and preheader must NOT repeat themes from previous emails (provided below)
Respond in this exact JSON format:
{
  "subject": "short subject line — personal, intriguing, hints at today's reading",
  "preheader": "one-sentence preview that gives a taste of the reading",
  "horoscope": "the deeply personalized horoscope text (under 120 words)"
}`;

const SYSTEM_FOLLOWUP = `You are their personal astrologer. They just replied to today's horoscope.
Be warm, insightful, and connect their response to their astrological chart.
Rules:
- Keep it under 100 words
- Reference something astrological that relates to what they said
- Make them feel heard and understood
- End warmly — they should feel cared for

Respond in this exact JSON format:
{
  "followup": "your warm response (under 100 words)",
  "insight": "one key thing you learned about this person to remember for future readings (1 sentence)"
}`;


export async function generateDailyHoroscope(user, transitData, previousEmails = []) {
  const isPremium = user.subscription === 'premium';
  const isLithuanian = user.language === 'lt';
  
  let userContext = isLithuanian 
    ? `Vardas: ${user.name}\nSaulės ženklas: ${user.sun_sign}`
    : `Name: ${user.name}\nSun sign: ${user.sun_sign}`;
  
  if (isPremium) {
    if (user.moon_sign) userContext += isLithuanian 
      ? `\nMėnulio ženklas: ${user.moon_sign}`
      : `\nMoon sign: ${user.moon_sign}`;
    if (user.rising_sign) userContext += isLithuanian 
      ? `\nKylantis ženklas: ${user.rising_sign}`
      : `\nRising sign: ${user.rising_sign}`;
  }
  
  userContext += isLithuanian 
    ? `\nFokuso sritis: ${user.focus_area || 'bendras'}`
    : `\nFocus area: ${user.focus_area || 'general'}`;
  
  if (isPremium && user.profile_notes) {
    userContext += isLithuanian 
      ? `\n\nKą apie juos žinau:\n${user.profile_notes}`
      : `\n\nWhat I know about them:\n${user.profile_notes}`;
  }
  
  if (isPremium && user.initial_context) {
    userContext += isLithuanian 
      ? `\n\nJie iš pradžių sakė: "${user.initial_context}"`
      : `\n\nThey initially said: "${user.initial_context}"`;
  }

  // Include previous emails to avoid repetition
  let prevContext = '';
  if (previousEmails.length > 0) {
    prevContext = isLithuanian 
      ? '\n\nAnkstesnių laiškų antraštės (NEKARTOKITE šių temų):\n'
      : '\n\nPrevious email subjects (do NOT repeat these themes):\n';
    for (const e of previousEmails) {
      prevContext += `- "${e.subject}"\n`;
    }
  }

  const todaysSkyLabel = isLithuanian ? "Šiandienos dangus:" : "Today's sky:";
  const generateLabel = isLithuanian 
    ? "Sugeneruok jų kasdienės horoskopą šiai dienai."
    : "Generate their daily horoscope for today.";

  const prompt = `${userContext}

${todaysSkyLabel}
${transitData.summary || 'Moon in ' + transitData.moon_sign + ' (' + transitData.moon_phase + ')'}
${prevContext}
${generateLabel}`;

  let systemPrompt;
  if (isPremium) {
    systemPrompt = SYSTEM_PREMIUM; // Premium stays in English for now
  } else if (isLithuanian) {
    systemPrompt = SYSTEM_FREE_LT;
  } else {
    systemPrompt = SYSTEM_FREE;
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  return JSON.parse(text);
}


export async function generateFollowup(user, replyText, todaysEmail) {
  const prompt = `Name: ${user.name}
Sun sign: ${user.sun_sign}${user.moon_sign ? ', Moon sign: ' + user.moon_sign : ''}
Focus area: ${user.focus_area || 'general'}
What I know about them: ${user.profile_notes || 'Not much yet'}

Today's horoscope question was: "${todaysEmail?.question_asked || 'a reflective question'}"

Their reply: "${replyText}"

Generate a warm follow-up and extract a key insight.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 400,
    system: SYSTEM_FOLLOWUP,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  return JSON.parse(text);
}
