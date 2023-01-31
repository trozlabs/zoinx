const fs = require('fs');

// regex borrowed/stoken from dotenv
const ENV_VAR_REGEX = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

class Env {
    static {
        module.exports = new this();
        module.exports.Env = this;
    }

    load(...files) {
        for (const file of files) {
            this.#parseFile(file);
        }
        return this;
    }
    get(name) {
        return name ? process.env[name] : process.env;
    }
    string(name) {
        return String(process.env[name]);
    }
    number(name) {
        return Number(process.env[name]);
    }
    boolean(name) {
        if (process.env[name] === '') return true;
        if (process.env[name] === '1') return true;
        if (process.env[name] === 'TRUE') return true;
        if (process.env[name] === 'true') return true;
        if (process.env[name] === 'Y') return true;
        if (process.env[name] === 'y') return true;
        else return false;
    }
    array(name) {
        return process.env[name]?.trim().split(/,|\s+|\s/) ?? [];
    }
    object(name) {
        return JSON.parse(process.env[name]);
    }

    #parseFile(filePath) {
        const envFile = fs.readFileSync(filePath, 'utf8');

        var match;
    
        while ((match = ENV_VAR_REGEX.exec(envFile)) !== null) {
            let [ line, name, value ] = match;
            process.env[name] = this.#stripQuotes(value);
            if (value?.includes('${')) {
                process.env[name] = this.#expandVariable(value);
            }
        }
        // console.log(process.env);
    }
    #expandVariable(string) {
        const [ variable, fallback ] = string?.replace('${', '').replace('}', '').split(':-') ?? [];
        const defaultValue = this.#stripQuotes(fallback);
        const result = process.env[variable] ?? defaultValue;
        return result;
    }
    #stripQuotes(string) {
        return string?.replace(/(^"|"$)|(^'|'$)/g, '');
    }    
}
