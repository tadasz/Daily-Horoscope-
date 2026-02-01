/**
 * Welcome email generator — "Your Cosmic Blueprint"
 * Generates a rich, personalized birth chart reading on signup.
 * Style: Chani Nicholas warmth + Susan Miller depth + raw astro data
 */
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const SYSTEM_WELCOME = `You are a gifted astrologer writing someone's birth chart reading for the first time.

Your voice blends:
- Chani Nicholas's radical warmth and empowerment ("You were born for this")
- Susan Miller's detailed astronomical knowledge
- The intimacy of a wise friend reading your chart over wine

STRUCTURE (follow exactly):

## ✨ Your Cosmic Blueprint

[Opening — 2 sentences. Address them by name. Express genuine fascination about their chart. Make them feel seen immediately.]

### The Big Three — Who You Are

☀️ **Sun in [Sign]** — [Their core identity, life force, what drives them. 2-3 sentences that feel eerily personal.]

🌙 **Moon in [Sign]** — [Their emotional world, what they need to feel safe, their inner landscape. 2-3 sentences.]

⬆️ **Rising in [Sign]** — [How the world sees them, the energy they walk into a room with. 2-3 sentences.]

### Your Cosmic Gifts

[Pick 2-3 of the strongest/most interesting aspects or placements from their chart. Frame as superpowers/talents. Each one 2 sentences. Use real astrological language but keep it accessible.]

### Your Growth Edge

[ONE challenging aspect from their chart, framed entirely as growth potential. Never negative. 2-3 sentences. This should feel like permission to be imperfect.]

### What This Means for Your [Focus Area]

[Connect their chart specifically to whatever focus area they chose — love, career, health, growth, or money. 3-4 sentences. Be specific to their placements.]

### Your Number

🔢 [ONE sentence about their numerological essence. Calculate their Life Path number from their birth date (add all digits until single digit or master number 11/22/33). Mention the number and what it means for them personally — tie it to their chart. Keep it mystical and brief.]

### What's Coming

[Brief tease of what current transits mean for them specifically. Reference one real current transit hitting their chart. 2 sentences. End with anticipation for tomorrow's reading.]

---

RULES:
- ~350 words total for the reading portion
- Sound like a human who is genuinely moved by what they see in this chart
- Use "you" constantly — this is intimate
- Every astrological claim must reference a REAL placement from their data
- Never generic. Never "as a typical Gemini..." — speak to THIS person's unique chart
- Challenging placements = growth edges, never curses
- End with warmth that makes them want to open tomorrow's email

OUTPUT FORMAT — respond in this exact JSON:
{
  "subject": "email subject line (personal, include their name, use ☽ or ✨)",
  "reading": "the full reading in markdown (use the headers above)",
  "technical_section": "the raw technical data section (see below)"
}

For the technical_section, create a clean, minimal display of their chart data. NO explanations — just the raw positions. Like a chart printout an astrologer would have on their desk:

☀️ Sun · [Sign] · [degree]° · [House]
🌙 Moon · [Sign] · [degree]° · [House]
⬆️ Asc · [Sign] · [degree]°
☿ Mercury · [Sign] · [degree]° · [House] [℞ if retrograde]
♀ Venus · [Sign] · [degree]° · [House] [℞ if retrograde]
♂ Mars · [Sign] · [degree]° · [House]
♃ Jupiter · [Sign] · [degree]° · [House] [℞ if retrograde]
♄ Saturn · [Sign] · [degree]° · [House]
♅ Uranus · [Sign] · [degree]° · [House]
♆ Neptune · [Sign] · [degree]° · [House]
♇ Pluto · [Sign] · [degree]° · [House]

🌕 Moon Phase at Birth: [phase]

Key Aspects:
[List 5-6 most significant natal aspects, e.g. "Venus ☌ Mars (3.2°)" or "Moon □ Saturn (1.5°)"]`;


export async function generateWelcomeReading(user, natalChart, currentSky) {
  // Build the planet summary for the prompt
  const planets = natalChart.planets || [];
  const houses = natalChart.houses || [];
  const aspects = natalChart.natal_aspects || [];

  let chartData = `Name: ${user.name}\n`;
  chartData += `Sun: ${natalChart.sun_sign}, Moon: ${natalChart.moon_sign}, Rising: ${natalChart.rising_sign}\n`;
  chartData += `Moon phase at birth: ${natalChart.moon_phase_at_birth}\n`;
  chartData += `Focus area: ${user.focus_area || 'general growth'}\n`;

  if (user.initial_context) {
    chartData += `What's on their mind: "${user.initial_context}"\n`;
  }

  chartData += `\nPlanetary Positions:\n`;
  for (const p of planets) {
    const retro = p.retrograde ? ' ℞' : '';
    chartData += `  ${p.name} in ${p.sign} at ${p.position?.toFixed(1)}° (${p.house})${retro}\n`;
  }

  if (houses.length > 0) {
    chartData += `\nHouse Cusps:\n`;
    for (const h of houses) {
      chartData += `  House ${h.house}: ${h.sign} ${h.position?.toFixed(1)}°\n`;
    }
  }

  chartData += `\nRetrogrades at birth: ${natalChart.retrogrades_at_birth?.join(', ') || 'None'}\n`;

  if (aspects.length > 0) {
    chartData += `\nKey Natal Aspects (sorted by orb):\n`;
    const topAspects = aspects
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 15);
    for (const a of topAspects) {
      chartData += `  ${a.planet1} in ${a.sign1} ${a.aspect} ${a.planet2} in ${a.sign2} (orb ${a.orb}°)\n`;
    }
  }

  if (currentSky) {
    chartData += `\nCurrent Sky (for "What's Coming" section):\n`;
    chartData += `  Moon: ${currentSky.moon_sign} (${currentSky.moon_phase})\n`;
    chartData += `  Sun: ${currentSky.sun_sign}\n`;
    if (currentSky.retrogrades?.length) {
      chartData += `  Current retrogrades: ${currentSky.retrogrades.join(', ')}\n`;
    }
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 2000,
    system: SYSTEM_WELCOME,
    messages: [{ role: 'user', content: chartData }],
  });

  let text = response.content[0].text;
  
  // Extract JSON - handle markdown code blocks and control characters
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in LLM response');
  
  // Fix control characters in JSON string values (newlines in markdown)
  let jsonStr = jsonMatch[0]
    .replace(/[\r\n]+\s*/g, '\\n')  // replace actual newlines with \n
    .replace(/\t/g, '  ');           // replace tabs
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Last resort: try to extract fields manually
    console.error('JSON parse failed, attempting manual extraction');
    const subjectMatch = text.match(/"subject"\s*:\s*"([^"]+)"/);
    const readingMatch = text.match(/"reading"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"technical|"\s*})/);
    const techMatch = text.match(/"technical_section"\s*:\s*"([\s\S]*?)"\s*}/);
    
    return {
      subject: subjectMatch?.[1] || `☽ ${chartData.split('\n')[0].replace('Name: ', '')}, your cosmic blueprint`,
      reading: (readingMatch?.[1] || text).replace(/\\n/g, '\n'),
      technical_section: (techMatch?.[1] || '').replace(/\\n/g, '\n'),
    };
  }
}
