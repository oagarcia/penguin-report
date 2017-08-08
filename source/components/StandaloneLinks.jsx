import React, { Component } from 'react';

export default class StandaloneLinks extends Component {
    render () {
        return (
            <script dangerouslySetInnerHTML={{__html: `
                // Avoid links to be opened in Safari (standalone mode)
                (function (document, navigator, standalone) {
                    // prevents links from apps from oppening in mobile safari
                    // this javascript must be the first script in your <head>
                    if ((standalone in navigator) && navigator[standalone]) {
                        let curnode;
                        const location = document.location;
                        const stop = /^(a|html)$/i;

                        document.addEventListener('click', (e) => {
                            curnode = e.target;
                            while (!(stop).test(curnode.nodeName)) {
                                curnode = curnode.parentNode;
                            }
                            // Condidions to do this only on links to your own app
                            // if you want all links, use if('href' in curnode) instead.
                            if ('href' in curnode && (curnode.href.indexOf('http') || ~curnode.href.indexOf(location.host))) {
                                e.preventDefault();
                                location.href = curnode.href;
                            }
                        }, false);
                    }
                })(document, window.navigator, 'standalone');
            `}} />
        );
    }
}
