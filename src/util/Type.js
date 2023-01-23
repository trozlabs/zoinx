module.exports = class Type {
    static OBJECT = 'OBJECT';
    static GLOBAL = 'GLOBAL';
    static NULL = 'NULL';
    static UNDEFINED = 'UNDEFINED';
    static BOOLEAN = 'BOOLEAN';
    static FUNCTION = 'FUNCTION';
    static ARGUMENTS = 'ARGUMENTS';
    static PROMISE = 'PROMISE';
    static SYMBOL = 'SYMBOL';
    static ERROR = 'ERROR';
    static EVALERROR = 'EVALERROR';
    static RANGEERROR = 'RANGEERROR';
    static REFERENCEERROR = 'REFERENCEERROR';
    static SYNTAXERROR = 'SYNTAXERROR';
    static TYPEERROR = 'TYPEERROR';
    static URIERROR = 'URIERROR';
    static NUMBER = 'NUMBER';
    static NAN = 'NAN';
    static BIGINT = 'BIGINT';
    static MATH = 'MATH';
    static DATE = 'DATE';
    static ARRAY = 'ARRAY';
    static UINT8ARRAY = 'UINT8ARRAY';
    static INT8ARRAY = 'INT8ARRAY';
    static REGEXP = 'REGEXP';
    static STRING = 'STRING';
    static MAP = 'MAP';
    static SET = 'SET';
    static WEAKMAP = 'WEAKMAP';
    static WEAKSET = 'WEAKSET';

    static object = 'OBJECT';
    static global = 'GLOBAL';
    static null = 'NULL';
    static undefined = 'UNDEFINED';
    static boolean = 'BOOLEAN';
    static function = 'FUNCTION';
    static arguments = 'ARGUMENTS';
    static promise = 'PROMISE';
    static symbol = 'SYMBOL';
    static error = 'ERROR';
    static evalerror = 'EVALERROR';
    static rangeerror = 'RANGEERROR';
    static referenceerror = 'REFERENCEERROR';
    static syntaxerror = 'SYNTAXERROR';
    static typeerror = 'TYPEERROR';
    static urierror = 'URIERROR';
    static number = 'NUMBER';
    static nan = 'NAN';
    static bigint = 'BIGINT';
    static math = 'MATH';
    static date = 'DATE';
    static array = 'ARRAY';
    static uint8array = 'UINT8ARRAY';
    static int8array = 'INT8ARRAY';
    static regexp = 'REGEXP';
    static string = 'STRING';
    static map = 'MAP';
    static set = 'SET';
    static weakmap = 'WEAKMAP';
    static weakset = 'WEAKSET';

    static Object = 'OBJECT';
    static Global = 'GLOBAL';
    static Null = 'NULL';
    static Undefined = 'UNDEFINED';
    static Boolean = 'BOOLEAN';
    static Function = 'FUNCTION';
    static Arguments = 'ARGUMENTS';
    static Promise = 'PROMISE';
    static Symbol = 'SYMBOL';
    static Error = 'ERROR';
    static EvalError = 'EVALERROR';
    static RangeError = 'RANGEERROR';
    static ReferenceError = 'REFERENCEERROR';
    static SyntaxError = 'SYNTAXERROR';
    static TypeError = 'TYPEERROR';
    static UriError = 'URIERROR';
    static Number = 'NUMBER';
    static NaN = 'NAN';
    static BigInt = 'BIGINT';
    static Math = 'MATH';
    static Date = 'DATE';
    static Array = 'ARRAY';
    static Uint8array = 'UINT8ARRAY';
    static Int8array = 'INT8ARRAY';
    static Regexp = 'REGEXP';
    static String = 'STRING';
    static Map = 'MAP';
    static Set = 'SET';
    static Weakmap = 'WEAKMAP';
    static Weakset = 'WEAKSET';

    static getType(obj) {
        return Type.get(obj).alias;
    }

    static get(obj) {
        const tag = (obj && obj.toString && obj.toString()) || obj;
        const primitive = typeof obj;
        const type = (obj && obj.constructor.name) || Object.prototype.toString.call(obj).toString().replace('[object ', '').replace(']', '');
        const alias = (type || primitive).toUpperCase();
        const isUndefinedOrNull = alias == Type.UNDEFINED || alias == Type.NULL;
        return {
            alias,
            type,
            primitive,
            value: obj,
            length: isUndefinedOrNull ? undefined : obj.length,
            size: isUndefinedOrNull ? undefined : obj.size
        };
    }

    static isBoolean(obj) {
        return Type.get(obj).alias === Type.BOOLEAN;
    }

    static isDate(obj) {
        return Type.get(obj).alias === Type.DATE;
    }

    static isBigInt(obj) {
        return Type.get(obj).alias === Type.BIGINT;
    }

    static isNumber(obj) {
        return !Number.isNaN(Number.parseFloat(obj)) && !Number.isNaN(obj - 0);
    }

    static isInteger(obj) {
        return Type.isNumber(obj) && Number(obj) === obj && obj % 1 === 0;
    }

    static isFloat(obj) {
        return Type.isNumber(obj) && Number(obj) === obj && obj % 1 !== 0;
    }

    static isBuffer(obj) {
        return Type.get(obj).alias === Type.BUFFER;
    }

    static isString(obj) {
        return Type.get(obj).alias === Type.STRING;
    }

    static isArray(obj) {
        return Type.get(obj).alias === Type.ARRAY;
    }

    static isMap(obj) {
        return Type.get(obj).alias === Type.MAP;
    }

    static isSet(obj) {
        return Type.get(obj).alias === Type.SET;
    }

    static isFunction(obj) {
        return this.get(obj).alias === Type.FUNCTION;
    }

    static isNull(obj) {
        return this.get(obj).alias === Type.NULL;
    }

    static isUndefined(obj) {
        return this.get(obj).alias === Type.UNDEFINED;
    }

    static isObject(obj) {
        return (
            !Type.isDate(obj) &&
            !Type.isNumber(obj) &&
            !Type.isString(obj) &&
            !Type.isArray(obj) &&
            !Type.isBoolean(obj) &&
            !Type.isMap(obj) &&
            !Type.isSet(obj) &&
            !Type.isNull(obj) &&
            !Type.isUndefined(obj)
        );
    }

    // Beyond Basics:

    /**
     * Opinionated Boolean Coercion.
     */
    static toBoolean(obj) {
        const truthy = [1, '1', 'Y', 'T', 'YES', 'TRUE'];
        const falsey = [0, '0', 'N', 'F', 'NO', 'FALSE', 'NULL', 'UNDEFINED', '', ' '];

        let result = true;

        if (Type.isEmpty(obj)) {
            result = false;
        }
        // only if it can't be cast as a number and is not an object...
        else if (!Type.isNumber(obj) && !Type.isObject(obj)) {
            let str = Type.toUpper(obj).trim();
            if (truthy.includes(str)) {
                result = true;
            } else if (falsey.includes(str)) {
                result = false;
            }
        }
        // if it can be treated as a number...
        if (Type.isNumber(obj)) {
            let num = parseInt(obj);

            if (num > 0) {
                result = true;
            } else {
                result = false;
            }
        }
        return result;
    }

    static isEmpty(obj) {
        const { alias, length } = EDC.Type.get(obj);

        switch (alias) {
            case Type.NULL:
            case Type.UNDEFINED:
                return true;
            case Type.NUMBER:
                return !Type.isNumber(obj);
            case Type.STRING:
            case Type.ARRAY:
            case Type.BUFFER:
                return length === 0;
            case Type.OBJECT:
                return JSON.stringify(obj) === JSON.stringify({});
            default:
                return false;
        }
    }

    static ifEmpty(obj, defaults) {
        if (Type.isEmpty(obj)) return defaults;
        return obj;
    }
};
