'use strict';
/**
 * @file Data related operations
 * @copyright Zemoga Inc
 * @author Andres Garcia <andres@zemoga.com>
 */

import requestURL from 'request-promise';
import { parseString } from 'xml2js';
import lodash from 'lodash';
import map from 'lodash/fp/map';
import { MongoClient }  from 'mongodb';
import flatten from 'lodash/fp/flatten';
//import util from 'util';
import cheerio from 'cheerio';
import Promise from 'bluebird';
import CONFIG from './config';
import debugModule from 'debug';


//Debug module
const debug = debugModule('zpeep-manager');
const { PERSON_NAME, PERSON_ID, PERSON_NICK } = CONFIG;
const ADMIN_USER_ID = '870268';
const HIDDEN_PROJECT_NAME = 'Zemoga-Directors Team';

/**
 * Deals with data
 * @namespace ZPeepManager
 */
const ZPeepManager = {

    Z_PEEPS_COLLECTION_NAME: 'zpeeps',

    getAdminId () {
        return ADMIN_USER_ID;
    },

    getAdminHiddenProject () {
        return HIDDEN_PROJECT_NAME;
    },

    //TODO: IDs should be retrieved from people.xml
    //take into account that it will retrieve every z-peep from given company and
    //there is not such thing like filter by UI dept
    peopleIds: [
    { [PERSON_NAME]: 'Aiman Samad', [PERSON_ID]: '10739872', hours: 0, [PERSON_NICK]: 'Aiman' },
    { [PERSON_NAME]: 'Alejandro Sanmartin', [PERSON_ID]: '1243347', hours: 0, [PERSON_NICK]: 'Pastor' },
    { [PERSON_NAME]: 'Andres Garcia', [PERSON_ID]: ADMIN_USER_ID, hours: 0, [PERSON_NICK]: 'Proff' },
    { [PERSON_NAME]: 'Andres Zorro', [PERSON_ID]: '10997106', hours: 0, [PERSON_NICK]: 'Mr Fox' },
    { [PERSON_NAME]: 'Camilo Soto', [PERSON_ID]: '11527725', hours: 0, [PERSON_NICK]: 'Camilin' },
    { [PERSON_NAME]: 'Cesar Guerrero', [PERSON_ID]: '11842419', hours: 0, [PERSON_NICK]: 'Mono' },
    { [PERSON_NAME]: 'Daniel Camilo Daza', [PERSON_ID]: '11749582', hours: 0, [PERSON_NICK]: 'Danny' },
    { [PERSON_NAME]: 'Edin Rivera', [PERSON_ID]: '11657876', hours: 0, [PERSON_NICK]: 'Edin' },
    { [PERSON_NAME]: 'Fredy Urrego', [PERSON_ID]: '11915855', hours: 0, [PERSON_NICK]: 'Fredy' },
    { [PERSON_NAME]: 'German Galvis', [PERSON_ID]: '1645970', hours: 0, [PERSON_NICK]: 'Fello' },
    { [PERSON_NAME]: 'Gustavo Morales', [PERSON_ID]: '11934744', hours: 0, [PERSON_NICK]: 'Gus' },
    { [PERSON_NAME]: 'Jose Conde', [PERSON_ID]: '11925814', hours: 0, [PERSON_NICK]: 'Jose' },
    { [PERSON_NAME]: 'Juan Pablo Vallejo', [PERSON_ID]: '11943154', hours: 0, [PERSON_NICK]: 'Juan P' },
    { [PERSON_NAME]: 'Luis Carlos Chivata', [PERSON_ID]: '10581568', hours: 0, [PERSON_NICK]: 'Chivata' },
    { [PERSON_NAME]: 'Maria Antonia Serna', [PERSON_ID]: '12108160', hours: 0, [PERSON_NICK]: 'ANTONIA' },
    { [PERSON_NAME]: 'Mauricio Cubillos', [PERSON_ID]: '11360590', hours: 0, [PERSON_NICK]: 'Mao' },
    { [PERSON_NAME]: 'Mauricio Florez', [PERSON_ID]: '12131303', hours: 0, [PERSON_NICK]: 'Max' },
    { [PERSON_NAME]: 'Nicolas Lopez', [PERSON_ID]: '12213547', hours: 0, [PERSON_NICK]: 'Nico' },
    { [PERSON_NAME]: 'Orlando Donado', [PERSON_ID]: '11926495', hours: 0, [PERSON_NICK]: 'Orly' }
    // {[PERSON_NAME]: 'Javier Jaimes', [PERSON_ID]: '11926506', hours: 0},
    // {[PERSON_NAME]: 'Andres Acevedo', [PERSON_ID]: '11890705', hours: 0},
    // {[PERSON_NAME]: 'Carlos Acero', [PERSON_ID] : '12109484', hours: 0},
    // {[PERSON_NAME]: 'Nicolas Muñoz', [PERSON_ID]: '12224662', hours: 0},
    // {[PERSON_NAME]: 'Pablo Dorado', [PERSON_ID] : '12104247', hours: 0},
    // {[PERSON_NAME]: 'Pedro Patron', [PERSON_ID] : '11915402', hours: 0},
    ],

    /**
     * Add a new z-peep for push notification registry
     * @param {Object}   db       Mongo DB Object
     * @param {Function} callback A function object that will be fired once command is completed
     * @returns {void}
     */
    addZPeep (db, { personid, registrationid, personname }, callback) {
        db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).insertOne({
            'person-id': personid,
            'person-name': personname,
            'registration-id': registrationid
        }, (err, results) => {
            debug('Inserted a zpeep!!', personid, personname, registrationid);
            db.close();
            callback(results);
        });
    },

    /**
     * @method __connect
     * @return {Promise} A promise containing data fetch
     * @private
     * */
    __connect () {
        return new Promise((resolve, reject) => {
            MongoClient.connect(CONFIG.MONGO_CONFIG_URL)
            .then((db, err) => {
                if (err) {
                    db.close();
                    reject(err);
                } else {
                    resolve(db);
                }
            }).catch((err) => {
                reject(err);
            });
        });
    },

    /**
     * Gets the stored data related to the z-peep
     * @param {string} registrationId - The Substription identifier
     * @return {Promise} A promise containing retieved data
     */
    getZPeepByRegistrationId (registrationId) {

        return ZPeepManager.__connect()
        .then((db) => {

            const zPeep = db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).findOne(
                { 'registration-id': registrationId }
            );

            db.close();
            return zPeep;
        })
        .catch((err) => {
            debug(err);
        });
    },

    /**
     * Gets the number (count) of registries for this person
     * @param  {string} personid Person ID identifier
     * @param  {Object} db Database object
     * @param  {Function} callback Function to call once DB returned data
     * @return {void}
     */
    getZPeepCount (personid, db, callback) {
        const cursor = db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).find(
            { 'person-id': personid }
        );

        cursor.count((err, count) => {
            db.close();
            callback(count || 0);
        });
    },

    /**
     * Get all registration IDs and format the request for push notification
     * @param  {Object}   db           Reference to the Mongo DB
     * @param  {Array}   pinguinedIds Array containing person-ids to search for
     * @param  {Function} callback     Fires once data is retrieved
     * @return {void}
     */
    getZPeepsRegistry (db, pinguinedIds, callback) {
        debug('pinguinedIds', pinguinedIds);
        const requestBody = { 'registration_ids': [] };
        const cursor = db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).find({ $or: pinguinedIds });

        cursor.each((err, doc) => {
            if (doc !== null) {
                requestBody.registration_ids.push(doc['registration-id']);
            } else {
                db.close();
                callback(requestBody);
            }
        });
    },

    /**
     * Update current registered zpeep
     * @param  {Object}   db                     Reference to Mongo DB
     * @param  {string}   options.personid       The zpeep id
     * @param  {string}   options.registrationid The new registration id
     * @param  {Function} callback               Fires once update is achieved
     * @return {void}
     */
    syncZPeep (db, { personid, registrationid }, callback) {
        debug('time to sync');
        db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).updateOne(
            { 'person-id': personid },
            { $set: { 'registration-id': registrationid } },
            (err, results) => {
                debug('Updated a zpeep!!', personid, registrationid);
                db.close();
                callback(results);
            });
    },

    /**
     * Get timesheet reports and format data for proper rendering
     * @param  {string}   reportDate A string representing a date 'YYYYMMDD'
     * @param  {Function} callback   Triggers once data is retrieved
     * @returns {void}
     */
    getZPeepsTimeReport (reportDate, callback) {

        //Initialize Object with time report data
        let timeEntries = null;
        const REQUEST_USER_AGENT_HEADER = 'Andres Garcia Reports (andres@zemoga.com)';

        //Call to Basecamp reports
        const requestTimeReport = {
            uri: `${CONFIG.BASECAMP_PROTOCOL}${CONFIG.BASECAMP_TOKEN}@${CONFIG.BASECAMP_DOMAIN}${CONFIG.BASECAMP_PATH}`,
            qs: { from: reportDate, to: reportDate },
            headers: { 'User-Agent': REQUEST_USER_AGENT_HEADER }
        };

        debug('report URL: ' + requestTimeReport.uri + '?from=' + reportDate + '&to=' + reportDate);

        requestURL(requestTimeReport)
        .then((body) => {

            parseString(body, (parseError, parseResult) => {
                timeEntries = parseResult['time-entries']['time-entry'];

                //TODO: Refactor > I want a final dataset in the way of:
                // [{'person-id': xxxxx,
                // 'person-name': 'xxxxx',
                // 'total-hours': 'xx.xx',
                // 'reports': [{'description': 'xx', ..}, ...]}];
                // this can be acomplished with less lodash involvement, less code and vanilla js.

                // Basically I'm filtering reports.xml so discarding users non in peopleIds (UI team)
                //PD: Sorry for the long line
                timeEntries =
                lodash.filter(
                    timeEntries, (entry) =>
                    ZPeepManager.peopleIds.map((el) =>
                        el[PERSON_ID]).indexOf(entry[PERSON_ID][0]._) !== -1
                );

                //Normalize some ugly data
                lodash.forEach(timeEntries, (entry) => {
                    //debug(util.inspect(entry, false, null));
                    //debug('todo: ' + entry['todo-item-id'][0]._);
                    entry[PERSON_ID] = entry[PERSON_ID][0]._;
                    entry.hours = +entry.hours[0]._;
                    entry.projectName = '';
                    entry.todoName = '';

                    //Sometimes, empty descriptions are parsed by xml2js coms as weird { '$': { nil: 'true' } } objects.
                    //So normalizing to empty string
                    entry.description = entry.description[0];
                    if (typeof entry.description === 'object') {
                        entry.description = '';
                    }

                    entry[PERSON_NAME] = entry[PERSON_NAME].toString();
                });

                //Grouping allows me to easily sumarize each report because reports are not sorted by each z-peep
                timeEntries = lodash.groupBy(timeEntries, PERSON_ID);

                //If 0 reports, the user will not be present in the reports API
                //so as calling People.xml is pending, I'm completing the info
                //from harcoding users in peopleIds
                ZPeepManager.peopleIds.forEach((person) => {
                    const thisPersonId = person[PERSON_ID];
                    let isAvailable = false;

                    lodash.forOwn(timeEntries, (entryValue, entryKey) => {
                        if (thisPersonId === entryKey) {
                            isAvailable = true;
                        }
                    });
                    if (!isAvailable) {
                        timeEntries[thisPersonId] = [person];

                        person.projectName = '';
                        person.todoName = '';
                    }
                });

                //Just to sort by total hours :( Thinking on refactoring
                lodash.forOwn(timeEntries, (value, key) => {
                    let totalHours = 0;
                    let personName = '';

                    lodash.forEach(value, (timeEntryValue) => {
                        personName = timeEntryValue[PERSON_NAME];
                        totalHours += timeEntryValue.hours;
                    });
                    timeEntries[key] = { [PERSON_ID]: key, [PERSON_NAME]: personName, totalHours, report: value };
                });
                timeEntries = lodash.sortBy(timeEntries, ['totalHours']);

                let currentTimeEntry = 0;
                //Get the total number of time entry records
                const timeEntriesCount = lodash.flow(map('report'),flatten)(timeEntries).length;

                //Additional report data (Project name and todo name)
                //@TODO: Making requests x each entry is not cool. We need mem Cache for project info.
                lodash.forEach(timeEntries, (entry) => {

                    lodash.forEach(entry.report, (report) => {

                        const projectId = report['project-id'];
                        const todoItemId = report['todo-item-id'];
                        const requests = [];

                        if (projectId) {
                            //Gets the project info:
                            const requestProjectInfo = {
                                url: `${CONFIG.BASECAMP_PROTOCOL}${CONFIG.BASECAMP_TOKEN}@${CONFIG.BASECAMP_DOMAIN}/projects/${projectId[0]._}.xml`,
                                headers: { 'User-Agent': REQUEST_USER_AGENT_HEADER }
                            };
                            //debug(requestProjectInfo.url);

                            requests.push(requestURL(requestProjectInfo));
                        }

                        if (todoItemId && todoItemId[0] && todoItemId[0]._) {
                             //Gets the todo item name
                            const requestTodoInfo = {
                                url: `${CONFIG.BASECAMP_PROTOCOL}${CONFIG.BASECAMP_TOKEN}@${CONFIG.BASECAMP_DOMAIN}/todo_items/${todoItemId[0]._}.xml`,
                                headers: { 'User-Agent': REQUEST_USER_AGENT_HEADER }
                            };

                            //debug(requestTodoInfo.url);
                            requests.push(requestURL(requestTodoInfo));
                        }

                        if (requests.length) {
                            Promise.all(requests)
                            .spread((responseProjectInfo, responseTodoInfo) => {

                                const projectName = cheerio.load(responseProjectInfo).root().find('project > name').text();

                                report.projectName = projectName;

                                if (typeof responseTodoInfo !== 'undefined') {
                                    const todoName = cheerio.load(responseTodoInfo).root().find('todo-item > content').text();

                                    report.todoName = todoName + ': ';
                                }
                            }).catch((err) => {
                                debug('Error occured when requesting additional entry information:' + err);
                            }).finally(() => {
                                currentTimeEntry++;
                                //All requests made, so calling callback to continue the rendering process
                                if (currentTimeEntry === timeEntriesCount) {
                                    //Returns array of formalized data
                                    //debug(currentTimeEntry);
                                    //debug(timeEntries[20].report[0]);
                                    callback(timeEntries);
                                }
                            });
                        } else {
                            currentTimeEntry++;
                            //All requests made, so calling callback to continue the rendering process
                            if (currentTimeEntry === timeEntriesCount) {
                                //Returns array of formalized data
                                //debug(timeEntries);
                                callback(timeEntries);
                            }
                        }
                    });
                });
            });
        }).catch((err) => {
            debug('error >>>>> ' + err);
        });
    }
};

export { ZPeepManager };
