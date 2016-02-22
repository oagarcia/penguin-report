'use strict';
/**
 * @file Penguin Basecamp report
 * @author Andres Garcia <andres@zemoga.com>
 * @author insert additional z-peeps here...
 * @copyright Zemoga Inc
 * @version 0.0.1
 */
import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { MongoClient }  from 'mongodb';
import lodash from 'lodash';
import requestURL from 'request';
import { Utils, getCurrentDate } from './utils';
import { ZPeepManager } from './zpeep-manager';

const PERSON_ID = 'person-id';
const PERSON_NAME = 'person-name';

const MIN_HOURS = 7;

//Will store querystrng Date
let reportDate;

//Set Heroku Time Zone
process.env.TZ = 'America/Bogota';

//Creates the server
const app = express();

// Static files
app.use(express.static(path.resolve(__dirname, './../web')));

app.get('/', function (req, res) {
  const { currentDate, reportDate } = getCurrentDate(req.query.date);

  //Gets the basecamp data and prints html with info
  // TODO: Handle errors!
  ZPeepManager.getZPeepsTimeReport(reportDate, timeEntries => {

    //Prints the layout of time
    const rows = lodash.map(timeEntries, entryValue => {
      let flag = '', row = '', header;

      //Pronts each row of data (TODOs)
      entryValue.report.forEach(entry => {
        row += `<tr><td>${typeof entry.description !== 'undefined' ? entry.description !== '' ? entry.description : '????' : '<span class="penguin-icon">🐧🐧🐧</span>'}</td><td class="tright">${entry.hours}</td></tr>`;
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
            <title>Penguin Report</title>
            ${Utils.ogRenderer()}
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
  const { currentDate, reportDate } = getCurrentDate(req.query.date);
  const pinguinedIds = [];

  console.log('the report date:', reportDate);

  ZPeepManager.getZPeepsTimeReport(reportDate, timeEntries => {
    lodash.forEach(timeEntries, (entryValue) => {

      // Penguined!!!!!!!!!!!!!!!!!!
      if (entryValue.totalHours < MIN_HOURS) {
        pinguinedIds.push({[PERSON_ID]: entryValue[PERSON_ID]});
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

            //Send the push via Goole cloud message protocol
            if (lodash.get(peepsBody, 'registration_ids') && peepsBody['registration_ids'].length) {
              requestURL.post(
                {
                  url: process.env.GCM_URL,
                  json: peepsBody,
                  headers: {'Content-Type': 'application/json', 'Authorization': 'key=' + process.env.GCM_AUTH}
                },
                (err, httpResponse, body) => {
                  console.log('push sent!!!', body);
                  res.status(200).send(body);
                }
              );
            }
          });
        });
      } else {
        res.status(200).send({ success: 1, nopinguins: 1 });
      }
    });
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
