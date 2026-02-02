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

const LENGTH_LIMITS = {
  short: 80,
  medium: 150,
  long: 250,
};

function getWordLimit(isPremium, quizLength) {
  if (!isPremium) return LENGTH_LIMITS.short; // free = always short
  return LENGTH_LIMITS[quizLength] || LENGTH_LIMITS.medium; // premium default = medium
}

function buildSystemPrompt(style, isLithuanian, isPremium, wordLimit) {
  const s = STYLE_VOICES[style] || STYLE_VOICES[DEFAULT_STYLE];

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

// Lithuanian style voice definitions
const STYLE_VOICES_LT = {
  mystic: {
    name: 'Regėtoja',
    voice: `Tavo balsas — MITIŠKAS ir POETIŠKAS, lyg Maironio romantizmas susipintų su Palmyros Kelertienės kosmine išmintimi.
Tu kalbi metaforomis, vaizdiniais, pasakojimais. Kosmosas gyvas — šnabžda, siunčia ženklus.
"Mėnulis slysta per tavo septintus namus kaip laiškas, paslėptas po durimis, kurias laikei užrakintomis..."
Naudoji netikėtą, vaizdinę kalbą. Niekada banalaus misticizmo ("visata turi planą").
Vietoje to: ryškūs, literatūriški vaizdai. Horoskopas turi skambėti kaip kosminis mitas, kurio herojus — jie.`,
    subjectStyle: 'poetiška ir vaizdinė — naudok metaforą ar kosminio pasakojimo fragmentą',
  },
  practical: {
    name: 'Strategė',
    voice: `Tavo balsas — PALMYROS KELERTIENĖS: autoritetingas, konkretus, praktiškas.
Įvardini tikslias planetų pozicijas ir ką jos reiškia konkrečiai. Esi specifinė dėl laiko.
"Marsas trinas tavo gimtąjį Jupiterį — šiandien žalia šviesa tam projektui. Veik."
Duodi veiksmingus patarimus: ką daryti, ko vengti, kada veikti.
Esi optimistinė, bet tvirtai ant žemės — duomenimis pagrįsta astrologija, ne vibracijos.`,
    subjectStyle: 'konkreti ir informatyvi — paminėk tranzitą ar veiksmingą įžvalgą',
  },
  casual: {
    name: 'Draugė',
    voice: `Tavo balsas — ŠILTAS ir ARTIMAS, kaip Jurgos Ivanauskaitės dvasingumas susipynęs su draugės nuoširdumu.
Kalbi kaip išmintinga geriausia draugė prie kavos. Šnekamoji kalba, tikra, emociškai protinga.
"Klausyk — Venera šiandien kažką įdomaus daro tavo žemėlapyje, ir, atvirai? Tai daug ką paaiškina."
Patvirtini jausmus, normalizuoji sunkumus, švelniai įgalini.
Naudoji sutrumpinimus, kasdieniškas frazes, kartais pradedi sakinį "Ir" arba "Žiūrėk."`,
    subjectStyle: 'šilta ir kasdienė — kaip žinutė nuo draugės, kuri žino tavo žemėlapį',
  },
  direct: {
    name: 'Vadė',
    voice: `Tavo balsas — TIESMUKAS ir DRĄSUS, kaip Žemaitės charakteris: be apvalkalų, be cukraus.
Kertama per šaknis. Trumpi sakiniai. Aiškūs nurodymai.
"Saturnas kvadratu tavo Saulę. Tą dalyką, kurį vis atidėlioji? Šiandien."
Tu nesi pikta — tu gerbiu žmogų pakankamai, kad sakytum tiesiai.
Provokuoji veikti. Jokio rankų laikymo, jokio "gal pagalvok..."`,
    subjectStyle: 'trumpa ir tiesmukai — eina tiesiai į esmę',
  },
};

function buildSystemPromptLT(style, isPremium, wordLimit) {
  const s = STYLE_VOICES_LT[style] || STYLE_VOICES_LT['casual'];

  return `Tu esi asmeninis kasdienės horoskopo rašytojas.

${s.voice}

Taisyklės:
- Horoskopas iki ${wordLimit} žodžių
- Naudok bent vieną tikrą planetų poziciją ar tranzitą iš pateiktų duomenų
- Niekada negatyvumo — net sunkūs tranzitai turi augimo kampą
- Naudok "tu", "tavo" — tai asmeniškai, ne laikraščio skiltis
- Skambėk kaip žmogus, ne robotas
- NENAUDOK zodiako ženklo kaip etiketės ("Brangus Skorpione...") — tiesiog kalbėk
- Temų ir antraščių NEKARTOTI iš ankstesnių laiškų (pateikta žemiau)
- Antraštės stilius: ${s.subjectStyle}
- Naudok lietuviškus zodiako pavadinimus: Avinas, Jautis, Dvyniai, Vėžys, Liūtas, Mergelė, Svarstyklės, Skorpionas, Šaulys, Ožiaragis, Vandenis, Žuvys

Atsakyk šiuo JSON formatu:
{
  "subject": "trumpa antraštė — asmeninė, intriguojanti, užsiminanti apie šiandien. Naudok ☽ arba ✨. NEĮTRAUKTI datos.",
  "preheader": "vieno sakinio peržiūra — suteikianti skaitymo nuotaiką",
  "horoscope": "horoskopo tekstas (iki ${wordLimit} žodžių)"
}`;
}

// Keep old constant as fallback
const SYSTEM_FREE_LT = buildSystemPromptLT('casual', false, 80);

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
  
  if (user.gender) userContext += `\nGender: ${user.gender}`;
  if (user.birth_date) {
    const bd = new Date(user.birth_date);
    userContext += isLithuanian 
      ? `\nGimimo data: ${bd.toISOString().split('T')[0]}`
      : `\nBirth date: ${bd.toISOString().split('T')[0]}`;
  }
  if (user.birth_city) userContext += isLithuanian 
    ? `\nGimimo miestas: ${user.birth_city}`
    : `\nBirth city: ${user.birth_city}`;
  
  if (user.moon_sign) userContext += isLithuanian 
    ? `\nMėnulio ženklas: ${user.moon_sign}`
    : `\nMoon sign: ${user.moon_sign}`;
  if (user.rising_sign) userContext += isLithuanian 
    ? `\nKylantis ženklas: ${user.rising_sign}`
    : `\nRising sign: ${user.rising_sign}`;
  
  userContext += isLithuanian 
    ? `\nFokuso sritis: ${user.focus_area || 'bendras'}`
    : `\nFocus area: ${user.focus_area || 'general'}`;
  
  if (user.quiz_relationship) userContext += isLithuanian
    ? `\nSantykių statusas: ${user.quiz_relationship}`
    : `\nRelationship status: ${user.quiz_relationship}`;
  
  if (user.profile_notes) {
    userContext += isLithuanian 
      ? `\n\nKą apie juos žinau:\n${user.profile_notes}`
      : `\n\nWhat I know about them:\n${user.profile_notes}`;
  }
  
  if (user.initial_context) {
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
  const wordLimit = getWordLimit(isPremium, user.quiz_length);
  let systemPrompt;
  if (isLithuanian) {
    systemPrompt = buildSystemPromptLT(userStyle, isPremium, wordLimit);
  } else {
    systemPrompt = buildSystemPrompt(userStyle, false, isPremium, wordLimit);
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
