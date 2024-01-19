const util = require('node:util');
const fs = require('node:fs');
const path = require('node:path');
const debug = util.debuglog('timber');
const Destination = require('./Destination');
const ObjectUtil = require('../../util/ObjectUtil');

module.exports = class FileDestination extends Destination {
    name = 'file-destination';
    type = 'file';
    // debug = false;

    #writeStream;
    #console;
    #rotationIntervalId;

    /**
     * @param {object} options
     * @param {string} options.name - the name of the destination
     * @param {boolean} options.debug - debug settings are enabled
     * @param {object} options.config - configuration based on destination type
     * @param {string} options.config.file - path and name of log file
     * @param {number} options.config.maxAge - if the log file is older than X milliseconds create a new file
     * @param {number} options.config.maxSize - if the log file is larger than X bytes create a new file
     * @param {number} options.config.rotationInterval - how often to check if log file needs rotated
     */
    constructor(options={}) {
        super(...arguments);

        const config = this.getConfig();
        config.file = config?.file ?? 'logs/app.log';
        config.maxAge = config?.maxAge ?? (3600 * 24);
        config.maxSize = config?.maxSize ?? (1_048);
        config.rotationInterval = config?.rotationInterval ?? (10_000);

        this.#writeStream = fs.createWriteStream(path.resolve(this.getConfig().file), { flags: 'a' });
        this.#console = new console.Console({
            stdout: this.#writeStream,
            stderr: this.#writeStream,
            colorMode: false
        });

        this.#rotateLogIfNeeded();

        this.#rotationIntervalId = setInterval(() => {
            this.#rotateLogIfNeeded();
        }, config.rotationInterval);
    }

    /**
     * @todo add a way to pause log rotation
     */

    #rotateLogIfNeeded() {
        if (this.debug) {
            console.debug(this.name, 'Checking if log needs rotated');
        }
        const timestamp = new Date().toISOString().replace(/[-:]/g, '.');

        const maxAge = this.getConfig().maxAge;
        const maxSize = this.getConfig().maxSize;

        const absolutePath = path.resolve(this.getConfig().file);
        const { dir, ext, name } = path.parse(absolutePath);

        const isDirExist = fs.existsSync(dir);
        // const isFileExist = fs.existsSync(absolutePath);
        const isFileTooOld = this.#isFileOlderThan(absolutePath, maxAge);
        const isFileTooBig = this.#isFileTooBig(absolutePath, maxSize);

        // Create directory if it does not exist.
        //
        if (!isDirExist) {
            if (this.debug) {
                console.debug(this.name, 'Directory does not exist. Creating', dir);
            }
            fs.mkdirSync(dir, { recursive: true });
        }

        if (isFileTooOld || isFileTooBig) {
            const newFileName = path.resolve(dir, `${name}-${timestamp}${ext}`);

            if (this.debug) {
                console.debug(this.name, 'File exceeds max age or size. Renaming to', newFileName);
            }

            fs.renameSync(absolutePath, newFileName);

            this.#writeStream = fs.createWriteStream(absolutePath, { flags: 'a' });
            this.#console._stdout = this.#writeStream;
            this.#console._stderr = this.#writeStream;
        }

    }

    #isFileOlderThan(filePath, maxAgeInSeconds) {
        const currentTime = Date.now();
        const maxAgeInMillis = maxAgeInSeconds * 1000;
        try {
            const stats = fs.statSync(filePath);
            const fileCreatedTime = stats.ctime.getTime();
            return currentTime - fileCreatedTime >= maxAgeInMillis;
        } catch (error) {
            // Handle errors (e.g., file not found)
            console.error('Error:', error.message);
            return false;
        }
    }

    #isFileTooBig(filePath, maxSizeBytes) {
        try {
            const stats = fs.statSync(filePath);
            return maxSizeBytes <= stats.size;
        } catch (error) {
            // Handle errors (e.g., file not found)
            console.error('Error:', error.message);
            return false;
        }
    }

    handle(log) {
        if (this.debug) console.debug(this.name, 'destination handle', this);

        const method = this.#console[log.method];

        if (method) {
            method.apply(this, [ log.plain, ...log?.args ]);
        } else {
            debug(`${log.level} method does not exist on this.#console`);
            this.#console.log(log.plain);
        }
    }
}
