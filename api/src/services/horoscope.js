/**
 * Horoscope generator — builds prompts and calls Claude to generate personalized readings.
 */
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

// Style voice definitions — each maps to a famous astrologer's tone
const STYLE_VOICES = {
  mystic: {
    name: 'The Seer',
    inspiration: 'Rob Brezsny',
    voice: `Your voice is MYTHIC and POETIC, inspired by Rob Brezsny's "Free Will Astrology."
You speak in metaphors, imagery, and story. The cosmos is alive, whispering, conspiring.
You paint scenes — "the Moon slips behind your seventh house like a letter under a door."
You use unexpected, evocative language. Never cliché mysticism ("the universe has a plan").
Instead: vivid, literary, slightly surreal. You make astrology feel like magic realism.
Tone: enchanting, imaginative, a little mysterious — like a poet who reads birth charts.`,
    subjectStyle: 'poetic and evocative — use imagery, metaphor, or a fragment of a cosmic story',
  },
  practical: {
    name: 'The Strategist',
    inspiration: 'Susan Miller',
    voice: `Your voice is DETAILED and STRATEGIC, inspired by Susan Miller's thorough, analytical style.
You name exact planetary positions and what they mean concretely. You're specific about timing.
"Mars trines your natal Jupiter at 14° — this is your green light for that project."
You give actionable advice: what to do, when to do it, what to avoid.
You're optimistic but grounded — data-driven astrology, not vibes.
Tone: knowledgeable, reassuring, precise — like a trusted financial advisor who reads charts.`,
    subjectStyle: 'specific and informative — mention a transit or actionable insight',
  },
  casual: {
    name: 'The Friend',
    inspiration: 'Chani Nicholas',
    voice: `Your voice is WARM and INTIMATE, inspired by Chani Nicholas's empowering, heart-centered style.
You talk like a wise best friend having coffee. Conversational, real, emotionally intelligent.
"Hey — Venus is doing something interesting in your chart today, and honestly? It explains a lot."
You validate feelings, normalize struggles, and gently empower.
You use contractions, casual phrasing, sometimes start sentences with "And" or "Look."
Tone: warm, validating, gently empowering — like a friend who truly sees you.`,
    subjectStyle: 'warm and conversational — like a text from a friend who knows your chart',
  },
  direct: {
    name: 'The Commander',
    inspiration: 'Jessica Lanyadoo',
    voice: `Your voice is BLUNT and BOLD, inspired by Jessica Lanyadoo's no-nonsense, tell-it-like-it-is style.
You cut through the fluff. Short sentences. Clear directives.
"Saturn square your Sun. That thing you've been avoiding? Today's the day."
You're not mean — you're honest. You respect people enough to be straight with them.
You challenge them to act. No hand-holding, no "maybe consider..."
Tone: direct, empowering, bold — like a coach who also reads birth charts.`,
    subjectStyle: 'punchy and direct — short, bold, gets right to the point',
  },
};

const DEFAULT_STYLE = 'casual';

