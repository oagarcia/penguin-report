'use strict';

const fetch = require('node-fetch');
const schedule = require('node-schedule');

/* global console */
//Set the Time Zone
process.env.TZ = 'America/Bogota';

let ruleToday = new schedule.RecurrenceRule();
let ruleYesterday = new schedule.RecurrenceRule();

ruleToday.dayOfWeek = [0, new schedule.Range(1, 5)];
ruleToday.hour = 22;
ruleToday.minute = 30;

ruleYesterday.dayOfWeek = [0, new schedule.Range(1, 5)];
ruleYesterday.hour = 14;
ruleYesterday.minute = 15;

/**
 * Communicates with the API (Heroku) and sends the push
 * @param  {string} dateStr The formated string with the date
 */
let sendPushNotification = function(dateStr) {

  let url = 'https://penguin-report.herokuapp.com/notify/?date=';
  console.log('sending push: ' + url + dateStr);

  fetch(url + dateStr)
    .then(function(response) {
      
      return response.json()
        .then(function(data) {
          console.log('the data', data);
          if (data.nopinguins) {
            console.log('No people to notify!!!!');
          } else {
            if (data.failure) {
              console.log('Notifications sent but with problems> fails: ' + data.failure + ', success: ' + data.success);
            } else {
              console.log(data.success + ' users notified!!!!');
            }
          }
        })
        .catch(function(err) {
          console.error('Unable to retrieve data', err);
        });
    })
    .catch(function(error) {
      console.log('There has been a problem: ' + error.message);
    });
};

/**
 * Ads zero if less than 10 and returns the string
 * @param  {number} x A given number
 * @return {string}   The string putput
 */
let leadingZero = function(x) {
  return x < 10 ? '0' + x : x;
};

/**
 * Takes a Date object and returns a date in the form yyyy-mm-dd
 * @param  {Object} theDate A given Date object
 * @return {string}         The string date format
 */
let getFormatDate = function(theDate) {
  return theDate.getFullYear() + '-' + leadingZero(theDate.getMonth() + 1) + '-' + leadingZero(theDate.getDate());
};
 
schedule.scheduleJob(ruleToday, function() {
  let today = new Date();
  let dateStr = getFormatDate(today);
  sendPushNotification(dateStr);
});

schedule.scheduleJob(ruleYesterday, function() {
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  let dateStr = getFormatDate(yesterday);
  sendPushNotification(dateStr);
});

console.log('Penguins cronjob started!!!!!! local time: ' + new Date());
