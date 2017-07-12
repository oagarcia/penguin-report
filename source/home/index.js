import express from 'express';
import { default as _ } from 'lodash';
import { getCurrentDate } from '../utils';
import { ZPeepManager } from '../zpeep-manager';
import DEPARTMENT from '../department';
import path from 'path';

const app = express();

app.set('views', [__dirname, path.resolve(__dirname, './../views')]);
app.engine('jsx', require('express-react-views').createEngine({
    babel: {} // Setting this ensures babel transfomrs from babelrc
}));
app.set('view engine', 'jsx');

app.get('/', (req, res) => {
    const { reportDate } = getCurrentDate(req.query.date);

    // Check for error messages comming form passport (authorization.js)
    const { error: [errorMessage = ''] = [] } = req.flash();
    const departmentCode = _.get(req, 'session.passport.user.departmentCode', DEPARTMENT.UNASSIGNED);

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
});

export default app;
