const { Log } = require('../../src/log');

Log.banner('testing: zoinx/log v0.0.1', '=');

Log.style(Log.Text.BLACK)(`FG BLACK`);
Log.style(Log.Text.RED)(`FG RED`);
Log.style(Log.Text.GREEN)(`FG GREEN`);
Log.style(Log.Text.YELLOW)(`FG YELLOW`);
Log.style(Log.Text.BLUE)(`FG BLUE`);
Log.style(Log.Text.MAGENTA)(`FG MAGENTA`);
Log.style(Log.Text.CYAN)(`FG CYAN`);
Log.style(Log.Text.WHITE)(`FG WHITE`);

Log.style(Log.Background.BLACK)(`BG BLACK`);
Log.style(Log.Background.RED)(`BG RED`);
Log.style(Log.Background.GREEN)(`BG GREEN`);
Log.style(Log.Background.YELLOW)(`BG YELLOW`);
Log.style(Log.Background.BLUE)(`BG BLUE`);
Log.style(Log.Background.MAGENTA)(`BG MAGENTA`);
Log.style(Log.Background.CYAN)(`BG CYAN`);
Log.style(Log.Background.WHITE)(`BG WHITE`);

Log.style(Log.BLINK)(`BLINK`);
Log.style(Log.BOLD)(`BOLD`);
Log.style(Log.BRIGHT)(`BRIGHT`);
Log.style(Log.UNDERLINE)(`UNDERLINE`);
Log.style(Log.DIM)(`DIM`);
Log.style(Log.REVERSE)(`REVERSE`);
Log.style(Log.HIDDEN)(`HIDDEN`);

Log.verbose(`testing zoinx/log`);
Log.debug(`testing zoinx/log`);
Log.info(`testing zoinx/log`);
Log.warn(`testing zoinx/log`);
Log.error(`testing zoinx/log`);
Log.banner(`testing zoinx/log`);
Log.json({ msg: `testing zoinx/log` });

Log.style(Log.BOLD, Log.FG.CYAN)(`
------------------------------------------------------------
 testing: Log.method(fn, args, thisArg)
------------------------------------------------------------
`);

class TestClass {

    static create(options = {}) {
        Log.method(this.create, arguments);

        return new this(options);
    }

    constructor(options = {}) {
        Log.method(this.constructor, arguments, this);

        this.name = options.name;
        this.version = options.version;
        this.description = options.description;

        this.classMethod(...arguments);
    }

    classMethod(one=1, name, obj={ a : 1, b: 'b' }, arr = [ '1', 2, 3 ], ...extras) {
        Log.method(this.classMethod, arguments, this);
        this.classArrowMethod(one, name, obj, arr, extras);
    }

    classArrowMethod = (one=1,name='', obj={a:1,b:'b'}, arr=['1',2,3], ...extras) => {
        Log.method(this.classArrowMethod, [one, name, obj, arr, extras], this);
        this.classArrowMethodWithoutBraces(one, name, obj, arr, extras);
        
        this.assignedClassMethod();
        testA();
    }

    classArrowMethodWithoutBraces = (
        one=1,
        name,
        obj={ a : 1, b: 'b' },
        arr = [ '1', 2, 3 ],
        ...extras
    ) => Log.method(this.classArrowMethodWithoutBraces, [one, name, obj, arr, extras], this);

    assignedClassMethod = testA;
}

Log.style(Log.BOLD, Log.FG.CYAN)(`testing: zoinx/log - methods (Classes)`);

const testClassInstance = TestClass.create(
    { name: 'MyApp', version: '1.0.0', description: 'My awesome app' },
    'some',
    'extra',
    'values',
    1,
    null,
    TestClass,
    true,
    [ 5 ]
);

Log.style(Log.BOLD, Log.FG.CYAN)(`testing: zoinx/log - basic function`);
Log.style(Log.BOLD, Log.FG.CYAN)(`testing: zoinx/log - A variety of default arguments`);

function testA(one=1, name, obj={ a : 1, b: 'b' }, arr = [ '1', 2, 3 ], ...extras) {
    Log.method(testA, arguments, this);
}
testA();


Log.style(Log.BOLD, Log.FG.CYAN)(`testing: zoinx/log - Out of scope default argument values`);

const defaultArgValue=1;
function testA2(one=defaultArgValue, testClass = TestClass) {
    Log.method(testA2, arguments, this);
}
testA2(undefined, TestClass);


Log.style(Log.BOLD, Log.FG.CYAN)(`testing: zoinx/log - Arrow function`);

const testB = (one=1, name, obj={ a : 1, b: 'b' }, arr = [ '1', 2, 3 ], ...extras) => { 
    Log.method(testB, [one, name, obj, arr, extras], this);
}
testB(null);


Log.style(Log.BOLD, Log.FG.CYAN)(`testing: zoinx/log - Arrow functions without braces`);

const testD = (one=1, name, obj={ a : 1, b: 'b' }, arr = [ '1', 2, 3 ], ...extras) => 
    Log.method(testD, [one, name, obj, arr, extras], this);
testD(null, 'testD');
