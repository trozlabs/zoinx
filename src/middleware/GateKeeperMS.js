const { Log } = require('../log');
const APIError = require('../core/APIError');
const AppCache = require('../core/AppCache');
const _ = require('lodash');
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const laService = require('../routes/localAccts/service');
const vaService = require('../routes/validatedAuths/service');
const rrService = require('../routes//routeRoles/service');
const {Filter} = require("zoinx/util");
const bcrypt = require('bcrypt');

const GateKeeperMS = async (req, res, next) => {

    if (_.isEmpty(global.AuthCache)) await setupSecurityCaches();

    const authHeader = req.headers.authorization;
    if (_.isEmpty(authHeader)) throw new APIError(401, `No authorization bearer was provided for: ${req.url}`, `No credentials provided for: ${req.url}`);

    try {
        const parsedToken = await parseAuthHeader(authHeader);
        let principal = '',
            jwtToken;

        if (!_.isEmpty(parsedToken) && _.isEmpty(global.AuthCache.get(parsedToken.payload.oid))) {

            if (!_.isEmpty(parsedToken)) {
                if (await validateJwtAudienceId(parsedToken)) {
                    jwtToken = await validateJwtToken(parsedToken, authHeader);
                    if (!_.isEmpty(jwtToken)) {
                        principal = jwtToken?.preferred_username ?? 'user';
                        Log.info(`Token successfully decoded for user: ${principal}`);
                        await saveVerifiedAuth(req, parsedToken, authHeader);
                    }
                }
                else {
                    next(new APIError(401, `Incorrect audience id`, `Incorrect audience id`));
                }
            }
            else {
                next(new APIError(401, `Invalid authorization header: ${authHeader}`, `Invalid authorization: ${req.url}`));
            }
        }
        else if (_.isEmpty(parsedToken) && authHeader.includes('Basic')) {
            let basicAuthResult = await isBasicAuthHeaderValid(authHeader);
            if (basicAuthResult.valid) {
                Log.info('Successful basic auth login');
                if (_.isEmpty(req.verfiedAuth)) {
                    req.verfiedAuth = {};
                    req.verfiedAuth.roles = [];
                }
                req.verfiedAuth.roles.push(basicAuthResult.role);
                //save the root accessed to db.
            }
            else {
                next(new APIError(401, `Invalid Basic auth credentials: ${req.url}`, `Invalid Basic auth credentials: ${req.url}`));
            }
        }
        else {
            req.verfiedAuth = {};
            req.verfiedAuth.oid = parsedToken.payload.oid;
            if (!_.isEmpty(process.env.AZURE_TEST_ROLES)) {
                req.verfiedAuth.roles = JSON.parse(process.env.AZURE_TEST_ROLES);
            }
            else {
                req.verfiedAuth.roles = parsedToken.payload.roles;
            }
        }
        //maybe put found cached auth in req object
    }
    catch (e) {
        if (!_.isEmpty(e.statusCode))
            next(e);
        else
            next(new APIError(401, e.message));
    }
    next();
}

async function setupSecurityCaches() {
    global.AuthCache = new AppCache();
    global.RouteCache = new AppCache();
    await fillAuthCacheFromStore();
    await fillRouteCacheFromStore();
}

async function validateJwtToken(decodedToken, authHeader) {
    let tokenStr, decoded;

    if (!_.isEmpty(decodedToken) && !_.isEmpty(authHeader) && _.isString(authHeader)) {

        tokenStr = authHeader.replace(/^Bearer /, '');
        const kid = decodedToken.header.kid,
            algorithm = decodedToken.header.alg;

        Log.info('Received token kid is: ' + kid);

        // Get the public key from Azure AD
        const client = jwksClient({
            jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys'
        });

        let key = await new Promise((resolve, reject) => {
            client.getSigningKey(kid, (err, key) => {
                if (err) {
                    Log.info('Error retrieving signing key from Azure.');
                    reject(err);
                } else {
                    Log.info('Received public key from Azure AD.');
                    resolve(key.publicKey || key.rsaPublicKey);
                }
            });
        });

        try {
            // Verify the token using the public key
            decoded = jwt.verify(tokenStr, key, {
                signature: decodedToken.signature,
                algorithms: [algorithm]
            });
        } catch (e) {
            if (e.name.toLowerCase() === 'tokenexpirederror') {
                throw new APIError(401, `Access has expired, please login again.`);
            } else {
                throw new APIError(401, e.message);
            }
        }
    }

    return decoded;
}

