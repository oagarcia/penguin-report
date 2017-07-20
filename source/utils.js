import CONFIG from './config';

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

    appURL () {
        const { PROTOCOL, DOMAIN, ROOT_URI } = CONFIG;
        const appURL = PROTOCOL + DOMAIN + ROOT_URI;

        return appURL;
    },

    imgURL () {
        return Utils.appURL() + '/images/';
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
