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
      <a href="#envs">Environments & AppConfig</a>
      <ul>
        <li><a href="#envs-default">Default env</a></li>
        <li><a href="#envs-local">Local env</a></li>
      </ul>
    </li>
    <li>
      <a href="#efi">Entities and Features and Integrations</a>
      <ul>
        <li><a href="#code-gen">Code Generators</a></li>
        <li><a href="#code-gen-ex">Code Generating Examples</a></li>
      </ul>
    </li>
    <li>
      <a href="#security">Security</a>
      <ul>
        <li><a href="#oauth">OAuth</a></li>
        <li><a href="#basic">Local Auth</a></li>
      </ul>
    </li>
    <li>
      <a href="#telemetry">Telemetry</a>
      <ul>
        <li><a href="#telemetry-ex">Telemetry Examples</a></li>
      </ul>
    </li>
    <li>
      <a href="#testing">Testing</a>
      <ul>
        <li><a href="#test-harness">Test Harness</a></li>
        <li><a href="#test-conf">Test Configuration</a></li>
      </ul>
    </li>
    <li>
      <a href="#logging">Logging</a>
    </li>
    <li>
      <a href="#optional-tools">Optional Tools Links</a>
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
* Built in application telemetry
* Built in configuration based testing
* Built in configuration for role based security
* Event driven using Kafka by default
* Built in CLI


<a name="built-with"></a>
### Built With
Zoinx is based in NodeJS with MongoDB as the main datastore. It does not support using any SQL based datastore for the primary datastore.<br/>
It is of course possible to add connectivity to any SQL datastore but that is a per-project decision.

Zoinx is event driven out of the box. To support an event driven architecture, Kafka is used to produce and consume messages. Kafka is more than pub/sub messaging but Zoinx does not dictate how it can be used but sets up the basic functionality inside of Docker.
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
<p align="right">(<a href="#readme-top">back to top</a>)</p>


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


<a name="envs"></a>
## Environments & AppConfig
Zoinx has a built-in application configuration. AppConfig.js is used to set up specific needs for any application. It by default uses the .env file to set up environment variables.

The app.js, AppConfig.js, .env, .env.local files are created for the developer when using the npx installation option.

In modern applications, most environment variables are defined either as secrets or public variables stored in cloud provider systems. This isn't required and can also make development more complicated. It is for these reasons, Zoinx supports environment variable files.

In app.js, there is a block to use AppConfig and this is where to define which env file should be used. If none are specified, the .env is used by default.
```js
AppConfig.initConfig(
    // '.env',          // default file loaded
    // '.env.local'
    // '.env.test',
    // '.env.dev',
);
```

<a name="envs-default"></a>
### Default env
.env is the default environment variable file. These values are primarily used to ensure a working application in the Docker containers.<br/>
.env is also used by default by the CLIs provided with Zoinx.<br/>
The two CLI options using the .env file:
```bash
npm run zoinxcli
npm run zoinxcli-usedb
```

