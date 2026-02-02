import pg from 'pg';
import config from './src/config.js';
import { generateWelcomeReading } from './src/services/welcome.js';
import { sendRichWelcomeEmail } from './src/services/email.js';
import { birthProfile, NUMBER_MEANINGS } from './src/services/numerology.js';
import { getCurrentSky } from './src/services/astrology.js';

const pool = new pg.Pool({ connectionString: config.db });

async function main() {
  const style = process.argv[2] || 'practical';
  const { rows } = await pool.query("SELECT * FROM users WHERE email = 'tadasz@gmail.com'");
  const user = rows[0];
  const natalChart = typeof user.natal_chart === 'string' ? JSON.parse(user.natal_chart) : user.natal_chart;
  const currentSky = await getCurrentSky();
  const bd = new Date(user.birth_date);
  const numerology = birthProfile(user.name, bd.getFullYear(), bd.getMonth() + 1, bd.getDate());
  numerology.meanings = NUMBER_MEANINGS;

  const lang = process.argv[3] || 'lt';
  const styledUser = { ...user, quiz_style: style, language: lang };
  console.log(`Generating ${style}...`);
  const reading = await generateWelcomeReading(styledUser, natalChart, currentSky);
  console.log('Got reading, subject:', reading.subject);
  
  await sendRichWelcomeEmail(styledUser, {
    subject: `[${lang.toUpperCase()}-${style.toUpperCase()}] ${reading.subject}`,
    preheader: reading.preheader,
    reading: reading.reading,
    technical_section: reading.technical_section,
    numerology,
  });
  console.log('✅ Sent!');
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
