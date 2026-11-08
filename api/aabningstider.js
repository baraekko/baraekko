// ===== ÅBNINGSTIDER FRA DET INTERNE SYSTEM =====
// Serverless-funktion på Vercel. Henter ugens faste tider og de kommende
// særlige dage, som rettes på intern.baraekko.dk (Hjemmeside → Åbningstider).
// Svar: { uge: { 0: ["10:00","22:00"] | null, … }, undtagelser: [{ dato, tider, note }] }
// Samme publishable-nøgle som /api/events.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ctzflhuhinkxwtstgxyf.supabase.co';
const NOEGLE = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UHuTmZ3o8WvqiInDGx-reg_7vkxBpYv';

async function hent(tabel, params) {
  const url = new URL('/rest/v1/' + tabel, SUPABASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const svar = await fetch(url, {
    headers: { apikey: NOEGLE, Authorization: 'Bearer ' + NOEGLE },
    signal: AbortSignal.timeout(8000)
  });
  const data = await svar.json();
  if (!svar.ok) throw new Error(data.message || 'HTTP ' + svar.status);
  return data;
}

// "10:00:00" → "10:00"
const kort = (t) => (t ? t.slice(0, 5) : null);
const tider = (r) => (r.aabner && r.lukker ? [kort(r.aabner), kort(r.lukker)] : null);

module.exports = async function handler(req, res) {
  // Fra i går (dansk tid), så en åbningstid efter midnat stadig tæller.
  const igaar = new Date(Date.now() - 86400000)
    .toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' });

  let uge, undtagelser;
  try {
    [uge, undtagelser] = await Promise.all([
      hent('aabningstider', { select: 'ugedag,aabner,lukker' }),
      hent('aabning_undtagelser', { select: 'dato,aabner,lukker,note', dato: 'gte.' + igaar, order: 'dato.asc' })
    ]);
  } catch (fejl) {
    console.error('Åbningstider-kald fejlede:', fejl.message);
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(503).json({ error: 'Kunne ikke hente åbningstider.' });
  }

  const svar = { uge: {}, undtagelser: [] };
  uge.forEach(r => { svar.uge[r.ugedag] = tider(r); });
  svar.undtagelser = undtagelser.map(r => ({ dato: r.dato, tider: tider(r), note: r.note }));

  // Kort cache, så en rettelse er ude inden for et minut.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  return res.status(200).json(svar);
};
