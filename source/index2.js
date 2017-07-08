import express from 'express';
import lodash from 'lodash';
import { getLoginTemplate } from '../login';
import { Utils, getCurrentDate } from '../utils';
import { ZPeepManager } from '../zpeep-manager';
import CONFIG from '../config';

const app = express();

app.get('/', (req, res) => {
    const dateQueryString = req.query.date;

    // if not authenticated, just shows login
    if (!req.isAuthenticated()) {
        res.status(200).send(getLoginTemplate(`date=${dateQueryString}`));
        return;
    }

    // Will store querystrng Date
    const { currentDate, reportDate } = getCurrentDate(dateQueryString);

    // Gets the basecamp data and prints html with info
    // TODO: Handle errors!
    ZPeepManager.getZPeepsTimeReport(reportDate, (timeEntries) => {
        // Prints the layout of time
        const rows = lodash.map(timeEntries, (entryValue) => {
            let flag = '';
            let row = '';

            // Pronts each row of data (TODOs)
            entryValue.report.forEach((entry) => {
                const entryDescription = entry.description;
                let description = '';

                if (typeof entryDescription !== 'undefined') {
                    if (entryDescription === '') {
                        description = '<strong class="text-penguined">????????????</strong>';
                    } else {
                        if (entry['person-id'] === ZPeepManager.getAdminId() && entry.projectName === ZPeepManager.getAdminHiddenProject()) {
                            description = '<span class="description-hidden">*hidden</span>';
                        } else {
                            description = `<span class="text-description">${entryDescription.replace(CONFIG.JIRA_PATTERN, '<a target="_blank" href="' + CONFIG.JIRA_DOMAIN + '$1">$1</a>')}</span>`;
                        }
                    }
                } else {
                    description = '<span class="penguin-icon">🐧🐧🐧</span>';
                }

                row += `<tr><td>
                ${entry.projectName !== '' ? '<strong>' + entry.projectName + '</strong><br />' : ''}
                ${entry.todoName}
                ${description}</td><td class="tright">${entry.hours}</td></tr>`;
            });

            // Penguined!!!!!!!!!!!!!!!!!!
            if (entryValue.totalHours < CONFIG.MIN_HOURS) {
                flag = 'penguined';
            }

            return `
            <tr>
            <td class="user-name ${flag}" colspan="2">
                <b>${entryValue[CONFIG.PERSON_NAME]}</b>
            </td>
            </tr>
            ${row}
            <tr class="tright text-${flag}">
            <td colspan="2">
                <b>Total Hours: </b> ${entryValue.totalHours}
            </td>
            </tr>`;
        });

        const { STORAGE_IDENTIFIER, STORAGE_NAME, ROOT_URI } = CONFIG;

        // TODO: Rendering enhanced via templates i.e handlebars
        // Zorro: Can be done, but need a few more advanced tasks,
        // such as copy files to build/ folder
        res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en" class="hide-notifier-button">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <title>Penguin Report</title>
            ${Utils.ogRenderer()}
            <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat+Alternates:400,700">
            <link rel="stylesheet" href="${CONFIG.ROOT_URI}styles/main.css">
            <link rel="manifest" href="${CONFIG.ROOT_URI}manifest.json">
            <link rel="icon" type="image/png" href="${CONFIG.ROOT_URI}images/favicon.png">
        </head>
        <body>
            ${Utils.zPeepsSelectorRenderer(ZPeepManager.peopleIds)}
            <div class="title-container">
            <h1>Penguin UI Report</h1>
            <form action="" method="GET">
                <input name="date" type="date" value="${currentDate}" onchange="this.form.submit();">
            <form>
            <button id="push-notifier">Notify users</button>
            </div>
            <table class="penguin-report">
            ${rows.join('')}
            </table>
            <div style="text-align:center;padding:20px">
                <a href="/logout">logout</a>
            </div>
            <script type="application/json" id="data-env">
            ${JSON.stringify({ STORAGE_IDENTIFIER, STORAGE_NAME, ROOT_URI })}
            </script>
            <script src="${ROOT_URI}scripts/main.js"></script>
        </body>
        </html>
    `);
    });
});

export default app;
