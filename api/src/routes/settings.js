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
      'SELECT language, focus_area, birth_time, birth_city FROM users WHERE unsub_token = $1',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      language: user.language || 'en',
      focus_area: user.focus_area,
      birth_time: user.birth_time,
      birth_city: user.birth_city
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
    const { language, focus_area, birth_time, birth_city } = req.body;
    
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
      birth_time: birth_time || null
    };
    
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