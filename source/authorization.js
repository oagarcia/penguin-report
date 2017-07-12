import passportGoogleOauth from 'passport-google-oauth2';
import debugModule from 'debug';
import CONFIG from './config';
import ZProfile from './zprofile';

// Debug module
const debug = debugModule('authorization');

export const Authorization = {
    // Google authentication via OAUTH2
    init (passport) {
        const GoogleStrategy = passportGoogleOauth.Strategy;

        passport.serializeUser((user, done) => {
            done(null, user);
        });

        passport.deserializeUser((obj, done) => {
            done(null, obj);
        });

        passport.use(new GoogleStrategy({
            clientID: CONFIG.GOOGLE_CLIENT_ID,
            clientSecret: CONFIG.GOOGLE_CLIENT_SECRET,
            callbackURL: `${CONFIG.ROOT_URI}${CONFIG.GOOGLE_CALLBACK_URL}`,
            passReqToCallback: true
        }, (request, accessToken, refreshToken, profile, done) => {
            ZProfile.getZemogian(profile.email)
            .then((response) => {
                if (!response.zemogian) {
                    return done(null, false, {
                        message: 'It seems that you are logged in with an invalid Zemoga account. Go to Gmail, logout and try again'
                    });
                }

                // Destructuring the ZProfile response
                const {
                    zemogian: {
                        externalIds: [{value: basecampId}],
                        department: {code: departmentCode}}
                    } = response;

                response.zemogian.basecampId = basecampId;
                response.zemogian.departmentCode = departmentCode;

                return done(null, response.zemogian);
            })
            .catch((error) => {
                debug('>>>>>', error);
                return done(error);
            });
        }
        ));
    }
};
