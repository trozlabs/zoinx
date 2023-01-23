// native
const fs = require('fs');
const readline = require('readline');
// external
const _ = require('lodash');
// siblings
const Log = require('../log');

module.exports = class ParseCsv2Array {
    #hasHeader = true;
    #delimiter = ',';
    #filePath = '';
    #headerRow = [];
    #dataArray = [];
    #fileStream;
    #reader;

    constructor(filePath = '', delimiter = ',', hasHeader = true) {
        if (_.isEmpty(filePath)) this.#filePath = 'data/emptyFile.txt';
        else this.#filePath = filePath;

        this.#delimiter = delimiter;
        this.#hasHeader = hasHeader;

        try {
            this.#fileStream = fs.createReadStream(this.#filePath);
            this.#reader = readline.createInterface({ input: this.#fileStream });
        } catch (e) {
            console.error(`Failed reading data file: ${e.message}`);
        }
    }

    get filePath() {
        return this.#filePath;
    }

    get headerRow() {
        return this.#headerRow;
    }

    get dataArray() {
        return this.#dataArray;
    }

    doesHeaderCountMatchData(logCounts = false) {
        if (this.#headerRow.length < 1) {
            console.error('Header has now data');
            return false;
        }
        if (this.#dataArray.length < 1) {
            console.log('No data present to count');
            return false;
        }

        if (_.isBoolean(logCounts) && logCounts) console.log(`header count: ${this.#headerRow.length} : data count: ${this.#dataArray[0].length}`);

        return (this.#headerRow.length = this.#dataArray[0].length);
    }

    async parse(returnData = false) {
        try {
            let idx = -1;
            for await (const line of this.#reader) {
                idx++;
                if (this.#hasHeader && idx < 1) this.#headerRow = line.split(this.#delimiter);
                else this.#dataArray.push(line.split(this.#delimiter));
            }
        } catch (e) {
            console.error(e.message);
        }

        if (returnData) return this.#dataArray;
    }
};
