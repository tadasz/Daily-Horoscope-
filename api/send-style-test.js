/**
 * Send 4 welcome emails with different styles to test
 */
import pg from 'pg';
import config from './src/config.js';
import { generateWelcomeReading } from './src/services/welcome.js';
import { sendRichWelcomeEmail } from './src/services/email.js';
import { birthProfile, NUMBER_MEANINGS } from './src/services/numerology.js';
import { getCurrentSky } from './src/services/astrology.js';

const pool = new pg.Pool({ connectionString: config.db });

const styles = ['mystic', 'practical', 'casual', 'direct'];
const styleNames = {
  mystic: '🌙 The Seer (Rob Brezsny)',
  practical: '🔬 The Strategist (Susan Miller)',
  casual: '💬 The Friend (Chani Nicholas)',
  direct: '🔥 The Commander (Jessica Lanyadoo)',
};

async function main() {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = 'tadasz@gmail.com'");
  const user = rows[0];
  if (!user) { console.error('User not found'); process.exit(1); }

  const natalChart = typeof user.natal_chart === 'string' ? JSON.parse(user.natal_chart) : user.natal_chart;
  const currentSky = await getCurrentSky();
  const bd = new Date(user.birth_date);
  const numerology = birthProfile(user.name, bd.getFullYear(), bd.getMonth() + 1, bd.getDate());
  numerology.meanings = NUMBER_MEANINGS;

  for (const style of styles) {
    console.log(`\n📨 Generating ${styleNames[style]}...`);
    const styledUser = { ...user, quiz_style: style, language: 'lt' };
    
    try {
      const reading = await generateWelcomeReading(styledUser, natalChart, currentSky);
      const subject = `[LT-${style.toUpperCase()}] ${reading.subject}`;
      
      await sendRichWelcomeEmail(styledUser, {
        subject,
        preheader: reading.preheader,
        reading: reading.reading,
        technical_section: reading.technical_section,
        numerology,
      });
      
      console.log(`✅ ${styleNames[style]} sent! Subject: ${subject}`);
    } catch (e) {
      console.error(`❌ ${style} failed:`, e.message);
    }
  }

  await pool.end();
  console.log('\n🎉 Done! Check tadasz@gmail.com');
}

main().catch(e => { console.error(e); process.exit(1); });
