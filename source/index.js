'use strict';
/**
 * @file Penguin Basecamp report
 * @author Andres Garcia <andres@zemoga.com>
 * @author insert additional z-peeps here...
 * @copyright Zemoga Inc
 * @version 0.0.1
 */
import path from 'path';
import express from 'express';
import { MongoClient }  from 'mongodb';
import lodash from 'lodash';
import requestURL from 'request';
import { Utils, getCurrentDate } from './utils';
import { ZPeepManager } from './zpeep-manager';

const PERSON_ID = 'person-id';
const PERSON_NAME = 'person-name';

const MIN_HOURS = 7;
const JIRA_DOMAIN = 'https://zemoga.jira.com/browse/';
const JIRA_PATTERN = /([a-z|A-Z]+-[0-9]+)/ig;

//Set Heroku Time Zone
process.env.TZ = 'America/Bogota';

//Creates the server
const app = express();

//Push notification content.
//TODO: Should be retrieved from DB
const pushContent = {
  TITLE: 'Time to report!!!!',
  BODY: 'Avoid the Penguin',
  ICON: '../images/penguin-icon.png',
  TAG: 'penguin-tag',
  RENOTIFY: false,
  REQUIRE_INTERACTION: false,
  VIBRATE: [300, 100, 400],
  DATA: {url: 'https://penguin-report.herokuapp.com'}
};

// Static files
app.use(express.static(path.resolve(__dirname, './../web')));

app.use(function(req, res, next) {
  res.setHeader('Service-Worker-Allowed', '/');
  next();
});

