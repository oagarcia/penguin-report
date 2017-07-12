import querystring from 'querystring';
import React from 'react';
import {object, func, arrayOf, shape, string} from 'prop-types';
import lodash from 'lodash';
import { getCurrentDate } from '../utils';
import { ZPeepManager } from '../zpeep-manager';
import CONFIG from '../config';
import Layout from '../views/Layout';

export default class Home extends React.Component {
    static propTypes = {
        req: shape({
            isAuthenticated: func,
            query: object
        }),
        timeEntries: arrayOf(object),
        errorMessage: string
    };

    constructor (props) {
        super(props);

        const {currentDate} = getCurrentDate(this.props.req.query.date);

        this.state = {
            currentDate
        };
    }

    render () {
        const { query } = this.props.req;
        const {errorMessage} = this.props;

        // for some reason destructuring the isAuthenticated recreates the return
        if (!this.props.req.isAuthenticated()) {
            const errorLoginMessage = errorMessage ? <div>{ errorMessage }</div> : null;

            return (
                <div>
                    { errorLoginMessage }
                    <a href={`/auth/google?${querystring.stringify(query)}`}>Login</a>
                </div>);
        }

        // Prints the layout of time
        const rows = lodash.map(this.props.timeEntries, (entryValue) => {
            let flag = '';
            const row = [];

            entryValue.report.forEach((entry) => {
                const entryDescription = entry.description;
                let description = <span className='penguin-icon'>🐧🐧🐧</span>;

                if (typeof entryDescription !== 'undefined') {
                    description = <strong className='text-penguined'>????????????</strong>;

                    if (entryDescription !== '') {
                        if (entry['person-id'] === ZPeepManager.getAdminId() && entry.projectName === ZPeepManager.getAdminHiddenProject()) {
                            description = <span className='description-hidden'>*hidden</span>;
                        } else {
                            description =
                                <span className='text-description' dangerouslySetInnerHTML={{__html: `
                                ${entryDescription.replace(
                                    CONFIG.JIRA_PATTERN,
                                    `<a target="_blank" href="${CONFIG.JIRA_DOMAIN}$1">$1</a>`
                                )}
                                `}} />;
                        }
                    }
                }

                row.push(
                    <tr>
                        <td>
                            {
                                entry.projectName !== ''
                                ? <span><strong>{entry.projectName}</strong><br /></span>
                                : null
                            }
                            { entry.todoName }
                            { description }
                        </td>
                        <td className='tright'>{entry.hours}</td>
                    </tr>
                );
            });

            if (entryValue.totalHours < CONFIG.MIN_HOURS) {
                flag = 'penguined';
            }

            return ([
                <tr>
                    <td className={`user-name ${flag}`} colSpan='2'>
                        <b>{entryValue[CONFIG.PERSON_NAME]}</b>
                    </td>
                </tr>,
                row,
                <tr className={`tright text-${flag}`}>
                    <td colSpan='2'>
                        <b>Total Hours: </b> {entryValue.totalHours}
                    </td>
                </tr>]);
        });

        return (
            <Layout>
                <div className='title-container'>
                    <form id='dateForm' action='' method='GET'>
                        <input id='dateField' name='date' type='date' defaultValue={this.state.currentDate} />
                    </form>
                    <button id='push-notifier'>Notify users</button>
                </div>
                <table className='penguin-report'>
                    <tbody>
                        { rows }
                    </tbody>
                </table>
            </Layout>
        );
    }
}
