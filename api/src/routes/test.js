import { runDailyHoroscopes } from '../cron/dailyHoroscope.js';

export async function testDailyRoute(req, res) {
  try {
    console.log('🧪 Manual trigger: daily horoscope generation');
    await runDailyHoroscopes();
    res.json({ status: 'ok', message: 'Daily horoscopes generated. Check logs.' });
  } catch (err) {
    console.error('Test route error:', err);
    res.status(500).json({ error: err.message });
  }
}
