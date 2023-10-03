const { MongoDB } = require('zoinx/database');

/**
 * Environment variables are used to configure the
 * database connection. There's a bug when passing
 * config in the constructor. Need to look into that.
 */
module.exports = MongoDB.create();
