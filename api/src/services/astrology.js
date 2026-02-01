/**
 * Astrology service — calls the Kerykeion Python microservice.
 */
import config from '../config.js';

const ASTRO = config.astroUrl;

export async function calculateNatalChart({ name, year, month, day, hour, minute, lat, lng, tz }) {
  const res = await fetch(`${ASTRO}/natal-chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, year, month, day, hour, minute, lat, lng, tz }),
  });
  if (!res.ok) throw new Error(`Astro service error: ${res.status}`);
  const data = await res.json();
  return data.chart;
}

export async function getDailyTransits(natalChart, date = null) {
  const res = await fetch(`${ASTRO}/daily-transits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ natal_chart: natalChart, date }),
  });
  if (!res.ok) throw new Error(`Astro service error: ${res.status}`);
  const data = await res.json();
  return data.transits;
}

export async function getCurrentSky() {
  const res = await fetch(`${ASTRO}/current-sky`);
  if (!res.ok) throw new Error(`Astro service error: ${res.status}`);
  const data = await res.json();
  return data.sky;
}
