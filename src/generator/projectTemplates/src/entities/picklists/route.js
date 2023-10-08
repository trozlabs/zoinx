const express = require('express');
const Service = require('./service');
const Controller = require('./controller');

// instances of above
const router = express();
const service = new Service();
const controller = new Controller({
    router: router,
    service: service
});

module.exports = controller.router;
