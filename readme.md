# zoinx

```bash
npm install trozlabs/zoinx
```

```js

const zoinx = require('zoinx');

const cli = require('zoinx/cli');
const log = require('zoinx/log');
const util = require('zoinx/util');
const core = require('zoinx/core');
const enums = require('zoinx/enums');
const database = require('zoinx/database');
const generator = require('zoinx/generator');

```


## zoinx/database

### JSONDatabase

```js
const { JSONDatabase } = require('zoinx/database');

const db = new JSONDatabase({
    file: './data/db.json', // defaults to `./db.json`
    syncronizeSchemas: true, // will update json schemas with changes in `schemas`.
    schemas: {
        users: [],
        roles: []
    }
});

const read = db.insert('roles', { name: 'read' })
const write = db.insert('roles', { name: 'write' })

var user1 = db.insert('users', { 
    email: 'user1@example.com', 
    enabled: false,
    roles: [ read.id, write.id ] 
})

user1 = db.select('users', user1.id);

db.search('users', 'user1');

user1 = db.update('users', {
    ...user1,
    enabled: true
});

db.delete('users', user1.id);

```