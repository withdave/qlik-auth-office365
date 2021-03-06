var OAuth = require('oauth'),
    https = require('https');

var endpoint = {
    "authority": "https://login.microsoftonline.com/common",
    "authorize_endpoint": "/oauth2/v2.0/authorize",
    "token_endpoint": "/oauth2/v2.0/token",
    "scope": "user.read directory.read.all offline_access",

    "state": "o3651234abcd",
    "redirectUriPath": "/oauth2callback",
    "graphUri": "graph.microsoft.com"
};

/**
 * Gets a token for a given resource.
 * @param {string} code An authorization code returned from a client.
 * @param {AcquireTokenCallback} callback The callback function.
 */
function getTokenFromCode( code, state, reqUrl, config, callback ) {

    var redirectUri = reqUrl + endpoint.redirectUriPath;

    var OAuth2 = OAuth.OAuth2;
    var oauth2 = new OAuth2(
        config.office365.client_id,
        config.office365.client_secret,
        endpoint.authority,
        endpoint.authorize_endpoint,
        endpoint.token_endpoint
    );

    oauth2.getOAuthAccessToken(
        code,
        {
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            response_mode: 'form_post',
            nonce: _guid(),
            state: state
        },
        function (e, accessToken, refreshToken) {
            callback(e, accessToken, refreshToken);
        }
    );
}

/**
 * Gets a new access token via a previously issued refresh token.
 * @param {string} refreshToken A refresh token returned in a token response
 *                       from a previous result of an authentication flow.
 * @param {AcquireTokenCallback} callback The callback function.
 */
function getTokenFromRefreshToken( refreshToken, reqUrl, config, callback ) {
    var redirectUri = reqUrl + endpoint.redirectUriPath;
    var OAuth2 = OAuth.OAuth2;
    var oauth2 = new OAuth2(
        config.office365.client_id,
        config.office365.client_secret,
        endpoint.authority,
        endpoint.authorize_endpoint,
        endpoint.token_endpoint
    );

    oauth2.getOAuthAccessToken(
        refreshToken,
        {
            grant_type: 'refresh_token',
            redirect_uri: redirectUri,
            response_mode: 'form_post',
            nonce: _guid(),
            state: endpoint.state
        },
        function ( e, accessToken ) {
            callback(e, accessToken);
        }
    );
}

/**
 * Gets office 365 login url
 */
function getAuthUrl( reqUrl, config ) {
    var redirectUri = reqUrl + endpoint.redirectUriPath;
    return endpoint.authority + endpoint.authorize_endpoint +
        "?response_type=code" +
        "&client_id=" + config.office365.client_id +
        "&redirect_uri=" + redirectUri +
        "&scope=" + endpoint.scope +
        "&response_mode=query" +
        "&nonce=" + _guid() +
        "&state=" + endpoint.state;
}

/**
 * Gets user Groups from user data in Office 365.
 * @param {string} accessToken
 * @param {Callback} callback The callback function.
 */
function getUserGroups( accessToken, callback ) {
    _request( {
        path: "/v1.0/me/memberOf",
        headers: { "Authorization": "Bearer " + accessToken },
    }, function( err, response ) {
        if ( err ) {
            callback(err, null);
        } else {
            callback( null, response );
        }
    } );
}

/**
 * Gets userId from user data in Office 365.
 * @param {string} accessToken
 * @param {Callback} callback The callback function.
 */
function getUser( accessToken, callback ) {
    _request( {
        path: "/v1.0/me",
        headers: { "Authorization": "Bearer " + accessToken },
    }, function( err, response ) {
        if ( err ) {
            callback(err, null);
        } else {
            callback( null, response );
        }
    } );
}

function _request( options, callback ) {

    options.host = options.host || endpoint.graphUri;
    options.agent = options.agent || false;
    options.method = options.method || "GET";

    var req = https.request (options, function( response ) {
        var str = ''
        response.on( 'data', function (chunk) {
            str += chunk;
        });

        response.on( 'end', function () {
            callback( null, JSON.parse(str) );
        } );
    } );
    req.on( 'error', function (err) {
        callback( err, null );
    } );
    req.on( 'timeout', function () {
        // Timeout happend. Server received request, but not handled it
        // (i.e. doesn't send any response or it took to long).
        // You don't know what happend.
        // It will emit 'error' message as well (with ECONNRESET code).
        req.abort();
        callback( "timeout", null );
    } );
    req.end();
}

function _guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}


// ------ LIB exports ------- //
exports.getUser = getUser;
exports.getUserGroups = getUserGroups;
exports.getAuthUrl = getAuthUrl;
exports.getTokenFromCode = getTokenFromCode;
exports.getTokenFromRefreshToken = getTokenFromRefreshToken;