// ===== ÅBEN/LUKKET-STATUS + ÅBNINGSTIDER =====
// Tiderne rettes på intern.baraekko.dk (Hjemmeside → Åbningstider) og hentes
// fra /api/aabningstider. Tiderne herunder er reserven, hvis kaldet fejler.
//
// Scriptet styrer:
//   #statusStrip    – "Åbent nu / Lukket lige nu" (alle sider med strimlen)
//   #ugensTider     – ugens faste tider (aabningstider.html)
//   #saerligeTider  – kommende særlige dage (aabningstider.html)
(function () {
  // Almindelige åbningstider pr. ugedag (0 = søndag). ["åbner", "lukker"].
  // Lukker før åbner betyder efter midnat, fx ["10:00", "02:00"]. null = lukket.
  let UGE = {
    0: ['10:00', '22:00'],
    1: null,
    2: ['10:00', '22:00'],
    3: ['10:00', '22:00'],
    4: ['10:00', '22:00'],
    5: ['10:00', '00:00'],
    6: ['10:00', '00:00']
  };

  // Undtagelser på bestemte datoer: { "2026-12-24": { tider, note } }
  let SAERLIGE = {};

  const DAGE = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  const MDR = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  const stort = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // Dansk tid, uanset hvor gæsten sidder
  function nu() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' }));
  }

  function datonoegle(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function minutter(hhmm) {
    const [t, m] = hhmm.split(':').map(Number);
    return t * 60 + m;
  }

  // ["10:00", "02:00"] → [600, 1560] (minutter fra midnat; over 1440 = natten efter)
  function iMinutter(tider) {
    if (!tider) return null;
    const a = minutter(tider[0]);
    let l = minutter(tider[1]);
    if (l <= a) l += 1440;
    return [a, l];
  }

  function tiderFor(d) {
    const noegle = datonoegle(d);
    if (Object.prototype.hasOwnProperty.call(SAERLIGE, noegle)) return SAERLIGE[noegle].tider;
    return UGE[d.getDay()] || null;
  }

  // ---------- Statusstrimlen ----------
  const strip = document.getElementById('statusStrip');
  const stateEl = document.getElementById('statusState');
  const detailEl = document.getElementById('statusDetail');

  function naesteAabne(d) {
    for (let i = 1; i <= 14; i++) {
      const kandidat = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      const tider = tiderFor(kandidat);
      if (tider) return { dato: kandidat, om: i, tider: tider };
    }
    return null;
  }

  function vis(tilstand, tekst, detalje) {
    strip.dataset.state = tilstand;
    stateEl.textContent = tekst;
    detailEl.textContent = detalje;
    strip.hidden = false;
  }

  function opdaterStatus() {
    if (!strip) return;
    const n = nu();
    const m = n.getHours() * 60 + n.getMinutes();

    // Kører gårsdagens åbningstid stadig, fordi vi lukker efter midnat?
    const igaar = iMinutter(tiderFor(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1)));
    if (igaar && igaar[1] > 1440 && m < igaar[1] - 1440) {
      return vis('open', 'Åbent nu', 'Vi lukker kl. ' + tiderFor(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1))[1]);
    }

    const idagTider = tiderFor(n);
    const idag = iMinutter(idagTider);

    if (idag && m >= idag[0] && m < idag[1]) {
      vis('open', 'Åbent nu', 'Vi lukker kl. ' + idagTider[1]);
    } else if (idag && m < idag[0]) {
      vis('closed', 'Lukket lige nu', 'Vi åbner kl. ' + idagTider[0]);
    } else {
      const naeste = naesteAabne(n);
      vis('closed', 'Lukket lige nu', naeste
        ? 'Vi åbner ' + (naeste.om === 1 ? 'i morgen' : DAGE[naeste.dato.getDay()]) + ' kl. ' + naeste.tider[0]
        : 'Se åbningstider');
    }
  }

  // ---------- Skemaet på aabningstider.html ----------
  function raekke(dage, tid) {
    const item = document.createElement('div');
    item.className = 'hours-band__item';
    const d = document.createElement('span');
    d.className = 'hours-band__days';
    d.textContent = dage;
    const t = document.createElement('span');
    t.className = 'hours-band__time';
    t.textContent = tid;
    item.append(d, t);
    return item;
  }

  const tidTekst = (tider) => (tider ? tider[0] + '-' + tider[1] : 'Lukket');

  // Mandag først; dage i træk med samme tider slås sammen ("Tirsdag-Torsdag").
  function tegnUge() {
    const el = document.getElementById('ugensTider');
    if (!el) return;
    const raekkefoelge = [1, 2, 3, 4, 5, 6, 0];
    const grupper = [];
    raekkefoelge.forEach(function (dag) {
      const tekst = tidTekst(UGE[dag]);
      const sidste = grupper[grupper.length - 1];
      if (sidste && sidste.tekst === tekst) sidste.til = dag;
      else grupper.push({ fra: dag, til: dag, tekst: tekst });
    });
    el.replaceChildren.apply(el, grupper.map(function (g) {
      const navn = stort(DAGE[g.fra]) + (g.til !== g.fra ? '-' + stort(DAGE[g.til]) : '');
      return raekke(navn, g.tekst);
    }));
  }

  // Særlige dage de næste 60 dage
  function tegnSaerlige() {
    const boks = document.getElementById('saerligeTider');
    if (!boks) return;
    const liste = boks.querySelector('.hours-band__grid');
    const idag = datonoegle(nu());
    const graense = datonoegle(new Date(nu().getTime() + 60 * 86400000));
    const kommende = Object.keys(SAERLIGE).sort().filter((k) => k >= idag && k <= graense);

    if (!kommende.length) { boks.hidden = true; return; }

    liste.replaceChildren.apply(liste, kommende.map(function (k) {
      const [aar, md, dag] = k.split('-').map(Number);
      const d = new Date(aar, md - 1, dag);
      const s = SAERLIGE[k];
      const navn = stort(DAGE[d.getDay()]) + ' ' + dag + '. ' + MDR[md - 1] + (s.note ? ' · ' + s.note : '');
      return raekke(navn, tidTekst(s.tider));
    }));
    boks.hidden = false;
  }

  function tegnAlt() {
    opdaterStatus();
    tegnUge();
    tegnSaerlige();
  }

  tegnAlt();
  setInterval(opdaterStatus, 30000);

  fetch('/api/aabningstider')
    .then(function (svar) {
      if (!svar.ok) throw new Error('HTTP ' + svar.status);
      return svar.json();
    })
    .then(function (data) {
      if (data.uge && Object.keys(data.uge).length) {
        const ny = {};
        for (let i = 0; i < 7; i++) ny[i] = data.uge[i] || null;
        UGE = ny;
      }
      SAERLIGE = {};
      (data.undtagelser || []).forEach(function (u) {
        SAERLIGE[u.dato] = { tider: u.tider, note: u.note || '' };
      });
      tegnAlt();
    })
    .catch(function (fejl) {
      console.warn('Kunne ikke hente åbningstider:', fejl.message);
    });
})();
