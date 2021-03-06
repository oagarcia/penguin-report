import React from 'react';
import {shape, string, bool} from 'prop-types';
import { Utils } from '../utils';
import classNames from 'classnames';

class Header extends React.Component {
    static propTypes = {
        user: shape({
            fullname: string,
            nickname: string
        }),
        authenticated: bool
    };

    static defaultProps = {
        user: {
            nickName: '',
            fullName: '',
            thumbnailPhotoUrl: ''
        }
    };

    render () {
        const { user, authenticated } = this.props;
        const { nickname: nickName, fullName, thumbnailPhotoUrl } = user;

        return (
            <header
                role='banner'
                className={classNames('header', {'header--simple': !authenticated})} >
                <div className='header_wrapper'>
                    <h1>Zemoga Inc</h1>
                    { authenticated ? <div className='user-session'>
                        <img
                            witdh='32'
                            height='32'
                            className='header__thumbnail'
                            src={thumbnailPhotoUrl || Utils.imgURL() + 'default-thumbnail.png'}
                            alt={fullName} />
                        <span>{fullName}{nickName ? <span> ({nickName})</span> : null}  | </span>
                        <a href={`${Utils.appURL()}/logout`}>Log out</a>
                    </div> : null }
                </div>
            </header>
        );
    }
}

export default Header;
