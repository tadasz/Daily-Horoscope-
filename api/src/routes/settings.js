import { query } from '../db.js';
import { geocodeCity } from '../services/geocode.js';
import { calculateNatalChart } from '../services/astrology.js';

// GET /api/settings/:token — returns user settings as JSON
export async function getSettingsRoute(req, res) {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Find user by unsub_token
    const result = await query(
      `SELECT name, language, focus_area, birth_date, birth_time, birth_city,
              gender, quiz_style, quiz_length, quiz_relationship, premium
       FROM users WHERE unsub_token = $1`,
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      name: user.name,
      language: user.language || 'en',
      focus_area: user.focus_area,
      birth_date: user.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : null,
      birth_time: user.birth_time,
      birth_city: user.birth_city,
      gender: user.gender,
      quiz_style: user.quiz_style,
      quiz_length: user.quiz_length,
      quiz_relationship: user.quiz_relationship,
      premium: !!user.premium,
    });
    
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// PUT /api/settings/:token — updates user settings
export async function updateSettingsRoute(req, res) {
  try {
    const { token } = req.params;
    const { name, language, focus_area, birth_time, birth_city, birth_date, gender, quiz_style, quiz_length, quiz_relationship } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Find user by unsub_token
    const userResult = await query(
      'SELECT id, birth_city, birth_lat, birth_lng, timezone, birth_date FROM users WHERE unsub_token = $1',
      [token]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let updateData = {
      language: language || 'en',
      focus_area: focus_area || null,
      birth_time: birth_time || null,
    };
    
    if (name !== undefined) updateData.name = name || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (quiz_style !== undefined) updateData.quiz_style = quiz_style || null;
    if (quiz_relationship !== undefined) updateData.quiz_relationship = quiz_relationship || null;
    if (birth_date !== undefined) updateData.birth_date = birth_date || null;

    // Length: free users forced to short
    if (quiz_length !== undefined) {
      const premResult = await query('SELECT premium FROM users WHERE id = $1', [user.id]);
      const isPremium = premResult.rows[0]?.premium;
      updateData.quiz_length = isPremium ? (quiz_length || 'short') : 'short';
    }
    
    // If birth_city changed, we need to re-geocode and recalculate natal chart
    if (birth_city && birth_city !== user.birth_city) {
      try {
        const geo = await geocodeCity(birth_city);
        if (geo) {
          updateData.birth_city = birth_city;
          updateData.birth_lat = geo.lat;
          updateData.birth_lng = geo.lng;
          updateData.timezone = geo.timezone;
          
          console.log(`📍 Re-geocoded "${birth_city}" → ${geo.lat}, ${geo.lng} (${geo.timezone})`);
          
          // Recalculate natal chart if we have birth date
          if (user.birth_date) {
            try {
              const birthDate = new Date(user.birth_date);
              const [hour, minute] = (birth_time || user.birth_time || '12:00').split(':').map(Number);
              
              const natalChart = await calculateNatalChart({
                name: 'User', // We don't store names in this context
                year: birthDate.getUTCFullYear(),
                month: birthDate.getUTCMonth() + 1,
                day: birthDate.getUTCDate(),
                hour,
                minute,
                lat: geo.lat,
                lng: geo.lng,
                tz: geo.timezone,
              });
              
              updateData.natal_chart = JSON.stringify(natalChart);
              updateData.sun_sign = natalChart?.sun_sign || null;
              updateData.moon_sign = natalChart?.moon_sign || null;
              updateData.rising_sign = natalChart?.rising_sign || null;
              
              console.log(`♈ Recalculated natal chart: ${natalChart?.sun_sign} Sun, ${natalChart?.moon_sign} Moon, ${natalChart?.rising_sign} Rising`);
              
            } catch (err) {
              console.error('Natal chart recalculation failed:', err.message);
              // Continue with geocoding update even if chart calc fails
            }
          }
        } else {
          return res.status(400).json({ error: 'Could not find that city. Please check the spelling.' });
        }
      } catch (err) {
        console.error('Geocoding failed:', err.message);
        return res.status(400).json({ error: 'Could not geocode city. Please try again.' });
      }
    } else if (birth_city === '') {
      // If birth_city is empty string, clear it
      updateData.birth_city = null;
    }
    
    // Build dynamic UPDATE query
    const setClause = Object.keys(updateData).map((key, i) => `${key} = $${i + 2}`).join(', ');
    const values = [user.id, ...Object.values(updateData)];
    
    await query(
      `UPDATE users SET ${setClause} WHERE id = $1`,
      values
    );
    
    console.log(`⚙️ Updated settings for user ${user.id}: ${JSON.stringify(updateData)}`);
    
    res.json({ 
      status: 'ok', 
      message: 'Settings updated successfully',
      updated: Object.keys(updateData)
    });
    
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// DELETE /api/settings/:token — delete user account
export async function deleteAccountRoute(req, res) {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const userResult = await query(
      'SELECT id, email, name FROM users WHERE unsub_token = $1',
      [token]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Delete related data first
    await query('DELETE FROM emails_sent WHERE user_id = $1', [user.id]);
    await query('DELETE FROM email_events WHERE user_id = $1', [user.id]);
    await query('DELETE FROM feedback WHERE user_id = $1', [user.id]);
    await query('DELETE FROM replies WHERE user_id = $1', [user.id]);
    await query('DELETE FROM users WHERE id = $1', [user.id]);

    console.log(`🗑️ Account deleted: ${user.name} (${user.email})`);

    res.json({ status: 'ok', message: 'Account deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}