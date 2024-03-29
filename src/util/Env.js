const fs = require('fs');
const path = require('path');

// regex borrowed from dotenv
const ENV_VAR_REGEX = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

/**
 * Env
 * @class
 * @classdesc A class for loading environment variables from a file[s].
 * @example
 * const { env }= require('zoinx/util');
 * 
 * to load additional files not already loaded by default
 * @example
 * Env.load('.env.custom', '.env.custom.local');
 */
class Env {

    static instance = null;

    /**
     * Load environment variables from file[s].
     */
    static {
        this.instance = this.instance || new this().load(
            '.env',
            // '.env.development',
            // '.env.testing',
            // '.env.production',
            // '.env.local',
            // '.env.development.local',
            // '.env.testing.local',
            // '.env.production.local'
        );
        module.exports = this.instance;
        module.exports.load = this.instance.load;
        module.exports.Env = this;
    }

    /**
     * Create a new instance of Env.
     * @returns {Env} instance
     * @constructor
     */
    constructor() {
        if (this.constructor.instance) {
            return this.constructor.instance;
        }
    }

    variables = {};

    /**
     * Get an environment variable.
     * @param {string|undefined?} name - optionally the name of the environment variable.
     * @returns {string|object} The environment variable or object of all environment variables.
     */
    get(name) {
        return name ? process.env[name] : process.env;
    }

    /**
     * Parse a string from an environment variable.
     * @param {string} name - The name of the environment variable.
     * @returns {string} The parsed string.
     */
    string(name) {
        return String(process.env[name]);
    }

    /**
     * Parse a number from an environment variable.
     * @param {string} name - The name of the environment variable.
     * @returns {number} The parsed number.
     */
    number(name) {
        return Number(process.env[name]);
    }

    /**
     * Parse a boolean from an environment variable.
     * Accepted values are: 1, true, TRUE, T, t, y, Y
     * @param {string} name - The name of the environment variable.
     * @returns {boolean} The parsed boolean.
     */
    boolean(name) {
        if (process.env[name] === '1') return true;
        if (process.env[name] === 'TRUE') return true;
        if (process.env[name] === 'true') return true;
        if (process.env[name] === 'T') return true;
        if (process.env[name] === 't') return true;
        if (process.env[name] === 'Y') return true;
        if (process.env[name] === 'y') return true;
        else return false;
    }

    /**
     * Parse a comma-separated list from an environment variable.
     * @param {string} name - The name of the environment variable.
     * @returns {string[]} The parsed list.
     */
    array(name) {
        return process.env[name]?.trim().split(/,|\s+|\s/) ?? [];
    }

    /**
     * Parse a JSON string from an environment variable.
     * @param {string} name - The name of the environment variable.
     * @returns {object} The parsed JSON object.
     */
    object(name) {
        return JSON.parse(process.env[name]);
    }

    /**
     * Load environment variables from a file[s].
     * @param {string} files - The file[s] to load.
     * @returns {Env} instance
     */
    load(...files) {
        files.forEach(async (file) => {
            const vars = this.#parseFile(file);
            if (vars) {
                Object.assign(process.env, this.variables);
            }
        });
        return this;
    }

    /**
     * Loads a file by name and parses it for environment variables.
     * @method
     * @private
     * @param {string} file
     */
    #parseFile(file) {
        let filepath, envFile;
        
        try {
            filepath = path.resolve(process.cwd(), file);

            try {
                envFile = fs.readFileSync(filepath, { encoding: 'utf8' });
            }
            catch (e) {
                throw new Error(`Checked for ${filepath} but it doesn't exist.`);
            }

            if (!envFile) {
                throw new Error(`File ${filepath} is empty.`);
            }
        }
        catch(e) {
            if (process.env.DEBUG) {
                console.warn(`WARNING: ${e.message}`);
            }
            return;
        }


        let match;
        while ((match = ENV_VAR_REGEX.exec(envFile)) !== null) {
            let [ line, name, value ] = match;

            this.variables[name] = this.#stripQuotes(value);

            if (value?.includes('${')) {
                const expandedValue = this.#expandVariable(value);
                if (expandedValue !== undefined) {
                    this.variables[name] = expandedValue;
                }
            }
        }

        return this.variables;
    }

    /**
     * Expand a variable in a string. Works like bash variables.
     * @method
     * @private
     * @param {string} string - The string to expand.
     * @returns {any} result 
     * @example
     * ```js
     * process.env.FOO = 'bar';
     * #expandVariable('${FOO}') // bar
     *
     * process.env.ENV = undefined;
     * #expandVariable('zoinx-${ENV:-bar}') // zoinx-bar
     * ```
     */
    #expandVariable(string) {
        const regex = /\${(.*?)}/g;
        const [ expandable ] = string.match(regex);
        const [ variable, fallback ] = expandable?.replace('${', '').replace('}', '').split(':-') ?? [];
        const defaultValue = this.#stripQuotes(fallback);
        const value = this.variables[variable] ?? process.env[variable] ?? defaultValue;
        const result = string.replace(regex, value === 'undefined' ? undefined : value);

        // console.log({ string, expandable, fallback, variable, value, result });

        return result;
    }

    /**
     * Strip quotes from a string.
     * @method
     * @private
     * @param {string} string - The string to strip quotes from.
     * @returns {string} The string without quotes.
     */
    #stripQuotes(string) {
        return string?.replace(/(^"|"$)|(^'|'$)/g, '');
    }
}
