const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/**
 * @example
 * ```js
 *  import JSONDatabase from './jsondatabase.js';
 * 
 *  const db = new JSONDatabase({
 *      // defaults to `./db.json`
 *      file: './data/db.json', 
 *      // will update json schemas with changes in `schemas`.
 *      syncronizeSchemas: true,
 *      schemas: {
 *          observers: []
 *      }
 *  });
 * 
 *  const doc = db.insert(`observers`, {
 *      name: 'socure',
 *      path: './src/observers/socure.js',
 *      enabled: false
 *  });
 *  // { 
 *  //     id: uuid,
 *  //     name: string,
 *  //     path: string,
 *  //     enabled: boolean, 
 *  //     updatedAt: date,
 *  //     createdAt: date
 *  // }
 * 
 *  const docSelected = db.select(`observers`, doc.id)
 *  // { 
 *  //     id: uuid,
 *  //     name: string,
 *  //     path: string,
 *  //     enabled: boolean, 
 *  //     updatedAt: date,
 *  //     createdAt: date
 *  // }
 * 
 *  const docsSearched = db.search(`observers`, doc.name)
 *  // [{...}, {...}]
 * 
 *  const docUpdated = db.update(`observers`, { ...doc, enabled: true })
 *  // {
 *  //     id: uuid,
 *  //     name: string,
 *  //     path: string,
 *  //     enabled: boolean,
 *  //     updatedAt: date,
 *  //     createdAt: date
 *  // }
 * 
 *  const docDeletedId = db.delete(`observers`, doc.id)
 *  // uuid
 * ```
 */
