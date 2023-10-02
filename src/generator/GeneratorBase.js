const fs = require("fs");
const {Log} = require("../log");
const _ = require("lodash");
const path = require("path");


module.exports = class GeneratorBase {

    #confObj = {};
    #overwrite = false;
    #templateSrc = 'codeTemplates';

    constructor(templateSrc) {
        this.#templateSrc = templateSrc;
    }

    static async doesDirExist(dirName) {
        let exists = fs.existsSync(dirName);

        if (exists && this.#overwrite) {
            exists = false;
        }
        else if (exists) {
            Log.error(`${dirName} already exists.`);
            Log.error('Set "overwrite": "true" in JSON options to overwrite existing Entity.');
        }

        return exists;
    };

    get configObj() {
        return this.#confObj;
    }
    set configObj(configObj) {
        this.#confObj = configObj
    }

    static async  writeSourceFile(dirName, fileName, fileContents = '') {
        const fullPath = `${dirName}/${fileName}`;

        try {
            if (!_.isEmpty(dirName) && !_.isEmpty(fileName)) {

                if (!fs.existsSync(dirName))
                    fs.mkdirSync(dirName, {recursive: true});

                await fs.writeFile(fullPath, fileContents, { flag: 'w+' }, err => {
                    if (err) {
                        Log.error(err);
                    } else {
                        Log.info(`Successfully wrote file: ${fullPath}`);
                    }
                });
            }
        }
        catch (ex) {
            Log.error(ex);
        }
    }

    static async  getTemplateContent(templateName = 'entityIndex') {
        const templatePath = path.join(__dirname, `./${this.#templateSrc}/${templateName}.txt`),
            name = this.#confObj.name;

        let contents = `NO TEMPLATE SOURCE FOUND: ${templatePath}`;

        try {
            contents = await this.readFileAsync(templatePath);
            let tmpCompiled = _.template(contents);
            contents = tmpCompiled({}); //{ 'name': name, 'className': className, 'schemaName': schemaName });

            // Template strings had to be escaped for the above replacements. These 2 lines removed those escaped strings.
            contents = contents.replaceAll('\\$\\{', '${');
            contents = contents.replaceAll('\\}', '}');
        }
        catch (ex) {
            Log.error(`============ ${ex}`);
        }

        return contents;
    }

    static async readFileAsync(path) {
        return new Promise(function (resolve, reject) {
            fs.readFile(path, 'utf8', function (error, result) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
}
