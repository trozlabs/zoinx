# zoinx

NPM workspace for `@zoinx/*`

## Creating a new Package

    npm init --scope @zoinx --workspace ./packages/mysql

## Testing:

Run the workspace test for Commonjs and ES Modules in the `/test/cjs` and `test/mjs` directories.

    npm test

Runs each package test script. 

    npm test --workspaces

## Installing Packages

Example

    npm install mysql --workspace ./packages/database

Install package on a sub package

    npm install <package-name> --workspace <target-package-name>

Install `package-name` on `target-package-name` as a dev dependency

    npm install package-name --workspace target-package-name --save-dev

Install `package-a` on `package-b`

    npm install package-a --workspace package-b

Install `eslint` in all packages

    npm install eslint --workspaces

## `./package.json`

```json
{
    "exports": {
        ".": {
            "import": "./src/index.js",
            "require": "./src/index.js"
        },
        "./enum": {
            "import": "./packages/enum/src/index.js",
            "require": "./packages/enum/src/index.js"
        },
        "./util": {
            "import": "./packages/util/src/index.js",
            "require": "./packages/util/src/index.js"
        },
        "./log": {
            "import": "./packages/log/src/index.js",
            "require": "./packages/log/src/index.js"
        },
        "./core": {
            "import": "./packages/core/src/index.js",
            "require": "./packages/core/src/index.js"
        },
        "./mongodb": {
            "import": "./packages/mongodb/src/index.js",
            "require": "./packages/mongodb/src/index.js"
        }
    }
}
```

In `~/some-project`

```json
{
    "name": "some-project",
    "dependencies": {
        "@zoinx/zoinx": "file:../zoinx"
    }
}
```

```js
import * as log from '@zoinx/log';
import * as util from '@zoinx/util';
import * as core from '@zoinx/core';
import * as enums from '@zoinx/enums';
```

```js
const log = require('../log');
const util = require('../util');
const core = require('../core');
const enums = require('../enums');

```