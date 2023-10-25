// native
const fs = require('fs');
const path = require('path');
const os = require('os');
// external
const _ = require('lodash');
// siblings
const { Log } = require('../log');

function readonlyDecorator(target, property, descriptor) {
    console.log("Target: ")
    console.log(target)

    console.log("\nProperty name")
    console.log(property)

    console.log("\nDescriptor property")
    console.log(descriptor)

    // This will make property readonly
    descriptor.writable = false
    // This descriptor will overwrite getFullName method descriptor
    return descriptor
}

module.exports = class CreateEntityOrFeature {

    #confObj
    #createWhat
    #baseEntityDir
    #baseFeatureDir
    #overwrite
    #templates
    #onlyGenerate
    #excludeGenerate

    constructor(confObj, createWhat) {
        if (confObj) this.#confObj = confObj;
        this.#baseEntityDir = path.join(process.env.PWD, '/src/entities');
        this.#baseFeatureDir = path.join(process.env.PWD, '/src/features');
        this.#createWhat = (['entity', 'feature'].includes(createWhat.toLowerCase())) ? createWhat.toLowerCase() : 'entity';

        this.#templates = ['index', 'route', 'service', 'domain', 'statics', 'controller'];
        if(this.#createWhat === 'feature') this.#templates = ['index', 'route', 'service', 'statics', 'controller'];

        this.#overwrite = (!_.isEmpty(this.#confObj.overwrite)) ? this.#confObj.overwrite : false;
        this.#onlyGenerate = (!_.isEmpty(this.#confObj.only) && this.#templates.includes(this.#confObj.only.toLowerCase())) ? this.#confObj.only.toLowerCase() : '';
        if (!_.isEmpty(this.#confObj.exclude)) {
            if (!_.isArray(this.#confObj.exclude)) {
                this.#confObj.exclude = (_.isString(this.#confObj.exclude)) ? [this.#confObj.exclude] : [];
            }

            this.#excludeGenerate = [];
            this.#confObj.exclude.forEach((exclusion) => {
                if (this.#templates.includes(exclusion.toLowerCase()))
                    this.#excludeGenerate.push(exclusion);
            });
        }
        else this.#excludeGenerate = [];
    }

    get confObj() {
        return this.#confObj;
    }

    async generate(callback) {
        if (_.isEmpty(this.#confObj?.name)) {
            Log.error('Entity name has to be supplied to create code structure');
            return;
        }

        if (_.isEmpty(this.#onlyGenerate)) {
            if (this.#createWhat === 'entity' && _.isEmpty(this.#confObj?.schemaName)) {
                Log.error('SchemaName has to be preset to create an entity code structure');
                return;
            }
        }

        if (!this.doesEntityExist(this.#confObj.name)) {

            if (!_.isEmpty(this.#onlyGenerate)) {
                await this.generateOnly();
            }
            else if (_.isArray(this.#excludeGenerate)) {
                await this.generateWithExclusions();
            }
            else {
                await this.generateAll();
            }

            callback();
        }
    }

    async generateOnly() {
        try {
            let templateName = `${this.#createWhat}${_.capitalize(this.#onlyGenerate)}`,
                fileName = `${this.#onlyGenerate.toLowerCase()}.js`,
                fileContents = await this.getTemplateContent(templateName);

            await this.writeSourceFile(this.#confObj.name, fileName, fileContents);
        }
        catch (ex) {
            Log.error(ex.message);
        }
    }

    async generateWithExclusions() {
        let toGenerate = [],
            templateName, fileName, fileContents;

        try {

            this.#templates.forEach((template) => {
                if (!this.#excludeGenerate.includes(template))
                    toGenerate.push(template);
            });

            for (let i = 0; i < toGenerate.length; i++) {
                templateName = `${this.#createWhat}${_.capitalize(toGenerate[i])}`;
                fileName = `${toGenerate[i].toLowerCase()}.js`;
                fileContents = await this.getTemplateContent(templateName);
                await this.writeSourceFile(this.#confObj.name, fileName, fileContents);
            }
        }
        catch (ex) {
            Log.error(ex.message);
        }
    }

    async generateAll() {
        try {
            let fileContents = await this.getTemplateContent('entityIndex');
            await this.writeSourceFile(this.#confObj.name, 'index.js', fileContents);

            fileContents = await this.getTemplateContent('entityRoute');
            await this.writeSourceFile(this.#confObj.name, 'route.js', fileContents);

            if (this.#createWhat === 'entity') {
                fileContents = await this.getTemplateContent('entityService');
                await this.writeSourceFile(this.#confObj.name, 'service.js', fileContents);
            }
            else {
                fileContents = await this.getTemplateContent('featureService');
                await this.writeSourceFile(this.#confObj.name, 'service.js', fileContents);
            }

            if (this.#createWhat === 'entity') {
                fileContents = await this.getTemplateContent('entityDomain');
                await this.writeSourceFile(this.#confObj.name, 'domain.js', fileContents);
            }

            fileContents = await this.getTemplateContent('entityStatics');
            await this.writeSourceFile(this.#confObj.name, 'statics.js', fileContents);

            fileContents = await this.getTemplateContent('entityController');
            await this.writeSourceFile(this.#confObj.name, 'controller.js', fileContents);
        }
        catch (ex) {
            Log.error(ex.message);
        }
    }

    doesEntityExist(dirName) {
        const dir = (this.#createWhat === 'feature') ? `${this.#baseFeatureDir}/${dirName}` : `${this.#baseEntityDir}/${dirName}`;
        let exists = fs.existsSync(dir);

        if (exists && this.#overwrite) {
            exists = false;
        }
        else if (exists) {
            Log.error(`${dir} already exists.`);
            Log.error('Set "overwrite": "true" in JSON options to overwrite existing Entity.');
        }

        return exists;
    };

    async writeSourceFile(dirName, fileName, fileContents = '') {
        const dir = (this.#createWhat === 'feature') ? `${this.#baseFeatureDir}/${dirName}` : `${this.#baseEntityDir}/${dirName}`,
            fullPath = `${dir}/${fileName}`;

        try {
            if (!_.isEmpty(dirName) && !_.isEmpty(fileName)) {

                if (!fs.existsSync(dir))
                    await fs.mkdirSync(dir, { recursive: true });

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

    async getTemplateContent(templateName = 'entityIndex') {
        const templatePath = path.join(__dirname, `./codeTemplates/${templateName}.txt`),
            name = this.#confObj.name,
            className = (!_.isEmpty(this.#confObj.className)) ? this.#confObj.className : this.#confObj.name,
            schemaName = this.#confObj.schemaName;
        let contents = 'NO TEMPLATE CONTENT FOUND';

        try {
            contents = await this.readFileAsync(templatePath);
            let tmpCompiled = _.template(contents);
            contents = tmpCompiled({ 'name': name, 'className': className, 'schemaName': schemaName });

            // Template strings had to be escaped for the above replacements. These 2 lines removed those escaped strings.
            contents = contents.replaceAll('\\$\\{', '${');
            contents = contents.replaceAll('\\}', '}');
        }
        catch (ex) {
            Log.error(`============ ${ex}`);
        }

        return contents;
    }

    readFileAsync(path) {
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
