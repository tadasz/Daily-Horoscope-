import { runDailyHoroscopes } from '../cron/dailyHoroscope.js';

export async function testDailyRoute(req, res) {
  try {
    // Only send to specific email in test mode (don't spam real users)
    const testEmail = req.query.email || 'tadasz@gmail.com';
    console.log(`🧪 Manual trigger: daily horoscope for ${testEmail}`);
    await runDailyHoroscopes(testEmail);
    res.json({ status: 'ok', message: `Daily horoscope sent to ${testEmail}. Check logs.` });
  } catch (err) {
    console.error('Test route error:', err);
    res.status(500).json({ error: err.message });
  }
}
