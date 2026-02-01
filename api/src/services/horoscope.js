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
Respond in this exact JSON format:
{
  "subject": "email subject line (include a real astro reference and their first name, use ☽ or ✨ emoji)",
  "horoscope": "the horoscope text (under 80 words)"
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
Respond in this exact JSON format:
{
  "subject": "email subject line (include a real astro reference and their first name)",
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


export async function generateDailyHoroscope(user, transitData) {
  const isPremium = user.subscription === 'premium';
  
  let userContext = `Name: ${user.name}\nSun sign: ${user.sun_sign}`;
  
  if (isPremium) {
    if (user.moon_sign) userContext += `\nMoon sign: ${user.moon_sign}`;
    if (user.rising_sign) userContext += `\nRising sign: ${user.rising_sign}`;
  }
  
  userContext += `\nFocus area: ${user.focus_area || 'general'}`;
  
  if (isPremium && user.profile_notes) {
    userContext += `\n\nWhat I know about them:\n${user.profile_notes}`;
  }
  
  if (isPremium && user.initial_context) {
    userContext += `\n\nThey initially said: "${user.initial_context}"`;
  }

  const prompt = `${userContext}

Today's sky:
${transitData.summary || 'Moon in ' + transitData.moon_sign + ' (' + transitData.moon_phase + ')'}

Generate their daily horoscope for today.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    system: isPremium ? SYSTEM_PREMIUM : SYSTEM_FREE,
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
