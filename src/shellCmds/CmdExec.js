const _ = require('lodash');
const { Log } = require('../log');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

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

    async run(processResults=false) {
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
            Log.error(ex);
        }
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
