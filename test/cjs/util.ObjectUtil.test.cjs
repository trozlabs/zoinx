const test = require('node:test');
const { describe } = test;
const assert = require('assert');
const { ObjectUtil } = require('zoinx/util');

describe('ObjectUtil.serialize/deserialize: complex scenarios', () => {

    test('round-trips primitives and common exotic types', () => {
        const { root } = makeComplexFixture();
        const wire = ObjectUtil.serialize(root);
        const revived = ObjectUtil.deserialize(wire);

        // console.log('root', inspectObject(wire));
        // console.log('root', inspectObject(revived));

        // Basic structure
        assert.equal(revived.name, 'root');

        // Date
        assert.ok(revived.date instanceof Date);
        assert.equal(revived.date.toISOString(), '2020-05-01T12:34:56.789Z');

        // RegExp
        assert.ok(revived.re instanceof RegExp);
        assert.equal(revived.re.source, 'he(llo)?');
        assert.equal(revived.re.flags.split('').sort().join(''), 'gi');

        // URL
        assert.ok(revived.url instanceof URL);
        assert.equal(revived.url.toString(), 'https://example.com/path?q=1');

        // BigInt
        assert.equal(revived.big, 2n ** 63n - 1n);

        // Buffer
        assert.ok(Buffer.isBuffer(revived.buf));
        bytesEqual(revived.buf, Buffer.from([1, 2, 3, 4, 255]));

        // ArrayBuffer & TypedArrays/DataView: same bytes & view semantics
        assert.ok(revived.ab instanceof ArrayBuffer);
        bytesEqual(new Uint8Array(revived.ab), new Uint8Array(root.ab));

        assert.ok(revived.taFull instanceof Uint8Array);
        bytesEqual(revived.taFull, root.taFull);

        assert.ok(revived.taSlice instanceof Uint8Array);
        assert.equal(revived.taSlice.byteOffset, 4);
        assert.equal(revived.taSlice.length, 6);
        // Ensure slice content was preserved
        bytesEqual(revived.taSlice, new Uint8Array(root.ab, 4, 6));

        assert.ok(revived.i16 instanceof Int16Array);
        assert.equal(revived.i16.byteOffset, 2);
        assert.equal(revived.i16.length, 3);

        assert.ok(revived.dv instanceof DataView);
        assert.equal(revived.dv.byteLength, 8);
    });

    test('preserves Map keys of any type and values', () => {
        const { root, keyObj, keyArr } = makeComplexFixture();
        const wire = ObjectUtil.serialize(root);
        const revived = ObjectUtil.deserialize(wire);

        assert.ok(revived.map instanceof Map);

        // String key
        assert.equal(revived.map.get('s'), 123);

        // Number key with deep object value
        const nObj = revived.map.get(99);
        assert.equal(nObj.deep, true);

        // Object key preserves identity only within the revived graph.
        // We can't compare to original identity; instead assert that some object key exists with Set value.
        let foundObjKey = false,
            foundArrKey = false,
            foundSymKey = false;
        for (const [k, v] of revived.map.entries()) {
            if (isPlainObject(k) && v instanceof Set) foundObjKey = true;
            if (Array.isArray(k) && v === 'array-as-key') foundArrKey = true;
            if (typeof k === 'symbol' && v === 'symbol-value') foundSymKey = true;
        }
        assert.ok(foundObjKey, 'Object key round-tripped');
        assert.ok(foundArrKey, 'Array key round-tripped');
        assert.ok(foundSymKey, 'Symbol key round-tripped');

        // The map also contained the root as a key -> 'root-as-key'
        assert.equal(revived.map.get(revived), 'root-as-key');
    });

    test('preserves Set membership including object references', () => {
        const { root } = makeComplexFixture();
        const wire = ObjectUtil.serialize(root);
        const revived = ObjectUtil.deserialize(wire);

        assert.ok(revived.set instanceof Set);
        assert.ok(revived.set.has(1));
        assert.ok(revived.set.has('two'));

        // The set should contain the nested object by identity in the revived graph
        assert.ok(revived.set.has(revived.nested));
    });

    test('resolves circular references and shared aliases', () => {
        const { root } = makeComplexFixture();
        const wire = ObjectUtil.serialize(root);
        const revived = ObjectUtil.deserialize(wire);

        // Self cycle
        assert.equal(revived.self, revived);

        // Nested parent back-reference
        assert.equal(revived.nested.inner.parent, revived.nested);

        // Shared alias (same array instance)
        assert.equal(revived.arrRef, revived.nested.arr);
    });

    test('function/class stubs are named and throw on call/construct', async () => {
        const { root } = makeComplexFixture();
        const wire = ObjectUtil.serialize(root);
        const revived = ObjectUtil.deserialize(wire);

        // sync function
        assert.equal(typeof revived.demoFn, 'function');
        assert.equal(revived.demoFn.name, 'demoFn');
        throwsWithMessageSync(() => revived.demoFn(), /placeholder function/);

        // async function
        assert.equal(typeof revived.demoAsync, 'function');
        assert.equal(revived.demoAsync.name, 'demoAsync');
        await rejectsWithMessage(() => revived.demoAsync(), /placeholder async function/);

        // generator (throw happens on .next())
        assert.equal(typeof revived.demoGen, 'function');
        assert.equal(revived.demoGen.name, 'demoGen');
        throwsWithMessageSync(() => revived.demoGen().next(), /placeholder generator function/);

        // class (throw happens on construct)
        assert.equal(typeof revived.DemoClass, 'function');
        assert.equal(revived.DemoClass.name, 'DemoClass');
        throwsWithMessageSync(() => new revived.DemoClass(), /placeholder class/);
    });

    test('Error objects deserialize to usable Error instances', () => {
        const { root } = makeComplexFixture();
        const wire = ObjectUtil.serialize(root);
        const revived = ObjectUtil.deserialize(wire);

        assert.ok(revived.error instanceof Error);
        assert.equal(revived.error.name, 'TypeError');
        assert.equal(revived.error.message, 'Boom!');
    });

    test('Symbols round-trip by description for values', () => {
        const { root } = makeComplexFixture();
        const wire = ObjectUtil.serialize(root);
        const revived = ObjectUtil.deserialize(wire);

        // We can't preserve identity across processes, but we can preserve description.
        assert.equal(typeof revived.symKey, 'symbol');
        assert.equal(revived.symKey.description, 'sym-key');
    });

    test('serializer emits $ref for cycles (sanity check on wire format)', () => {
        const { root } = makeComplexFixture();
        const wire = ObjectUtil.serialize(root);

        // Walk the serialized structure to ensure at least one {$ref} exists
        let foundRef = false;
        (function scan(node) {
            if (!node || typeof node !== 'object') return;
            if ('$ref' in node) {
                foundRef = true;
                return;
            }
            for (const v of Object.values(node)) {
                if (v && typeof v === 'object') scan(v);
            }
        })(wire);

        assert.ok(foundRef, 'Expected at least one {$ref} for cycles');
    });
});

