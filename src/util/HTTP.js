const Type = require('./Type');

/**
 * Reusable methods related to http requests
 */
module.exports = class HTTP {
    static PAGING_PARAMS = ['page', 'limit', 'sort', 'dir'];
    static DEFAULT_PAGE = 1;
    static DEFAULT_LIMIT = 25;

    /**
     * Paging, Sorting and Query parameter cleanup to match a provided object or array.
     * @param {Object} params any of key:val object to be checked against a Model class.
     * @param {Object/Array} model a model class to be used to verify sort columns or params.
     * @returns {Object}
     */
    static parameters(params, model, caseSensitive) {
        var fieldList = Type.isArray(model) ? model : Object.keys(model);
        var allowed = fieldList.concat(HTTP.PAGING_PARAMS).join(' ');

        console.log('model:', fieldList);
        console.log('allowed:', allowed);

        params.sort = model.hasOwnProperty(params.sort) ? params.sort : undefined;
        params.dir = params.sort ? (params.dir.toUpperCase() === 'ASC' || params.dir.toUpperCase() === 'DESC' ? params.dir : 'ASC') : undefined;
        params.page = (params.page && parseInt(params.page)) || HTTP.DEFAULT_PAGE;
        params.limit = (params.limit && parseInt(params.limit)) || HTTP.DEFAULT_LIMIT;

        for (let param in params) {
            if (Type.isUndefined(params[param])) {
                delete params[param];
            } else if (HTTP.contains(allowed, param, caseSensitive)) {
                continue;
            } else {
                delete params[param];
                console.warn(
                    `Removing '${param}' from parameters as it does not match list of allowed field names. (Parameter names ${caseSensitive ? 'ARE' : 'are NOT'} case sensitive)`
                );
            }
        }
        return params;
    }

    /**
     * Returns true if A contains the contents of B. Optionally case sensitive.
     */
    static contains(a, b, caseSensitive) {
        a = caseSensitive ? a : a.toLowerCase();
        b = caseSensitive ? b : b.toLowerCase();
        return a.includes(b);
    }
};
