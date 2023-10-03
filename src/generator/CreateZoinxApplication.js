const GeneratorBase = require('./GeneratorBase');
const _ = require("lodash");
const Log = require('../log/Log');

module.exports = class CreateZoinxApplication extends GeneratorBase{

    #cliPath
    #cliPrompt
    #cliParent
    #installPath
    #appBannerMsg = 'Thank you for choosing Zoinx.\n' +
        'A core vision for Zoinx is the ability to create API endpoints fully CRUD (Create, Read, Update, Delete) enabled and secure in minutes.\n';
    #questionsAnswers = {
        0: {
            question: 'What is the name of your project/application? (zoinx)',
            answerProp: 'projectName',
            answerType: 'string',
            answerDefault: 'zoinx',
            answerValue: undefined,
            endWithHR: false
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
            endWithHR: true
        },
        4: {
            question: 'To make CRUD operations a reality, Zoinx uses Mongo as the primary Data Store.\n' +
                'There are 2 options to install and use MongoDB:\n' +
                '1. Install MongoDB locally anywhere you like\n' +
                '2. Use a Docker instance of MongoDB\n' +
                'If Docker is selected, the installation process will set up needed Docker config and set the initial build to run.\n' +
                'Mongo shell is also needed to better enable working with Mongo. https://www.mongodb.com/docs/mongodb-shell/install/\n' +
                'How would you prefer to run MongoDB with docker or locally? (docker)',
            answerProp: 'mongo',
            answerType: 'string',
            answerDefault: 'docker',
            answerValue: undefined,
            endWithHR: true
        },
        5: {
            question: 'Security is also a major feature for any application. Currently, Zoinx supports authentication against Azure, and it will handle all token validation and extracting roles.\n' +
                'Each endpoint can have a role assigned to it. Zoinx will automatically enforce role based security.\n' +
                'Would you like to enable Role Based security? (yes)',
            answerProp: 'roleBased',
            answerType: 'boolean',
            answerDefault: true,
            answerValue: undefined,
            endWithHR: true
        },
        6: {
            question: 'Part of the built-in security for Zoinx is the ability to set up a local account that can be used for development or application config changes. The username created will be used as a new role for endpoint security.\n' +
                'Would you like to make use of local security auth? (yes)',
            answerProp: 'localAccts',
            answerType: 'boolean',
            answerDefault: true,
            answerValue: undefined,
            endWithHR: false,
            skipToIfFalse: 2
        },
        7: {
            question: 'What username would you like to use for your admin account? (ROOT)',
            answerProp: 'username',
            answerType: 'string',
            answerDefault: 'ROOT',
            answerValue: undefined,
            endWithHR: false
        },
        8: {
            question: 'What is the password for the admin account? ' +
                'A local password should be very secure and complex but can be changed at anytime.',
            answerProp: 'password',
            answerType: 'string',
            answerDefault: '----',
            answerValue: undefined,
            endWithHR: true
        },
        9: {
            question: 'Zoinx offers telemetry where messages are sent to a Kafka data streaming service. Similar to MongoDB, you can install it locally on your own or user a Docker instance.\n' +
                '1. Install Kafka locally anywhere you like\n' +
                '2. Use a Docker instance of Kafka\n' +
                'If Docker is selected, the installation process will set up needed Docker config and set initial build to run. This version will be a Kraft version removing the need for Zookeeper.\n' +
                'How would you prefer to run Kafka with docker or locally? (docker)',
            answerProp: 'kafka',
            answerType: 'string',
            answerDefault: 'docker',
            answerValue: undefined,
            endWithHR: true
        }
    }

    constructor(cliPrompt, cliParent) {
        super('projectTemplates');
        this.#cliPrompt = cliPrompt;
        this.#cliParent = cliParent;
        this.#cliPath = __dirname;
    }

    async askQuestions() {

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

            if (!_.isUndefined(qaObj.skipToIfFalse) && qaObj.answerValue !== qaObj.answerDefault) {
                if (!isNaN(qaObj.skipToIfFalse)) {
                    i += qaObj.skipToIfFalse ;
                    await this.#cliParent.horizontalLine();
                    console.log('');
                }
            }
        }

        let configObj = {};
        for (const key of qaKeys) {
            configObj[this.#questionsAnswers[key].answerProp] = this.#questionsAnswers[key].answerValue;
        }
        this.configObj = configObj;

        console.log('Configured installation: ', this.configObj);
        await this.#cliParent.horizontalLine();

        await this.#initProjectDirectory();
        await this.#createDottedFiles();
        await this.#createProjectFiles();

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

    async #initProjectDirectory() {

        try {
            this.#installPath =  (this.#cliPath.includes('_npx')) ? process.env.PWD : `${__dirname}/tmpFiles`;
            // console.log(this.#installPath);

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
            let fileContents = await this.getTemplateContent(this.#installPath,'env.txt');
            await this.writeSourceFile(this.#installPath, '.env', fileContents);

            fileContents = await this.getTemplateContent(this.#installPath,'editorConfig.txt');
            await this.writeSourceFile(this.#installPath, '.editorConfig', fileContents);

            fileContents = await this.getTemplateContent(this.#installPath,'gitignore.txt');
            await this.writeSourceFile(this.#installPath, '.gitignore', fileContents);

            fileContents = await this.getTemplateContent(this.#installPath,'nvmrc.txt');
            await this.writeSourceFile(this.#installPath, '.nvmrc', fileContents);

            fileContents = await this.getTemplateContent(this.#installPath,'prettierrc.json.txt');
            await this.writeSourceFile(this.#installPath, '.prettierrc.json', fileContents);
        }
        catch (e) {
            Log.error(e);
        }
    }

    async #createProjectFiles() {
        try {
            let fileContents = await this.getTemplateContent(this.#installPath,'package.json.txt');
            await this.writeSourceFile(this.#installPath, 'package.json', fileContents);
        }
        catch (e) {
            Log.error(e);
        }
    }
}
