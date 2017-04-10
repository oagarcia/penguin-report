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
import { stringify } from 'querystring';
import { Utils, getCurrentDate } from './utils';
import { ZPeepManager } from './zpeep-manager';
import CONFIG from './config';

process.env.TZ = CONFIG.TZ;

//Creates the server
const app = express();

//Push notification content.
//TODO: Should be retrieved from DB
const pushContent = {
    TITLE: 'Hey Dude no has reportado!!!!',
    BODY: 'Evita el pingüino',
    ICON: `${CONFIG.PROTOCOL}${CONFIG.DOMAIN}${CONFIG.ROOT_URI}/images/penguin-icon.png`,
    TAG: 'penguin-tag',
    RENOTIFY: false,
    REQUIRE_INTERACTION: false,
    VIBRATE: [300, 100, 400],
    DATA: { url: CONFIG.PROTOCOL + CONFIG.DOMAIN + CONFIG.ROOT_URI }
};

//Redirects to only use https
app.get('*', (req, res, next) => {
    const fwdProtocolHeader = req.headers['x-forwarded-proto'];

    if (fwdProtocolHeader && fwdProtocolHeader !== 'https') {
        res.redirect(CONFIG.PROTOCOL + CONFIG.DOMAIN + req.url);
    } else {
        next(); /* Continue to other routes if we're not redirecting */
    }
});

