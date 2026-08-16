/* Tanger Reiseplan — offline service worker */
var CACHE = 'tanger-v48';
var TILES = 'tanger-maps-v1';   // Kartenkacheln, von der App gefuellt
var DATA  = 'tanger-data-v1';   // Erinnerungsliste fuer periodicSync
var DOCS  = 'tanger-docs-v1';   // vom Nutzer hinterlegte Dateien, bleiben lokal
var FOTOS = 'tanger-fotos-v1';  // Fotos je Reisetag, ebenfalls lokal
var TKTS  = 'tanger-tickets-v1'; // QR-Codes der Fahrkarten, streng lokal
var KEEP  = [CACHE, TILES, DATA, DOCS, FOTOS, TKTS];

var TILE_HOSTS = ['tile.openstreetmap.org', 'a.tile.openstreetmap.org',
                  'b.tile.openstreetmap.org', 'c.tile.openstreetmap.org'];

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vendor/leaflet.js',
  './vendor/leaflet.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

// Graue Ersatzkachel, wenn offline und nicht im Cache
var BLANK = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' +
  '<rect width="256" height="256" fill="#E8E4DB"/></svg>';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      // Nur eigene alte Versionen loeschen — Kacheln und Daten bleiben liegen.
      return Promise.all(keys.map(function (k) {
        return KEEP.indexOf(k) === -1 ? caches.delete(k) : null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  // Kartenkacheln: erst Cache, dann Netz, sonst graue Platzhalterkachel.
  if (TILE_HOSTS.indexOf(url.host) !== -1) {
    e.respondWith(
      caches.open(TILES).then(function (c) {
        return c.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.ok) c.put(req, res.clone());
            return res;
          }).catch(function () {
            return new Response(BLANK, {headers: {'Content-Type': 'image/svg+xml'}});
          });
        });
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Eigene Dateien und Fotos: ausschliesslich aus dem lokalen Cache, nie aus dem Netz.
  var eigen = url.pathname.indexOf('/docs/') !== -1 ? DOCS
            : url.pathname.indexOf('/fotos/') !== -1 ? FOTOS
            : url.pathname.indexOf('/tickets/') !== -1 ? TKTS : null;
  if (eigen) {
    e.respondWith(
      caches.open(eigen).then(function (c) { return c.match(req); }).then(function (hit) {
        return hit || new Response('Nicht hinterlegt', {status: 404});
      })
    );
    return;
  }

  // Seiten: erst Netz (damit Updates ankommen), sonst Cache — funktioniert offline in der Medina.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) {
          return r || caches.match('./');
        });
      })
    );
    return;
  }

  // Assets: erst Cache, dann Netz.
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

/* ---------- Versionsauskunft und Sofort-Update ---------- */
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.q === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage(CACHE);
  if (d.q === 'skipWaiting') self.skipWaiting();
});

/* ---------- Erinnerungen ---------- */
// Die App legt die Liste unter DATA ab; hier wird sie ohne offene Seite gelesen.
function dueReminders() {
  return caches.open(DATA).then(function (c) {
    return c.match('./reminders.json');
  }).then(function (r) {
    return r ? r.json() : [];
  }).then(function (list) {
    var now = Date.now();
    return Promise.all((list || []).filter(function (x) {
      return x.when <= now && now - x.when < 36 * 3600e3;
    }).map(function (x) {
      return self.registration.showNotification('Tanger · Tag ' + x.n, {
        body: 'Morgen ' + x.t + ' Uhr · ' + x.h,
        icon: 'icons/icon-192.png',
        badge: 'icons/favicon-32.png',
        tag: 'tng-' + x.id            // gleicher Tag = ersetzt statt stapelt
      });
    }));
  }).catch(function () {});
}

self.addEventListener('periodicsync', function (e) {
  if (e.tag === 'tanger-reminders') e.waitUntil(dueReminders());
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(function (cs) {
      for (var i = 0; i < cs.length; i++) {
        if ('focus' in cs[i]) return cs[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
