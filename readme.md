<a name="readme-top"></a>
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<div align="center">
    <img src="images/zoinxLogo.png" alt="Zoinx" width="360" height="150">
  <p>
    An Opinionated Framework based on NodeJS, Mongo and Kafka to simplify creating full-featured applications.
    <br />
    <a href="https://github.com/trozlabs/zoinx/wiki"><strong>Explore the WIKI »</strong></a>
    <br />
    <a href="https://github.com/trozlabs/zoinx/issues">Report Bug</a>
    ·
    <a href="https://github.com/trozlabs/zoinx/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-zoinx">About Zoinx</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li>
      <a href="#efi">Entities and Features and Integrations</a>
      <ul>
        <li><a href="#code-gen">Code Generators</a></li>
        <li><a href="#blah">Blah</a></li>
      </ul>
    </li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
<a name="about-zoinx"></a>
## About The Project
A core vision for Zoinx is the ability to create REST API endpoints fully CRUD (Create, Read, Update, Delete) enabled and secure in minutes and fully instrumented.<br/>
The framework is primarily geared to creating event driven microservices. It is usable for any purpose desired as it's based on industry standard technology.

Why use Zoinx:
* Focus on what matters, business logic and not mundane details most applications need
* Easily add Entities and Features covered in more detail below
* Built in application Telemetry
* Built in configuration based testing
* Built in configuration role based security
* Event driven using Kafka by default
* Built in CLI


<a name="built-with"></a>
### Built With
Zoinx is based in NodeJS with MongoDB as the main datastore. It does not support using any SQL based datastore for the primary datastore.<br/>
It is of course possible to add connectivity to any SQL datastore but that is a per-project decision.

Zoinx is also event driven out of the box. Support an event driven architecture, Kafka is used to produce and consume messages. Kafka is more than a pub/sub model but Zoinx does not dictate how it can be used but sets up the basic functionality inside of Docker.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<a name="getting-started"></a>
<!-- GETTING STARTED -->
## Getting Started
Getting up and running with any framework can be clumsy but Zoinx works to make this process painless and as fast as your development machine will allow.

The development setup is based in Docker which can be resource intensive. The NodeJS container can be turned off and run from an IDE where the NodeJS app can connect to and make use of the resources inside Docker. This will be covered later along with env vars.

<a name="prerequisites"></a>
### Prerequisites
Zoinx requires certain applications and environments to be ready to use. If you are already developing NodeJS and Docker based applications, you might already have what is needed.
* GIT
* npm/node version 18+
* nvm (suggested not required)
* Docker Desktop or a Docker environment
* Shell environment (specifically on Windows, use GitBash, PowerShell or CMD will not work)
* Mongo Compass (suggested not required)
* API Platform i.e. Postman, Insomnia, etc.
* Kafka client (suggested not required)
<br/>
<br/>

<a name="installation"></a>
### NPX Installation
There are 2 options for installing the Zoinx framework. Installing via npx will ask you a number of questions and setup the entire environment, including Docker, Mongo and Kafka. This will also populate Mongo with some initial data and setup local account access. <br/>

```bash
mkdir <project name>
cd <project name>
npx trozlabs/zoinx
```
This will run and walk you thru questions that are used to setup the needed components. Once all the questions have been answered and the dependencies installed, run the command it states (shown below)
```bash
npm run docker:build-start
```
Once the Docker environment is running, a picklists endpoint will already be in place and functional and have data. To test this, use your API client for this endpoint
```js
http://localhost:3000/picklists/typelist
```
Because security is built in, the local account created after running the npx installer will need to be added to the request. This means:<br/>
add a Basic Auth Header with the local account username and password. Default account is ROOT.
<br/>
<br/>


### Basic Installation
Doing a basic installation is also available but will not set up all the needed details.
```bash
mkdir <project name>
cd <project name>
npm init
npm install trozlabs/zoinx
```
This will get Zoinx downloaded to your project but will not include any config or setup.
<p align="right">(<a href="#readme-top">back to top</a>)</p>




<a name="efi"></a>
## Entities and Features and Integrations
There are 3 core concepts in this framework: Entities & Features & Integrations.

All needed files to make a fully functional Entity or Feature are included in these folders. This means no bouncing around many locations to find the referenced classes/files. They are contained as a single unit and because of this organization, Entities can easily be copied and pasted between projects.

**Entities** -- are a 1-to-1 representation of a data collection in Mongo. It creates a fully enabled REST CRUD API with security applied.
For example: a user collection or single SQL table holding data defined in the domain file.

