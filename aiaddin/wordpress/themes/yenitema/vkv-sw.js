/**
 * VKV Tema — Service Worker (Web Push)
 * Konum: https://siteniz.com/vkv-sw.js  (kök scope)
 */

const VKV_CACHE = 'vkv-v1';
const VKV_OFFLINE = '/';

// Install
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VKV_CACHE).then(function(cache) {
      return cache.addAll([VKV_OFFLINE]).catch(function(){});
    })
  );
});

// Activate
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== VKV_CACHE; }).map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return clients.claim(); })
  );
});

// Push event — bildirimi göster
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}

  var title   = data.title || 'Yeni Bildirim';
  var options = {
    body:    data.body   || '',
    icon:    data.icon   || '/wp-content/themes/vkv-wp/assets/img/logo-192.png',
    badge:   data.badge  || '/wp-content/themes/vkv-wp/assets/img/badge-72.png',
    data:    { url: data.url || '/' },
    vibrate: [200, 100, 200],
    tag:     'vkv-notification',
    renotify: true,
    actions: [
      { action: 'open',  title: '🔗 Habere Git' },
      { action: 'close', title: '✕ Kapat' },
    ],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanınca
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'close') return;

  var url = (e.notification.data && e.notification.data.url) ? e.notification.data.url : '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Fetch — network-first, offline fallback
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  // Admin ve API isteklerini atla
  if (url.pathname.startsWith('/wp-admin') || url.pathname.startsWith('/wp-json')) return;

  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match(VKV_OFFLINE);
      });
    })
  );
});
