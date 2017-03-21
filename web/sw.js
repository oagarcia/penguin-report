/**
 * Service worker handles push notifications
 * @author: Andres Garcia - Zemoga Inc
 */

'use strict';
/* global self */
/* global clients */
/* global registration */
/* global console */
/* global fetch */

//Will store clicked push URL (filled out when content data retrieved)
var url = '';
var ROOT_URI = '/penguin-report';

console.log('Started', self);

//Install the push
self.addEventListener('install', function(event) {
  self.skipWaiting();
  console.log('Installed', event);
});

//Activates the push
self.addEventListener('activate', function(event) {
  console.log('Activated', event);
});

//Sends the push
self.addEventListener('push', function(event) {
  var apiPath = ROOT_URI + '/getpushcontent/';

  event.waitUntil(
    registration.pushManager.getSubscription()
    .then(function(subscription) {

      //Adds the suscription token in case it is needed for custom notification messages per user
      if (subscription && subscription.endpoint) {
        apiPath = apiPath + '?regId=' + subscription.endpoint.split('/').slice(-1);
      }

      return fetch(apiPath)
        .then(function(response) {
          if (response.status !== 200) {
            console.log('Problem Occurred: ' + response.status);
            throw new Error();
          }

          return response.json();
        })
        .then(function(data) {

          //Reassign URL as needed
          url = data.data.url;

          return self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            tag: data.tag,
            data: data.data
          });
        })
        .catch(function(err) {
          console.log('Error retrieving data: ' + err);
        });
    })
  );
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
