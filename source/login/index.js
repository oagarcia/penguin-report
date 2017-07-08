export const getLoginTemplate = (queryString = '') => {
    let outputQueryString = queryString;

    outputQueryString = outputQueryString && ('?' + outputQueryString);

    return `<a href="/auth/google${outputQueryString}">Login</a>`;
};