app.get('/', (req, res) => {
    //Will store querystrng Date
    const { currentDate, reportDate } = getCurrentDate(req.query.date);

    //Gets the basecamp data and prints html with info
    // TODO: Handle errors!
    ZPeepManager.getZPeepsTimeReport(reportDate, (timeEntries) => {

        //Prints the layout of time
        const rows = lodash.map(timeEntries, (entryValue) => {
            let flag = '', row = '';

      //Pronts each row of data (TODOs)
            entryValue.report.forEach((entry) => {

                const entryDescription = entry.description;
                let description = '';

                if (typeof entryDescription !== 'undefined') {
                    if (entryDescription === '') {
                        description = '<strong class="text-penguined">????????????</strong>';
                    } else {
                        if (entry['person-id'] === ZPeepManager.getAdminId() && entry.projectName === ZPeepManager.getAdminHiddenProject()) {
                            description = '<span class="description-hidden">*hidden</span>';
                        } else {
                            description = `<span class="text-description">${entryDescription.replace(CONFIG.JIRA_PATTERN, '<a target="_blank" href="' + CONFIG.JIRA_DOMAIN + '$1">$1</a>')}</span>`;
                        }
                    }
                } else {
                    description = '<span class="penguin-icon">🐧🐧🐧</span>';
                }

                row += `<tr><td>
                ${entry.projectName !== '' ? '<strong>' + entry.projectName  + '</strong><br />' : ''}
                ${entry.todoName}
                ${description}</td><td class="tright">${entry.hours}</td></tr>`;
            });

            //Penguined!!!!!!!!!!!!!!!!!!
            if (entryValue.totalHours < CONFIG.MIN_HOURS) {
                flag = 'penguined';
            }

            return `
            <tr>
            <td class="user-name ${flag}" colspan="2">
                <b>${entryValue[CONFIG.PERSON_NAME]}</b>
            </td>
            </tr>
            ${row}
            <tr class="tright text-${flag}">
            <td colspan="2">
                <b>Total Hours: </b> ${entryValue.totalHours}
            </td>
            </tr>`;
        });

        const { STORAGE_IDENTIFIER, STORAGE_NAME, ROOT_URI } = CONFIG;

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
            <link rel="stylesheet" href="${CONFIG.ROOT_URI}/styles/main.css">
            <link rel="manifest" href="${CONFIG.ROOT_URI}/manifest.json">
            <link rel="icon" type="image/png" href="${CONFIG.ROOT_URI}/images/favicon.png">
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
            <script type="application/json" id="data-env">
            ${JSON.stringify({ STORAGE_IDENTIFIER, STORAGE_NAME, ROOT_URI })}
            </script>
            <script src="${CONFIG.ROOT_URI}/scripts/main.js"></script>
          </body>
        </html>
    `);
    });
});

/**
 * Retrieve users as JSON
 */
app.get('/api', (req, res) => {
    const { reportDate } = getCurrentDate(req.query.date);

    ZPeepManager.getZPeepsTimeReport(reportDate, (timeEntries) => {
        res.send(timeEntries);
    });
});

app.get('/notify', (req, res) => {
    const { reportDate } = getCurrentDate(req.query.date);
    const pinguinedIds = [];

    console.log('the report date:', reportDate);

    ZPeepManager.getZPeepsTimeReport(reportDate, (timeEntries) => {

        for (const entryValue of timeEntries) {

            // Penguined!!!!!!!!!!!!!!!!!!
            if (entryValue.totalHours < CONFIG.MIN_HOURS) {
                pinguinedIds.push({ [CONFIG.PERSON_ID]: entryValue[CONFIG.PERSON_ID] });
            }
        }

         //There are some penguined people to notify...
        if (pinguinedIds.length) {
            //  TODO: Move DB connection to zpeep manager
            //  Connect to MongoDB and get current registries for oush notification
            MongoClient.connect(CONFIG.MONGO_CONFIG_URL, (err, db) => {
                // Handle error
                if (err) {
                    return res.status(500).send({ done: false, results: null });
                }

                console.log('will be', pinguinedIds);
                ZPeepManager.getZPeepsRegistry(db, pinguinedIds, (peepsBody) => {
                    console.log('I got pinguined zpeeps!!', peepsBody);
                    //Send the push via Google cloud message protocol
                    if (lodash.get(peepsBody, 'registration_ids') && peepsBody.registration_ids.length) {

                        //Send push to Google Cloud Manager (GCM) so it will handle push notifications
                        requestURL.post({
                            url: CONFIG.GCM_URL,
                            json: peepsBody,
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'key=' + CONFIG.GCM_AUTH
                            }
                        }, (requestErr, httpResponse, body) => {
                            console.log('push sent!!!', body);

                            res.status(200).send(body);
                        });
                    }
                });
            });
        } else {
            res.status(200).send('{"nopinguins": true}');
        }

    });
});

/**
 * path URL used to retrieve the push message
 */
app.get('/getpushcontent', (req, res) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const subscriptionID = req.query.regId;
    const response = res.status(200);
    const DEFAULT_NICK = 'Dude';
    const pushData = {
        title: pushContent.TITLE,
        body: timeStr + ' - ' + pushContent.BODY,
        icon: pushContent.ICON,
        tag: pushContent.TAG,
        renotify: pushContent.RENOTIFY,
        requireInteraction: pushContent.REQUIRE_INTERACTION,
        vibrate: pushContent.VIBRATE,
        data: pushContent.DATA
    };

    if (subscriptionID) {
        ZPeepManager.getZPeepByRegistrationId(subscriptionID).then((zPeep) => {
            const nick = lodash.get(zPeep, 'nick');

            if (nick) {
                pushData.title = pushData.title.replace(DEFAULT_NICK, nick);
            }
            response.send(pushData);
        });
    } else {
        response.send(pushData);
    }
});

app.get('/sync-user', (req, res) => {
    // sync-user path allows to update the current service work (GCM) identifier by
    // updating and adding a new one if new user
    const { user, registry } = req.query,
        userData = user && user.split('|');

    if (userData && userData[1] && registry) {
        console.log('we have an user!!!!!!!', userData);

        // Get current zpeeps from database
        // TODO: Move DB connection to zpeepManager or proper model
        MongoClient.connect(CONFIG.MONGO_CONFIG_URL, (err, db) => {
            // Handle error
            if (err) {
                return res.status(500).send({ done: false, results: null });
            }

            ZPeepManager.getZPeepCount(userData[0], db, (count) => {
                //Count > 0 means that user is aready registered so we need UPDATE the registration ID
                if (count) {
                    ZPeepManager.syncZPeep(db, { personid: userData[0], registrationid: registry }, (results) => {
                        res.status(200).send({ done: true, results });
                    });
                } else {
                    //Count = 0 means that user is NOT registered so we need to ADD the registration ID
                    ZPeepManager.addZPeep(db, {
                        personid: userData[0],
                        registrationid: registry,
                        personname: userData[1]
                    }, (results) => {
                        res.status(200).send({ done: true, results });
                    });
                }
            });
        });
    } else {
        res.status(404).send({ done: false, results: null });
    }
});

if (CONFIG.NODE_ENV === 'development') {
    // allows service worker to run
    // In prod, this is handled by nginx
    app.use((req, res, next) => {
        res.setHeader('Service-Worker-Allowed', CONFIG.ROOT_URI || '/');
        next();
    });

    // Static files
    app.use(CONFIG.ROOT_URI, express.static(path.resolve(__dirname, './../web')));

    app.all('/penguin-report/*', (req, res) => {
        console.log('Attempt to redirect call', req.path);
        res.redirect(`/${req.params[0]}?${stringify(req.query)}`);
    });
}

// Catch all not found
app.use('*', (req, res) => res.status(404).send('<h1>404 Not Found</h1>'));

app.listen(CONFIG.PORT || 3000, () =>
    console.log('Server started in port', CONFIG.PORT || 3000, 'Node env:', CONFIG.NODE_ENV));
