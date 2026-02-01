import { query } from '../db.js';
import { generateFollowup } from '../services/horoscope.js';
import { sendFollowupEmail, sendPaywallReply } from '../services/email.js';

export async function webhookRoute(req, res) {
  try {
    // Sweego inbound webhook delivers parsed email data
    const { from, text, subject } = req.body;
    const senderEmail = from?.email || from;

    if (!senderEmail || !text) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    console.log(`📩 Reply from: ${senderEmail}`);

    // Find user
    const userResult = await query('SELECT * FROM users WHERE email = $1 AND subscribed = TRUE', [senderEmail]);
    if (userResult.rows.length === 0) {
      console.log(`Unknown sender: ${senderEmail}`);
      return res.json({ status: 'ignored', reason: 'unknown sender' });
    }

    const user = userResult.rows[0];

    // Free users get the paywall reply
    if (user.subscription !== 'premium') {
      console.log(`Free user reply — sending paywall: ${user.email}`);
      await sendPaywallReply(user);
      return res.json({ status: 'paywall_sent' });
    }

    // Premium users: process the reply
    // Find the most recent email we sent them
    const lastEmail = await query(
      'SELECT * FROM emails_sent WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 1',
      [user.id]
    );

    // Generate AI follow-up
    const { followup, insight } = await generateFollowup(
      user,
      text,
      lastEmail.rows[0] || null
    );

    // Store the reply
    await query(`
      INSERT INTO replies (user_id, email_id, reply_text, ai_followup, key_insight)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      user.id,
      lastEmail.rows[0]?.id || null,
      text,
      followup,
      insight,
    ]);

    // Update user's context with new insight
    if (insight) {
      await query(`
        UPDATE users SET 
          raw_context = raw_context || $1::jsonb,
          profile_notes = CASE 
            WHEN profile_notes = '' THEN $2
            ELSE profile_notes || E'\n' || $2
          END,
          updated_at = NOW()
        WHERE id = $3
      `, [
        JSON.stringify([{ insight, date: new Date().toISOString() }]),
        insight,
        user.id,
      ]);
    }

    // Send follow-up email
    await sendFollowupEmail(user, followup);

    console.log(`✨ Follow-up sent to ${user.email}`);
    res.json({ status: 'followup_sent' });

  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Processing failed' });
  }
}
