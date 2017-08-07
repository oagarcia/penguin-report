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
                <script key='1' src={`${FULL_URL}/scripts/main.js?cacheBuster=${Utils.cacheBuster}`} />
            ];
        }

        return (
            <html lang='en' className='hide-notifier-button'>
                <head>
                    <title>Penguin Report</title>
                    <meta charSet='UTF-8' />
                    <meta name='viewport' content='width=device-width, initial-scale=1' />
                    <meta name='apple-mobile-web-app-capable' content='yes' />
                    <meta property='og:image' content={`${FULL_URL}/images/icons/penguin-icon.png`} />
                    <meta property='og:title' content='Zemoga | Z-Penguin report' />
                    <meta property='og:url' content={FULL_URL} />
                    <meta property='og:description' content='Easily check your z-peeps reports' />
                    <meta property='og:site_name' content='Z-Penguin report' />
                    <meta name='theme-color' content='#ffffff' />
                    <link rel='apple-touch-icon' sizes='180x180' href={`${FULL_URL}/images/icons/apple-touch-icon.png`} />
                    <link rel='icon' type='image/png' sizes='32x32' href={`${FULL_URL}/images/icons/favicon-32x32.png`} />
                    <link rel='icon' type='image/png' sizes='16x16' href={`${FULL_URL}/images/icons/favicon-16x16.png`} />
                    <link rel='mask-icon' href={`${FULL_URL}/images/icons/safari-pinned-tab.svg`} color='#5bbad5' />
                    <link
                        rel='stylesheet'
                        href='https://fonts.googleapis.com/css?family=Montserrat+Alternates:400,700' />
                    <link rel='stylesheet' href={`${FULL_URL}/styles/main.css?cacheBuster=${Utils.cacheBuster}`} />
                    <link rel='manifest' href={`${FULL_URL}/manifest.json`} />
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
