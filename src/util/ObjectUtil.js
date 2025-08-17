const {
    getTypeMeta,
    parseFunctionSignature,
    parseError
} = require('../inspect');

// Tune these if needed
const MAX_RECURSION_DEPTH = 100;
const BYTES_AS = 'array'; // 'array' | 'base64'

/**
 * Node shape for any serialized object-like value
 * {
 *   $id: number,
 *   type: string,    // e.g. "Object", "Array", "Map", "Set", "Buffer", ...
 *   data: any        // type-dependent payload
 * }
 *
 * References elsewhere are represented as:
 * { $ref: number }
 *
 * The final JSON is the fully inlined tree with $id markers at first appearance
 * and {$ref} on subsequent appearances. You can JSON.stringify the whole thing.
 */
class ObjectUtil {

    static serialize(root) {
        const seen = new WeakMap(); // object -> id
        let nextId = 1;

        const encode = (value, depth) => {
            if (depth > MAX_RECURSION_DEPTH) return { type: 'Truncated', data: null };

            const meta = getTypeMeta(value);

            // primitives & null
            if (value === null || (meta.primitive !== 'object' && meta.primitive !== 'function')) {
                return serializePrimitive(meta, value);
            }

            // already seen object? emit ref
            const existingId = seen.get(value);
            if (existingId) {
                return { $ref: existingId };
            }

            // assign id for this node
            const id = nextId++;
            seen.set(value, id);

            // dispatch by instanceOf/type
            return serializeByType(value, meta, encode, id, depth + 1);
        };

        return encode(root, 0);
    }

    static deserialize(root) {
        // First pass: create containers/placeholders by $id
        const idToObj = new Map();

        const revive = (node, depth) => {
            if (depth > MAX_RECURSION_DEPTH) return undefined;

            // reference
            if (isPlainObject(node) && typeof node.$ref === 'number') {
                const existing = idToObj.get(node.$ref);
                if (!existing) {
                    // forward ref: make a lazy placeholder; will be filled later
                    const placeholder = {};
                    idToObj.set(node.$ref, placeholder);
                    return placeholder;
                }
                return existing;
            }

            // primitives pass through
            if (!isPlainObject(node) || !node.type) return node;

            // If this is a typed node, create a shell (and register it) then fill it.
            const { $id, type, data } = node;

            const make = () => constructEmpty(type, data);
            const target = typeof $id === 'number'
                ? idToObj.get($id) || (idToObj.set($id, make()), idToObj.get($id))
                : make();

            // Fill / finalize the target with children revived
            return fillTyped(target, type, data, revive, idToObj, depth + 1);
        };

        return revive(root, 0);
    }
}


// Helpers: type detection / guards

function isPlainObject(o) {
    return o !== null && typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype;
}

// Serialization handlers

function serializePrimitive(meta, value) {
    switch (meta.type) {
        case 'Undefined':
            return { type: 'Undefined', data: 'undefined' };
        case 'Symbol':
            return { type: 'Symbol', data: value.description ?? null };
        case 'BigInt':
            return { type: 'BigInt', data: value.toString() };
        default:
            return value; // number, string, boolean, null
    }
}

