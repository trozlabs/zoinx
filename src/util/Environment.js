const fs = require('fs');
const path = require('path');

module.exports = async (...files) => {
    const file = path.resolve(...files);
    // console.log(file);
    const envFileContents = fs.readFileSync(file, 'utf8');
    const envLines = envFileContents.split('\n').filter((line) => !isBlank(line) && !isComment(line));

    const parsedEnv = {};
    envLines.forEach((line) => {
        let [key, val] = parse(line);
        val = isExpandable(val) ? expandValue(val) : val;
        process.env[key] = val;
        //console.log(`:: process.env.${key} = ${process.env[key]}`);
    });

    console.log(`ENV VARIABLES LOADED FROM ${file}`);
    // process.env.NODE_ENV = global.config.envName;
    // console.log(`${process.env.MONGO_DB_NAME}`);
    // console.log(global.config);
    return parsedEnv;
};

function isBlank(line) {
    return String(line).trim().length === 0 ? true : false;
}
function isComment(line) {
    return String(line).startsWith('#') ? true : false;
}
function isExpandable(val) {
    return String(val).startsWith(`$`) ? true : false;
}
function hasDefault(val) {
    return String(val).indexOf(':-') > 0;
}
function stripComment(line) {
    return String(line).split('#').shift();
}
function parse(line) {
    // console.log('parse', line);
    line = line.indexOf('#') > 0 ? stripComment(line) : line;
    let tmpline = line.split('=');

    if (tmpline.length > 2) line = [tmpline[0], line.substring(line.indexOf('=') + 1)];
    else line = tmpline;

    let [key, val] = line;
    val = isExpandable(val) ? expandValue(val) : val;
    return [key, val];
}
function expandValue(val) {
    // console.log('expandValue', val)
    const key = val.replace(`$`, '').replace(`{`, '').replace(`}`, '');
    const defaultValue = val.split(`:-`).pop();
    // console.log(key, defaultValue);
    return process.env[key] || defaultValue || '';
}
