const _ = require('lodash');
const { Log } = require('../log');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { spawn } = require('child_process');

module.exports = class CmdExec {

    #rawCmd
    #cmdName
    #cmdOptions
    #cmdResults

    constructor(rawCmd) {
        if (_.isEmpty(rawCmd) || !_.isString(rawCmd)) this.#rawCmd = "ls -ltra";
        else this.#rawCmd = rawCmd;
        this.#init();
    }

    #init() {
        let tmpCmdParts = this.#rawCmd.split(' ');
        this.#cmdName = (!_.isEmpty(tmpCmdParts[0])) ? tmpCmdParts[0] : '';
        this.#cmdOptions = (!_.isEmpty(tmpCmdParts[1])) ? tmpCmdParts.slice()  : []; //
    }

    async run(processResults=false, suppressException=false) {
        try {
            const { stdout, stderr } = await exec(this.#rawCmd);
            if (!stdout && stderr)
                Log.error(stderr);
            else {
                if (processResults)
                    await this.#processCmdResults(stdout);
                else
                    Log.info(stdout);
            }
        }
        catch (ex) {
            if (!suppressException)
                Log.error(ex.message);
        }
    }

    static runSpawn(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                shell: true,
                ...options,
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
                process.stdout.write(data);
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
                process.stderr.write(data);
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Command failed with code ${code}\n${stderr}`));
                }
            });

            child.on('error', (err) => {
                reject(err);
            });
        });
    }

    async #processCmdResults(results) {
        let splitResults = results.split('\n');

        if (_.isEmpty(splitResults[splitResults.length-1].trim())) {
            splitResults = _.dropRight(splitResults, 1);
        }

        this.#cmdResults = splitResults;
    }

    getCmdResults() {
        return this.#cmdResults;
    }

    getRawCmd() {
        return this.#rawCmd;
    }

    getCmdName() {
        return this.#cmdName;
    }

    getCmdOptions() {
        return this.#cmdOptions;
    }

}