function serializeByType(value, meta, encode, $id, depth) {
    const t = meta.type; // Function vs Class corrected in getTypeMeta
    const i = meta.instanceOf; // e.g. 'Array', 'Map', etc.

    // --- handle Error family (Error, TypeError, RangeError, etc.) ---
    if (t === 'Error' || /Error$/.test(i)) {
        const parsed = parseError(value);
        return { $id, type: 'Error', data: parsed };
    }

    switch (i) {
        case 'Array': {
            const out = value.map((v) => encode(v, depth));
            return { $id, type: 'Array', data: out };
        }

        case 'Object': {
            // plain object only; custom classes fall through to Function/Class below
            const out = {};
            for (const [k, v] of Object.entries(value)) {
                out[k] = encode(v, depth);
            }
            return { $id, type: 'Object', data: out };
        }

        case 'Map': {
            // preserve keys exactly by serializing entries
            const entries = [];
            for (const [k, v] of value.entries()) {
                entries.push([encode(k, depth), encode(v, depth)]);
            }
            return { $id, type: 'Map', data: entries };
        }

        case 'Set': {
            const items = [];
            for (const v of value.values()) items.push(encode(v, depth));
            return { $id, type: 'Set', data: items };
        }

        case 'Date': {
            return { $id, type: 'Date', data: value.toISOString() };
        }

        case 'RegExp': {
            return { $id, type: 'RegExp', data: { source: value.source, flags: value.flags } };
        }

        case 'Error': {
            const parsed = parseError(value);
            return { $id, type: 'Error', data: parsed };
        }

        case 'URL': {
            return { $id, type: 'URL', data: value.toString() };
        }

        case 'ArrayBuffer': {
            const bytes = new Uint8Array(value);
            return { $id, type: 'ArrayBuffer', data: packBytes(bytes) };
        }

        case 'DataView': {
            const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
            return { $id, type: 'DataView', data: packBytes(bytes) };
        }

        case 'Buffer': {
            // Node Buffer -> bytes (array or base64)
            return { $id, type: 'Buffer', data: packBytes(new Uint8Array(value)) };
        }

        case 'Int8Array':
        case 'Uint8Array':
        case 'Uint8ClampedArray':
        case 'Int16Array':
        case 'Uint16Array':
        case 'Int32Array':
        case 'Uint32Array':
        case 'Float32Array':
        case 'Float64Array':
        case 'BigInt64Array':
        case 'BigUint64Array': {
            const ctor = i;
            const view = value;
            // capture exact slice: offset/length + full backing store bytes
            const bytes = new Uint8Array(view.buffer); // full buffer
            return {
                $id,
                type: 'TypedArray',
                data: {
                    ctor,
                    byteOffset: view.byteOffset,
                    length: view.length,
                    buffer: packBytes(bytes)
                }
            };
        }

        case 'Function':
        case 'AsyncFunction':
        case 'GeneratorFunction':
        case 'Class': {
            // Don’t transport source by default (security). Preserve name + shape.
            const parsedSig = safeFunctionSignature(value);
            const kind = (meta.type === 'Class') ? 'Class' : meta.instanceOf; // <-- fix
            return {
                $id,
                type: kind,
                data: { name: meta.name || 'Anonymous', ...parsedSig }
            };
        }

        // Modules are not reconstructable safely. Treat as token.
        case 'Module':
            return { $id, type: 'Module', data: { kind: 'module' } };

        default: {
            // Fallback for custom class instances: serialize own enumerable props
            const out = {};
            for (const [k, v] of Object.entries(value)) {
                out[k] = encode(v, depth);
            }
            return { $id, type: 'Object', data: out };
        }
    }
}

function packBytes(uint8) {
    if (BYTES_AS === 'base64') {
        // Manual base64 to avoid Buffer dependency on the other side
        const b64 = Buffer.from(uint8).toString('base64');
        return { encoding: 'base64', bytes: b64, length: uint8.byteLength };
    }
    // default: raw array of numbers (portable, debuggable)
    return { encoding: 'array', bytes: Array.from(uint8), length: uint8.byteLength };
}

