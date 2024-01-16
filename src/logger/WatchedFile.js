const fs = require('node:fs');
const { EventEmitter } = require('node:events');

/**
 * @classdesc Wraps a file with EventEmitter to watch a file for
 * changes. Also adds read and write methods added for convienience.
 */
module.exports = class WatchedFile extends EventEmitter {
    name;
    filepath;

    constructor({ name, filepath }) {
        super();

        this.name = name;
        this.filepath = filepath;

        fs.watch(filepath, (eventType, filename) => {
            if (eventType === 'change') {
                try {
                    const data = this.read();
                    this.emit('change', { filename, data });
                } catch (err) {
                    console.error(`Error reading or parsing ${filepath}:`, err);
                }
            }
        });
    }

    read() {
        return fs.readFileSync(this.filepath, 'utf8');
    }

    write(data = '') {
        fs.writeFileSync(this.filepath, data, { encoding: 'utf-8' });
    }
}
