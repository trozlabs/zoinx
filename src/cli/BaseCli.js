const Log = require("../log/Log");
const events = require("events");
const _ = require("lodash");
const readline = require("readline");
const MongoDB = require("./../database/MongoDB");

module.exports = class BaseCli {

    #_interface
    #cliProcessName
    #uniqueInputs = {
        'man':                      {fn: 'displayHelp', desc:'Show help content'},
        'help':                     {fn: 'displayHelp', desc:'Show help content'},
        'exit':                     {fn: 'exit', desc:'Kill CLI Interface'}
    }

    #process
    #events
    #useDB = false

    constructor(cliProcessName='!!!!! NO NAME !!!!!', process) {
        this.#cliProcessName = cliProcessName;
        this.#process = process;
        this.#events = new events();

        const userArgs = process.argv.slice(2);

        let _interface = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: `\n\r[${cliProcessName}] -> `
        });
        this.#_interface = _interface;

        switch (userArgs[0]) {
            case 'usedb':
                this.#useDB = true;
                break;
        }

        _interface.on('line', async (str, clazz=this) => {
            if (str === '\n') _interface.write('\n\n');
            await clazz.#processInput(str, _interface);
            _interface.prompt();
        });

        _interface.on('close', function () {
            process.exit(0);
        });

        _interface.prompt();
    }

    get _interface() {
        return this.#_interface;
    }

    get useDB() {
        return this.#useDB;
    }

    get uniqueInputs() {
        return this.#uniqueInputs;
    }

    addInputs(inputs) {
        if (!_.isEmpty(inputs) && _.isObject(inputs)) {
            this.#uniqueInputs = _.merge(this.#uniqueInputs, inputs);
        }
    }

    async #processInput(inputStr, _interface) {
        if (!_.isEmpty(inputStr)) {
            inputStr = typeof inputStr === 'string' && inputStr.trim().length > 0 ? inputStr.trim() : false;

            let eventParts = this.#getEventPart(inputStr),
                matchFound = !_.isEmpty(this.#uniqueInputs[eventParts.eventName]);

            if (!matchFound) {
                Log.warn(`No matching action for input: ${inputStr}`);
            }
            else {
                const funcResult = await this[this.#uniqueInputs[eventParts.eventName].fn](inputStr, _interface);
                //console.log(funcResult);
            }
        }
    }

    #getEventPart(inputStr) {
        let inputParts = inputStr.trim().toLowerCase().split('--'),
            eventName = inputParts[0]?.toLowerCase().trim(),
            eventSwitches = (inputParts.length > 1) ? inputParts[1] : undefined;

        return {
            eventName: eventName,
            eventSwitches: eventSwitches
        }
    }

    async exit(inputStr, _interface) {
        process.exit(0);
    }

    async horizontalLine() {
        let screenWidth = process.stdout.columns,
            line = '';

        for (let i = 0; i < screenWidth; i++) {
            line += '-';
        }
        console.log(line);
    }

    async verticalSpace(numberOfLines) {
        let lines = typeof numberOfLines === 'number' && numberOfLines > 0 ? numberOfLines : 1;
        for (let i = 0; i < lines; i++) {
            console.log('');
        }
    }

    async centered(inputStr) {
        let screenWidth = process.stdout.columns,
            str = typeof inputStr === 'string' && inputStr.trim().length > 0 ? inputStr.trim() : '',
            strWidth = str.length,
            leftPadding = Math.floor((screenWidth - strWidth) / 2),
            line = '';

        for (let i = 0; i < leftPadding; i++) {
            line += ' ';
        }

        line += str;
        console.log(line);
    }

    async getMongoConnectionDB() {
        const adminConf = {
            host: process.env.MONGO_HOST,
            port: process.env.MONGO_PORT,
            name: process.env.MONGO_INITDB_DATABASE,
            user: process.env.MONGO_INITDB_ROOT_USERNAME,
            password: process.env.MONGO_INITDB_ROOT_PASSWORD,
            maxPoolSize: 1,
            dbOptions: process.env.MONGO_OPTIONS
        }
        const conn = await MongoDB.create4Cli(adminConf);
        return { conn: conn, db: conn.db };
    }


    async displayHelp() {
        try {
            await this.horizontalLine();
            await this.centered('CLI Manual');
            await this.horizontalLine();
            await this.verticalSpace(2);

            for (let key in this.uniqueInputs) {
                if (this.uniqueInputs.hasOwnProperty(key)) {
                    let value = this.uniqueInputs[key].desc,
                        line = `\x1b[33m${key}\x1b[0m`,
                        padding = 60 - line.length;

                    for (let i = 0; i < padding; i++) {
                        line += ' ';
                    }
                    line += value;
                    console.log(line);
                    await this.verticalSpace();
                }
            }

            await this.verticalSpace(1);
            await this.horizontalLine();
        }
        catch (ex) {
            Log.error(ex);
        }
    }
}