function unpackBytes(packed) {
    if (!packed || !packed.encoding) return new Uint8Array(0);
    if (packed.encoding === 'base64') {
        const buf = Buffer.from(packed.bytes, 'base64');
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    return new Uint8Array(packed.bytes || []);
}

function safeFunctionSignature(fn) {
    try {
        const sig = parseFunctionSignature(fn);
        return { signature: sig?.signature || '', sourceHint: (sig?.source || '').slice(0, 200) };
    } catch {
        return { signature: '', sourceHint: '' };
    }
}

// Deserialization handlers

function constructEmpty(type, data) {
    switch (type) {
        case 'Array':
            return [];
        case 'Object':
            return {};
        case 'Map':
            return new Map();
        case 'Set':
            return new Set();
        case 'Date':
            return new Date(data); // filled immediately
        case 'RegExp':
            return new RegExp(data.source, data.flags);
        case 'Error':
            return reconstructError(data);
        case 'URL':
            return new URL(data);
        case 'ArrayBuffer': {
            const bytes = unpackBytes(data);
            const buf = new ArrayBuffer(bytes.byteLength);
            new Uint8Array(buf).set(bytes);
            return buf;
        }
        case 'DataView': {
            const bytes = unpackBytes(data);
            const buf = new ArrayBuffer(bytes.byteLength);
            new Uint8Array(buf).set(bytes);
            return new DataView(buf);
        }
        case 'Buffer': {
            const bytes = unpackBytes(data);
            return Buffer.from(bytes);
        }
        case 'TypedArray': {
            // create an empty view; filled immediately below
            return { __typed_placeholder__: true };
        }
        case 'Class':
            return makeStubClass(data?.name || 'AnonymousClass');
        case 'GeneratorFunction':
            return makeStubGen(data?.name || 'anonymousGen');
        case 'AsyncFunction':
            return makeStubAsync(data?.name || 'anonymousAsync');
        case 'Function':
            return makeStubFn(data?.name || 'anonymous');
        case 'Module':
            return { __module__: true };
        case 'Undefined':
            return undefined;
        case 'BigInt':
            return BigInt(data);
        case 'Symbol':
            return Symbol(data);
        default:
            return {}; // fallback
    }
}

function fillTyped(target, type, data, revive, idToObj, depth) {
    switch (type) {
        case 'Array': {
            for (let i = 0; i < data.length; i++) {
                target[i] = revive(data[i], depth);
            }
            return target;
        }

        case 'Object': {
            for (const [k, v] of Object.entries(data)) {
                target[k] = revive(v, depth);
            }
            return target;
        }

        case 'Map': {
            for (const [kNode, vNode] of data) {
                const k = revive(kNode, depth);
                const v = revive(vNode, depth);
                target.set(k, v);
            }
            return target;
        }

        case 'Set': {
            for (const vNode of data) target.add(revive(vNode, depth));
            return target;
        }

        case 'Date':
        case 'RegExp':
        case 'URL':
        case 'ArrayBuffer':
        case 'DataView':
        case 'Buffer':
        case 'Undefined':
        case 'BigInt':
        case 'Symbol':
        case 'Class':
        case 'GeneratorFunction':
        case 'AsyncFunction':
        case 'Function':
        case 'Error':
        case 'Module': {
            // already fully constructed
            return target;
        }

        case 'TypedArray': {
            const { ctor, byteOffset, length, buffer } = data || {};
            const bytes = unpackBytes(buffer);
            const buf = new ArrayBuffer(bytes.byteLength);
            new Uint8Array(buf).set(bytes);
            const viewCtor = globalThis[ctor];
            if (typeof viewCtor !== 'function') return target;
            const array = new viewCtor(buf, byteOffset || 0, length || 0);
            return array;
        }

        default: {
            // Unknown ‘type’: try to hydrate own props if ‘data’ is object
            if (data && typeof data === 'object') {
                for (const [k, v] of Object.entries(data)) {
                    target[k] = revive(v, depth);
                }
            }
            return target;
        }
    }
}

function reconstructError(parsed) {
    if (!parsed) return new Error();
    const e = new Error(parsed.message || '');
    e.name = parsed.name || 'Error';
    // Rebuild stack text if you want; here we leave Node to generate one
    return e;
}

function makeStubFn(name) {
    // Create a named function that always throws when called
    try {
        // eslint-disable-next-line no-new-func
        return new Function(`return function ${sanitizeIdent(name)}(){ throw new Error("Deserialization placeholder function"); }`)();
    } catch {
        const fn = function () {
            throw new Error('Deserialization placeholder function');
        };
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
        return fn;
    }
}

function makeStubAsync(name) {
    try {
        return new Function(`return async function ${sanitizeIdent(name)}(){ throw new Error("Deserialization placeholder async function"); }`)();
    } catch {
        const fn = async function () {
            throw new Error('Deserialization placeholder async function');
        };
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
        return fn;
    }
}

function makeStubGen(name) {
    try {
        return new Function(`return function* ${sanitizeIdent(name)}(){ throw new Error("Deserialization placeholder generator function"); }`)();
    } catch {
        const fn = function* () {
            throw new Error('Deserialization placeholder generator function');
        };
        Object.defineProperty(fn, 'name', { value: name, configurable: true });
        return fn;
    }
}

function makeStubClass(name) {
    try {
        return new Function(`return class ${sanitizeIdent(name)} { constructor(){ throw new Error("Deserialization placeholder class"); } }`)();
    } catch {
        return class {
            constructor() {
                throw new Error('Deserialization placeholder class');
            }
        };
    }
}

function sanitizeIdent(s = '') {
    return String(s).replace(/[^A-Za-z0-9_$]/g, '_') || 'Anonymous';
}

module.exports = ObjectUtil;
