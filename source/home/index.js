import express from 'express';
import { getCurrentDate } from '../utils';
import { ZPeepManager } from '../zpeep-manager';
import path from 'path';

const app = express();

app.set('views', [__dirname, path.resolve(__dirname, './../views')]);
app.engine('jsx', require('express-react-views').createEngine({
    babel: {} // Setting this ensures babel transfomrs from babelrc
}));
app.set('view engine', 'jsx');

app.get('/', (req, res) => {
    const { reportDate } = getCurrentDate(req.query.date);

    ZPeepManager.getZPeepsTimeReport(reportDate, (timeEntries) => {
        res.render('Home',
            {
                req,
                timeEntries
            }
        );
    });
});

export default app;
