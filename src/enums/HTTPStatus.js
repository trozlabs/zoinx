const HTTPStatus = {};
(function (HTTPStatus) {
    HTTPStatus[(HTTPStatus[`Continue`] = 100)] = `Continue`;
    HTTPStatus[(HTTPStatus[`Switching Protocols`] = 101)] = `Switching Protocols`;
    HTTPStatus[(HTTPStatus[`Early Hints`] = 103)] = `Early Hints`;

    HTTPStatus[(HTTPStatus[`OK`] = 200)] = `OK`;
    HTTPStatus[(HTTPStatus[`Created`] = 201)] = `Created`;
    HTTPStatus[(HTTPStatus[`Accepted`] = 202)] = `Accepted`;
    HTTPStatus[(HTTPStatus[`Non-Authoritative Information`] = 203)] = `Non-Authoritative Information`;
    HTTPStatus[(HTTPStatus[`No Content`] = 204)] = `No Content`;
    HTTPStatus[(HTTPStatus[`Reset Content`] = 205)] = `Reset Content`;
    HTTPStatus[(HTTPStatus[`Partial Content`] = 206)] = `Partial Content`;

    HTTPStatus[(HTTPStatus[`Multiple Choices`] = 300)] = `Multiple Choices`;
    HTTPStatus[(HTTPStatus[`Moved Permanently`] = 301)] = `Moved Permanently`;
    HTTPStatus[(HTTPStatus[`Found`] = 302)] = `Found`;
    HTTPStatus[(HTTPStatus[`See Other`] = 303)] = `See Other`;
    HTTPStatus[(HTTPStatus[`Not Modified`] = 304)] = `Not Modified`;
    HTTPStatus[(HTTPStatus[`Temporary Redirect`] = 307)] = `Temporary Redirect`;
    HTTPStatus[(HTTPStatus[`Permanent Redirect`] = 308)] = `Permanent Redirect`;

    HTTPStatus[(HTTPStatus[`Bad Request`] = 400)] = `Bad Request`;
    HTTPStatus[(HTTPStatus[`Unauthorized`] = 401)] = `Unauthorized`;
    HTTPStatus[(HTTPStatus[`Payment Required`] = 402)] = `Payment Required`;
    HTTPStatus[(HTTPStatus[`Forbidden`] = 403)] = `Forbidden`;
    HTTPStatus[(HTTPStatus[`Not Found`] = 404)] = `Not Found`;
    HTTPStatus[(HTTPStatus[`Method Not Allowed`] = 405)] = `Method Not Allowed`;
    HTTPStatus[(HTTPStatus[`Not Acceptable`] = 406)] = `Not Acceptable`;
    HTTPStatus[(HTTPStatus[`Proxy Authentication Required`] = 407)] = `Proxy Authentication Required`;
    HTTPStatus[(HTTPStatus[`Request Timeout`] = 408)] = `Request Timeout`;
    HTTPStatus[(HTTPStatus[`Conflict`] = 409)] = `Conflict`;
    HTTPStatus[(HTTPStatus[`Gone`] = 410)] = `Gone`;
    HTTPStatus[(HTTPStatus[`Length Required`] = 411)] = `Length Required`;
    HTTPStatus[(HTTPStatus[`Precondition Failed`] = 412)] = `Precondition Failed`;
    HTTPStatus[(HTTPStatus[`Payload Too Large`] = 413)] = `Payload Too Large`;
    HTTPStatus[(HTTPStatus[`URI Too Long`] = 414)] = `URI Too Long`;
    HTTPStatus[(HTTPStatus[`Unsupported Media Type`] = 415)] = `Unsupported Media Type`;
    HTTPStatus[(HTTPStatus[`Range Not Satisfiable`] = 416)] = `Range Not Satisfiable`;
    HTTPStatus[(HTTPStatus[`Expectation Failed`] = 417)] = `Expectation Failed`;
    HTTPStatus[(HTTPStatus[`I'm a teapot`] = 418)] = `I'm a teapot`;
    HTTPStatus[(HTTPStatus[`Unprocessable Entity`] = 422)] = `Unprocessable Entity`;
    HTTPStatus[(HTTPStatus[`Too Early`] = 425)] = `Too Early`;
    HTTPStatus[(HTTPStatus[`Upgrade Required`] = 426)] = `Upgrade Required`;
    HTTPStatus[(HTTPStatus[`Precondition Required`] = 428)] = `Precondition Required`;
    HTTPStatus[(HTTPStatus[`Too Many Requests`] = 429)] = `Too Many Requests`;
    HTTPStatus[(HTTPStatus[`Request Header Fields Too Large`] = 431)] = `Request Header Fields Too Large`;
    HTTPStatus[(HTTPStatus[`Unavailable For Legal Reasons`] = 451)] = `Unavailable For Legal Reasons`;

    HTTPStatus[(HTTPStatus[`Internal Server Error`] = 500)] = `Internal Server Error`;
    HTTPStatus[(HTTPStatus[`Not Implemented`] = 501)] = `Not Implemented`;
    HTTPStatus[(HTTPStatus[`Bad Gateway`] = 502)] = `Bad Gateway`;
    HTTPStatus[(HTTPStatus[`Service Unavailable`] = 503)] = `Service Unavailable`;
    HTTPStatus[(HTTPStatus[`Gateway Timeout`] = 504)] = `Gateway Timeout`;
    HTTPStatus[(HTTPStatus[`HTTP Version Not Supported`] = 505)] = `HTTP Version Not Supported`;
    HTTPStatus[(HTTPStatus[`Variant Also Negotiates`] = 506)] = `Variant Also Negotiates`;
    HTTPStatus[(HTTPStatus[`Insufficient Storage`] = 507)] = `Insufficient Storage`;
    HTTPStatus[(HTTPStatus[`Loop Detected`] = 508)] = `Loop Detected`;
    HTTPStatus[(HTTPStatus[`Not Extended`] = 510)] = `Not Extended`;
    HTTPStatus[(HTTPStatus[`Network Authentication Required`] = 511)] = `Network Authentication Required`;
})(HTTPStatus);
module.exports = HTTPStatus;
