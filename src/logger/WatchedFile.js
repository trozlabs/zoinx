const fs = require('node:fs')
const { EventEmitter } = require('node:events');

module.exports = class WatchedFile extends EventEmitter {
    filepath;

    constructor({ name, filepath }) {
        super();

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
