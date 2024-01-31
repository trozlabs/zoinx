const GeneratorBase = require('./GeneratorBase');
const _ = require("lodash");
const Log = require('../log/Log');
const ShellCmd = require("../shellCmds/CmdExec");

module.exports = class CreateZoinxApplication extends GeneratorBase{

    #minNodeVersion = 20
    #platform
    #cliPath
    #cliPrompt
    #cliParent
    #installPath
    #dottedFiles = {
        'env':              { templateFile: 'env.txt',                      destinationFile: '.env',                    subDir: ''},
        'env.local':        { templateFile: 'env.local.txt',                destinationFile: '.env.local',              subDir: ''},
        'editorConfig':     { templateFile: 'editorConfig.txt',             destinationFile: '.editorConfig',           subDir: ''},
        'gitignore':        { templateFile: 'gitignore.txt',                destinationFile: '.gitignore',              subDir: ''},
        'nvmrc':            { templateFile: 'nvmrc.txt',                    destinationFile: '.nvmrc',                  subDir: ''},
        'prettierrc':       { templateFile: 'prettierrc.json.txt',          destinationFile: '.prettierrc.json',        subDir: ''},
        'dockerignore':     { templateFile: 'dockerignore.txt',             destinationFile: '.dockerignore',           subDir: ''}
    }
    #projectFiles = {
        'docker':           { templateFile: 'docker-compose.yaml.txt',      destinationFile: 'docker-compose.yaml',     subDir: ''},
        'package':          { templateFile: 'package.json.txt',             destinationFile: 'package.json',            subDir: ''},
        'mainIndex':        { templateFile: 'index.js.txt',                 destinationFile: 'index.js',                subDir: 'src'},
        'db':               { templateFile: 'db.js.txt',                    destinationFile: 'db.js',                   subDir: 'src'},
        'app':              { templateFile: 'app.js.txt',                   destinationFile: 'app.js',                  subDir: 'src'},
        'AppConfig':        { templateFile: 'AppConfig.js.txt',             destinationFile: 'AppConfig.js',            subDir: 'src'},
        'www':              { templateFile: 'www.js.txt',                   destinationFile: 'www.js',                  subDir: 'bin'},
        'ZoinxCli':         { templateFile: 'ZoinxCli.js.txt',              destinationFile: 'ZoinxCli.js',             subDir: 'bin'},
        'dockerfile':       { templateFile: 'Dockerfile.txt',               destinationFile: 'Dockerfile',              subDir: 'docker/node'},
        'dockerscript':     { templateFile: 'docker-entrypoint.txt',        destinationFile: 'docker-entrypoint.sh',    subDir: 'docker/node'},
        'projectInit':      { templateFile: 'projectInit.json.txt',         destinationFile: 'projectInit.json',        subDir: 'docker/node'},
        'mongoscript':      { templateFile: 'init.js.txt',                  destinationFile: 'init.js',                 subDir: 'docker/mongo'},
        'kafkaAddons':      { templateFile: 'InstallExtras.sh.txt',         destinationFile: 'InstallExtras.sh',        subDir: 'docker/kafka'}
    }
    #projectDirectories = {
        'picklists':        { templateDir: 'src/entities/picklists',        destinationDir: 'src/entities/picklists' },
        'userprefs':        { templateDir: 'src/entities/userPrefs',        destinationDir: 'src/entities/userPrefs' }
    }
    #appBannerMsg = 'Thank you for choosing Zoinx.\n' +
        'A core vision for Zoinx is the ability to create API endpoints fully CRUD (Create, Read, Update, Delete) enabled and secure in minutes.\n' +
        'This script sets up the basics of a Zoinx project but will still need configuration to be fully functional.\n';
    #questionsAnswers = {
        0: {
            question: 'What is the name of your project/application? (zoinx)',
            answerProp: 'projectName',
            answerType: 'string',
            answerDefault: 'zoinx',
            answerValue: undefined,
            endWithHR: false,
            exitOnFail: true,
            exitOnFailLabel: 'Project name; must consist only of lowercase alphanumeric characters, hyphens, and underscores as well as start with a letter or number',
            regex: /^[a-z0-9][a-z\d-_]{1,127}$/
        },
        1: {
            question: 'What is the project/application description? (Zoinx API)',
            answerProp: 'projectDesc',
            answerType: 'string',
            answerDefault: 'Zoinx API',
            answerValue: undefined,
            endWithHR: false
        },
        2: {
            question: 'Who is the project author? (Zoinx)',
            answerProp: 'projectAuthor',
            answerType: 'string',
            answerDefault: 'Zoinx',
            answerValue: undefined,
            endWithHR: true
        },
        3: {
            question: 'Do you want to use this project with a Docker Container? (yes)',
            answerProp: 'docker',
            answerType: 'boolean',
            answerDefault: true,
            answerValue: undefined,
            endWithHR: true,
            skipForwardIfFalse: 6
        },
        4: {
            question: 'To make CRUD operations a reality, Zoinx uses Mongo as the primary Data Store.\n' +
                'There are 2 options to install and use MongoDB:\n' +
                '1. Install MongoDB locally anywhere you like\n' +
                '2. Use a Docker instance of MongoDB\n' +
                'If Docker is selected, the installation process will set up needed Docker config and set the initial build to run.\n' +
                'How would you prefer to run MongoDB with docker or locally? (docker)',
            answerProp: 'mongo',
            answerType: 'string',
            answerDefault: 'docker',
            answerValue: undefined,
            endWithHR: false
        },
        5: {
            question: 'What admin username would you like to use for your Mongo DB? (doadmin)',
            answerProp: 'mongoRootUsr',
            answerType: 'string',
            answerDefault: 'doadmin',
            answerValue: undefined,
            endWithHR: false
        },
        6: {
            question: 'What is the password for the admin account?\n' +
                '-> Must have a minimum of 8 characters\n' +
                '-> One uppercase letter\n' +
                '-> One lowercase letter\n' +
                '-> One number\n' +
                '-> One special character (@$!%*&)',
            answerProp: 'mongoRootPw',
            answerType: 'string',
            answerDefault: undefined,
            answerValue: undefined,
            endWithHR: true,
            exitOnFail: true,
            exitOnFailLabel: 'Mongo DB admin password',
            regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        },
        7: {
            question: 'What DB username would you like to use for your Mongo DB? (mainUser)',
            answerProp: 'mongoUsr',
            answerType: 'string',
            answerDefault: 'mainUser',
            answerValue: undefined,
            endWithHR: false
        },
        8: {
            question: 'What is the password for the DB account?\n' +
                '-> Must have a minimum of 8 characters\n' +
                '-> One uppercase letter\n' +
                '-> One lowercase letter\n' +
                '-> One number\n' +
                '-> One special character (@$!%*&)',
            answerProp: 'mongoPw',
            answerType: 'string',
            answerDefault: undefined,
            answerValue: undefined,
            endWithHR: true,
            exitOnFail: true,
            exitOnFailLabel: 'Mongo DB account password',
            regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        },
        // 9: {
        //     question: 'Zoinx offers telemetry where messages are sent to a Kafka data streaming service. Similar to MongoDB, you can install it locally on your own or user a Docker instance.\n' +
        //         '1. Install Kafka locally anywhere you like\n' +
        //         '2. Use a Docker instance of Kafka\n' +
        //         'If Docker is selected, the installation process will set up needed Docker config and set initial build to run. This version will be a Kraft version removing the need for Zookeeper.\n' +
        //         'How would you prefer to run Kafka with docker or locally? (docker)',
        //     answerProp: 'kafka',
        //     answerType: 'string',
        //     answerDefault: 'docker',
        //     answerValue: undefined,
        //     endWithHR: true
        // },
        // 9: {
        //     question: 'Security is also a major feature for any application. Currently, Zoinx supports authentication against Azure, and it will handle all token validation and role extraction.\n' +
        //         'Zoinx will automatically enforce role based security with each endpoint having a role assigned to it.\n' +
        //         'Would you like to enable Role Based security? (yes)',
        //     answerProp: 'roleBased',
        //     answerType: 'boolean',
        //     answerDefault: true,
        //     answerValue: undefined,
        //     endWithHR: true
        // },
        9: {
            question: 'Security is also a major feature for any application. Currently, Zoinx supports authentication against Azure, and it will handle all token validation and role extraction.\n' +
                'Zoinx will automatically enforce role based security with each endpoint having a role assigned to it.\n' +
                'Part of the built-in security for Zoinx is the ability to set up a local account that can be used for development or application config changes. The username created will be used as a new role for endpoint security.\n' +
                'Would you like to make use of local security auth? (yes)',
            answerProp: 'localAccts',
            answerType: 'boolean',
            answerDefault: true,
            answerValue: undefined,
            endWithHR: false,
            skipForwardIfFalse: 2
        },
        10: {
            question: 'What username would you like to use for your admin account? (ROOT)',
            answerProp: 'username',
            answerType: 'string',
            answerDefault: 'ROOT',
            answerValue: undefined,
            endWithHR: false,
            escDblQuotes: true
        },
        11: {
            question: 'What is the password for the admin account?\n' +
                '-> Must have a minimum of 10 characters\n' +
                '-> One uppercase letter\n' +
                '-> One lowercase letter\n' +
                '-> One number\n' +
                '-> One special character (@$!%*?&)',
            answerProp: 'password',
            answerType: 'string',
            answerDefault: '----',
            answerValue: undefined,
            endWithHR: true,
            exitOnFail: true,
            exitOnFailLabel: 'Local admin account password',
            escDblQuotes: true,
            regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/
        }
    }

    constructor(cliPrompt, cliParent) {
        super('projectTemplates');
        this.#cliPrompt = cliPrompt;
        this.#cliParent = cliParent;
        this.#cliPath = __dirname;
        this.#platform = process.platform;
    }

    async askQuestions() {

        await this.#checkNodeVersion();

        const bannerSplit = this.#appBannerMsg.split('\n');
        for (const line of bannerSplit) {
            console.log(line);
        }
        console.log('');

        let qaKeys = Object.keys(this.#questionsAnswers),
            key, qaObj;

        for (let i=0; i<qaKeys.length; i++) {
            qaObj = this.#questionsAnswers[i];

            qaObj.answerValue = await this.#askQuestion(qaObj);
            while (_.isUndefined(qaObj.answerValue)) {
                qaObj.answerValue = await this.#askQuestion(qaObj);
            }

            if (!_.isUndefined(qaObj.skipForwardIfFalse) && qaObj.answerValue !== qaObj.answerDefault) {
                if (!isNaN(qaObj.skipForwardIfFalse)) {
                    i += qaObj.skipForwardIfFalse ;
                    await this.#cliParent.horizontalLine();
                    console.log('');
                }
            }

            if (!_.isUndefined(qaObj.exitOnFail) && _.isUndefined(qaObj.answerValue) && qaObj.exitOnFail) {
                console.log('___________________________________________________________________');
                console.log(`Input can not be empty for ${qaObj.exitOnFailLabel}.`);
                await this.#cliParent.exit();
            }
        }

        let configObj = {};
        for (const key of qaKeys) {
            if (this.#questionsAnswers[key].escDblQuotes) {
                this.#questionsAnswers[key].answerValue = this.#questionsAnswers[key].answerValue.replace('"', '\"');
            }
            configObj[this.#questionsAnswers[key].answerProp] = this.#questionsAnswers[key].answerValue;
        }

        this.configObj = configObj;

        // console.log('Configured installation: ', this.configObj);
        // await this.#cliParent.horizontalLine();

        await this.#initProjectDirectory();
        await this.#createDottedFiles();
        await this.#createProjectFiles();
        await this.#createPlaceholders();
        await this.#createProjectDirectories();
        await this.#doesDockerExist();
        // await this.#doesMongoshExist();
        await this.#execNpmInstall();

        await this.#cliParent.exit();
    }

    async #askQuestion(qaObj) {
        let answer,
            questionText = '';

        try {
            const questionSplit = qaObj.question.split('\n');
            for (let i=0; i<questionSplit.length; i++) {
                if (i === (questionSplit.length-1))
                    questionText = `${questionSplit[i]} -> `;
                else
                    console.log(questionSplit[i]);
            }

            answer = await new Promise((resolve, reject) => {
                this.#cliPrompt.question(questionText, (answer) => {
                    if (_.isEmpty(answer)) answer = qaObj.answerDefault;
                    if (qaObj.answerType === 'boolean') {
                        if (!_.isEmpty(answer)) {
                            answer = (answer.toLowerCase() === 'yes');
                        }
                    }
                    else if (!_.isUndefined(qaObj.regex) && !qaObj.regex.test(answer)) {
                        console.log(`\x1b[33mInvalid input for ${qaObj.exitOnFailLabel}.`, '\x1b[0m');
                        answer = undefined;
                    }

                    resolve(answer);
                })
            })

            if (qaObj.endWithHR) {
                await this.#cliParent.horizontalLine();
                console.log('');
            }
        }
        catch (e) {
            Log.error(e);
        }

        return answer;
    }

    async #checkNodeVersion() {
        try {
            const version = process.versions.node;
            const versionNumb = parseInt(version.split('.')[0]);
            if (versionNumb < this.#minNodeVersion) {
                console.log('');
                console.log('==============================================================================');
                console.log(`Minimum NodeJs version for Zoinx is ${this.#minNodeVersion}.`);
                console.log(`Please upgrade or change to version ${this.#minNodeVersion} to install Zoinx.`);
                console.log('==============================================================================');
                await this.#cliParent.exit();
            }
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #initProjectDirectory() {

        try {
            this.#installPath =  (this.#cliPath.includes('_npx')) ? process.env.PWD : `${__dirname}/tmpFiles`;

            if (!await this.doesDirExist(this.#installPath)) {
                await this.writeSourceFile(this.#installPath, '.env');
            }
        }
        catch (e) {
            Log.error(e);
        }

    }

    async #createDottedFiles(){
        try {
            let entryKeys = Object.keys(this.#dottedFiles),
                fileContents, mapRef;

            for (let i=0; i<entryKeys.length; i++) {
                mapRef = this.#dottedFiles[entryKeys[i]];

                // need to see if this can be done with above config.
                if (entryKeys[i] === 'dockerignore') {
                    if (!this.configObj.docker) continue;
                }
                fileContents = await this.getTemplateContent(this.#installPath, mapRef.templateFile);
                await this.writeSourceFile(this.#installPath, mapRef.destinationFile, fileContents);
            }
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #createProjectFiles() {
        try {
            let entryKeys = Object.keys(this.#projectFiles),
                fileContents, mapRef, tmpSubDir;

            for (let i=0; i<entryKeys.length; i++) {
                mapRef = this.#projectFiles[entryKeys[i]];
                tmpSubDir = mapRef.subDir;
                if (!_.isEmpty(tmpSubDir)) tmpSubDir = `/${mapRef.subDir}/`;

                if (entryKeys[i] === 'docker') {
                    if (!this.configObj.docker) continue;
                }
                fileContents = await this.getTemplateContent(this.#installPath, `${tmpSubDir}${mapRef.templateFile}`);
                await this.writeSourceFile(`${this.#installPath}${tmpSubDir}`, mapRef.destinationFile, fileContents);

                if (mapRef.destinationFile.endsWith('.sh')) {
                    await this.chmodFile(`${this.#installPath}${tmpSubDir}/${mapRef.destinationFile}`, '754');
                }
            }
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #createPlaceholders() {
        try {
            let fileContents = await this.getTemplateContent(this.#installPath,'/src/index.empty.txt');
            await this.writeSourceFile(`${this.#installPath}/src/entities/`, 'index.js', fileContents);

            fileContents = await this.getTemplateContent(this.#installPath,'/src/index.empty.txt');
            await this.writeSourceFile(`${this.#installPath}/src/features/`, 'index.js', fileContents);

            fileContents = await this.getTemplateContent(this.#installPath,'/src/index.empty.txt');
            await this.writeSourceFile(`${this.#installPath}/src/integrations/`, 'index.js', fileContents);
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #createProjectDirectories() {
        try {
            let entryKeys = Object.keys(this.#projectDirectories),
                mapRef;

            for (let i=0; i<entryKeys.length; i++) {
                mapRef = this.#projectDirectories[entryKeys[i]];
                await this.copyDirectory(`${__dirname}/${this.templateSrc}/${mapRef.templateDir}`, `${this.#installPath}/${mapRef.destinationDir}`);
            }
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #execNpmInstall() {
        try {
            console.log('Installing dependencies...');
            let cmd = new ShellCmd(`npm install`);
            await cmd.run(true);
            console.log(await cmd.getCmdResults());
            await this.#cliParent.horizontalLine();
            await this.#cliParent.verticalSpace();
            console.log('Zoinx application is installed. Run the below command to spin up the application in Docker.');
            console.log('npm run docker:build-start');
            await this.#cliParent.verticalSpace();
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #doesDockerExist() {
        if (!this.configObj?.docker) return;

        try {
            let found = true,
                cmd;

            if (this.#platform === 'win32') {
                cmd = new ShellCmd('docker --version');
                await cmd.run(true, true);
                if (await cmd.getCmdResults().includes('is not recognized'))
                    found = false
            }
            else {
                cmd = new ShellCmd(`which docker`);
                await cmd.run(true, true);
                if (_.isEmpty(await cmd.getCmdResults()))
                    found = false;
            }

            if (!found) {
                console.log('Appears Docker is not installed. Docker will need to be installed before running the docker installation.');
            }
        }
        catch (e) {
            Log.warn('Appears Docker is not installed. Docker will need to be installed before running the docker installation.');
        }
    }

    async #doesMongoshExist() {
        if (!this.configObj?.docker) return;

        try {
            let found = true,
                cmd;

            if (this.#platform === 'win32') {
                cmd = new ShellCmd('mongosh --version');
                await cmd.run(true, true);
                if (await cmd.getCmdResults().includes('is not recognized'))
                    found = false
            }
            else {
                cmd = new ShellCmd(`which mongosh`);
                await cmd.run(true, true);
                let shit = await cmd.getCmdResults();
                if (_.isEmpty(shit))
                    found = false;
            }

            if (!found) {
                console.log('Appears Mongo Shell is not installed. Mongo Shell should be installed for best results.');
            }
        }
        catch (e) {
            Log.warn('Appears Mongo Shell is not installed. Mongo Shell should be installed for best results.');
        }
    }

}
