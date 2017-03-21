'use strict';

const fetch = require('node-fetch');
const schedule = require('node-schedule');

/* ------------------------------------------
Start - Now requires the app running any port
------------------------------------------ */
// const http = require('http');
// const PORT = 9090;
// const server = http.createServer((request, response) => response.end());

// server.listen(PORT, () => {
//   //Callback triggered when server is successfully listening.
//   console.log('Server listening on: http://localhost:%s', PORT);
// });

/* -----------------------------------------
End - Now requires the app running any port
----------------------------------------- */

/* global console */
//Set the Time Zone
process.env.TZ = 'America/Bogota';

const ruleToday = new schedule.RecurrenceRule();
const ruleYesterday = new schedule.RecurrenceRule();

ruleToday.dayOfWeek = [new schedule.Range(1, 5)];
ruleToday.hour = 21;
ruleToday.minute = 30;

ruleYesterday.dayOfWeek = [new schedule.Range(1, 5)];
ruleYesterday.hour = 14;
ruleYesterday.minute = 15;

/**
 * Communicates with the API (Heroku) and sends the push
 * @param  {string} dateStr The formated string with the date
 */
const sendPushNotification = function (dateStr) {

  const url = 'https://penguin-report.herokuapp.com/notify/?date=';
  console.log('sending push: ' + url + dateStr);

  fetch(url + dateStr)
    .then((response) => {
      
      return response.json()
        .then((data) => {
          console.log('the data', data);
          if (data.nopinguins) {
            console.log(new Date() + ' No people to notify!!!!');
          } else {
            if (data.failure) {
              console.log(new Date() + ' Notifications sent but with problems > fails: ' + data.failure + ', success: ' + data.success);
            } else {
              console.log(new Date() + ' ' + data.success + ' users notified!!!!');
            }
          }
        })
        .catch((err) => {
          console.error(new Date() + ' Unable to retrieve data: ' + err);
        });
    })
    .catch((error) => {
      console.log(new Date() + ' There has been a problem: ' + error.message);
    });
};

/**
 * Ads zero if less than 10 and returns the string
 * @param  {number} x A given number
 * @return {string}   The string putput
 */
const leadingZero = function (x) {
  return x < 10 ? '0' + x : x;
};

/**
 * Takes a Date object and returns a date in the form yyyy-mm-dd
 * @param  {Object} theDate A given Date object
 * @return {string}         The string date format
 */
const getFormatDate = function (theDate) {
  return theDate.getFullYear() + '-' + leadingZero(theDate.getMonth() + 1) + '-' + leadingZero(theDate.getDate());
};
 
schedule.scheduleJob(ruleToday, () => {
  const today = new Date();
  const dateStr = getFormatDate(today);
  sendPushNotification(dateStr);
});

schedule.scheduleJob(ruleYesterday, () => {
  const today = new Date();
  const yesterday = new Date();

  const todayDayNumber = today.getDay();
  let daysBefore = 1;

  //If today is monday, check friday:
  if (todayDayNumber === 1) {
    daysBefore = 3;
  }

  yesterday.setDate(yesterday.getDate() - daysBefore);

  const dateStr = getFormatDate(yesterday);
  sendPushNotification(dateStr);
});

console.log('Penguins cronjob started!!!!!! local time: ' + new Date());
