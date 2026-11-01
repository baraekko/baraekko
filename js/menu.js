// ===== MENUKORTET FRA DET INTERNE SYSTEM =====
// Henter varerne fra /api/menu og bygger listerne i .menu-items[data-menu].
// Fejler kaldet, bliver varerne i HTML'en stående.
(function () {
  const lister = document.querySelectorAll('.menu-items[data-menu]');
  if (!lister.length) return;

  fetch('/api/menu')
    .then(function (svar) {
      if (!svar.ok) throw new Error('HTTP ' + svar.status);
      return svar.json();
    })
    .then(function (data) {
      const menu = data.menu || {};
      lister.forEach(function (liste) {
        const varer = menu[liste.dataset.menu];
        if (!varer) return;
        liste.textContent = '';
        varer.forEach(function (v) { liste.appendChild(vare(v)); });
      });
    })
    .catch(function (fejl) {
      console.warn('Kunne ikke hente menukortet:', fejl.message);
    });

  function vare(v) {
    const el = div('menu-item');
    const info = div('menu-item__info');
    info.appendChild(div('menu-item__name', v.navn));
    if (v.beskrivelse) info.appendChild(div('menu-item__desc', v.beskrivelse));
    el.appendChild(info);
    el.appendChild(div('menu-item__price', v.pris));
    return el;
  }

  function div(klasse, tekst) {
    const el = document.createElement('div');
    el.className = klasse;
    if (tekst) el.textContent = tekst;
    return el;
  }
})();
