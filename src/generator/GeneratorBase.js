const fs = require("fs");
const Log = require("../log/Log");
const _ = require("lodash");
const path = require("path");


module.exports = class GeneratorBase {

    #confObj = {};
    #overwrite = false;
    #templateSrc = '';

    constructor(templateSrc) {
        this.#templateSrc = templateSrc;
    }

    get configObj() {
        return this.#confObj;
    }
    set configObj(configObj) {
        this.#confObj = configObj;
    }

    get templateSrc() {
        return this.#templateSrc;
    }

    async doesDirExist(dirName) {
        let exists = fs.existsSync(dirName);

        if (exists && this.#overwrite) {
            exists = false;
        }
        else if (exists) {
            Log.info(`Writing to ${dirName}.`);
            // Log.error('Set "overwrite": "true" to overwrite existing config.');
        }

        return exists;
    };

    async writeSourceFile(dirName, fileName, fileContents = '') {
        const fullPath = `${dirName}/${fileName}`;

        try {
            if (!_.isEmpty(dirName) && !_.isEmpty(fileName)) {

                if (!fs.existsSync(dirName))
                    fs.mkdirSync(dirName, {recursive: true});

                if (!_.isEmpty(fileContents)) {
                    await fs.writeFileSync(fullPath, fileContents, {flag: 'w+'});
                }
            }
        }
        catch (ex) {
            Log.error(ex);
        }
    }

    async getTemplateContent(dirName, templateName = '.env') {
        const templatePath = path.join(__dirname, `./${this.#templateSrc}/${templateName}`),
            name = this.#confObj.name;

        let contents = `NO TEMPLATE SOURCE FOUND: ${templatePath}`;

        try {
            contents = await this.readFileAsync(templatePath);
            if (!_.isEmpty(this.#confObj)) {
                let tmpCompiled = _.template(contents);
                contents = tmpCompiled(this.#confObj);
            }

            // Template strings had to be escaped for the above replacements. These 2 lines removed those escaped strings.
            contents = contents.replaceAll('\\$\\{', '${');
            contents = contents.replaceAll('\\}', '}');
        }
        catch (ex) {
            Log.error(`============ ${ex}`);
        }

        return contents;
    }

    async readFileAsync(path) {
        let fileContents;

        try {
            fileContents = fs.readFileSync(path, {encoding: 'utf8', flag: 'r'});
        }
        catch (e) {
            Log.error(e);
        }

         return fileContents;
    }

    async chmodFile(fileName, perms='754'){
        let result = true;

        try {
            if (!_.isEmpty(fileName) && _.isString(fileName)) {
                fs.chmodSync(fileName, perms);
            }
        }
        catch (e) {
            result = false;
            Log.error(e);
        }

        return result;
    }

    async copyDirectory(source, destination, recursive=true) {
        let result = true;

        try {
            if (!_.isEmpty(source) && _.isString(source) && !_.isEmpty(destination) && _.isString(destination)) {
                fs.cpSync(source, destination, {recursive: recursive});
            }
        }
        catch (e) {
            result = false;
            Log.error(e);
        }

        return result;
    }
}
