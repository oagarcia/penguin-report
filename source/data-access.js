'use strict';
/**
 * @file Data Base related operations
 * @copyright Zemoga Inc
 * @author Andres Garcia <andres@zemoga.com>
 */

import { MongoClient }  from 'mongodb';
import CONFIG from './config';

/**
 * Database related operations
 * @namespace DataAccess
 */
export const DataAccess = {

  /** @member {string} myVar */
    myVar: 'value',

    /**
     * @method connect
     * @return {Promise} A promise containing data fetch
     * */
    connect () {
        return MongoClient.connect(CONFIG.MONGO_CONFIG_URL);
    }
};