**Features** -- are REST APIs that make use of 1 or many Entities and/or Integrations. Features are where composite functionality is needed.
They do NOT have a domain file as they are not responsible for the data store in and out.

**Integrations** -- are where outside services, i.e. other microservices or outside 3rd party APIs, are integrated.
These don't have any template generators as they are completely custom to what is needed to accomplish define requirements.


<a name="code-gen"></a>
### Code Generators
To generate code templates, the ZoinxCLI can be run by using the node script:

```bash
npm run zoinxcli
```

Template generator will create 1 to 6 files for an entity or a feature
depending on configuration. The files created are:

1. `index.js`    - Used by express to define API routes is also used to define subroutes
2. `route.js`    - Used to setup the relationship between controllers, services and domains and will likely not be modified. (might be hidden in future versions)
3. `service.js`  - Used to contain actual logic and operations that can
   range from simple CRUD to related Domain or more complex
   hybrid operations across services or to remote services. These are meant to be the organizing functionality and/or internal orchestration
4. `domain.js`   - Used to define the Schema used in Mongo to store data
   into collections. Domains are not strictly needed for
   services to be functional and are NOT present when creating Features
5. `controller.js`   - Used to define the actual endpoints, their method and
   the function that handles the incoming request. These methods are generally
   used to verify incoming data and access perms then pass the request and
   needed data to the service class. Role based controls are placed on each defined endpoint.
6. `statics.js` - Used to define static methods that are specific to the Entity or Feature or Integration


</br>The CLI will provide a prompt in the command line where the following example
commands can be run.</br>
**NOTE**
`--entity` and `--feature` work in nearly identical manners, Feature
differences will be noted.</br></br></br>

```json
create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "test.newEntity"}
```

This line will create all 6 entity files with the supplied names, `name`
and `schemaName` are required for generating an Entity. `className` is
optional but will be set using `name` if absent.

    entities/
    ├── newEntity/
    │   ├── domain.js
    │   ├── index.js
    │   ├── route.js
    │   └── service.js
    │   └── controller.js
    │   └── statics.js


```json
create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "test.newEntity", "overwrite":"true"}
```

This line will overwrite all 4 existing files if the Entity already exists.
If the first command is run twice, it will state it already exists and
`overwrite` will need to be provided.<br/><br/>

```json
create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "test.newEntity", "only": "index"}
```

This line will ONLY generate the `index` file for a specified Entity or
Feature. Add `"overwrite":"true"` to overwrite the single file.<br/><br/>

```json
create --entity={"name": "newEntity", "className": "NewEntity", "schemaName": "test.newEntity", "exclude": ["domain","service"]}
```

This line will create all files NOT mentioned in the `exclude` array.
Add `"overwrite":"true"` to overwrite the generated files.


## Optional Tools:

- [Compass](https://www.mongodb.com/products/compass): A MongoDB Client
- [Insomnia](https://insomnia.rest/download) A REST Client

## `env`

.env file.

```sh
ENV=dev
DEBUG=true
PORT=3000
MONGO_URI=mongodb://localhost:27017/test
LIST=one,two,three
OBJ_1={ "one": 1, "two": 2, "three": 3 }
OBJ_2='
{
    "one": 1,
    "two": 2,
    "three": 3
}'
```

Usage:

```js
const { env } = require('zoinx/util');

env.load(
    // '.env', // default file loaded and not required
    '.env.local',
    '.env.development',
    '.env.development.local',
    '.env.testing',
    '.env.testing.local',
    '.env.production',
    '.env.production.local'
);

env.get('ENV');
env.boolean('DEBUG');
env.number('PORT');
env.string('MONGO_URI');
env.array('LIST');
env.object('OBJ_1');
env.object('OBJ_2');
```

[contributors-shield]: https://img.shields.io/github/contributors/othneildrew/Best-README-Template.svg?style=for-the-badge
[contributors-url]: https://github.com/trozlabs/zoinx/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/othneildrew/Best-README-Template.svg?style=for-the-badge
[forks-url]: https://github.com/trozlabs/zoinx/forks
[stars-shield]: https://img.shields.io/github/stars/othneildrew/Best-README-Template.svg?style=for-the-badge
[stars-url]: https://github.com/trozlabs/zoinx/stargazers
[issues-shield]: https://img.shields.io/github/issues/othneildrew/Best-README-Template.svg?style=for-the-badge
[issues-url]: https://github.com/trozlabs/zoinx/issues
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://github.com/trozlabs/zoinx/blob/main/LICENSE.txt
