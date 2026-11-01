// ===== TEKSTER OG BILLEDER FRA DET INTERNE SYSTEM =====
// Serverless-funktion på Vercel. Sender de felter, der er rettet på
// intern.baraekko.dk (Hjemmeside → Tekster/Billeder), som { nøgle: værdi }.
// Felter uden rettelse sendes ikke med; dér gælder teksten i HTML'en.
// Samme publishable-nøgle som /api/events.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ctzflhuhinkxwtstgxyf.supabase.co';
const NOEGLE = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UHuTmZ3o8WvqiInDGx-reg_7vkxBpYv';

module.exports = async function handler(req, res) {
  const url = new URL('/rest/v1/indhold', SUPABASE_URL);
  url.searchParams.set('select', 'noegle,vaerdi');
  url.searchParams.set('vaerdi', 'not.is.null');

  let raekker;
  try {
    const svar = await fetch(url, {
      headers: { apikey: NOEGLE, Authorization: 'Bearer ' + NOEGLE },
      signal: AbortSignal.timeout(8000)
    });
    raekker = await svar.json();
    if (!svar.ok) throw new Error(raekker.message || 'HTTP ' + svar.status);
  } catch (fejl) {
    console.error('Indhold-kald fejlede:', fejl.message);
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(503).json({ error: 'Kunne ikke hente indhold.' });
  }

  const indhold = {};
  raekker.forEach(r => { indhold[r.noegle] = r.vaerdi; });

  // Kort cache, så en rettelse er ude inden for et minut.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  return res.status(200).json({ indhold });
};
