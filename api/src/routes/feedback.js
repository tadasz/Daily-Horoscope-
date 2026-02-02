import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// POST /api/feedback/:token — submit feedback
router.post('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { rating, message } = req.body;

    const userResult = await query('SELECT id, name, email FROM users WHERE unsub_token = $1', [token]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    await query(
      'INSERT INTO feedback (user_id, rating, message) VALUES ($1, $2, $3)',
      [user.id, rating || null, message || null]
    );

    console.log(`💬 Feedback from ${user.name} (${user.email}): ${rating}⭐ — ${message || '(no message)'}`);

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
