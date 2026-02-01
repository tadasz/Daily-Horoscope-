import { query } from '../db.js';
import { calculateNatalChart, getCurrentSky } from '../services/astrology.js';
import { sendRichWelcomeEmail } from '../services/email.js';
import { generateWelcomeReading } from '../services/welcome.js';
import { birthProfile, personalYear, NUMBER_MEANINGS } from '../services/numerology.js';
import { geocodeCity } from '../services/geocode.js';

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

    // Geocode city if lat/lng not provided
    let lat = birth_lat ? parseFloat(birth_lat) : null;
    let lng = birth_lng ? parseFloat(birth_lng) : null;
    let tz = timezone || null;

    if ((!lat || !lng) && birth_city) {
      const geo = await geocodeCity(birth_city);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
        tz = tz || geo.timezone;
        console.log(`📍 Geocoded "${birth_city}" → ${lat}, ${lng} (${tz})`);
      }
    }
    tz = tz || 'UTC';

    // Calculate natal chart via astrology microservice
    let natalChart = null;
    try {
      natalChart = await calculateNatalChart({
        name,
        year, month, day, hour, minute,
        lat,
        lng,
        tz,
      });
    } catch (err) {
      console.error('Natal chart calculation failed:', err.message);
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
      lat || null,
      lng || null,
      tz,
      natalChart ? JSON.stringify(natalChart) : null,
      natalChart?.sun_sign || null,
      natalChart?.moon_sign || null,
      natalChart?.rising_sign || null,
      focus_area || null,
      context || null,
    ]);

    const user = result.rows[0];

    // Generate and send rich welcome email
    try {
      // Get current sky for "What's Coming" section
      let currentSky = null;
      try { currentSky = await getCurrentSky(); } catch (e) { /* ok */ }

      // Calculate numerology profile
      const numProfile = birthProfile(name, year, month, day);
      const persYear = personalYear(month, day, new Date().getUTCFullYear());

      const welcomeData = await generateWelcomeReading(
        { name, focus_area, initial_context: context },
        natalChart,
        currentSky
      );

      // Add numerology section to the welcome email
      welcomeData.numerology = {
        ...numProfile,
        personalYear: persYear,
        meanings: NUMBER_MEANINGS,
      };

      await sendRichWelcomeEmail(
        { email, name, unsub_token: user.unsub_token },
        welcomeData
      );

      // Log the welcome email
      await query(`
        INSERT INTO emails_sent (user_id, email_type, subject, body_text, question_asked)
        VALUES ($1, 'welcome', $2, $3, $4)
      `, [user.id, welcomeData.subject, welcomeData.reading, '']);

      console.log(`✨ Welcome reading sent to ${email} (${natalChart?.sun_sign})`);
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
