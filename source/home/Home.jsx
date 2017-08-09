import querystring from 'querystring';
import React from 'react';
import {object, func, arrayOf, shape, string} from 'prop-types';
import { default as _ } from 'lodash';
import { getCurrentDate, Utils } from '../utils';
import CONFIG from '../config';
import Layout from '../views/Layout';
import Zemogian from '../components/Zemogian';

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
        const { errorMessage, timeEntries } = this.props;

        const errorLoginMessage = errorMessage ? <div className='login'>{ errorMessage }</div> : null;

        // for some reason destructuring the isAuthenticated recreates the return :(
        const authenticated = this.props.req.isAuthenticated();

        const content = !authenticated ? (
            <div className='content zemogian header_wrapper login'>
                <div className='title'>
                    <span className='title-container__icon' />
                    <h3>Penguin Report</h3><br />
                </div>
                { errorLoginMessage }
                <br />
                <a href={`${CONFIG.ROOT_URI}/auth/google?${querystring.stringify(query)}`}><strong>Login with your Zemoga Gmail account</strong></a>
            </div>)
            : <div className='content'>
                <div className='title-container'>
                    <div className='title'>
                        <span className='title-container__icon' />
                        <h3>Penguin Report</h3>
                    </div>
                    <div className='date'>
                        <form id='dateForm' action='' method='GET'>
                            <input id='dateField' name='date' type='date' defaultValue={this.state.currentDate} />
                            <button type='button' id='push-notifier'>Notify users</button>
                        </form>
                        <a href='https://zemogatime.updatelog.com' rel='noopener' target='_blank'>Report on Basecamp &gt;</a>
                    </div>
                </div>
                <div className='zemogians'>
                    {
                    _.map(timeEntries,
                    (entryValue) => {
                        const { 'person-id': personId } = entryValue;

                        return (
                            <Zemogian
                                key={personId}
                                entryValue={entryValue}
                                defaultThumbnailPhotoUrl={Utils.imgURL() + 'default-thumbnail.png'}
                                minimumReportedHours={7} />
                        );
                    }) }
                </div>
            </div>;

        return (
            <Layout authenticated={authenticated} {...this.props}>
                { content }
            </Layout>
        );
    }
}
