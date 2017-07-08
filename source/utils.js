'use strict';
/**
 * @file Utils library
 * @copyright Zemoga Inc
 */

/**
 * Global utility functions
 * @namespace Utils
 */
const Utils = {

    /**
     * Converts Date to YYYYMMDD format string
     * @param  {Date} localDate A given Date
     * @param {Date} removeDash Removes - sign form the output string
     * @return {string}         YYYYMMDD format string
     */
    toDateInputValue (localDate, removeDash = false) {
        let dateOutput;

        localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
        dateOutput = localDate.toJSON().slice(0, 10);

        if (removeDash) {
            dateOutput = dateOutput.replace(/\-/g, '');
        }
        return dateOutput;
    },

    /**
     * Enum for content types
     * @readonly
     * @enum {string}
     *
     */
    CONTENT_TYPE: {
        '.js': 'text/javascript',
        '.json': 'text/json',
        '.css': 'text/css',
        '.html': 'text/html',
        '.gif': 'image/gif'
    },

    /**
     * Renders Not found page
     * @param  {ServerResponse} response A ServerResponse stream
     * @return {void}
     */
    notFoundRenderer (response) {
        response.writeHead(404, { 'content-type': Utils.CONTENT_TYPE['.html'] });
        response.end('<h1>404 Not Found</h1>');
    },

    /**
     * Renders identify selector dropdown
     * @param  {Object} people Collection of people
     * @return {string} The template related to user identify selector dropdown
     */
    zPeepsSelectorRenderer (people) {
        let output = `
        <div class="z-peeps-container">
        <div class="z-peeps-body">
        In order to get notifications about your reports, please identify yourself:
        <br>
        <br>
        <form>
        <select name="z-peeps" id="z-peeps">
            <option required value="">Please select your name</option>`;

        people.forEach((person) => {
            output += `<option value="${person['person-id']}">${person['person-name']}</option>`;
        });
        return output + `
        <select>
        <button id="z-peeps-identify" name="z-peeps-identify" class="btn z-peeps-identify" type="button">Identify</button>
        </form>
        </div>
        </div>`;
    }
};

export { Utils };

export function getCurrentDate (currentDate) {
    let reportDate;
    // If date is provided in querystring date the report is that date
    // else will be today date

    if (currentDate) {
        reportDate = currentDate.replace(/\-/g, '');
    } else {
        currentDate = Utils.toDateInputValue(new Date());
        reportDate = Utils.toDateInputValue(new Date(), true);
    }

    return { currentDate, reportDate };
}
