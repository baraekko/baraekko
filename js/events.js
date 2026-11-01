// ===== EVENTS FRA DET INTERNE SYSTEM =====
// Henter programmet fra /api/events og bygger rækkerne i .upcoming__grid.
// Fejler kaldet, bliver de rækker, der står i HTML'en, stående.
// Rækken med data-tom vises kun, når der ikke er nogen events.
(function () {
  const grid = document.querySelector('.upcoming__grid');
  if (!grid) return;
  const tom = grid.querySelector('[data-tom]');

  fetch('/api/events')
    .then(function (svar) {
      if (!svar.ok) throw new Error('HTTP ' + svar.status);
      return svar.json();
    })
    .then(function (data) {
      const events = data.events || [];
      grid.querySelectorAll('.event-row:not([data-tom])').forEach(function (el) { el.remove(); });
      events.forEach(function (ev) { grid.insertBefore(raekke(ev), tom); });
      if (tom) {
        tom.removeAttribute('data-from');
        tom.hidden = events.length > 0;
      }
    })
    .catch(function (fejl) {
      console.warn('Kunne ikke hente events:', fejl.message);
    });

  function raekke(ev) {
    const el = div('event-row');
    el.appendChild(div('event-row__date', ev.dato));

    const midte = document.createElement('div');
    midte.appendChild(div('event-row__title', ev.titel));
    if (ev.beskrivelse) {
      const p = document.createElement('p');
      p.className = 'event-row__desc';
      p.style.marginTop = 'var(--space-xs)';
      p.textContent = ev.beskrivelse;
      midte.appendChild(p);
    }
    el.appendChild(midte);

    el.appendChild(div('event-row__time', ev.tid || ''));
    if (ev.maerkat) {
      const tag = document.createElement('span');
      tag.className = 'event-row__tag';
      tag.textContent = ev.maerkat;
      el.appendChild(tag);
    }
    return el;
  }

  function div(klasse, tekst) {
    const el = document.createElement('div');
    el.className = klasse;
    if (tekst) el.textContent = tekst;
    return el;
  }
})();
