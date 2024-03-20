<a name="readme-top"></a>
<!--[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]-->

<!-- PROJECT LOGO -->
<div align="center">
    <img src="images/zoinxLogo.png" alt="Zoinx" width="360" height="150">
  <p>
    An Opinionated Framework based on NodeJS, Mongo and Kafka <br/>to simplify creating event driven, full-featured microservice applications.
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
* Easily add Entities and Features
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
* npm/node version 20+
* nvm (suggested not required)
* Docker Desktop or a Docker environment
* Shell environment (specifically on Windows use GitBash, PowerShell or CMD will not work)
* Mongo Compass (suggested not required)
* API Platform i.e. Postman, Insomnia, etc.
* Kafka client (akhq is included but not installed to Docker by default)
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

Because security is built in, the local account created after running the npx installer will need to be added to the request.
> This means:<br/>
> add a Basic Auth Header with the local account username and password. Default account is ROOT.

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
