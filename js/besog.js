// ===== COOKIEFRI BESØGSTÆLLER =====
// Fortæller /api/besog, at siden er vist, og hvor besøgeren kom fra.
// Gemmer intet i browseren (ingen cookies eller lokal lagring).
(function () {
  if (navigator.webdriver || location.hostname === 'localhost') return;
  const besked = JSON.stringify({ side: location.pathname, ref: document.referrer });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/besog', besked);
  } else {
    fetch('/api/besog', { method: 'POST', body: besked, keepalive: true }).catch(function () {});
  }
})();