<a name="envs-local"></a>
### Local env
.env.local is very similar but is used to allow the NodeJS application to be run outside the Docker container. It is usually faster and more efficient to run the application within IntelliJ or VSCode or the IDE of choice and the references to the Mongo and Kafka containers are different.<br/>
.env.local is also used by the CLIs provided with Zoinx but must be called by separate scripts.<br/>
The two CLI options using the .env.local file:
```bash
npm run zoinxcli-localenv
npm run zoinxcli-localenv-usedb
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<a name="efi"></a>
## Entities & Features & Integrations
There are 3 core concepts in Zoinx framework: Entities & Features & Integrations.

These are in place to suggest how to organize an application and keep separation of concerns clean and easy to find. Entities & Features are the only areas used for defining external APIs. If an endpoint route is defined outside of these directories, Zoinx will not automatically pick them up and create the route.

All needed files to make a fully functional Entity or Feature are included in these folders. This means no bouncing around many locations to find the referenced classes/files. They are contained as a single unit and because of this organization, Entities can easily be copied and pasted between projects.

Integrations are different as they don't have a hard definition in the framework. They are meant to be standalone functionality the rest of the app can make use of. Integrations can be used within the services of Entities or Features or any other way that might be defined.

**Entities**<br/>1-to-1 representation of a data collection in Mongo. It creates a fully enabled REST CRUD API with security applied.
For example: a user collection or single SQL table holding data defined in the domain file.

**Features**<br/>REST APIs that make use of 1 or many Entities and/or Integrations. Features are where composite functionality is created.
They do NOT have a domain file as they are not responsible for the data store in and out.

**Integrations**<br/>Where outside services, i.e. other microservices or outside 3rd party APIs, are integrated.
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
commands can be run.

**NOTE**
`--entity` and `--feature` work in nearly identical manners. Feature differences will be noted i.e. Features NOT having a domain class.</br></br>

<a name="code-gen-ex"></a>
### Code Generating Examples
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
    │   ├── service.js
    │   ├── controller.js
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
Add `"overwrite":"true"` to overwrite the generated files.<br/><br/>


```json
create --feature={"name": "newFeature", "className": "NewFeature"}
```
This line is an explicit example for creating a Feature and will create the structure below.

    features/
    ├── newFeature/
    │   ├── index.js
    │   ├── route.js
    │   ├── service.js
    │   ├── controller.js
    │   └── statics.js

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<a name="security"></a>
## Security
Zoinx security is role based tooled from OAuth standards. The default OAuth is via Azure and has needed environment variables in place making it simple to implement. We will add needed OAuth providers as they are requested.

Security is enabled and applied via middleware before the request makes it to the endpoint controller.

Most systems need another way to execute special command but also admin capabilities if the OAuth provider is down. This is where basic local authentication is available.

<a name="oauth"></a>
### OAuth
Gatekeeper is the internal Zoinx class that enables OAuth to be enabled and applied. When a JWT is verified by the issuer, the application caches verified credentials and set to expire by the time-to-live (ttl) from the provider.

Zoinx application will not auto refresh tokens. It is the client's responsibility to send valid tokens and Zoinx will enforce.

<a name="basic"></a>
### Basic Auth
When using the npx installer, it will ask for a username and password to automatically create the login and assign the username as a Route Role. Basic Auth is not cached and will only work for a single request. This means the name and password has to be sent as a basic auth header each time which in turn slows down the response time.

It is possible to have multiple local accounts but the fewer, the better. To create a local account after the project is up and running. Run the ZoinxCli and then execute the following command.
```bash
create local acct --{"username":"yourSpecialUser", "password":"12345678"}
```
When creating a local account in this manner, password rules are not enforced. Using the above password, while foolish and not recommended, is possible.
<p align="right">(<a href="#readme-top">back to top</a>)</p>


<a name="telemetry"></a>
## Telemetry
Coming soon

<a name="telemetry-ex"></a>
### Telemetry Example
Coming soon

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<a name="testing"></a>
## Testing
Coming soon

<a name="test-harness"></a>
### Test Harness
Coming soon

<a name="test-conf"></a>
### Test Configuration
Coming soon
<p align="right">(<a href="#readme-top">back to top</a>)</p>


<a name="logging"></a>
## Logging
Coming soon
<p align="right">(<a href="#readme-top">back to top</a>)</p>

<a name="optional-tools"></a>
## Optional Tools
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) Installer
- [Compass](https://www.mongodb.com/products/compass): MongoDB Client
- [Insomnia](https://insomnia.rest/download) REST Client
- [Postman](https://www.postman.com/downloads/) REST Client
- [GIT](https://git-scm.com/downloads) Installer (windows will have GitBash Included)
- [GitHub Desktop](https://desktop.github.com/) Installer for Desktop Client
<p align="right">(<a href="#readme-top">back to top</a>)</p>

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