// Helper duplicated here for the test

function isPlainObject(o) {
    return o !== null && typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype;
}

function bytesEqual(a, b) {
    a = a instanceof Uint8Array ? a : new Uint8Array(a);
    b = b instanceof Uint8Array ? b : new Uint8Array(b);
    assert.equal(a.byteLength, b.byteLength);
    for (let i = 0; i < a.byteLength; i++) assert.equal(a[i], b[i]);
}

function throwsWithMessageSync(fn, re) {
    let threw = false;

    try {
        fn();
    } catch (e) {
        threw = true;
        if (re) {
            require('node:assert/strict').match(String(e.message || e), re);
        }
    }

    require('node:assert/strict').ok(threw, 'Expected function to throw');
}

async function rejectsWithMessage(promiseOrFn, re) {
    const assert = require('node:assert/strict');
    if (typeof promiseOrFn === 'function') {
        await assert.rejects(promiseOrFn(), re);
    } else {
        await assert.rejects(promiseOrFn, re);
    }
}

function makeComplexFixture() {
    // Symbols
    const symKey = Symbol('sym-key');

    // Buffers & ArrayBuffers
    const buf = Buffer.from([1, 2, 3, 4, 255]);
    const ab = new ArrayBuffer(16);
    const u8 = new Uint8Array(ab);
    for (let i = 0; i < u8.length; i++) u8[i] = i;
    // Create a typed view with non-zero offset
    const taFull = new Uint8Array(ab);
    const taSlice = new Uint8Array(ab, 4, 6); // bytes 4..9
    taSlice.set([42, 43, 44, 45, 46, 47]); // mutate a portion
    const i16 = new Int16Array(ab, 2, 3); // overlapping view
    const dv = new DataView(ab, 1, 8); // overlapping DataView

    // Map with various key types (object, string, symbol, number)
    const keyObj = { k: 'object-key' };
    const keyArr = [1, 2, 3];
    const map = new Map();
    map.set('s', 123);
    map.set(99, { deep: true });
    map.set(keyObj, new Set([1, 2, 3]));
    map.set(keyArr, 'array-as-key');
    map.set(symKey, 'symbol-value');

    // Set with mixed values
    const set = new Set([1, 'two', keyObj, keyArr]);

    // Error
    let capturedError;
    try {
        // eslint-disable-next-line no-throw-literal
        throw new TypeError('Boom!');
    } catch (e) {
        capturedError = e;
    }

    // URL, Date, RegExp, BigInt
    const url = new URL('https://example.com/path?q=1');
    const date = new Date('2020-05-01T12:34:56.789Z');
    const re = /he(llo)?/gi;
    const big = 2n ** 63n - 1n;

    // Functions & classes
    async function demoAsync() {}
    function* demoGen() {
        yield 1;
    }
    function demoFn() {}
    class DemoClass {}

    // Build the root object with cycles
    const root = {
        name: 'root',
        buf,
        ab,
        taFull,
        taSlice,
        i16,
        dv,
        map,
        set,
        error: capturedError,
        url,
        date,
        re,
        big,
        symKey, // symbol as value
        demoAsync,
        demoGen,
        demoFn,
        DemoClass,
        nested: {
            arr: [1, 2, 3],
            inner: {}
        }
    };

    // Add cycles
    root.self = root;
    root.nested.inner.parent = root.nested;
    root.map.set(root, 'root-as-key');
    root.set.add(root.nested); // set references non-root
    root.arrRef = root.nested.arr; // shared reference (not a cycle but aliasing)

    return { root, symKey, keyObj, keyArr };
}

function inspectObject(obj, options={}) {
    return require('util').inspect(obj, Object.assign({
        depth: 100,
        colors: true,
        compact: false,
        showHidden: false,
        maxArrayLength: null,
        sorted: false
    }, options));
}
