import express from 'express';
import config from './config.js';
import pool from './db.js';
import { subscribeRoute } from './routes/subscribe.js';
import { webhookRoute } from './routes/webhook.js';
import webhookRouter from './routes/webhook.js';
import { unsubscribeRoute } from './routes/unsubscribe.js';
import { testDailyRoute } from './routes/test.js';
import { getSettingsRoute, updateSettingsRoute } from './routes/settings.js';
import adminRouter from './routes/admin.js';
import feedbackRouter from './routes/feedback.js';
import { setupDailyCron } from './cron/dailyHoroscope.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve landing page
const landingDir = path.resolve(__dirname, '../landing');
app.use(express.static(landingDir));
app.get('/', (req, res) => res.sendFile('index.html', { root: landingDir }));

// Serve Lithuanian page
app.use('/lt', express.static(path.resolve(__dirname, '../landing/lt')));
app.get('/lt', (req, res) => res.sendFile('index.html', { root: path.resolve(__dirname, '../landing/lt') }));

// API routes
app.post('/subscribe', subscribeRoute);
app.post('/webhook/email', webhookRoute);
app.use('/webhook', webhookRouter);
app.use('/admin', adminRouter);
app.use('/api/feedback', feedbackRouter);
app.get('/unsubscribe/:token', unsubscribeRoute);
app.post('/test/daily', testDailyRoute);
app.get('/api/settings/:token', getSettingsRoute);
app.put('/api/settings/:token', updateSettingsRoute);

// Settings page
app.get('/settings/:token', (req, res) => {
  res.sendFile('settings.html', { root: landingDir });
});

// Feedback page
app.get('/feedback/:token', (req, res) => {
  res.sendFile('feedback.html', { root: landingDir });
});

// Admin dashboard
app.get('/admin/dashboard', (req, res) => {
  if (req.query.token !== (process.env.ADMIN_TOKEN || 'gato-admin-2026')) {
    return res.status(401).send('Unauthorized');
  }
  res.sendFile('admin.html', { root: landingDir });
});

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
