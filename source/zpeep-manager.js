'use strict';
/**
 * @file ZPeep related services
 * @copyright Zemoga Inc
 */

import requestURL from 'request';
import {parseString} from 'xml2js';
import lodash from 'lodash';

const PERSON_ID = 'person-id';
const PERSON_NAME = 'person-name';
const ADMIN_USER_ID = '870268';

let ZPeepManager = {

  Z_PEEPS_COLLECTION_NAME : 'zpeeps',

  //TODO: IDs should be retrieved from people.xml
  //take into account that it will retrieve every z-peep from given company and
  //there is not such thing like filter by UI dept
  peopleIds : [
    {[PERSON_NAME]: 'Aiman Samad', [PERSON_ID] : '10739872', hours: 0},
    {[PERSON_NAME]: 'Alejandro Sanmartin', [PERSON_ID] : '1243347', hours: 0},
    {[PERSON_NAME]: 'Andres Acevedo', [PERSON_ID] : '11890705', hours: 0},
    {[PERSON_NAME]: 'Andres Zorro', [PERSON_ID] : '10997106', hours: 0},
    {[PERSON_NAME]: 'Camilo Soto', [PERSON_ID] : '11527725', hours: 0},
    {[PERSON_NAME]: 'Cesar Leonardo Guerrero', [PERSON_ID] : '11842419', hours: 0},
    {[PERSON_NAME]: 'Edin Rivera', [PERSON_ID] : '11657876', hours: 0},
    {[PERSON_NAME]: 'Fredy Urrego', [PERSON_ID] : '11915855', hours: 0},
    {[PERSON_NAME]: 'German Galvis', [PERSON_ID] : '1645970', hours: 0},
    {[PERSON_NAME]: 'Gustavo Morales', [PERSON_ID] : '11934744', hours: 0},
    {[PERSON_NAME]: 'Javier Jaimes', [PERSON_ID] : '11926506', hours: 0},
    {[PERSON_NAME]: 'Jose Conde', [PERSON_ID] : '11925814', hours: 0},
    {[PERSON_NAME]: 'Juan Pablo Vallejo', [PERSON_ID] : '11943154', hours: 0},
    {[PERSON_NAME]: 'Mauricio Cubillos', [PERSON_ID] : '11360590', hours: 0},
    //{[PERSON_NAME]: 'Nicolas Lopez', [PERSON_ID] : '11522300', hours: 0},
    {[PERSON_NAME]: 'Orlando Donado', [PERSON_ID] : '11926495', hours: 0},
    {[PERSON_NAME]: 'Pedro Patron', [PERSON_ID] : '11915402', hours: 0},
    {[PERSON_NAME]: 'Daniel Camilo Daza', [PERSON_ID] : '11749582', hours: 0},
    {[PERSON_NAME]: 'Andres Garcia', [PERSON_ID] : ADMIN_USER_ID, hours: 0},
    {[PERSON_NAME]: 'Luis Carlos Chivata', [PERSON_ID] : '10581568', hours: 0},
    {[PERSON_NAME]: 'Maria Antonia Serna', [PERSON_ID] : '12108160', hours: 0},
    {[PERSON_NAME]: 'Carlos Acero', [PERSON_ID] : '12109484', hours: 0}
  ],

  /**
   * Add a new z-peep for push notification registry
   * @param {Object}   db       Mongo DB Object
   * @param {Function} callback A function object that will be fired once command is completed
   */
  addZPeep(db, {personid, registrationid, personname}, callback){
    db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).insertOne({
      'person-id' : personid,
      'person-name' : personname,
      'registration-id' : registrationid
    }, (err, results) => {
      console.log('Inserted a zpeep!!', personid, personname, registrationid);
      db.close();
      callback(results);
    });
  },

  /**
   * [findZPeep description]
   * @param  {[type]} personid [description]
   * @return {number}          Number of zpeeps
   */
  getZPeepCount(personid, db, callback) {
    let cursor = db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).find( { 'person-id' : personid } );

    cursor.count((err, count) => {
      callback(count || 0);
    });
  },

  /**
   * Get all registration IDs and format the request for push notification
   * @param  {Object}   db           Reference to the Mongo DB
   * @param  {Array}   pinguinedIds Array containing person-ids to search for
   * @param  {Function} callback     Fires once data is retrieved
   */
  getZPeepsRegistry(db, pinguinedIds, callback) {
    console.log('pinguinedIds', pinguinedIds);
    let requestBody = {'registration_ids': []};
    let cursor = db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).find(
      { $or: pinguinedIds }
    );

    cursor.each((err, doc) => {
      if (doc !== null) {
         requestBody['registration_ids'].push(doc['registration-id']);
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
   */
  syncZPeep(db, {personid, registrationid}, callback) {
    console.log('time to sync');
    db.collection(ZPeepManager.Z_PEEPS_COLLECTION_NAME).updateOne(
    {'person-id' : personid},
    {$set: { 'registration-id': registrationid } },
    (err, results) => {
      console.log('Updated a zpeep!!', personid, registrationid);
      db.close();
      callback(results);
    });
  },

  /**
   * Get timesheet reports and format data for proper rendering
   * @param  {string}   reportDate A string representing a date 'YYYYMMDD'
   * @param  {Function} callback   Triggers once data is retrieved
   */
  getZPeepsTimeReport(reportDate, callback) {
    console.log('env vars: ', process.env.BASECAMP_PROTOCOL);
    //Call to Basecamp reports
    requestURL.get(
      {url: process.env.BASECAMP_PROTOCOL + process.env.BASECAMP_TOKEN + '@' + process.env.BASECAMP_DOMAIN + process.env.BASECAMP_PATH,
      form : {from : reportDate, to: reportDate},
      headers: {'User-Agent': 'Andres Garcia Reports (andres@zemoga.com)'}}, (error, resp, body) => {

      parseString(body, (parseError, parseResult) => {

        let timeEntries = parseResult['time-entries']['time-entry'];


        //TODO: Refactor > I want a final dataset in the way of:
        // [{'person-id': xxxxx, 'person-name': 'xxxxx', 'total-hours': 'xx.xx', 'reports': [{'description': 'xx', ..}, ...]}];
        // this can be acomplished with less lodash involvement, less code and vanilla js.

        // Basically I'm filtering reports.xml so discarding users non in peopleIds (UI team)
        //PD: Sorry for the long line
        timeEntries = lodash.filter(timeEntries, entry => ZPeepManager.peopleIds.map(el => el[PERSON_ID]).indexOf(entry[PERSON_ID][0]._) !== -1);

        //Normalize some ugly data
        timeEntries = lodash.forEach(timeEntries, entry => {
          entry[PERSON_ID] = entry[PERSON_ID][0]._;
          entry.hours = +entry.hours[0]._;
          entry.description = entry[PERSON_ID] ===  ADMIN_USER_ID ? '<span class="description-hidden">*hidden</span>' : entry.description[0];
          entry[PERSON_NAME] = entry[PERSON_NAME].toString();
        });

        //Grouping allows me to easily sumarize each report because reports are not sorted by each z-peep
        timeEntries = lodash.groupBy(timeEntries, PERSON_ID);

        //If 0 reports, the user will not be present in the reports API
        //so as calling People.xml is pending, I'm completing the info
        //from harcoding users in peopleIds
        ZPeepManager.peopleIds.forEach(person => {
          let thisPersonId = person[PERSON_ID];
          let isAvailable = false;
          lodash.forOwn(timeEntries, (entryValue, entryKey) => {
            if (thisPersonId === entryKey) {
              isAvailable = true;
            }
          });
          if (!isAvailable) {
            timeEntries[thisPersonId] = [person];
          }
        });

        //Just to sort by total hours :( Thinking on refactoring
        lodash.forOwn(timeEntries, function(value, key) {
          let totalHours = 0;
          let personName = '';
          lodash.forEach(value, function(value) {
            personName = value[PERSON_NAME];
            totalHours += value.hours;
          });
          timeEntries[key] = {[PERSON_ID]: key, [PERSON_NAME]: personName, totalHours, report : value};
        });
        timeEntries = lodash.sortBy(timeEntries, ['totalHours']);

        //Returns array of formalized data
        callback(timeEntries);
      });
    });
  }
};

export {ZPeepManager};
