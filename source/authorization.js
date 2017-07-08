import passportGoogleOauth from 'passport-google-oauth2';
import CONFIG from './config';

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
            // asynchronous verification, for effect...
            // User.findOrCreate({ googleId: profile.id }, (err, user) => {
            //     return done(err, user);
            // });

            // @TODO: Just grab from zprofile the user associated with the email!!!!
            // Or by ID if possible
            process.nextTick(() => {
                // To keep the example simple, the user's Google profile is returned to
                // represent the logged-in user.  In a typical application, you would want
                // to associate the Google account with a user record in your database,
                // and return that user instead.
                return done(null, profile);
            });
        }
        ));
    }
};
