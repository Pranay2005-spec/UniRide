const express = require('express');
const router = express.Router();

const NOMINATIM = 'https://nominatim.openstreetmap.org';
let lastRequest = 0;

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

const knownCities = [
  'pune', 'mumbai', 'bombay', 'delhi', 'new delhi', 'bangalore', 'bengaluru',
  'hyderabad', 'secunderabad', 'chennai', 'madras', 'kolkata', 'calcutta',
  'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore',
  'bhopal', 'visakhapatnam', 'vadodara', 'guwahati', 'chandigarh',
  'solapur', 'kolhapur', 'sangli', 'satara', 'karad', 'pandharpur',
  'latur', 'osmanabad', 'nanded', 'parbhani', 'aurangabad', 'nashik',
  'miraj', 'ichalkaranji', 'bijapur', 'vijayapura', 'gulbarga', 'kalaburagi',
  'belgaum', 'belagavi', 'hubli', 'dharwad', 'shirdi', 'shani shingnapur',
  'akola', 'amravati', 'jalgaon', 'dhule', 'malegaon', 'wardha',
];

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

router.get('/search', async (req, res) => {
  try {
    let q = req.query.q;
    const city = req.query.city || '';
    const state = req.query.state || '';
    const country = req.query.country || '';

    if (!q || !q.trim()) return res.json([]);

    const queryLower = q.toLowerCase();
    const hasCity = knownCities.some(c => queryLower.includes(c));

    let searchQuery = q;
    if (!hasCity && city) {
      const parts = [q, city];
      if (state) parts.push(state);
      if (country) parts.push(country);
      searchQuery = parts.join(', ');
    }

    const cacheKey = searchQuery;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const now = Date.now();
    const wait = 1100 - (now - lastRequest);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastRequest = Date.now();

    let data = [];

    const params = new URLSearchParams({
      format: 'json',
      q: searchQuery,
      limit: 8,
      addressdetails: 1,
      dedup: 1,
      countrycodes: 'IN',
    });

    let response = await fetch(`${NOMINATIM}/search?${params}`, {
      headers: { 'User-Agent': 'UniRide/1.0' }
    });

    if (response.ok) {
      data = await response.json();
    }

    if (!data || data.length < 3) {
      const elapsed = Date.now() - lastRequest;
      if (elapsed < 1100) await new Promise(r => setTimeout(r, 1100 - elapsed));
      lastRequest = Date.now();

      const fallbackParams = new URLSearchParams({
        format: 'json',
        q: !hasCity && state ? `${q}, ${state}, India` : `${q}, India`,
        limit: 6,
        addressdetails: 1,
        dedup: 1,
        countrycodes: 'IN',
      });
      response = await fetch(`${NOMINATIM}/search?${fallbackParams}`, {
        headers: { 'User-Agent': 'UniRide/1.0' }
      });
      if (response.ok) {
        const fallbackData = await response.json();
        if (data && data.length > 0) {
          data = [...data, ...fallbackData.filter(f => !data.some(d => d.osm_id === f.osm_id))];
        } else {
          data = fallbackData;
        }
      }
    }

    setCache(cacheKey, data);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/reverse', async (req, res) => {
  try {
    const lat = req.query.lat;
    const lon = req.query.lon;
    if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });

    const cacheKey = `rev_${lat}_${lon}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const now = Date.now();
    const wait = 1100 - (now - lastRequest);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastRequest = Date.now();

    const response = await fetch(
      `${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      { headers: { 'User-Agent': 'UniRide/1.0' } }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Reverse geocode failed' });
    }

    const data = await response.json();
    setCache(cacheKey, data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Reverse geocode failed' });
  }
});

module.exports = router;
