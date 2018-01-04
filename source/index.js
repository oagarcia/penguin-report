'use strict';
/**
 * @file Penguin Basecamp report
 * @author Andres Garcia <andres@zemoga.com>
 * @author insert additional z-peeps here...
 * @copyright Zemoga Inc
 * @version 1.1.0
 */
import path from 'path';
import express from 'express';
import { MongoClient } from 'mongodb';
import { stringify } from 'querystring';
import debugModule from 'debug';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import session from 'express-session';
import connectRedis from 'connect-redis';
import CONFIG from './config';
import routes from './routes';
import { Authorization } from './authorization';
import flash from 'connect-flash';

let mongodb;

// Global timezone
process.env.TZ = CONFIG.TZ;

const gracefulExit = function () {
    if (!mongodb) process.exit(0);

    mongodb.close(() => {
        process.exit(0);
    });
};

// If app is closed, disconnect from DB
process
    .on('SIGINT', gracefulExit)
    .on('SIGTERM', gracefulExit);

// Creates the server
const app = express();

// trust first proxy
app.set('trust proxy', 1);

// Redis initialization to store session
const RedisStore = connectRedis(session);

// Debug module
const debug = debugModule('index');

// Initializes the authorization module via passport
Authorization.init(passport);

// Global middleware
app.use((req, res, next) => {
    // for env environment, sets the correct path for service worker scope.
    if (CONFIG.NODE_ENV === 'development') {
        res.setHeader('Service-Worker-Allowed', CONFIG.WORKER_SCOPE);
    }

    // makes Mongo available to the entire application
    MongoClient.connect(CONFIG.MONGO_CONFIG_URL, (err, db) => {
        if (err) return next(err);
        mongodb = db;
        req.db = mongodb;
        next();
    });

    const afterResponse = () => {
        // once response is sent, disconnects from DB
        mongodb && mongodb.close();
    };

    // if Node App is closed, restarts
    // req.on('end', () => { req.db.close(); });
    res.on('finish', afterResponse);
    res.on('close', afterResponse);
});

// Static files for development environment
if (CONFIG.NODE_ENV === 'development') {
    app.use('/', express.static(path.resolve(__dirname, './../web')));

    // Redirects local notifications pointed to penguin-report subfolder to root path
    app.all('/penguin-report/*', (req, res) => {
        debug('Attempt to redirect call', req.path);
        res.redirect(`/${req.params[0]}?${stringify(req.query)}`);
    });
}

// Express App Config
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: CONFIG.SESSION_COOKIE_SECRET,
    name: 'penguinsession',
    store: new RedisStore({
        host: CONFIG.REDIS_HOST,
        port: 6379,
        logErrors: CONFIG.NODE_ENV === 'development'
    }),
    proxy: true,
    resave: true,
    saveUninitialized: true,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: CONFIG.NODE_ENV !== 'development' // Must be set to true in production
    }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Routes
routes(app, passport);

// Catch all not found
app.use('*', (req, res) => res.status(404).send('<h1>404 Not Found</h1>'));

app.listen(CONFIG.PORT || 3000, () =>
    debug('Server started in port', CONFIG.PORT || 3000, 'Node env:', CONFIG.NODE_ENV));
