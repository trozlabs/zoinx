module.exports = class Text {
    static SPACE = ' ';

    static toWords(string) {
        var regex = /[A-Z\xC0-\xD6\xD8-\xDE]?[a-z\xDF-\xF6\xF8-\xFF]+|[A-Z\xC0-\xD6\xD8-\xDE]+(?![a-z\xDF-\xF6\xF8-\xFF])|\d+/g;
        return string.replace(/\'/gim, '').match(regex);
    }

    static toTitle(string) {
        return Text.toWords(string)
            .join(Text.SPACE)
            .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    static upper(string) {
        return Text.toUpper(string);
    }

    static toUpper(string) {
        return String(string).toUpperCase();
    }

    static toLower(string) {
        return String(string).toLowerCase();
    }

    static toCamel(string) {
        return Text.toWords(string)
            .join(Text.SPACE)
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (char, index) => (index === 0 ? char.toLowerCase() : char.toUpperCase()))
            .replace(/\s+/g, '');
    }

    static toKebab(string) {
        return Text.toWords(string)
            .join(Text.SPACE)
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }

    static toSnake(string) {
        return Text.toWords(string)
            .join(' ')
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s-]+/g, '_')
            .toLowerCase();
    }

    /**
     * Removes any properties from an object with matching property names.
     * @param {Object} object the object to remove matching fields
     * @param {Array} redacted the property names to remove from an object.
     * @return {Object}
     */
    static redact(object, redacted = ['password']) {
        redacted.forEach((field) => {
            delete object[field];
        });
        return object;
    }

    /**
     * Remove extra whitespace including line breaks and tabs.
     * @param {String} text
     * @return {String}
     */
    static strip(string) {
        var words = string.match(/(\w+)/gim);
        return words.join(' ');
    }

    static json(obj, format) {
        return JSON.stringify(obj, null, format ? 4 : null);
    }
};
