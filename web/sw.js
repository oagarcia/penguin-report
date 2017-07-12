/**
 * Service worker handles push notifications
 * @author: Andres Garcia - Zemoga Inc
 */

'use strict';
/* global self */
/* global clients */
/* global console */
/* global fetch */

// Will store clicked push URL (filled out when content data retrieved)
let url = '';
const ROOT_URI = '/penguin-report';

console.log('Started', self);

// Install the push
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('Installed', event);
});

// Activates the push
self.addEventListener('activate', (event) => {
    console.log('Activated', event);
});

// Sends the push
self.addEventListener('push', (event) => {
    let apiPath = ROOT_URI + '/getpushcontent/';

    event.waitUntil(
        self.registration.pushManager.getSubscription()
        .then((subscription) => {
            // Adds the suscription token in case it is needed for custom notification messages per user
            if (subscription && subscription.endpoint) {
                apiPath += '?regId=' + subscription.endpoint.split('/').slice(-1);
            }

            return fetch(apiPath);
        })
        .then((response) => {
            if (response.status !== 200) {
                console.log('Problem Occurred: ' + response.status);
                throw new Error();
            }

            return response.json();
        })
        .then((notificationData) => {
            console.log('preparing message to be sent');
            // Reassign URL as needed
            url = notificationData.data.url;
            const { title, body, icon, tag, data, renotify, vibrate, requireInteraction } = notificationData;

            return self.registration.showNotification(title, {
                body,
                icon,
                tag,
                data,
                renotify,
                requireInteraction,
                vibrate
            });
        })
        .then(() => {
            console.log('client notification sent!!!!');
        })
        .catch((err) => {
            console.log('Error retrieving data: ' + err);
        })
  );
});

// Opens the penguin report if needed
self.addEventListener('notificationclick', (event) => {
    console.log('Notification click: tag ', event.notification.tag);
    event.notification.close();
    event.waitUntil(
    clients.matchAll({
        type: 'window'
    })
    .then((windowClients) => {
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];

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
