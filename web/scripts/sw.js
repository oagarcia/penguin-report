/**
 * Service worker handles push notifications
 * @author: Zemoga Inc
 */

'use strict';
/* global self */
/* global clients */

var url = 'https://zemogatime.basecamphq.com/';

console.log('Started', self);
self.addEventListener('install', function(event) {
  self.skipWaiting();
  console.log('Installed', event);
});
self.addEventListener('activate', function(event) {
  console.log('Activated', event);
});
self.addEventListener('push', function(event) {
  console.log('Push message', event);
  var title = 'Timesheeet!!!';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: 'Avoid the penguin. Check your reports!!',
      icon: '../images/penguin-icon.png',
      tag: 'penguin-tag'
    }));
});

//Opens basecamphq if needed
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click: tag ', event.notification.tag);
  event.notification.close();
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf(url) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
