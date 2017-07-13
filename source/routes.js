import querystring from 'querystring';
import requestURL from 'request-promise';
import CONFIG from './config';
import { getCurrentDate } from './utils';
import { default as _ } from 'lodash';
import debugModule from 'debug';
import { ZPeepManager } from './zpeep-manager';
import home from './home';

// Debug module
const debug = debugModule('routes');

// Middleware to check authorized users
// function ensureAuthenticated (req, res, next) {
//     if (req.isAuthenticated()) { return next(); }
//     res.redirect('/');
// }

// Push notification content.
// TODO: Should be retrieved from DB
const pushContent = {
    title: 'Hey Dude no has reportado!!!!',
    body: 'Evita el pingüino',
    icon: `${CONFIG.PROTOCOL}${CONFIG.DOMAIN}${CONFIG.ROOT_URI}images/penguin-icon.png`,
    tag: 'penguin-tag',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 400],
    data: { url: CONFIG.PROTOCOL + CONFIG.DOMAIN + CONFIG.ROOT_URI }
};

export default function routes (app, passport) {
    // Redirects to only use https
    app.get('*', (req, res, next) => {
        const fwdProtocolHeader = req.headers['x-forwarded-proto'];

        if (fwdProtocolHeader && fwdProtocolHeader !== 'https') {
            res.redirect(CONFIG.PROTOCOL + CONFIG.DOMAIN + req.url);
        } else {
            next(); /* Continue to other routes if we're not redirecting */
        }
    });

    // Rendering routes

    // Home page
    app.use(home);

    // TODO: Set template rendering
    // app.get('/account', ensureAuthenticated, (req, res) => {
    //     res.render('account', { user: req.user });
    // });

    app.get('/logout', (req, res) => {
        req.logout();
        res.redirect('/'); // Needs to be handled in prod to /penguin-report
    });

    // Redirects TO Google authentication page
    app.get('/' + CONFIG.GOOGLE_AUTH_URL, (req, res, next) => {
        passport.authenticate('google',
            {
                'scope': [
                    'https://www.googleapis.com/auth/plus.login',
                    'https://www.googleapis.com/auth/plus.profile.emails.read'
                ],
                'state': querystring.stringify(req.query)
            })(req, res, next);
    });

    // Redirects FROM Google authentication page
    app.get('/' + CONFIG.GOOGLE_CALLBACK_URL, (req, res, next) => {
        let originalQueryString = req.query.state || '';

        originalQueryString = originalQueryString && '?' + originalQueryString;

        passport.authenticate('google', {
            successRedirect: `${CONFIG.PROTOCOL}${CONFIG.DOMAIN}${CONFIG.ROOT_URI}${originalQueryString}`,
            failureRedirect: `${CONFIG.PROTOCOL}${CONFIG.DOMAIN}${CONFIG.ROOT_URI}`,
            failureFlash: true
        })(req, res, next);
    });

    /**
     * Retrieve users as JSON
     */
    app.get('/api', (req, res) => {
        const { reportDate } = getCurrentDate(req.query.date);
        const { department = '' } = req.query;

        // The 3rd parameter is temporary just to  prevent the UI bot from not working
        ZPeepManager.getZPeepsTimeReport(reportDate, department)
        .then((timeEntries) => {
            res.send(timeEntries);
        })
        .catch(err => res.status(500).send(err));
    });

    app.get('/notify', (req, res) => {
        const { reportDate } = getCurrentDate(req.query.date);
        const { department = '' } = req.query;
        const pinguinedIds = [];

        debug('the report date:', reportDate, department);

        ZPeepManager.getZPeepsTimeReport(reportDate)
        .then((timeEntries) => {
            for (const entryValue of timeEntries) {
                // Penguined!!!!!!!!!!!!!!!!!!
                if (entryValue.totalHours < CONFIG.MIN_HOURS) {
                    pinguinedIds.push({ [CONFIG.PERSON_ID]: entryValue[CONFIG.PERSON_ID] });
                }
            }

            if (!pinguinedIds.length) {
                res.send({ 'nopinguins': true });
            }

            // There are some penguined people to notify...
            debug('will be ', pinguinedIds);
            return ZPeepManager.getZPeepsRegistry(req.db, pinguinedIds);
        })
        .then((peepsBody) => {
            debug('I got pinguined zpeeps!! ', peepsBody);
            // Send the push via Google cloud message protocol
            if (_.get(peepsBody, 'registration_ids') && peepsBody.registration_ids.length) {
                // Send push to Google Cloud Manager (GCM) so it will handle push notifications
                return requestURL.post({
                    url: CONFIG.GCM_URL,
                    json: peepsBody,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'key=' + CONFIG.GCM_AUTH
                    }
                });
            }
            return {};
        }).then((body) => {
            debug('push sent!!!', body);
            res.send(body);
        })
        .catch(err => res.status(500).send(err));
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
        const { title, body, icon, tag, renotify, requireInteraction, vibrate, data } = pushContent;

        const pushData = {
            title,
            body: `${timeStr} - ${body}`,
            icon,
            tag,
            renotify,
            requireInteraction,
            vibrate,
            data
        };

        if (subscriptionID) {
            ZPeepManager.getZPeepByRegistrationId(subscriptionID, req.db)
            .then((zPeep) => {
                const nick = _.get(zPeep, 'nick');

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
        // sync-user path allows to update the current service work (GCM) identifier by either
        // updating an existing one or adding a new one if it is a new user
        const { pushRegistryId } = req.query;
        const basecampId = _.get(req, 'session.passport.user.basecampId');
        const personName = _.get(req, 'session.passport.user.fullName');
        const nickName = _.get(req, 'session.passport.user.nickname');

        if (basecampId && personName && pushRegistryId) {
            debug('we have a user!!!!!!!', personName, basecampId);

            // Get current zpeeps from database
            ZPeepManager.getZPeepCount(basecampId, req.db)
            .then((count) => {
                // Count > 0 means that user is aready registered so we need UPDATE the registration ID
                if (count) {
                    ZPeepManager.syncZPeep(req.db, {
                        basecampId,
                        pushRegistryId,
                        nickName
                    }).then((results) => {
                        res.send({ done: true, results });
                    }).catch((err) => {
                        res.status(500).send({ done: false, results: err });
                    });
                } else {
                    // Count = 0 means that user is NOT registered so we need to ADD the registration ID
                    ZPeepManager.addZPeep(req.db, {
                        basecampId,
                        pushRegistryId,
                        personName,
                        nickName
                    }).then((results) => {
                        res.send({ done: true, results });
                    }).catch((err) => {
                        res.status(500).send({ done: false, results: err });
                    });
                }
            }).catch((err) => res.status(500).send(err));
        } else {
            res.status(404).send({ done: false, results: null });
        }
    });
}