app.get('/', function (req, res) {
  //Will store querystrng Date
  const { currentDate, reportDate } = getCurrentDate(req.query.date);

  //Gets the basecamp data and prints html with info
  // TODO: Handle errors!
  ZPeepManager.getZPeepsTimeReport(reportDate, timeEntries => {

    //Prints the layout of time
    const rows = lodash.map(timeEntries, entryValue => {
      let flag = '', row = '';

      //Pronts each row of data (TODOs)
      entryValue.report.forEach(entry => {

        const entryDescription = entry.description;
        let description = '';


        if (typeof entryDescription !== 'undefined') {
          if (entryDescription === '') {
            description = '<strong class="text-penguined">????????????</strong>';
          } else {
            if (entry['person-id'] === ZPeepManager.getAdminId() && entry.projectName === ZPeepManager.getAdminHiddenProject()) {
              description = '<span class="description-hidden">*hidden</span>';
            } else {
              description = `<span class="text-description">${entryDescription.replace(JIRA_PATTERN, '<a target="_blank" href="' + JIRA_DOMAIN + '$1">$1</a>')}</span>`;  
            }
          }
        } else {
          description = '<span class="penguin-icon">🐧🐧🐧</span>';
        }

        row += `<tr><td>
        ${entry.projectName !== '' ? '<strong>' + entry.projectName  + '</strong><br />': ''}
        ${entry.todoName}
        ${description}</td><td class="tright">${entry.hours}</td></tr>`;
      });

      //Penguined!!!!!!!!!!!!!!!!!!
      if (entryValue.totalHours < MIN_HOURS) {
        flag = 'penguined';
      }

      return `
        <tr>
          <td class="user-name ${flag}" colspan="2">
            <b>${entryValue[PERSON_NAME]}</b>
          </td>
        </tr>
        ${row}
        <tr class="tright text-${flag}">
          <td colspan="2">
            <b>Total Hours: </b> ${entryValue.totalHours}
          </td>
        </tr>`;
    });

    // TODO: Rendering enhanced via templates i.e handlebars
    // Zorro: Can be done, but need a few more advanced tasks,
    // such as copy files to build/ folder
    res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en" class="hide-notifier-button">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <title>Penguin Report</title>
            ${Utils.ogRenderer()}
            <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat+Alternates:400,700">
            <link rel="stylesheet" href="styles/main.css">
            <link rel="manifest" href="manifest.json">
            <link rel="icon" type="image/png" href="images/favicon.png">
          </head>
          <body>
            ${Utils.zPeepsSelectorRenderer(ZPeepManager.peopleIds)}
            <div class="title-container">
              <h1>Penguin UI Report</h1>
              <form action="" method="GET">
                <input name="date" type="date" value="${currentDate}" onchange="this.form.submit();">
              <form>
              <button id="push-notifier">Notify users</button>
            </div>
            <table class="penguin-report">
              ${rows.join('')}
            </table>
            <script src="scripts/main.js"></script>
          </body>
        </html>
    `);
  });
});

app.get('/notify', function (req, res) {
  const { reportDate } = getCurrentDate(req.query.date);
  const pinguinedIds = [];

  console.log('the report date:', reportDate);

  ZPeepManager.getZPeepsTimeReport(reportDate, timeEntries => {

    for (let entryValue of timeEntries) {

      // Penguined!!!!!!!!!!!!!!!!!!
      if (entryValue.totalHours < MIN_HOURS) {
        pinguinedIds.push({[PERSON_ID]: entryValue[PERSON_ID]});
      }
    }

    //There are some penguined people to notify...
    if (pinguinedIds.length) {
      //  TODO: Move DB connection to zpeep manager
      //  Connect to MongoDB and get current registries for oush notification
      MongoClient.connect(process.env.MONGO_CONFIG_URL, (err, db) => {
        // Handle error
        if (err) {
          return res.status(500).send({done: false, results: null});
        }

        console.log('will be', pinguinedIds);
        ZPeepManager.getZPeepsRegistry(db, pinguinedIds, (peepsBody) => {
          console.log('I got pinguined zpeeps!!', peepsBody);
          //Send the push via Google cloud message protocol
          if (lodash.get(peepsBody, 'registration_ids') && peepsBody['registration_ids'].length) {

              //Send push to Google Cloud Manager (GCM) so it will handle push notifications
              requestURL.post({
                  url: process.env.GCM_URL,
                  json: peepsBody,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'key=' + process.env.GCM_AUTH
                  }
                }, (err, httpResponse, body) => {
                  console.log('push sent!!!', body);

                  res.status(200).send(body);
              });
            }
        });
      });
    }

  });
});

/**
 * path URL used to retrieve the push message
 */
app.get('/getpushcontent', function (req, res) {
  var now = new Date();
  var timeStr = now.toLocaleTimeString();

  res.status(200).send({
    title : pushContent.TITLE,
    body: timeStr + ' - ' + pushContent.BODY,
    icon: pushContent.ICON,
    tag: pushContent.TAG,
    renotify: pushContent.RENOTIFY,
    requireInteraction: pushContent.REQUIRE_INTERACTION,
    vibrate: pushContent.VIBRATE,
    data: pushContent.DATA
  });
});

app.get('/sync-user', function (req, res) {
  // sync-user path allows to update the current service work (GCM) identifier by
  // updating and adding a new one if new user
  const { user, registry } = req.query,
    userData = user && user.split('|');

  if (userData && userData[1] && registry) {
    console.log('we have an user!!!!!!!', userData);

    // Get current zpeeps from database
    // TODO: Move DB connection to zpeepManager or proper model
    MongoClient.connect(process.env.MONGO_CONFIG_URL, (err, db) => {
      // Handle error
      if (err) {
        return res.status(500).send({done: false, results: null});
      }

      ZPeepManager.getZPeepCount(userData[0], db, (count) => {
        //Count > 0 means that user is aready registered so we need UPDATE the registration ID
        if (count) {
          ZPeepManager.syncZPeep(db, {personid: userData[0], registrationid : registry}, results => {
            res.status(200).send({ done: true, results });
          });
        } else {
          //Count = 0 means that user is NOT registered so we need to ADD the registration ID
          ZPeepManager.addZPeep(db, {personid: userData[0], registrationid : registry, personname : userData[1]}, results => {
            res.status(200).send({ done: true, results });
          });
        }
      });
    });
  } else {
    return res.status(404).send({ done: false, results: null });
  }
});

// Catch all not found
app.use('*', (req, res) => res.status(404).send(`<h1>404 Not Found</h1>`));

app.listen(process.env.PORT || 80, () =>
  console.log('Server started in port', process.env.PORT || 80));
