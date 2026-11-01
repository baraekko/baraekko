// ===== EVENTS FRA DET INTERNE SYSTEM =====
// Serverless-funktion på Vercel. Henter de offentlige, ikke-udløbne events
// fra Supabase (tabellen events, som rettes på intern.baraekko.dk) og sender
// dem til events.html i et lille, rent format. Databasen afgør selv, hvad der
// er offentligt (RLS), så kladder og gamle events når aldrig herud.
//
// Nøglen er Supabases publishable-nøgle. Den er offentlig af natur og kan
// overskrives med miljøvariablen SUPABASE_PUBLISHABLE_KEY i Vercel.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ctzflhuhinkxwtstgxyf.supabase.co';
const NOEGLE = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UHuTmZ3o8WvqiInDGx-reg_7vkxBpYv';
const FELTER = 'id,titel,beskrivelse,dato,slutdato,dato_tekst,tid_tekst,maerkat';

const DAGE = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const MDR = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

module.exports = async function handler(req, res) {
  const url = new URL('/rest/v1/events', SUPABASE_URL);
  url.searchParams.set('select', FELTER);
  url.searchParams.set('order', 'dato.asc');

  let raekker;
  try {
    const svar = await fetch(url, {
      headers: { apikey: NOEGLE, Authorization: 'Bearer ' + NOEGLE },
      signal: AbortSignal.timeout(8000)
    });
    raekker = await svar.json();
    if (!svar.ok) throw new Error(raekker.message || 'HTTP ' + svar.status);
  } catch (fejl) {
    console.error('Events-kald fejlede:', fejl.message);
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(503).json({ error: 'Kunne ikke hente events.' });
  }

  const events = raekker.map(e => ({
    id: e.id,
    dato: datoTekst(e),
    titel: e.titel,
    beskrivelse: e.beskrivelse,
    tid: e.tid_tekst,
    maerkat: e.maerkat
  }));

  // Kort cache, så en rettelse i det interne system er ude inden for et minut.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  return res.status(200).json({ events });
};

// "Ons 2. sep" eller "28. aug – 6. sep", medmindre eventet har sin egen tekst.
// Samme regel som i det interne system (src/datoTekst.js).
function datoTekst({ dato, slutdato, dato_tekst }) {
  if (dato_tekst) return dato_tekst;
  const fra = new Date(dato + 'T12:00:00Z');
  const kort = d => d.getUTCDate() + '. ' + MDR[d.getUTCMonth()];
  if (!slutdato || slutdato === dato) return DAGE[fra.getUTCDay()] + ' ' + kort(fra);
  return kort(fra) + ' – ' + kort(new Date(slutdato + 'T12:00:00Z'));
}
