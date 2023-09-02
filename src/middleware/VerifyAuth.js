// sibling
const { Log } = require('../log');
const APIError = require('../core/APIError');
const _ = require('lodash');

const VerifyAuth = (req, res, next) => {

    try {
        const routePerms = global.RouteCache.get(`${req.method.toLowerCase()}=>${req.baseUrl}${req.route.path}`);
        const matchedRoles = _.intersection(req.verfiedAuth.roles, routePerms);
        // Log.info(matchedRoles);
        if (matchedRoles.length < 1) {
            next(new APIError(401, `No permissions for ${req.baseUrl}${req.route.path}`, `No permissions for ${req.baseUrl}${req.route.path}`));
        }
    }
    catch (e) {
        next(new APIError(401, `Error verifying auth for route: ${req.baseUrl}${req.route.path}`, `Error verifying auth for route: ${req.baseUrl}${req.route.path}`));
    }

    next();
}

module.exports = VerifyAuth;