module.exports = class JSONDatabase {
    /**
     * The file is used to store the database.
     * @private
     * @type {string}
     */
    #file;

    /**
     * The database is a map of schemas.
     * @private
     * @type {Map}
     */
    #db;

    /**
     * The schemas are used to create the file if it doesn't exist.
     * @private
     * @type {Object}
     */
    #schemas;

    /**
     * If true, the schemas will be updated with the changes in the file.
     * @private
     * @type {boolean}
     */
    #syncronizeSchemas;

    /**
     * @param {Object} options
     * @param {string} options.file
     * @param {Object} options.schemas
     * @param {boolean} options.syncronizeSchemas
     * @returns {JSONDatabase}
     */
    constructor({ file = './db.json', schemas = {}, syncronizeSchemas = false }) {
        this.#file = file;
        this.#db = new Map();
        this.#schemas = schemas;
        this.#syncronizeSchemas = Boolean(syncronizeSchemas);

        this.read();

        process.on('beforeExit', () => {
            this.write()
        });
        process.on('exit', () => {
            this.write()
        });
        process.on('SIG', () => {
            this.write()
        });
    }

    /**
     * Reads the file or creates a new one if it doesn't exist.
     */
    read() {
        const file = this.#file;
        const schemas = this.#schemas;

        let json;
        let map;
        let db;

        if (!fs.existsSync(file)) {
            console.warn(`File: ${file} cannot be found.`);
            this.#createFile();
        }

        let text = fs.readFileSync(file);
        console.log(`Reading file: ${file} (${text.length} bytes)`);

        try {
            json = JSON.parse(text);
        } catch(e) {
            console.error(e.message);
            json = this.#schemas;
        } finally {
            map = this.#toMap(json);
            db = this.#validateSchemas(map);
            console.log(`Validating schemas: ${Object.keys(schemas).join(', ')}`)
            this.#db = db;
        }
    }

    /**
     * Writes the changes to the file.
     */
    write() {
        const file = this.#file;
        const db = this.#db;
        const data = this.#toJson(db);
        const json = JSON.stringify(data, null, 4);

        // console.log(`Writing file: ${file} (${json.length} bytes)`);

        fs.writeFileSync(file, json, { encoding: 'utf8' });
    }

    /**
     * Searches the database for a record/document.
     * @param {string} schema
     * @param {string} value
     * @returns {Array}
     * @throws {Error}
     */
    search(schema, value) {
        // console.log(`[${this.#file}] searching '${schema}' for '${value}'`)
        const db = this.#db;
        if (!db?.has(schema)) {
            throw new Error(`Cannot search a Schema ('${schema}') that doesn't exist.`);
        }
        const table = db.get(schema);
        const searchTarget = [ ...table.values() ];
        return searchTarget.filter(doc => {
            const value = Object.values(doc).join(' ');
            return value.match(new RegExp(`(${value})`, 'gmi'));
        });
    }

    /**
     * Selects a record/document from the database.
     * @param {string} schema
     * @param {string} id
     * @returns {Object}
     * @throws {Error}
     */
    select(schema, id) {
        // console.log(`[${this.#file}] selecting '${schema}' with '${id}'`)
        const db = this.#db
        const table = db.get(schema);
        const doc = table.get(id);

        return doc;
    }

    /**
     * Creates a new record/document in the database.
     * will add id (if not already set), updatedAt, and createdAt fields.
     * @param {string} schema
     * @param {object} doc
     * @returns {object} updated document
     * @throws {Error}
     */
    insert(schema, doc) {
        // console.log(`[${this.#file}] inserting '${schema}'`, doc)
        
        const db = this.#db;
        if (!db?.has(schema)) {
            throw new Error(`Schema not found: ${schema}`);
        }
        const table = db.get(schema);
        const id = doc.id ?? crypto.randomUUID();

        table.set(id, {
            id,
            ...doc,
            updatedAt: new Date(),
            createdAt: new Date()
        });
        this.write();
        return this.select(schema, id);
    }

    /**
     * Applies changes to a record/document in the database.
     * will update updatedAt field.
     * @param {string} schema
     * @param {object} doc
     * @returns {object} updated document
     * @throws {Error}
     */
    update(schema, doc) {
        // console.log(`[${this.#file}] updating '${schema}' with '${doc.id}'`)

        const db = this.#db;
        const table = db.get(schema);
        const original = table.get(doc.id);
        const updated = { ...original, ...doc, updatedAt: new Date() };

        table.set(updated.id, updated);
        this.write();

        return updated;
    }

    /**
     * Deletes a record/document from the database.
     * @param {string} schema
     * @param {string} id
     * @returns {string} id
     * @throws {Error}
     */
    delete(schema, id) {
        // console.log(`[${this.#file}] deleting '${schema}' with '${id}'`)
        const db = this.#db;
        const table = db.get(schema);
        table.delete(id);
        this.write();
        return id;
    }


    #createFile() {
        const file = this.#file;
        const schemas = this.#schemas;

        if (fs.existsSync(file)) {
            console.warn(`File (${file}) already exists.`);
        } else {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, JSON.stringify(schemas, null, 4), { encoding: 'utf8' });
        }
    }

    #validateSchemas(map) {
        const schemas = this.#schemas;
        const syncronizeSchemas = this.#syncronizeSchemas;

        for (const [schema, docs] of Object.entries(schemas)) {
            if (!map.has(schema)) {
                if (syncronizeSchemas) {
                    map.set(schema, new Map());
                    if (docs) {
                        docs.forEach(doc => {
                            doc.id = doc.id ?? crypto.randomUUID();
                            doc.updatedAt = new Date();
                            doc.createdAt = new Date();
                            map.get(schema).set(doc.id, {
                                ...doc
                            })
                        })
                    }
                } else {
                    // console.warn(`> [ ] ${schema}`);
                    throw new Error(`${schema} schema not found`);
                }
            }
            continue;
        }
        return map;
    }

    #toMap(json) {
        let map = new Map();
        for (let [key, value] of Object.entries(json)) {
            if (Array.isArray(value)) {
                const schema = key;
                map.set(schema, this.#toMap(value));
            } else if (typeof value === 'object') {
                value.id = value.id ?? crypto.randomUUID();
                map.set(value.id, value);
            }
        }
        return map;
    }

    #toJson(map) {
        let json = {};
        for (let [key, value] of map.entries()) {
            const schema = key;
            if (value instanceof Map) {
                json[schema] = [...value.values()];
                continue;
            } else {
                json[schema] = value;
            }
        }
        return json;
    }

    toJSON() {
        return this.#toJson(this.#db);
    }
}
