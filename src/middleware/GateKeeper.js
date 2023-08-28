const { Log } = require('../log');
const APIError = require('../core/APIError');
const AppCache = require('../core/AppCache');
const _ = require('lodash');
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const GateKeeper = async (req, res, next) => {

    const authHeader = req.headers.authorization;
    if (_.isEmpty(authHeader)) throw new APIError(401, `No authorization bearer was provided for: ${req.url}`, `No credentials provided for: ${req.url}`);

    try {
        let tokenStr = '',
            principal = '';

        if (authHeader.includes('Bearer')) {
            tokenStr = authHeader.replace(/^Bearer /, '');
            const decoded = await validateJwtToken(tokenStr);
            if (decoded) {
                principal = decoded?.preferred_username ?? 'user';
                console.log('Token successfully decoded for user: ' + decoded?.preferred_username);
            }
        }
        else if (authHeader.includes('Basic')) {
            if (!await isBasicAuthHeaderValid(authHeader)) {
                console.log('Invalid Basic auth header. Header is: ' + authHeader);
                throw new APIError(401, `Invalid Basic Auth header: ${authHeader}`, `Invalid authorization: ${req.url}`);
            }
        }
        else {
            console.log('Invalid auth header. Auth header is: ' + authHeader);
            throw new APIError(401, `Invalid authorization header: ${authHeader}`, `Invalid authorization: ${req.url}`);
        }
    }
    catch (e) {
        throw new APIError(401);
    }

    next();
}

async function validateJwtToken(tokenStr) {

    // Decode the token to get the kid (key id) and the algorithm
    const decodedToken = jwt.decode(tokenStr, {
        complete: true
    });

    const kid = decodedToken.header.kid,
        algorithm = decodedToken.header.alg;

    Log.info('Received token kid is: ' + kid);

    // Get the public key from Azure AD
    const client = jwksClient({
        jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys' //`${process.env.azure_keys_url}`
    });

    let key = await new Promise((resolve, reject) => {
        client.getSigningKey(kid, (err, key) => {
            if (err) {
                Log.info('Error retrieving signing key from Azure.');
                reject(err);
            }
            else {
                Log.info('Received public key from Azure AD.');
                resolve(key.publicKey || key.rsaPublicKey);
            }
        });
    });

    let decoded;
    try {
        // Verify the token using the public key
        // Log.info(key);
        decoded = jwt.verify(tokenStr, key, {
            signature: decodedToken.signature,
            algorithms: [algorithm]
        });
    }
    catch (e) {
        Log.error(e);
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

module.exports = GateKeeper;

