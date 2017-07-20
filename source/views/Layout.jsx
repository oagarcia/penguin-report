import React from 'react';
import { object, bool } from 'prop-types';
import CONFIG from '../config';
import Header from '../components/Header';
import { default as _ } from 'lodash';
import { Utils } from '../utils';

export default class Layout extends React.Component {
    static propTypes = {
        children: object,
        authenticated: bool
    };

    render () {
        const { STORAGE_IDENTIFIER, STORAGE_NAME, ROOT_URI, WORKER_SCOPE } = CONFIG;
        const FULL_URL = Utils.appURL();
        const { authenticated } = this.props;
        const user = _.get(this.props, 'req.user');
        let scripts = null;

        if (authenticated) {
            scripts = [
                <script key='0' type='application/json' id='data-env' dangerouslySetInnerHTML={{__html: `
                        ${JSON.stringify({ STORAGE_IDENTIFIER, STORAGE_NAME, ROOT_URI, WORKER_SCOPE })}
                    `}} />,
                <script key='1' src={`${FULL_URL}/scripts/main.js`} />
            ];
        }

        return (
            <html lang='en' className='hide-notifier-button'>
                <head>
                    <meta charSet='UTF-8' />
                    <meta name='viewport' content='width=device-width, initial-scale=1' />
                    <meta name='apple-mobile-web-app-capable' content='yes' />
                    <title>Penguin Report</title>
                    <meta property='og:image' content={`${FULL_URL}/images/penguin-icon.png`} />
                    <meta property='og:title' content='Zemoga | Z-Penguin reports' />
                    <meta property='og:url' content={FULL_URL} />
                    <meta property='og:description' content='Easily check your z-peeps reports' />
                    <meta property='og:site_name' content='Z-Penguin reports' />
                    <link
                        rel='stylesheet'
                        href='https://fonts.googleapis.com/css?family=Montserrat+Alternates:400,700' />
                    <link rel='stylesheet' href={`${FULL_URL}/styles/main.css`} />
                    <link rel='manifest' href={`${FULL_URL}/manifest.json`} />
                    <link rel='icon' type='image/png' href={`${FULL_URL}/images/favicon.png`} />
                </head>
                <body>
                    <Header authenticated={authenticated} user={user} />
                    <main role='content'>
                        <div>{this.props.children}</div>
                    </main>
                    { scripts }
                </body>
            </html>);
    }
}
