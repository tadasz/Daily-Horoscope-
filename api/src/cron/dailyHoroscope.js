import cron from 'node-cron';
import { query } from '../db.js';
import { getDailyTransits, getCurrentSky } from '../services/astrology.js';
import { generateDailyHoroscope } from '../services/horoscope.js';
import { sendHoroscopeEmail } from '../services/email.js';
import config from '../config.js';

export function setupDailyCron() {
  const hour = config.cronHourUtc;
  const cronExpr = `0 ${hour} * * *`; // Every day at configured hour UTC
  
  console.log(`⏰ Daily horoscope cron scheduled: ${cronExpr} UTC`);
  
  cron.schedule(cronExpr, () => {
    console.log(`🌅 Running daily horoscope generation...`);
    runDailyHoroscopes().catch(err => {
      console.error('Daily cron failed:', err);
    });
  });
}


export async function runDailyHoroscopes() {
  const startTime = Date.now();
  
  // Get all subscribed users
  const users = await query('SELECT * FROM users WHERE subscribed = TRUE');
  console.log(`Found ${users.rows.length} subscribed users`);

  // Get current sky (same for everyone)
  let currentSky;
  try {
    currentSky = await getCurrentSky();
  } catch (err) {
    console.error('Failed to get current sky:', err.message);
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const user of users.rows) {
    try {
      // Get personalized transits if natal chart exists
      let transitData;
      if (user.natal_chart) {
        transitData = await getDailyTransits(user.natal_chart);
      } else {
        // Fallback: just use current sky data
        transitData = {
          moon_sign: currentSky.moon_sign,
          moon_phase: currentSky.moon_phase,
          summary: `Moon in ${currentSky.moon_sign} (${currentSky.moon_phase})\nSun in ${currentSky.sun_sign}`,
        };
      }

      // Generate horoscope via LLM
      const horoscope = await generateDailyHoroscope(user, transitData);

      // Send email
      const emailResult = await sendHoroscopeEmail(user, horoscope);

      // Log sent email
      await query(`
        INSERT INTO emails_sent (user_id, email_type, subject, body_text, question_asked, transit_summary, sweego_id)
        VALUES ($1, 'daily', $2, $3, $4, $5, $6)
      `, [
        user.id,
        horoscope.subject,
        horoscope.horoscope,
        horoscope.question,
        transitData.summary || '',
        emailResult?.id || null,
      ]);

      sent++;
      console.log(`  ✅ Sent to ${user.email} (${user.sun_sign})`);
      
      // Small delay between users to be nice to APIs
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      failed++;
      console.error(`  ❌ Failed for ${user.email}: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🌅 Daily horoscope complete: ${sent} sent, ${failed} failed (${elapsed}s)`);
}
