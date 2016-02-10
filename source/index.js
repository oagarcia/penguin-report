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
import {MongoClient}  from 'mongodb';
import lodash from 'lodash';
import requestURL from 'request';
import {Utils} from './utils';
import {ZPeepManager} from './zpeep-manager';
import {KEYS} from './keys';

const PERSON_ID = 'person-id';
const PERSON_NAME = 'person-name';

const MIN_HOURS = 7;

//Will store querystrng Date
let reportDate;

//Set Heroku Time Zone
process.env.TZ = 'America/Bogota';

//Creates the server
//TODO: Migrate to something like express in order to abstract lot of stuff
//and easilly call external assets as css, images, etc.
http.createServer((request, response) => {
  let urlPath = url.parse(request.url, true);
  let queryData = urlPath.query;
  let currentDate = queryData.date;
  console.log(urlPath.pathname);

  if (urlPath.pathname === '/') {

    //Index is requested
    response.writeHead(200, {'content-type' : Utils.CONTENT_TYPE['.html']});

    // If date is provided in querystring date report is that date
    // else will be today date
    if (currentDate) {
      reportDate = currentDate.replace(/\-/g, '');
    } else {
      currentDate = Utils.toDateInputValue(new Date()); 
      reportDate = Utils.toDateInputValue(new Date(), true);
    }

    //TODO: Rendering enhanced via templates i.e handlebars
    response.write(`
      <!DOCTYPE html>
      <html lang="en" class="hide-notifier-button">
        <head>
          <meta charset="UTF-8">
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
      `);

    ZPeepManager.getZPeepsTimeReport(reportDate, timeEntries => {
      //Print the layout of time entries by iterating the grouped object
      lodash.forOwn(timeEntries, (entryValue) => {
        let totalHours = 0;
        let flag = '';
        let header = 
          `<tr>
            <td class="user-name {{flag}}" colspan="2">
              <b>${entryValue[0][PERSON_NAME]}</b>
            </td>
          </tr>`;
        let row = '';

        entryValue.forEach(entry => {
          totalHours += entry.hours;
          row += `<tr><td>${typeof entry.description !== 'undefined' ? entry.description !== '' ? entry.description : '????' : '😂😂😂'}</td><td class="tright">${entry.hours}</td></tr>`;
        });

        //Penguined!!!!!!!!!!!!!!!!!!
        if (totalHours < MIN_HOURS) {
          flag = 'penguined';
        }

        response.write(header.replace('{{flag}}', flag));
        response.write(row);
        response.write(`<tr class="tright text-${flag}"><td colspan="2"><b>Total Hours: </b> ${totalHours} </td></tr>`);  
        
      });

      response.end(`
        </table>
        <script src="scripts/main.js"></script>
        </body>
        </html>
      `);
    });
  } else if (urlPath.pathname === '/notify/') {

    // If date is provided in querystring date report is that date
    // else will be today date
    if (currentDate) {
      reportDate = currentDate.replace(/\-/g, '');
    } else {
      reportDate = Utils.toDateInputValue(new Date(), true);
    }
    
    //Notify path points to  a service that creates the push notification for pinguined zpeeps
    //Provide a JSON content-type header in order to display GCM result
    response.writeHead(200, {'content-type' : Utils.CONTENT_TYPE['.json']});

    //Will store pinguined ids for push
    let pinguinedIds = [];
    console.log('the report date: ', reportDate);
    ZPeepManager.getZPeepsTimeReport(reportDate, timeEntries => {

      lodash.forOwn(timeEntries, (entryValue) => {
        let totalHours = 0;
        entryValue.forEach(entry => {
          totalHours += entry.hours;
        });

        //Penguined!!!!!!!!!!!!!!!!!!
        if (totalHours < MIN_HOURS) {
          pinguinedIds.push({[PERSON_ID]: entryValue[0][PERSON_ID]});
        }
      });

      //There are some penguined people to notify...
      if (pinguinedIds.length) {
        //TODO: Move DB connection to zpeep manager
        //Connect to MongoDB and get current registries for oush notification
        MongoClient.connect(KEYS.MONGO_CONFIG.URL, (err, db) => {
          console.log('will be', pinguinedIds);
          ZPeepManager.getZPeepsRegistry(db, pinguinedIds, (peepsBody) => {
            console.log('I got pinguined zpeeps!!', peepsBody);

            //Send the push via Goole cloud message protocol
            if (lodash.get(peepsBody, 'registration_ids') && peepsBody['registration_ids'].length) {
              requestURL.post(
                {
                  url: KEYS.GCM.URL,
                  json: peepsBody,
                  headers: {'Content-Type': 'application/json', 'Authorization': 'key=' + KEYS.GCM.AUTH}
                },
                (err, httpResponse, body) => {
                  console.log('push sent!!!', body);
                  response.end(JSON.stringify(body));
                }
              );
            }
          });
        });
      } else {
        response.end(`{"success":1, "nopinguins" :1}`);
      }
    });
  } else if (urlPath.pathname === '/sync-user/') {

    response.writeHead(200, {'content-type' : Utils.CONTENT_TYPE['.json']});

    if (queryData && queryData.user && queryData.user.split('|')[1] && queryData.registry) {

      let userData = queryData.user.split('|');

      console.log('we have an user!!!!!!!', queryData.user);

      //TODO: Move DB connection to zpeepManager or proper model
      MongoClient.connect(KEYS.MONGO_CONFIG.URL, (err, db) => {

        ZPeepManager.getZPeepCount(userData[0], db, (count) => {

          //Count > 0 means that user is aready registered so we need update the registration ID
          if (count) {
            ZPeepManager.syncZPeep(db, {personid: userData[0], registrationid : queryData.registry}, results => {
              response.end(`{"done": true, "results": ${results}}`);
            });
          } else {
            //Count = 0 means that user is NOT registered so we need to add the registration ID
            ZPeepManager.addZPeep(db, {personid: userData[0], registrationid : queryData.registry, personname : userData[1]}, results => {
              response.end(`{"done": true, "results": ${results}}`);
            });
          }
        });
      });
    } else {
      response.end(`{"done": false, "results": ${null}`);
    }
  } else {
    let extname = path.extname(urlPath.pathname);
    //let filename = path.basename(urlPath.pathname);
    console.log('hello world', extname);
    //Alowed extensions will be loaded in web folder
    switch (extname) {
      case '.js':
      case '.json':
      case '.css':
      case '.gif':
      case '.png':
      fs.readFile(__dirname + '/../web' + urlPath.pathname, function (err, data) {
        console.log('searching', __dirname + '/../web' + urlPath.pathname);
        if (err) {
          Utils.notFoundRenderer(response);
          return;
        }
        response.writeHead(200, { 'Content-Type': Utils.CONTENT_TYPE[extname]});

        //Image or not!!!
        if (extname === '.gif' || extname === '.png') {
          response.end(data, 'binary');
        } else {
          response.end(data.toString('utf8'));  
        }
      });
      break;
      default:
      Utils.notFoundRenderer(response);
    }
  }
}).listen(process.env.PORT || 80);
