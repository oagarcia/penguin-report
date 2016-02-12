'use strict';
/**
 * @file Utils library
 * @copyright Zemoga Inc
 */

let Utils = {
  /**
   * Converts Date to YYYYMMDD format string
   * @param  {Date} localDate A given Date
   * @return {string}           YYYYMMDD format string
   */
  toDateInputValue(localDate, removeSlashes = false) {
    let dateOutput;
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    dateOutput = localDate.toJSON().slice(0,10);

    if (removeSlashes) {
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
  CONTENT_TYPE : {
    '.js' : 'text/javascript',
    '.json': 'text/json',
    '.css': 'text/css',
    '.html': 'text/html',
    '.gif': 'image/gif'
  },

  /**
   * Renders Not found page
   * @param  {ServerResponse} response A ServerResponse stream
   */
  notFoundRenderer(response) {
    response.writeHead(404, {'content-type' : Utils.CONTENT_TYPE['.html']});
    response.end(`<h1>404 Not Found</h1>`);
  },

  /**
   * Renders identify selector dropdown
   * @return {string} The template related to user identify selector dropdown
   */
  zPeepsSelectorRenderer(people) {

    let output = `
    <div class="z-peeps-container">
      <div class="z-peeps-body">
      In order to get notifications about your reports, please identify yourself:
      <br>
      <br>
      <form>
      <select name="z-peeps" id="z-peeps">
        <option required value="">Please select your name</option>`;

    people.forEach(person => {
      output += `<option value="${person['person-id']}">${person['person-name']}</option>`;
    });
    return output + `
    <select>
    <button id="z-peeps-identify" name="z-peeps-identify" class="z-peeps-identify" type="button">Identify</button>
    </form>
    </div>
    </div>`;
  },

  /**
   * Renders OG Tags
   * @return {string} OG Tags meta tags
   */
  ogRenderer() {
    return `
    <meta property="og:image" content="https://penguin-report.herokuapp.com/images/penguin-icon.png">
    <meta property="og:title" content="Zemoga | Z-Penguin reports">
    <meta property="og:url" content="https://penguin-report.herokuapp.com">
    <meta property="og:description" content="Easily check your z-peeps reports">
    <meta property="og:site_name" content="Z-Penguin reports">
    `;
  }
};

export {Utils};
