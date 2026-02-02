import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// Simple auth — check for admin token in query string
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'gato-admin-2026';

function requireAdmin(req, res, next) {
  if (req.query.token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

// GET /admin/stats — main dashboard data
router.get('/stats', async (req, res) => {
  try {
    // Total subscribers by language
    const subscribers = await query(`
      SELECT language, COUNT(*) as count 
      FROM users WHERE subscribed = TRUE 
      GROUP BY language
    `);
    
    // Total unsubscribed
    const unsubscribed = await query(`SELECT COUNT(*) as count FROM users WHERE subscribed = FALSE`);
    
    // Total signups over time (last 30 days)
    const signupTrend = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count, language
      FROM users 
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), language
      ORDER BY date
    `);
    
    // Emails sent stats
    const emailsSent = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN sent_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN sent_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
      FROM emails_sent
    `);
    
    // Open/click rates from events
    const eventStats = await query(`
      SELECT event_type, COUNT(*) as count 
      FROM email_events 
      GROUP BY event_type
    `);
    
    // Open rate calculation: unique opens vs total emails sent (last 7 days)
    const openRate = await query(`
      SELECT 
        (SELECT COUNT(DISTINCT email_id) FROM email_events WHERE event_type IN ('opened', 'open') AND created_at > NOW() - INTERVAL '7 days') as opens,
        (SELECT COUNT(*) FROM emails_sent WHERE sent_at > NOW() - INTERVAL '7 days') as sent
    `);
    
    // Recent subscribers
    const recentUsers = await query(`
      SELECT name, email, language, sun_sign, focus_area, created_at, subscribed
      FROM users ORDER BY created_at DESC LIMIT 10
    `);
    
    // Recent events
    const recentEvents = await query(`
      SELECT ee.event_type, ee.created_at, u.email, u.name
      FROM email_events ee
      LEFT JOIN users u ON u.id = ee.user_id
      ORDER BY ee.created_at DESC LIMIT 20
    `);
    
    // Feedback
    const recentFeedback = await query(`
      SELECT f.rating, f.message, f.created_at, u.name, u.email, u.language
      FROM feedback f
      JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC LIMIT 20
    `);
    
    const avgRating = await query(`SELECT AVG(rating)::numeric(3,1) as avg, COUNT(*) as count FROM feedback WHERE rating IS NOT NULL`);

    res.json({
      subscribers: subscribers.rows,
      unsubscribed: parseInt(unsubscribed.rows[0].count),
      signupTrend: signupTrend.rows,
      emailsSent: emailsSent.rows[0],
      eventStats: eventStats.rows,
      openRate: openRate.rows[0],
      recentUsers: recentUsers.rows,
      recentEvents: recentEvents.rows,
      recentFeedback: recentFeedback.rows,
      feedbackStats: avgRating.rows[0],
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;