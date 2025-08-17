const test = require('node:test');
const assert = require('assert');
const {
    parseFunction,
    parseFunctionSignature,
    parseError,
    parseErrorStacktrace,
    getTypeMeta,
    getArrayType
} = require('zoinx/inspect');

test('getTypeMeta returns correct type info', () => {
    assert.strictEqual(getTypeMeta(42).type, 'Number');
    assert.strictEqual(getTypeMeta(42.5).subType, 'Float');
    assert.strictEqual(getTypeMeta([1, 2, 3]).type, 'Array');
    assert.strictEqual(getTypeMeta([1, 'a']).subType, 'Mixed');
    assert.strictEqual(getTypeMeta(function testFn() {}).type, 'Function');
});

test('getArrayType returns correct array type', () => {
    assert.strictEqual(getArrayType([1, 2, 3]), 'Number');
    assert.strictEqual(getArrayType([1, 'a', true]), 'Mixed');
});

test('parseFunctionSignature extracts function name and signature', () => {
    function foo(a, b = 2) {}
    const sig = parseFunctionSignature(foo);
    // console.log('parseFunctionSignature', sig);
    assert.strictEqual(sig.name, 'foo');
    assert.ok(sig.signature.includes('foo'));
});

test('parseFunction parses function and arguments', () => {
    function bar(x, y = 5) { return x + y; }
    const parsed = parseFunction(bar, [10], { constructor: { name: 'TestScope' } });
    // console.log('parsedFn', parsed);
    assert.strictEqual(parsed.name, 'bar');
    assert.strictEqual(parsed.scope, 'TestScope');
    assert.ok(parsed.args.has('x'));
    assert.ok(parsed.args.has('y'));
});

test('parseError and parseErrorStacktrace parse error objects', () => {
    try {
        throw new Error('Test error');
    } catch (err) {
        const parsedErr = parseError(err);
        // console.log('parsedError', parseError);
        assert.strictEqual(parsedErr.name, 'Error');
        assert.strictEqual(parsedErr.message, 'Test error');
        assert.ok(Array.isArray(parsedErr.stacktrace));
        assert.ok(parsedErr.stacktrace.length > 0);
    }
});

test('parseErrorStacktrace parses stacktrace lines', () => {
    const err = new Error('Stacktrace test');
    const stacktrace = parseErrorStacktrace(err.stack);
    // console.log('stacktrace', stacktrace);
    assert.ok(Array.isArray(stacktrace));
    assert.ok(stacktrace.length > 0);
    // Each line should be an object with function, filename, line, column
    for (const line of stacktrace) {
        assert.ok(typeof line.function === 'string');
        assert.ok(typeof line.filename === 'string');
        assert.ok(typeof line.line === 'number');
        assert.ok(typeof line.column === 'number');
    }
});

