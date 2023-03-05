const express = require('express');
const router = express.Router();
const { ResponseObj } = require('../core');

router.get(
    '/',
    global.asyncHandler(async (req, res) => {
        res.send(ResponseObj.getJson('PONG'));
    })
);

module.exports = router;
