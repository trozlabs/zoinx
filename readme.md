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


## Template Code Generation

There are 2 big concepts in this framework: Entities & Features.

Entities can be thought of as a full CRUD stack where there is an API route a
corresponding Service and Domain. The Domain file is responsible for defining
the MongoDB Schema. A collection with the Schema name, provided in the
options, will be created if the application server is run.

Features can be treated as an Entity but features define a broader set of
functionality. Feature Services can make use of as many Entity services as
needed and provide an entry point for complex data needs. A GraphQL
approach is similar in nature.

To generate code templates, the CLI can be run by using the node script:

```bash
npm run start-cli
```

### Example Template Generators

Template generator will create 1 to 4 files for an entity or a feature
depending on configuration. The files created are:

1. `index.js`    - Used by express to define API routes
2. `route.js`    - Used to define actionable API endpoints which handle
   permission enforcement, simple input validation, error  
   handling, consistent response output, etc.
3. `service.js`  - Used to contain actual logic and operations that can
   range from simple CRUD to related Domain or more complex
   hybrid operations across services or to remote services
4. `domain.js`   - Used to define the Schema used in Mongo to store data
   into collections. Domains are not strictly needed for
   services to be functional
5. `controller.js`   - Used to define the actual endpoints, their method and
   the function that handles the incoming request. These methods are generally
   used to verify incoming data and access perms then pass the request and
   needed data to the service class. Permission handling can occur in the
   route as well.


</br>The CLI will provide a prompt in the command line where the following example
commands can be run.</br>
**NOTE**
`--entity` and `--feature` work in nearly identical manners, Feature
differences will be noted.</br></br></br>

```json
create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "test.newEntity"}
```

This line will create all 4 entity files with the supplied names, `name`
and `schemaName` are required for generating an Entity. `className` is
optional but will be set using `name` if absent.

    entities/
    ├── newEntity/
    │   ├── domain.js
    │   ├── index.js
    │   ├── route.js
    │   └── service.js
    │   └── controller.js
    

```json
create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "test.newEntity", "overwrite":"true"}
```

This line will overwrite all 4 existing files if the Entity already exists.
If the first command is run twice, it will state it already exists and
`overwrite` will need to be provided.

```json
create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "test.newEntity", "only": "index"}
```

This line will ONLY generate the `index` file for a specified Entity or
Feature. Add `"overwrite":"true"` to overwrite the single file.

```json
create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "test.newEntity", "exclude": ["domain","service"]}
```

This line will create all files NOT mentioned in the `exclude` array.
Add `"overwrite":"true"` to overwrite the generated files.


## Optional Tools:

- [Compass](https://www.mongodb.com/products/compass): A MongoDB Client
- [Insomnia](https://insomnia.rest/download) A REST Client
