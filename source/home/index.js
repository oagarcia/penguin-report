import express from 'express';
import path from 'path';
import reactViews from 'express-react-views';
import { default as _ } from 'lodash';
import { getCurrentDate } from '../utils';
import { ZPeepManager } from '../zpeep-manager';

const app = express();

app.set('views', [__dirname, path.resolve(__dirname, './../views'), path.resolve(__dirname, './../components')]);
app.engine('jsx', reactViews.createEngine({
    babel: {} // Setting this ensures babel transfomrs from babelrc
}));
app.set('view engine', 'jsx');

app.get('/', (req, res) => {
    const { reportDate } = getCurrentDate(req.query.date);

    // Check for error messages comming form passport (authorization.js)
    const { error: [errorMessage = ''] = [] } = req.flash();
    const departmentCode = _.get(req, 'session.passport.user.departmentCode');

    // If not authenticated, render the home without requesting Basecamp users
    if (!req.isAuthenticated()) {
        res.render('Home',
            {
                req,
                errorMessage
            }
        );
    } else {
        ZPeepManager.getZPeepsTimeReport(reportDate, departmentCode)
        .then((timeEntries) => {
            res.render('Home',
                {
                    req,
                    timeEntries,
                    errorMessage
                }
            );
        })
        .catch((err) => {
            res.status(500).send(err);
        });
    }
});

export default app;
