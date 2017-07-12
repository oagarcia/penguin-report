'use strict';
/**
 * @file Data related operations
 * @copyright Zemoga Inc
 * @author Andres Garcia <andres@zemoga.com>
 */

import requestURL from 'request-promise';
import { parseString } from 'xml2js';
import { default as _ } from 'lodash';
import map from 'lodash/fp/map';
import flatten from 'lodash/fp/flatten';
import cheerio from 'cheerio';
import Promise from 'bluebird';
import debugModule from 'debug';
import CONFIG from './config';
import ZProfile from './zprofile';
import DEPARTMENT from './department';

// Debug module
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

    /**
     * Add a new z-peep for push notification registry
     * @param {Object} db       Mongo DB Object
     * @param {Object} params   Object containing the fields to create
     * @returns {Promise} A promise containing retieved data
     */
    addZPeep (db, { basecampId, pushRegistryId, personName, nickName }) {
        return db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).insertOne({
            'person-id': basecampId,
            'person-name': personName,
            'nick': nickName,
            'registration-id': pushRegistryId
        }).catch((err) => {
            debug('Error inserting record ', err);
        });
    },

    /**
     * Gets the stored data related to the z-peep
     * @param {string} registrationId - The Substription identifier
     * @param {Object} db - DataBase instance
     * @return {Promise} A promise containing retieved data
     */
    getZPeepByRegistrationId (registrationId, db) {
        return db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).findOne(
            { 'registration-id': registrationId }
        );
    },

    /**
     * Gets the number (count) of registries for this person
     * @param  {string} personid Person ID identifier
     * @param  {Object} db Database object
     * @return {void}
     */
    getZPeepCount (personid, db) {
        return db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).find(
            { 'person-id': personid }
        )
        .count()
        .then((count) => {
            return count || 0;
        })
        .catch((err) => {
            debug('Error reading cursor ', err);
        });
    },

    /**
     * Get all registration IDs and format the request for push notification
     * @param  {Object}   db           Reference to the Mongo DB
     * @param  {Array}   pinguinedIds Array containing person-ids to search for
     * @return {void}
     */
    getZPeepsRegistry (db, pinguinedIds) {
        debug('pinguinedIds', pinguinedIds);
        const requestBody = { 'registration_ids': [] };
        const cursor = db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).find({ $or: pinguinedIds });

        return new Promise((resolve, reject) => {
            cursor.each((err, doc) => {
                if (err) {
                    reject(err);
                }
                if (doc !== null) {
                    requestBody.registration_ids.push(doc['registration-id']);
                } else {
                    resolve(requestBody);
                }
            });
        });
    },

    /**
     * Update current registered zpeep
     * @param  {Object}   db                        Reference to Mongo DB
     * @param  {Object}   options                   Object containing the fields to update
     * @param  {string}   options.basecampId        The zpeep id
     * @param  {string}   options.nickName          The person nickname
     * @param  {string}   options.pushRegistryId    The new Push registration id
     * @return {void}
     */
    syncZPeep (db, { basecampId, pushRegistryId, nickName }) {
        debug('time to sync');
        return db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).updateOne(
            { 'person-id': basecampId },
            { $set: { 'registration-id': pushRegistryId, 'nick': nickName } }
        ).catch((err) => {
            debug('Error updating record ', err);
        });
    },

    /**
     * Get timesheet reports and format data for proper rendering
     * @param  {string}   reportDate A string representing a date 'YYYYMMDD'
     * @param  {string}   departmentCode Zemoga Department code
     * @param  {boolean}  enforceUI Temporary parameter while the bots are created.
     * @returns {void}
     */
    getZPeepsTimeReport (reportDate, departmentCode = DEPARTMENT.ALL, enforceUI = false) {
        // Initialize Object with time report data
        let timeEntries = null;
        let zemogians = null;
        const REQUEST_USER_AGENT_HEADER = 'Andres Garcia Reports (andres@zemoga.com)';

        // Temporary code needed while the bots are created
        if (enforceUI) {
            departmentCode = DEPARTMENT.UI;
        }

        // Call to Basecamp reports
        const requestTimeReport = {
            uri: `${CONFIG.BASECAMP_PROTOCOL}${CONFIG.BASECAMP_TOKEN}@${CONFIG.BASECAMP_DOMAIN}${CONFIG.BASECAMP_PATH}`,
            qs: { from: reportDate, to: reportDate },
            headers: { 'User-Agent': REQUEST_USER_AGENT_HEADER }
        };

        debug('report URL: ' + requestTimeReport.uri + '?from=' + reportDate + '&to=' + reportDate);

        return ZProfile.getZemogians(departmentCode)
            .then((response) => {
                zemogians = _.get(response, 'zemogians', []);
                return requestURL(requestTimeReport);
            })
            .then((body) => {
                return new Promise((resolve, reject) => {
                    parseString(body, (parseError, parseResult) => {
                        if (parseError) {
                            reject(parseError);
                        } else {
                            resolve(parseResult);
                        }
                    });
                });
            })
            .then((parseResult) => {
                return new Promise((resolve, reject) => {
                    timeEntries = parseResult['time-entries']['time-entry'];

                    // TODO: Refactor > I want a final dataset in the way of:
                    // [{'person-id': xxxxx,
                    // 'person-name': 'xxxxx',
                    // 'total-hours': 'xx.xx',
                    // 'reports': [{'description': 'xx', ..}, ...]}];
                    // this can be acomplished with less lodash involvement, less code and vanilla js.

                    // Basically I'm filtering reports.xml so discarding users non in Google zprofile list
                    // In cases where the department is passed
                    // PD: Sorry for the long line

                    if (departmentCode) {
                        timeEntries =
                        timeEntries.filter((entry) =>
                            zemogians.map((el) => el.externalIds[0].value
                            ).indexOf(entry[PERSON_ID][0]._) !== -1
                        );
                    }
                    // Normalize some ugly data
                    timeEntries.forEach((entry) => {
                        // debug(util.inspect(entry, false, null));
                        // debug('todo: ' + entry['todo-item-id'][0]._);
                        entry[PERSON_ID] = entry[PERSON_ID][0]._;
                        entry.hours = +entry.hours[0]._;
                        entry.projectName = '';
                        entry.todoName = '';

                        // Sometimes, empty descriptions are parsed by xml2js coms as weird { '$': { nil: 'true' } } objects.
                        // So normalizing to empty string
                        entry.description = entry.description[0];
                        if (typeof entry.description === 'object') {
                            entry.description = '';
                        }

                        entry[PERSON_NAME] = entry[PERSON_NAME].toString();
                    });

                    // Grouping allows me to easily sumarize each report because reports are not sorted by each z-peep
                    timeEntries = _.groupBy(timeEntries, PERSON_ID);

                    // If 0 reports, the user will not be present in the reports API
                    // so as calling People.xml is pending, I'm completing the info
                    // from user in zProfile API
                    zemogians.forEach((zemogian) => {
                        const thisPersonId = _.get(zemogian, 'externalIds[0].value');
                        let isAvailable = false;

                        _.forOwn(timeEntries, (entryValue, entryKey) => {
                            if (thisPersonId === entryKey) {
                                isAvailable = true;
                            }
                        });

                        // Basecamp doesn't print reports with 0 hours
                        // So recreating missing users from the Google ZProfile zemogians API active directory
                        if (!isAvailable) {
                            const emptyPersonEntry = {
                                [PERSON_NAME]: zemogian.fullName,
                                [PERSON_NICK]: zemogian.nickname,
                                [PERSON_ID]: _.get(zemogian, 'externalIds[0].value', '0'),
                                hours: 0,
                                projectName: '',
                                todoName: ''
                            };

                            timeEntries[thisPersonId] = [emptyPersonEntry];
                        }
                    });

                    // Just to sort by total hours :( Thinking on refactoring
                    _.forOwn(timeEntries, (value, key) => {
                        let totalHours = 0;
                        let personName = '';

                        _.forEach(value, (timeEntryValue) => {
                            personName = timeEntryValue[PERSON_NAME];
                            totalHours += timeEntryValue.hours;
                        });
                        timeEntries[key] = { [PERSON_ID]: key, [PERSON_NAME]: personName, totalHours, report: value };
                    });

                    // Sort by user with less reported hours
                    timeEntries = _.sortBy(timeEntries, ['totalHours']);

                    let currentTimeEntry = 0;
                    // Get the total number of time entry records

                    // const timeEntriesCount = _.flow(_.map('report'), _.flatten)(timeEntries).length;
                    const timeEntriesCount = _.flow(map('report'), flatten)(timeEntries).length;

                    // Additional report data (Project name and todo name)
                    // @TODO: Making requests x each entry is not cool. We need mem Cache for project info.
                    _.forEach(timeEntries, (entry) => {
                        _.forEach(entry.report, (report) => {
                            const projectId = report['project-id'];
                            const todoItemId = report['todo-item-id'];
                            const requests = [];

                            if (projectId) {
                                // Gets the project info:
                                const requestProjectInfo = {
                                    url: `${CONFIG.BASECAMP_PROTOCOL}${CONFIG.BASECAMP_TOKEN}@${CONFIG.BASECAMP_DOMAIN}/projects/${projectId[0]._}.xml`,
                                    headers: { 'User-Agent': REQUEST_USER_AGENT_HEADER }
                                };
                                // debug(requestProjectInfo.url);

                                requests.push(requestURL(requestProjectInfo));
                            }

                            if (todoItemId && todoItemId[0] && todoItemId[0]._) {
                                // Gets the todo item name
                                const requestTodoInfo = {
                                    url: `${CONFIG.BASECAMP_PROTOCOL}${CONFIG.BASECAMP_TOKEN}@${CONFIG.BASECAMP_DOMAIN}/todo_items/${todoItemId[0]._}.xml`,
                                    headers: { 'User-Agent': REQUEST_USER_AGENT_HEADER }
                                };

                                // debug(requestTodoInfo.url);
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
                                    // All requests made, so resolving promise to continue the rendering process
                                    if (currentTimeEntry === timeEntriesCount) {
                                        // Returns array of formalized data
                                        // debug(currentTimeEntry);
                                        // debug(timeEntries[20].report[0]);
                                        // callback(timeEntries);
                                        resolve(timeEntries);
                                    }
                                });
                            } else {
                                currentTimeEntry++;
                                // All requests made, so resolving promise to continue the rendering process
                                if (currentTimeEntry === timeEntriesCount) {
                                    // Returns array of formalized data
                                    // debug(timeEntries);
                                    resolve(timeEntries);
                                }
                            }
                        });
                    });
                });
            })
            .catch((err) => {
                debug('error >>>>> ' + err);
            });
    }
};

export { ZPeepManager };
