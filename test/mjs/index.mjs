import pkg from '../../package.json' assert { type: "json" };
console.log(`
------------------------------------------------------------
testing: ${pkg.name} v${pkg.version}
------------------------------------------------------------
`);


import * as zoinx from 'zoinx';
import * as cli from 'zoinx/cli';
import * as log from 'zoinx/log';
import * as util from 'zoinx/util';
import * as core from 'zoinx/core';
import * as enums from 'zoinx/enums';
import * as database from 'zoinx/database';
import * as generator from 'zoinx/generator';

console.log({
    'zoinx': Object.keys(zoinx),
    'zoinx/cli': Object.keys(cli),
    'zoinx/log': Object.keys(log),
    'zoinx/util': Object.keys(util),
    'zoinx/core': Object.keys(core),
    'zoinx/enums': Object.keys(enums),
    'zoinx/database': Object.keys(database),
    'zoinx/generator': Object.keys(generator)
});

process.exit(0);


const { Type } = require('zoinx/util');

Type.toBoolean('Y')
Type.toBoolean('Yes')
Type.toBoolean('YES')
Type.toBoolean('yes')
Type.toBoolean('y')
Type.toBoolean('Y')
Type.toBoolean('N')
Type.toBoolean('No')
Type.toBoolean('NO')
Type.toBoolean('F')
Type.toBoolean('false')