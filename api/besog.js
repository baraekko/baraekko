// ===== COOKIEFRI BESØGSTÆLLER =====
// js/besog.js sender en lille besked ved hver sidevisning: siden og hvor
// besøgeren kom fra. Her afgøres kilde (Instagram, Google …) og enhed, og
// besøget registreres i Supabase via registrer_besog. IP og browser sendes kun
// med til fingeraftrykket og gemmes aldrig. Ingen cookies.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ctzflhuhinkxwtstgxyf.supabase.co';
const NOEGLE = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UHuTmZ3o8WvqiInDGx-reg_7vkxBpYv';
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|lighthouse|headless|monitor|curl|wget|python|vercel/i;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();

  const browser = String(req.headers['user-agent'] || '');
  if (!browser || BOTS.test(browser)) return res.status(204).end();

  let data = req.body;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
  const side = rensSide(data && data.side);
  if (!side) return res.status(204).end();

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  try {
    await fetch(new URL('/rest/v1/rpc/registrer_besog', SUPABASE_URL), {
      method: 'POST',
      headers: { apikey: NOEGLE, Authorization: 'Bearer ' + NOEGLE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_side: side, p_kilde: kilde(data.ref), p_enhed: enhed(browser), p_noegle: ip + '|' + browser }),
      signal: AbortSignal.timeout(5000)
    });
  } catch (fejl) {
    console.error('Besøg kunne ikke registreres:', fejl.message);
  }
  return res.status(204).end();
};

// "/menu.html" og "/menu" tælles som samme side.
function rensSide(side) {
  if (typeof side !== 'string' || !side.startsWith('/')) return null;
  const s = side.split(/[?#]/)[0].replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
  return s.slice(0, 200);
}

function kilde(ref) {
  if (!ref) return 'Direkte';
  let vaert;
  try { vaert = new URL(ref).hostname.replace(/^www\./, ''); } catch { return 'Direkte'; }
  if (/(^|\.)baraekko\.dk$/.test(vaert)) return 'Intern';
  if (/instagram\.com$/.test(vaert)) return 'Instagram';
  if (/(facebook\.com|fb\.me|messenger\.com)$/.test(vaert)) return 'Facebook';
  if (/tiktok\.com$/.test(vaert)) return 'TikTok';
  if (/maps\.google\.|google\.[a-z.]+$/.test(vaert) && /\/maps/.test(ref)) return 'Google Maps';
  if (/maps\.(google|app\.goo)/.test(vaert) || vaert === 'maps.app.goo.gl') return 'Google Maps';
  if (/(^|\.)google\.[a-z.]+$/.test(vaert)) return 'Google';
  if (/(bing\.com|duckduckgo\.com|ecosia\.org|yahoo\.com)$/.test(vaert)) return 'Anden søgemaskine';
  if (/tripadvisor\./.test(vaert)) return 'Tripadvisor';
  return vaert.slice(0, 100);
}

function enhed(browser) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(browser)) return 'tablet';
  if (/mobi|iphone|android/i.test(browser)) return 'mobil';
  return 'computer';
}
