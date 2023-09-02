const { Log } = require('../log');
const APIError = require('../core/APIError');
const AppCache = require('../core/AppCache');
const _ = require('lodash');
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const vaService = require('../routes/validatedAuths/service');
const rrService = require('../routes//routeRoles/service');
const {Filter} = require("zoinx/util");

const GateKeeperMS = async (req, res, next) => {

    if (_.isEmpty(global.AuthCache)) await setupSecurityCaches();

    const authHeader = req.headers.authorization;
    if (_.isEmpty(authHeader)) throw new APIError(401, `No authorization bearer was provided for: ${req.url}`, `No credentials provided for: ${req.url}`);

    try {
        const parsedToken = await parseAuthHeader(authHeader);
        let principal = '',
            jwtToken;

        if (_.isEmpty(global.AuthCache.get(parsedToken.payload.oid))) {

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
            else if (authHeader.includes('Basic')) {
                if (!await isBasicAuthHeaderValid(authHeader)) {
                    console.log('Invalid Basic auth header. Header is: ' + authHeader);
                    next(new APIError(401, `Invalid Basic Auth header: ${authHeader}`, `Invalid authorization: ${req.url}`));
                }
            }
            else {
                console.log('Invalid auth header. Auth header is: ' + authHeader);
                next(new APIError(401, `Invalid authorization header: ${authHeader}`, `Invalid authorization: ${req.url}`));
            }
        }
        else {
            req.verfiedAuth = {};
            req.verfiedAuth.oid = parsedToken.payload.oid;
            req.verfiedAuth.roles = ['SAP_READ', 'BINGO']; //parsedToken.payload.roles;
            // console.log(`${parsedToken.payload.oid} found in cache`);
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
    // Check if the auth header is present and in the correct format
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }

    // Decode the auth header and extract the username and password
    const credentials = Buffer.from(authHeader.slice('Basic '.length), 'base64').toString();
    const [authUsername, authPassword] = credentials.split(':');

    const username = ''; //process.env.client_id;
    const password = ''; //process.env.client_secret;

    // Compare the extracted credentials to the expected values
    const valid = authUsername === username && authPassword === password;
    console.log('Basic auth header validated and the result is: ' + valid);
    return valid;
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

        if (results.length >= 0) {
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

        if (results.length >= 0) {
            global.RouteCache.flushAll();
            global.RouteCache.flushStats();
            let result;
            for (let i=0; i<results.length; i++) {
                result = results[i];
                global.RouteCache.set(`${result.get('route_method')}=>${result.get('route_path')}`, result.get('role_names'), 0);
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
            tokenStr = authHeader.replace(/^Bearer /, '');
            parsedToken = jwt.decode(tokenStr, {
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

