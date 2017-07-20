import React from 'react';
import {number, string, object} from 'prop-types';
import { Utils } from '../utils';
import { ZPeepManager } from '../zpeep-manager';
import CONFIG from '../config';

export default class Zemogian extends React.Component {
    static propTypes = {
        entryValue: object,
        minimumReportedHours: number,
        defaultThumbnailPhotoUrl: string
    };

    static defaultProps = {
        entryValue: {
            totalHours: 0,
            fullName: 'NN'
        },
        minimumReportedHours: 7,
        defaultThumbnailPhotoUrl: Utils.imgURL() + 'default-thumbnail.png'
    };

    render () {
        const { entryValue } = this.props;
        const {
            entryValue: {
                totalHours,
                googleProfile: {
                    thumbnailPhotoUrl,
                    fullName
                }
            },
            minimumReportedHours,
            defaultThumbnailPhotoUrl
        } = this.props;

        let flag = '';
        const reports = [];

        if (totalHours < minimumReportedHours) {
            flag = 'penguined';
        }

        entryValue.report.forEach((entry) => {
            const {
                description: entryDescription,
                projectName,
                'person-id': personId,
                todoName,
                reportId,
                hours
            } = entry;

            let description = <span className='penguin-icon'>🐧🐧🐧</span>;

            if (typeof entryDescription !== 'undefined') {
                description = <strong className='text-penguined'>????????????</strong>;

                if (entryDescription !== '') {
                    if (personId === ZPeepManager.getAdminId() && projectName === ZPeepManager.getAdminHiddenProject()) {
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

            reports.push(
                <div id={`report_${reportId}`} key={reportId} className='zemogian__report'>
                    {
                        projectName !== ''
                        ? <span>
                            <strong>{ projectName }</strong>
                            <br />
                        </span>
                        : null
                    }
                    { todoName }
                    { description }
                    <div className='tright'>{ hours }</div>
                </div>
            );
        });

        return (
            <div className='zemogian'>
                <header className='zemogian__header'>
                    <img
                        className='zemogian__icon'
                        width='32'
                        height='32'
                        src={thumbnailPhotoUrl || defaultThumbnailPhotoUrl}
                        alt={fullName} />
                    <h2 className='zemogian__name'>{ fullName }</h2>
                </header>
                { reports }
                <div className={`zemogian__total tright ${flag}`}>
                    Total Hours: { totalHours }
                </div>
            </div>
        );
    }
}
