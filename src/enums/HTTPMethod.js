const HTTPMethod = {};
(function (HTTPMethod) {
    HTTPMethod[(HTTPMethod[`CONNECT`] = `connect`)] = `Connect`;
    HTTPMethod[(HTTPMethod[`DELETE`] = `delete`)] = `Delete`;
    HTTPMethod[(HTTPMethod[`GET`] = `get`)] = `Get`;
    HTTPMethod[(HTTPMethod[`HEAD`] = `head`)] = `Head`;
    HTTPMethod[(HTTPMethod[`OPTIONS`] = `options`)] = `Options`;
    HTTPMethod[(HTTPMethod[`PATCH`] = `patch`)] = `Patch`;
    HTTPMethod[(HTTPMethod[`POST`] = `post`)] = `Post`;
    HTTPMethod[(HTTPMethod[`PUT`] = `put`)] = `Put`;
    HTTPMethod[(HTTPMethod[`TRACE`] = `trace`)] = `Trace`;
})(HTTPMethod || (HTTPMethod = {}));
module.exports = HTTPMethod;
