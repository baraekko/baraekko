// ===== MENUKORTET FRA DET INTERNE SYSTEM =====
// Serverless-funktion på Vercel. Henter de synlige varer fra Supabase
// (tabellen menu_varer, som rettes på intern.baraekko.dk) grupperet pr.
// kategori: { menu: { fadoel: [{ navn, beskrivelse, pris }], … } }.
// Samme publishable-nøgle som /api/events.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ctzflhuhinkxwtstgxyf.supabase.co';
const NOEGLE = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UHuTmZ3o8WvqiInDGx-reg_7vkxBpYv';
const KATEGORIER = ['fadoel', 'flasker', 'vin', 'kaffe', 'drinks', 'sodavand', 'mad'];

module.exports = async function handler(req, res) {
  const url = new URL('/rest/v1/menu_varer', SUPABASE_URL);
  url.searchParams.set('select', 'kategori,navn,beskrivelse,pris');
  url.searchParams.set('order', 'raekkefoelge.asc,navn.asc');

  let raekker;
  try {
    const svar = await fetch(url, {
      headers: { apikey: NOEGLE, Authorization: 'Bearer ' + NOEGLE },
      signal: AbortSignal.timeout(8000)
    });
    raekker = await svar.json();
    if (!svar.ok) throw new Error(raekker.message || 'HTTP ' + svar.status);
  } catch (fejl) {
    console.error('Menu-kald fejlede:', fejl.message);
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(503).json({ error: 'Kunne ikke hente menukortet.' });
  }

  // En tom database betyder, at startdata ikke er lagt ind endnu. Så svarer vi
  // 503, så siden beholder varerne fra HTML'en i stedet for at vise tomme lister.
  if (!raekker.length) {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(503).json({ error: 'Menukortet er tomt.' });
  }

  const menu = {};
  KATEGORIER.forEach(k => { menu[k] = []; });
  raekker.forEach(r => {
    if (menu[r.kategori]) menu[r.kategori].push({ navn: r.navn, beskrivelse: r.beskrivelse, pris: r.pris });
  });

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
  return res.status(200).json({ menu });
};
