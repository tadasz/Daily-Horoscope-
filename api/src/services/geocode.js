/**
 * Geocoding via OpenStreetMap Nominatim (free, no API key).
 * Converts city name → lat/lng + timezone.
 */

export async function geocodeCity(cityName) {
  if (!cityName) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GATO-Astrology/1.0 (stars@gato.app)' },
    });
    const data = await res.json();

    if (!data || data.length === 0) return null;

    const { lat, lon, display_name } = data[0];
    
    // Get timezone from coordinates using timeapi.io (free)
    let timezone = 'UTC';
    try {
      const tzRes = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lon}`);
      const tzData = await tzRes.json();
      timezone = tzData.timeZone || 'UTC';
    } catch (e) {
      // Fallback: estimate timezone from longitude
      const offset = Math.round(parseFloat(lon) / 15);
      timezone = `Etc/GMT${offset >= 0 ? '-' : '+'}${Math.abs(offset)}`;
    }

    return {
      lat: parseFloat(lat),
      lng: parseFloat(lon),
      display_name,
      timezone,
    };
  } catch (err) {
    console.error('Geocoding failed:', err.message);
    return null;
  }
}