function buildSystemPrompt(style, isLithuanian, isPremium) {
  const s = STYLE_VOICES[style] || STYLE_VOICES[DEFAULT_STYLE];
  const wordLimit = isPremium ? 120 : 80;

  if (isLithuanian) {
    // Lithuanian uses its own prompt (kept as-is for now)
    return isPremium ? SYSTEM_PREMIUM : SYSTEM_FREE_LT;
  }

  if (isPremium) {
    return `You are a personal astrologer who KNOWS this person. You've been talking with them.

${s.voice}

Rules:
- Keep the horoscope under ${wordLimit} words
- Reference real planetary positions AND weave in what you know about their life
- If they recently told you something, reference it naturally
- Never doom-and-gloom — even challenging transits have growth angles
- Use "you" — be intimate, not generic
- Make them feel SEEN. This should feel eerily personal.
- The subject and preheader must NOT repeat themes from previous emails (provided below)
- Subject style: ${s.subjectStyle}

Respond in this exact JSON format:
{
  "subject": "short subject line — personal, intriguing, hints at today's reading",
  "preheader": "one-sentence preview that gives a taste of the reading",
  "horoscope": "the deeply personalized horoscope text (under ${wordLimit} words)"
}`;
  }

  return `You are a personal daily horoscope writer.

${s.voice}

Rules:
- Keep the horoscope under ${wordLimit} words
- Reference at least one real planetary position or transit from the data provided
- Never doom-and-gloom — even challenging transits have growth angles
- Use "you" — this is personal, not a newspaper column
- Sound human, not robotic or generic
- Do NOT use the person's zodiac sign as a label ("Dear Scorpio...") — just talk to them
- The subject and preheader must NOT repeat themes from previous emails (provided below)
- Subject style: ${s.subjectStyle}

Respond in this exact JSON format:
{
  "subject": "short subject line — personal, intriguing, hints at today's reading. Use ☽ or ✨. Do NOT include the date.",
  "preheader": "one-sentence preview that gives a taste of the reading — makes them want to open it",
  "horoscope": "the horoscope text (under ${wordLimit} words)"
}`;
}

// Keep the old constant for backward compatibility — used when no style is set
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

const GRAMMAR_REVIEW_LT = `Esi profesionalus lietuvių kalbos redaktorius, lietuvių kalbos ekspertas. Tavo užduotis — patikrinti ir pataisyti lietuvišką tekstą.

Taisyk:
- Gramatikos klaidas (linksniai, galūnės, prielinksniai)
- Nenatūralias frazes (pakeisk natūralesnėmis lietuviškomis)
- Vertimo kalbą (kai sakinys skamba kaip versta iš anglų kalbos)
- Skyrybos klaidas

NEKIESK turinio, stiliaus ar tono. Taisyk tik klaidas.
Jei tekstas geras — grąžink nepakeistą.

Atsakyk JSON: {"subject": "pataisyta antraštė", "preheader": "pataisytas preheader", "horoscope": "pataisytas tekstas"}`;

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

  const userStyle = user.quiz_style || DEFAULT_STYLE;
  let systemPrompt;
  if (isLithuanian) {
    // Lithuanian: use dedicated LT prompt (style support coming later)
    systemPrompt = isPremium ? SYSTEM_PREMIUM : SYSTEM_FREE_LT;
  } else {
    // English: use style-aware prompt builder
    systemPrompt = buildSystemPrompt(userStyle, false, isPremium);
  }

  // Opus 4.5 for Lithuanian (best quality), Haiku for English (fast + cheap)
  const model = isLithuanian ? 'claude-opus-4-5-20251101' : 'claude-3-haiku-20240307';

  const response = await anthropic.messages.create({
    model,
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  let text = response.content[0].text;
  text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  let result = JSON.parse(text);

  // Lithuanian grammar review pass with Sonnet 4.5
  if (isLithuanian) {
    try {
      const reviewInput = `Antraštė: ${result.subject}\nPreheader: ${result.preheader}\nTekstas: ${result.horoscope}`;
      const reviewResp = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        system: GRAMMAR_REVIEW_LT,
        messages: [{ role: 'user', content: reviewInput }],
      });
      let reviewText = reviewResp.content[0].text;
      reviewText = reviewText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const reviewed = JSON.parse(reviewText);
      if (reviewed.horoscope) result.horoscope = reviewed.horoscope;
      if (reviewed.subject) result.subject = reviewed.subject;
      if (reviewed.preheader) result.preheader = reviewed.preheader;
    } catch (e) {
      console.warn('⚠️ Lithuanian grammar review failed, using original:', e.message);
    }
  }

  return result;
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
    model: user.language === 'lt' ? 'claude-sonnet-4-20250514' : 'claude-3-haiku-20240307',
    max_tokens: 400,
    system: SYSTEM_FOLLOWUP,
    messages: [{ role: 'user', content: prompt }],
  });

  let text2 = response.content[0].text;
  text2 = text2.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(text2);
}
