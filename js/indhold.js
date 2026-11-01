// ===== TEKSTER OG BILLEDER FRA DET INTERNE SYSTEM =====
// Elementer med data-indhold="nøgle" kan rettes på intern.baraekko.dk.
// Scriptet henter rettelserne fra /api/indhold og skifter dem ind. Det, der
// står i HTML'en, er standarden og bliver stående, hvis intet er rettet, eller
// hvis kaldet fejler. Linjeskift i en tekst bliver til <br>.
(function () {
  const felter = document.querySelectorAll('[data-indhold]');
  if (!felter.length) return;

  fetch('/api/indhold')
    .then(function (svar) {
      if (!svar.ok) throw new Error('HTTP ' + svar.status);
      return svar.json();
    })
    .then(function (data) {
      const indhold = data.indhold || {};
      felter.forEach(function (el) {
        const vaerdi = indhold[el.dataset.indhold];
        if (vaerdi == null || vaerdi === '') return;
        if (el.tagName === 'PICTURE') saetBillede(el, vaerdi);
        else saetTekst(el, vaerdi);
      });
    })
    .catch(function (fejl) {
      console.warn('Kunne ikke hente indhold:', fejl.message);
    });

  function saetTekst(el, tekst) {
    el.textContent = '';
    tekst.split('\n').forEach(function (linje, i) {
      if (i > 0) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(linje));
    });
  }

  // Et uploadet billede findes kun i én udgave, så <source>-varianterne
  // (webp og mobil) fjernes, ellers ville browseren blive ved med at vise dem.
  function saetBillede(picture, url) {
    picture.querySelectorAll('source').forEach(function (s) { s.remove(); });
    const img = picture.querySelector('img');
    if (img) {
      img.removeAttribute('srcset');
      img.src = url;
    }
  }
})();