async function isBasicAuthHeaderValid(authHeader) {
    let rtn = {
        valid: false,
        role: undefined
    };

    // Check if the auth header is present and in the correct format
    if (_.isEmpty(authHeader) || !authHeader.startsWith('Basic ')) {
        return false;
    }

    try {
        // Decode the auth header and extract the username and password
        const credentials = Buffer.from(authHeader.slice('Basic '.length), 'base64').toString();
        const [authUsername, authPassword] = credentials.split(':');
        let filterArry = [
                {field: 'username', term: authUsername}
            ],
            filters = new Filter(filterArry);

        const localAcctsService = new laService();
        const results = await localAcctsService.find({}, filters.getFilters());

        if (results.length === 1) {
            rtn.valid = await bcrypt.compare(authPassword, results[0].get('password'));
            rtn.role = authUsername;
        }
    }
    catch (e) {
        Log.error(e.message);
    }

    return rtn;
}

async function validateJwtAudienceId(parsedToken) {
    let validAudience = false;
    if (!_.isEmpty(parsedToken))
        validAudience = parsedToken?.payload?.aud === process.env.AZURE_AUDIENCE_ID;
    return validAudience;
}

async function fillAuthCacheFromStore() {
    let filterArry = [
        {field: 'expires', term: new Date(), oper: '>='}
    ],
    filters = new Filter(filterArry);

    try {
        const verifiedAuthsService = new vaService(),
            results = await verifiedAuthsService.find({}, filters.getFilters());

        if (results.length > 0) {
            let result, ttl;
            for (let i=0; i<results.length; i++) {
                result = results[i];
                ttl = parseInt((result.get('expires').getTime()/1000) - (new Date().getTime()/1000));
                global.AuthCache.set(result.get('user_oid'), result.get('jwt_parsed'), ttl);
            }
        }
    }
    catch (e) {
        console.log(e.message);
    }
}

async function fillRouteCacheFromStore() {
    let filterArry = [
            {field: 'enabled', term: true}
        ],
        filters = new Filter(filterArry);

    try {
        const routeRolesService = new rrService(),
            results = await routeRolesService.find({}, filters.getFilters());

        if (results.length > 0) {
            await global.RouteCache.flushAll();
            await global.RouteCache.flushStats();
            let result;
            for (let i=0; i<results.length; i++) {
                result = results[i];
                await global.RouteCache.set(`${result.get('route_method')}=>${result.get('route_path')}`, result.get('role_names'), 0);
            }
        }
    }
    catch (e) {
        console.log(e.message);
    }
}

async function saveVerifiedAuth(req, parsedToken, authHeader='') {
    try {
        let tokenStr = authHeader.replace(/^Bearer /, '');
        const verifiedAuthsService = new vaService(),
              verifiedObj = await createVerifiedObject(req, parsedToken, tokenStr);

        let saveResult = await verifiedAuthsService.save(undefined, verifiedObj),
            ttl = parseInt(parsedToken.payload.exp - (new Date().getTime()/1000));
        global.AuthCache.set(verifiedObj.user_oid, verifiedObj.jwt_parsed, ttl);
    }
    catch (e) {
        Log.error(e);
    }
}

async function createVerifiedObject(req, parsedToken, tokenStr) {
    let verifiedAuthObj = {},
        expires;

    try {
        if (!_.isEmpty(req) && !_.isEmpty(parsedToken)) {

            expires = new Date(0)
            expires.setUTCSeconds(parsedToken.payload.exp);

            verifiedAuthObj.user_oid = parsedToken.payload.oid;
            verifiedAuthObj.expires = expires;
            verifiedAuthObj.jwt_token = tokenStr;
            verifiedAuthObj.jwt_parsed = parsedToken;
            verifiedAuthObj.ip_address = req.socket.remoteAddress;
            verifiedAuthObj.user_agent = req.get('user-agent');
            verifiedAuthObj.preferred_username = parsedToken.payload.preferred_username;
            verifiedAuthObj.updated_user = 'SYSTEM';
            verifiedAuthObj.created_user = 'SYSTEM';
        }
    }
    catch (e) {
        Log.error(e.message);
    }

    return verifiedAuthObj;
}

async function parseAuthHeader(authHeader) {
    let parsedToken = {},
        tokenStr;

    try {
        if (!_.isEmpty(authHeader)) {
            tokenStr = await authHeader.replace(/^Bearer /, '');
            parsedToken = await jwt.decode(tokenStr, {
                complete: true
            });
        }
    }
    catch (e) {
        Log.error(e.message);
    }

    return parsedToken;
}

module.exports = GateKeeperMS;

