const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MODULE_PATH = path.resolve(__dirname, '../../src/util/Env.js');

// Helpers
function mkTmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'env-spec-'));
}
function write(file, content) {
    fs.writeFileSync(file, content, 'utf8');
}
function freshRequire(p) {
    delete require.cache[p];
    return require(p);
}

describe('Env loader', () => {
    let tmpdir;
    let originalCwd;
    let envSnapshot;

    beforeEach(() => {
        // Isolate filesystem and process.env per test
        tmpdir = mkTmp();
        originalCwd = process.cwd();
        process.chdir(tmpdir);
        envSnapshot = { ...process.env };
        // Clean DEBUG so missing-file warnings (if any) don't spam output
        delete process.env.DEBUG;
    });

    afterEach(() => {
        // Restore process.env
        for (const k of Object.keys(process.env)) {
            if (!(k in envSnapshot)) delete process.env[k];
        }
        for (const [k, v] of Object.entries(envSnapshot)) {
            process.env[k] = v;
        }
        // Restore CWD
        process.chdir(originalCwd);
        // Cleanup tmpdir
        fs.rmSync(tmpdir, { recursive: true, force: true });
    });

    test('loads .env on require and supports basic types', () => {
        write(
            path.join(tmpdir, '.env'),
            `
# comments and whitespace
FOO=bar
NUM=42
FLAG=true
LIST=a,b,c
JSON={"x":1,"y":"z"}
QUOTED="hello world"
SINGLE='hi there'
BACKTICK=\`kept-as-is\`  # stripQuotes does not strip backticks by design
    `.trim()
        );

        const env = freshRequire(MODULE_PATH); // triggers static block -> loads .env

        assert.equal(env.get('FOO'), 'bar');
        assert.equal(env.string('FOO'), 'bar');

        assert.equal(env.number('NUM'), 42);

        assert.equal(env.boolean('FLAG'), true);
        assert.equal(env.boolean('FOO'), false);

        assert.deepEqual(env.array('LIST'), ['a', 'b', 'c']);

        assert.deepEqual(env.object('JSON'), { x: 1, y: 'z' });

        assert.equal(process.env.QUOTED, 'hello world'); // quotes stripped
        assert.equal(process.env.SINGLE, 'hi there'); // quotes stripped
        assert.equal(process.env.BACKTICK, '`kept-as-is`'); // backticks preserved by #stripQuotes
    });

    test('accepts export prefix and colon syntax', () => {
        write(
            path.join(tmpdir, '.env'),
            `
export NAME=Zoinx
PORT: 3000   # dotenv-compatible colon
    `.trim()
        );

        const env = freshRequire(MODULE_PATH);

        assert.equal(env.get('NAME'), 'Zoinx');
        assert.equal(env.number('PORT'), 3000);
    });

    test('variable expansion and default fallback ${VAR:-default}', () => {
        write(
            path.join(tmpdir, '.env'),
            `
BASE='zoinx'
WITH_BASE=\${BASE}-api
MISSING_DEFAULT=\${DOES_NOT_EXIST:-fallback}
PREFIXED="svc-\${BASE}"
COMPLEX=\${BASE}-\${DOES_NOT_EXIST:-x}-\${BASE}
    `.trim()
        );

        const env = freshRequire(MODULE_PATH);

        assert.equal(env.get('BASE'), 'zoinx');
        assert.equal(env.get('WITH_BASE'), 'zoinx-api');
        assert.equal(env.get('MISSING_DEFAULT'), 'fallback');
        assert.equal(env.get('PREFIXED'), 'svc-zoinx');
        assert.equal(env.get('COMPLEX'), 'zoinx-x-zoinx');
    });

    test('expansion reads from existing process.env too', () => {
        process.env.OUTSIDE = 'outer';
        write(
            path.join(tmpdir, '.env'),
            `
FROM_ENV=\${OUTSIDE}
OVERRIDE=\${OUTSIDE:-x}
    `.trim()
        );

        const env = freshRequire(MODULE_PATH);

        assert.equal(env.get('FROM_ENV'), 'outer');
        assert.equal(env.get('OVERRIDE'), 'outer');
    });

    test('multiple files can be loaded and later files can override', () => {
        // Create two env files
        write(
            path.join(tmpdir, '.env'),
            `
NAME=first
SHARED=from-first
    `.trim()
        );

        write(
            path.join(tmpdir, '.env.local'),
            `
SHARED=from-local
NEW_ONLY=local
    `.trim()
        );

        // Require once to load default .env
        const env = freshRequire(MODULE_PATH);
        // Then explicitly load the second file
        env.load('.env.local');

        assert.equal(env.get('NAME'), 'first'); // from .env
        assert.equal(env.get('SHARED'), 'from-local'); // overridden by .env.local
        assert.equal(env.get('NEW_ONLY'), 'local');
    });

    test('boolean() accepts the documented truthy set', () => {
        const truthy = ['1', 'TRUE', 'true', 'T', 't', 'Y', 'y'];
        for (const v of truthy) {
            write(path.join(tmpdir, '.env'), `FLAG=${v}`);
            const env = freshRequire(MODULE_PATH);
            assert.equal(env.boolean('FLAG'), true, `expected ${v} to be truthy`);
            delete require.cache[MODULE_PATH];
        }

        write(path.join(tmpdir, '.env'), `FLAG=False`);
        const env2 = freshRequire(MODULE_PATH);
        assert.equal(env2.boolean('FLAG'), false);
    });

    test('array() splits on commas and whitespace', () => {
        write(
            path.join(tmpdir, '.env'),
            `
LIST1=a,b, c
LIST2=  a   b\tc
EMPTY=
    `.trim()
        );

        const env = freshRequire(MODULE_PATH);

        assert.deepEqual(env.array('LIST1'), ['a', 'b', 'c']);
        assert.deepEqual(env.array('LIST2'), ['a', 'b', 'c']);
        assert.deepEqual(env.array('EMPTY'), ['']); // current behavior; note: maybe you want []
    });

    test('missing file is tolerated (no throw) and DEBUG logs a warning', () => {
        // No .env present
        // Should not throw when requiring / loading a missing file
        const env = freshRequire(MODULE_PATH);
        assert.ok(env); // instance exists

        // Explicitly loading a missing file should also not throw
        assert.doesNotThrow(() => env.load('does-not-exist.env'));

        // If you want to assert the warning when DEBUG is set, you can stub console.warn:
        process.env.DEBUG = '1';
        let warned = false;
        const origWarn = console.warn;
        console.warn = () => {
            warned = true;
        };
        try {
            env.load('still-missing.env');
        } finally {
            console.warn = origWarn;
            delete process.env.DEBUG;
        }
        assert.equal(warned, true);
    });

    test('object() throws on invalid JSON (document current behavior)', () => {
        write(path.join(tmpdir, '.env'), `BAD_JSON={x:1}`);
        const env = freshRequire(MODULE_PATH);
        assert.throws(() => env.object('BAD_JSON'), /Unexpected token|JSON/);
    });
});
