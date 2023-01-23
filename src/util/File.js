const path = require('path');
const fs = require('fs');
const fspm = fs.promises;

const constants = {
    /**
     * Open file for appending.The file is created if it does
     * not exist.
     * @constant {string}
     */
    A: 'a',

    /**
     * Like 'a' but fails if the path exists.
     * @constant {string}
     */
    AX: 'ax',

    /**
     * Open file for reading and appending.The file is created
     * if it does not exist.
     * @constant {string}
     */
    AP: 'a+',

    /**
     * Like 'a+' but fails if the path exists.
     * @constant {string}
     */
    AXP: 'ax+', //,

    /**
     * Open file for appending in synchronous mode.The file is
     * created if it does not exist.
     * @constant {string}
     */
    AS: 'as',

    /**
     * Open file for reading and appending in synchronous mode.
     * The file is created if it does not exist.
     * @constant {string}
     */
    ASP: 'as+',

    /**
     * Open file for reading.An exception occurs if the file
     * does not exist.
     * @constant {string}
     */
    R: 'r',

    /**
     * Open file for reading and writing. An exception occurs
     * if the file does not exist.
     * @constant {string}
     */
    RP: 'r+',

    /**
     * Open file for reading and writing in synchronous mode.
     * Instructs the operating system to bypass the local file
     * system cache. This is primarily useful for opening files on
     * NFS mounts as it allows skipping the potentially stale
     * local cache. It has a very real impact on I / O performance
     * so using this flag is not recommended unless it is needed.
     * @constant {string}
     */
    RSP: 'rs+',

    /**
     * Open file for writing.The file is created(if it does
     * not exist) or truncated(if it exists).
     * @constant {string}
     */
    W: 'w',

    /**
     * Like 'w' but fails if the path exists.
     * @constant {string}
     */
    WX: 'wx',

    /**
     * Open file for reading and writing.The file is created
     * (if it does not exist) or truncated(if it exists).
     * @constant {string}
     */
    WP: 'w+',

    /**
     * Like 'w+' but fails if the path exists.
     * @constant {string}
     */
    WXP: 'wx+'
};

// async write(path, data = '', options = {}) {
//     Log.debug(__filename, 'write', arguments);
//     const files = await fs.promises.writeFile(path, data, options);
// }

class Util {
    static async list(path) {
        const files = await fs.promises.readdir(path);
        for (const file of files) {
            Log.log(file);
        }
    }

    static canAccess(filepath, callback) {
        fs.access(filepath, fs.constants.F_OK | fs.constants.W_OK, (err) => {
            let hasAccess = false;
            if (err) {
                Log.error(`${file} ${err.code === 'ENOENT' ? 'does not exist' : 'is read-only'}`);
            } else {
                Log.debug(`${file} exists, and it is writable`);
                hasAccess = true;
            }
            return callback(err, hasAccess);
        });
    }
}

class Reader {
    // TODO:
}

class Writer {
    #stream;

    #filepath;

    constructor(filepath) {
        this.#filepath = filepath;
        this.#stream = this.#createStream();
    }

    filepath(filepath) {
        this.#filepath = filepath;
        return this;
    }

    write(data) {
        this.#stream.write(data);
        return this;
    }

    #createStream = function () {
        // Log.debug('creating write stream');
        try {
            const stream = fs.createWriteStream(this.#filepath, {
                flags: constants.A,
                autoClose: false
            });
            return stream;
        } catch (e) {
            console.error(e);
        }
    };

    get stream() {
        return this.#stream;
    }
}

module.exports = { Util, Reader, Writer, constants };
