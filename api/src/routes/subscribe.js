import { query } from '../db.js';
import { calculateNatalChart, getCurrentSky } from '../services/astrology.js';
import { sendRichWelcomeEmail } from '../services/email.js';
import { generateWelcomeReading } from '../services/welcome.js';
import { birthProfile, personalYear, NUMBER_MEANINGS, NUMBER_MEANINGS_LT } from '../services/numerology.js';
import { geocodeCity } from '../services/geocode.js';

// In-memory status tracker for welcome email generation
const welcomeStatus = new Map();

export async function subscribeRoute(req, res) {
  try {
    const { name, email, birth_date, birth_time, birth_city, birth_lat, birth_lng, timezone, focus_area, context, language,
            gender, quiz_style, quiz_length, quiz_relationship, quiz_read_time } = req.body;

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
        lat, lng, tz,
      });
    } catch (err) {
      console.error('Natal chart calculation failed:', err.message);
    }

    // Insert user
    const result = await query(`
      INSERT INTO users (email, name, birth_date, birth_time, birth_city, birth_lat, birth_lng, timezone,
                         natal_chart, sun_sign, moon_sign, rising_sign, focus_area, initial_context, language)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, unsub_token, sun_sign, moon_sign, rising_sign
    `, [
      email, name, birth_date,
      birth_time || null,
      birth_city || null,
      lat || null, lng || null, tz,
      natalChart ? JSON.stringify(natalChart) : null,
      natalChart?.sun_sign || null,
      natalChart?.moon_sign || null,
      natalChart?.rising_sign || null,
      focus_area || null,
      context || null,
      language || 'en',
    ]);

    const user = result.rows[0];
    const token = user.unsub_token;

    // Save quiz preferences if provided
    if (quiz_style || quiz_length || quiz_relationship || quiz_read_time || gender) {
      await query(
        `UPDATE users SET quiz_style = COALESCE($2, quiz_style), quiz_length = COALESCE($3, quiz_length),
         quiz_relationship = COALESCE($4, quiz_relationship), quiz_read_time = COALESCE($5, quiz_read_time),
         gender = COALESCE($6, gender)
         WHERE id = $1`,
        [user.id, quiz_style || null, quiz_length || null, quiz_relationship || null, quiz_read_time || null, gender || null]
      );
    }

    // Set initial status
    welcomeStatus.set(token, { status: 'generating', sun_sign: natalChart?.sun_sign });

    // Track signup event
    console.log(`📝 New signup: ${name} (${email}) — ${language || 'en'} — focus: ${focus_area || 'none'} — ${natalChart?.sun_sign || 'unknown'}`);
    await query(
      'INSERT INTO email_events (user_id, event_type, event_data) VALUES ($1, $2, $3)',
      [user.id, 'signup', JSON.stringify({ name, email, language, focus_area, sun_sign: natalChart?.sun_sign })]
    );

    // Generate and send welcome email IN BACKGROUND (don't block response)
    generateAndSendWelcome(user, { name, email, year, month, day, focus_area, context, language, natalChart, token })
      .catch(err => {
        console.error('Background welcome email failed:', err.message);
        welcomeStatus.set(token, { status: 'error', error: err.message });
      });

    // Redirect immediately to progress page
    if (req.headers['content-type']?.includes('urlencoded')) {
      return res.redirect(`/welcome/${token}?lang=${language || 'en'}`);
    }

    res.json({
      status: 'ok',
      token,
      message: 'Generating your cosmic blueprint...',
      sun_sign: natalChart?.sun_sign,
    });

  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// Background welcome email generation
async function generateAndSendWelcome(user, { name, email, year, month, day, focus_area, context, language, natalChart, token }) {
  try {
    let currentSky = null;
    try { currentSky = await getCurrentSky(); } catch (e) { /* ok */ }

    const numProfile = birthProfile(name, year, month, day);
    const persYear = personalYear(month, day, new Date().getUTCFullYear());

    const welcomeData = await generateWelcomeReading(
      { name, focus_area, initial_context: context, language: language || 'en' },
      natalChart,
      currentSky
    );

    const lang = language || 'en';
    welcomeData.numerology = {
      ...numProfile,
      personalYear: persYear,
      meanings: lang === 'lt' ? NUMBER_MEANINGS_LT : NUMBER_MEANINGS,
    };

    await sendRichWelcomeEmail(
      { email, name, unsub_token: token, language: lang },
      welcomeData
    );

    await query(`
      INSERT INTO emails_sent (user_id, email_type, subject, body_text, question_asked)
      VALUES ($1, 'welcome', $2, $3, $4)
    `, [user.id, welcomeData.subject, welcomeData.reading, '']);

    console.log(`✨ Welcome reading sent to ${email} (${natalChart?.sun_sign})`);
    welcomeStatus.set(token, { status: 'sent', sun_sign: natalChart?.sun_sign });

    // Clean up status after 5 minutes
    setTimeout(() => welcomeStatus.delete(token), 5 * 60 * 1000);
  } catch (err) {
    console.error(`Welcome email failed for ${email}:`, err.message);
    welcomeStatus.set(token, { status: 'error' });
    throw err;
  }
}

// Status endpoint for polling
export function welcomeStatusRoute(req, res) {
  const { token } = req.params;
  const status = welcomeStatus.get(token);
  if (!status) {
    return res.json({ status: 'unknown' });
  }
  res.json(status);
}
