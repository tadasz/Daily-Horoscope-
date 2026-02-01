import { query } from '../db.js';

export async function unsubscribeRoute(req, res) {
  const { token } = req.params;
  
  try {
    const result = await query(
      'UPDATE users SET subscribed = FALSE, updated_at = NOW() WHERE unsub_token = $1 RETURNING email',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('<h1>Link expired or invalid.</h1>');
    }

    res.send(`
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: Georgia, serif; max-width: 520px; margin: 50px auto; padding: 20px; text-align: center;">
          <h2>You've been unsubscribed ☽</h2>
          <p>We'll miss you among the stars.</p>
          <p style="color: #888; font-size: 14px;">If this was a mistake, just sign up again anytime.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).send('<h1>Something went wrong.</h1>');
  }
}
