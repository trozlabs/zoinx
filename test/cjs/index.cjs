const pkg = require('../../package.json');

console.log(`
------------------------------------------------------------
testing: ${pkg.name} v${pkg.version}
------------------------------------------------------------
`);

const zoinx = require('zoinx');
const cli = require('zoinx/cli');
const log = require('zoinx/log');
const util = require('zoinx/util');
const core = require('zoinx/core');
const enums = require('zoinx/enums');
const inspect = require('zoinx/inspect');
const database = require('zoinx/database');
const generator = require('zoinx/generator');

console.log({
    'zoinx': Object.keys(zoinx),
    'zoinx/cli': Object.keys(cli),
    'zoinx/log': Object.keys(log),
    'zoinx/util': Object.keys(util),
    'zoinx/core': Object.keys(core),
    'zoinx/enums': Object.keys(enums),
    'zoinx/inspect': Object.keys(inspect),
    'zoinx/database': Object.keys(database),
    'zoinx/generator': Object.keys(generator)
});

console.log(`
------------------------------------------------------------
testing: zoinx/util
------------------------------------------------------------
`);
require('./util.cjs');

console.log(`
------------------------------------------------------------
testing: zoinx/inspect
------------------------------------------------------------
`);
require('./inspect.cjs');

console.log(`
------------------------------------------------------------
testing: zoinx/log
------------------------------------------------------------
`);
require('./log.cjs');


process.exit(0);
