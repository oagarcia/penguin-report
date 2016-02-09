'use strict';
/**
 * @file Main Client app
 * @copyright Zemoga Inc
 */

var PenguinReport = {

  STORAGE_IDENTIFIER : 'penguin-id',
  STORAGE_NAME : 'penguin-name',

  /**
   * Registers in the push notification
   * @return {[type]} [description]
   */
  register: function() {
    if ('serviceWorker' in navigator) {
      console.log('Service Worker is supported');

      navigator.serviceWorker.register('scripts/sw.js').then(function(reg) {
        console.log(':)', reg);
        reg.pushManager.subscribe({
          userVisibleOnly: true
        }).then(function(sub) {
          var endpointParts = sub.endpoint.split('/');
          var pushRegistry = endpointParts[endpointParts.length - 1];

          console.log('endpoint here:', sub.endpoint);

          if (localStorage.getItem(PenguinReport.STORAGE_IDENTIFIER)) {
            fetch('/sync-user/?user=' + localStorage.getItem(PenguinReport.STORAGE_IDENTIFIER) + '&registry=' + pushRegistry).then(function(response) {
              if (response.status !== 200) {  
                // Either show a message to the user explaining the error  
                // or enter a generic message and handle the
                // onnotificationclick event to direct the user to a web page  
                console.log('Looks like there was a problem. Status Code: ' + response.status);  
                throw new Error();  
              }
              return response.json().then(function(data) {
                console.log('the data', data);
              }).catch(function(err) {
                console.error('Unable to retrieve data', err);
              });
            });
          }
        });
      }).catch(function(err) {
        console.log(':(', err);
      });

      // We need the service worker registration to check for a subscription
      navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        // Do we already have a push message subscription?
        serviceWorkerRegistration.pushManager.getSubscription()
          .then(function(subscription) {
            // Enable any UI which subscribes / unsubscribes from
            // push messages.
            console.log('the suscription', subscription);

            if (subscription && subscription.endpoint) {
              console.log('and the suscription is ', subscription.endpoint);
            }
          })
          .catch(function(err) {
            console.warn('Error during getSubscription()', err);
          });
      });
    }
  },

  /**
   * Initializes and request registry
   */
  init: function() {

    var documentElement = document.querySelector('html');
    var zPeepsList = document.getElementById('z-peeps');
    var zPeepsIdentify = document.getElementById('z-peeps-identify');
    var pushNotifier = document.getElementById('push-notifier');

    //Send push notification to pinguined users
    pushNotifier.addEventListener('click', function() {
      pushNotifier.disabled = true;
      pushNotifier.textContent = 'Notifying...';
      fetch('/notify/' + location.search).then(function(response) {
        if (response.status !== 200) { 
          pushNotifier.textContent = 'Error notifyng'; 
          console.log('Looks like there was a problem. Status Code: ' + response.status);  
          throw new Error();  
        }
        return response.json().then(function(data) {
          console.log('the data', data);
          if (data.nopinguins) {
            pushNotifier.textContent = 'No people to notify!!!!';   
          } else {
            if (data.failure) {
              pushNotifier.textContent = 'Notifications sent but with problems';     
            } else {
              pushNotifier.textContent = 'Users notified!!!!';   
            }
            
          }
          
        }).catch(function(err) {
          pushNotifier.textContent = 'Error notifyng'; 
          console.error('Unable to retrieve data', err);
        });
      });
    }, false);

    zPeepsIdentify.addEventListener('click', function() {

      var selectedPeep = zPeepsList.options[zPeepsList.selectedIndex];

      if(selectedPeep.value) {
        localStorage.setItem(PenguinReport.STORAGE_IDENTIFIER, zPeepsList.value + '|' + selectedPeep.text);
        documentElement.classList.remove('z-peeps-visible');
        PenguinReport.register();
      }
    }, false);

    if (!localStorage.getItem(PenguinReport.STORAGE_IDENTIFIER)) {
      documentElement.classList.add('z-peeps-visible');
    } else {
      PenguinReport.register();
    }
  }
};

//Initialize
PenguinReport.init();

