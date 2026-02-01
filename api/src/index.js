import express from 'express';
import config from './config.js';
import pool from './db.js';
import { subscribeRoute } from './routes/subscribe.js';
import { webhookRoute } from './routes/webhook.js';
import { unsubscribeRoute } from './routes/unsubscribe.js';
import { testDailyRoute } from './routes/test.js';
import { setupDailyCron } from './cron/dailyHoroscope.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve landing page
app.use(express.static(path.join(__dirname, '../../landing')));

// API routes
app.post('/subscribe', subscribeRoute);
app.post('/webhook/email', webhookRoute);
app.get('/unsubscribe/:token', unsubscribeRoute);
app.post('/test/daily', testDailyRoute);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', time: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Start
app.listen(config.port, () => {
  console.log(`🔮 Horoscope API running on port ${config.port}`);
  setupDailyCron();
});
