import React from 'react';
import { arrayOf, object } from 'prop-types';
import CONFIG from '../config';
import { Utils } from '../utils';
import { ZPeepManager } from '../zpeep-manager';

export default class Layout extends React.Component {
    static propTypes = {
        children: arrayOf(object)
    };

    render () {
        const { STORAGE_IDENTIFIER, STORAGE_NAME, PROTOCOL, DOMAIN, ROOT_URI } = CONFIG;
        const FULL_URL = PROTOCOL + DOMAIN + ROOT_URI;

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
                    <link rel='stylesheet' href={`${ROOT_URI}styles/main.css`} />
                    <link rel='manifest' href={`${ROOT_URI}manifest.json`} />
                    <link rel='icon' type='image/png' href={`${ROOT_URI}images/favicon.png`} />
                </head>
                <body>
                    <div dangerouslySetInnerHTML={{__html: `
                        ${Utils.zPeepsSelectorRenderer(ZPeepManager.peopleIds)}
                        `}} />
                    <div className='title-container'>
                        <h1>Penguin UI Report</h1>
                    </div>
                    <div>{this.props.children}</div>
                    <div>
                        <a href='/logout'>logout</a>
                    </div>
                    <script type='application/json' id='data-env' dangerouslySetInnerHTML={{__html: `
                        ${JSON.stringify({ STORAGE_IDENTIFIER, STORAGE_NAME, ROOT_URI })}
                    `}} />
                    <script src={`${ROOT_URI}scripts/main.js`} />
                </body>
            </html>);
    }
}
