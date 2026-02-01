import { query } from '../db.js';
import { calculateNatalChart } from '../services/astrology.js';
import { sendWelcomeEmail } from '../services/email.js';

export async function subscribeRoute(req, res) {
  try {
    const { name, email, birth_date, birth_time, birth_city, birth_lat, birth_lng, timezone, focus_area, context } = req.body;

    if (!email || !birth_date || !name) {
      return res.status(400).json({ error: 'Name, email, and birth date are required.' });
    }

    // Check if already subscribed
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Already subscribed!' });
    }

    // Parse birth date
    const [year, month, day] = birth_date.split('-').map(Number);
    const [hour, minute] = birth_time ? birth_time.split(':').map(Number) : [12, 0];

    // Calculate natal chart via astrology microservice
    let natalChart = null;
    try {
      natalChart = await calculateNatalChart({
        name,
        year, month, day, hour, minute,
        lat: birth_lat ? parseFloat(birth_lat) : null,
        lng: birth_lng ? parseFloat(birth_lng) : null,
        tz: timezone || 'UTC',
      });
    } catch (err) {
      console.error('Natal chart calculation failed:', err.message);
      // Continue without chart — we can still use sun sign from date
    }

    // Insert user
    const result = await query(`
      INSERT INTO users (email, name, birth_date, birth_time, birth_city, birth_lat, birth_lng, timezone,
                         natal_chart, sun_sign, moon_sign, rising_sign, focus_area, initial_context)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, unsub_token, sun_sign, moon_sign, rising_sign
    `, [
      email, name, birth_date,
      birth_time || null,
      birth_city || null,
      birth_lat || null,
      birth_lng || null,
      timezone || 'UTC',
      natalChart ? JSON.stringify(natalChart) : null,
      natalChart?.sun_sign || null,
      natalChart?.moon_sign || null,
      natalChart?.rising_sign || null,
      focus_area || null,
      context || null,
    ]);

    const user = result.rows[0];

    // Send welcome email
    try {
      await sendWelcomeEmail({
        email, name,
        sun_sign: natalChart?.sun_sign || 'your sign',
        moon_sign: natalChart?.moon_sign,
        rising_sign: natalChart?.rising_sign,
        unsub_token: user.unsub_token,
      });
    } catch (err) {
      console.error('Welcome email failed:', err.message);
    }

    // Redirect to thank you page
    if (req.headers['content-type']?.includes('urlencoded')) {
      return res.redirect('/thanks.html');
    }

    res.json({
      status: 'ok',
      message: 'Welcome! Check your inbox.',
      sun_sign: natalChart?.sun_sign,
      moon_sign: natalChart?.moon_sign,
      rising_sign: natalChart?.rising_sign,
    });

  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
