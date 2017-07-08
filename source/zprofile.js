import requestURL from 'request-promise';
import debugModule from 'debug';
import moment from 'moment';
import Promise from 'bluebird';
import config from './config';
import DEPARTMENT from './department';

const debug = debugModule('zprofile');

const defaultRequests = {
    baseUrl: 'https://uitraining.zemoga.com/zprofile/api/',
    method: 'POST',
    json: true
};

const zProfileAPIRequest = requestURL.defaults(defaultRequests);
const zProfileGraphQLRequest = requestURL.defaults({ ...defaultRequests, uri: '/interactive' });

const ZProfile = {

    __token: null,

    __isValidToken () {
        const now = moment.utc();

        return this.__token && now.isBefore(moment.utc(this.__token.expiresOn));
    },

    set token (value) {
        this.__token = value;
    },

    get token () {
        return this.__token;
    },

    // Creates a Token if it is not present in the program memory OR is expired
    __requestToken () {
        if (this.__isValidToken()) {
            return Promise.resolve(this.token);
        }

        const {
            ZPROFILE_CLIENT_ID,
            ZPROFILE_CLIENT_SECRET,
            ZPROFILE_OWNER_KEY,
            ZPROFILE_SCOPE } = config;

        const body = {
            'credential': {
                'clientId': ZPROFILE_CLIENT_ID,
                'clientSecret': ZPROFILE_CLIENT_SECRET,
                'ownerKey': ZPROFILE_OWNER_KEY
            },
            'scopes': [ZPROFILE_SCOPE] // @TODO: Update this to support multiple scopes
        };

        return zProfileAPIRequest({
            uri: '/requesttoken',
            body
        })
        .then((bodyResponse) => {
            this.token = bodyResponse;
            return this.token;
        })
        .catch((err) => {
            debug('error >>>>> ' + err);
        });
    },

    getZemogians (department = DEPARTMENT.UI) {
        return this.__requestToken()
        .then((response) => {
            const body = {
                query: `{
                    zemogians(department:${department}){
                        fullName
                        nickname
                        externalIds{value}
                    }
                }`
            };

            return zProfileGraphQLRequest({
                auth: { bearer: response.token },
                body
            });
        })
        .then((response) => response.data)
        .catch((error) => {
            debug('>>>>>', error);
        });
    }
};

export default ZProfile;
