const _ = require('lodash');
const Log = require('../log/Log');

module.exports = class Playground {
    static testConfig = {
        FirstReverse: {
            input: ['str=><string>'],
            output: ['result=><string>']
        }
    };

    //############################################
    static FirstReverse(str) {
        let charArray = str.split('');
        charArray = charArray.reverse();
        return charArray.join('');
    }
    // console.log(FirstReverse("Laura sobs"));

    //############################################
    static ABCheck(str) {
        let charArr = str.split(''),
            aPos = -1,
            bPos = -1;

        charArr.forEach((char, idx) => {
            if (char.toLowerCase() === 'a') aPos = idx + 1; // +1 because it asked for separated by 3
            if (char.toLowerCase() === 'b') bPos = idx; // could use a -1 here as well
        });

        return bPos - aPos === 3;
    }
    // console.log(ABCheck("Laura sobs")); "after badly"

    //############################################
    static FirstFactorial(num) {
        let result = 1;
        while (num > 1) {
            result *= num;
            num--;
        }
        return num < 1 ? 0 : result;
    }
    // console.log(FirstFactorial(4));

    //############################################
    static LongestWord(sen) {
        let longestWord = '',
            parts = sen.split(' '),
            longestCharCount = 0;

        for (let i = 0; i < parts.length; i++) {
            if (parts[i].length > longestCharCount) {
                longestCharCount = parts[i].length;
                longestWord = parts[i];
            }
        }
        return longestWord;
    }
    // console.log(LongestWord("Yippie kay yay"));

    //############################################
    static LetterChanges(str) {
        let chars = str.split(''),
            newStr = '';

        chars.forEach((char) => {
            let tmpStr = '';

            if (!Number.isInteger(parseInt(char)) && char.charCodeAt(0) !== 32) {
                tmpStr = String.fromCharCode(char.charCodeAt(0) + 1);
            } else tmpStr = char;

            if (['a', 'e', 'i', 'o', 'u'].includes(tmpStr.toLowerCase())) tmpStr = tmpStr.toUpperCase();

            newStr += tmpStr;
        });
        return newStr;
    }
    // console.log(LetterChanges("fun times!"));

    //############################################
    static SimpleAdding(num) {
        let result = 0;
        for (let i = 1; i <= num; i++) {
            result += i;
        }
        return result;
    }
    // console.log(SimpleAdding(140));

    //############################################
    static LetterCapitalize(str) {
        let titleRe = /((?:\s|^)[a-z])/g;
        function uc(str, p1) {
            return p1.toUpperCase();
        }
        return str.replace(titleRe, uc);
    }
    // console.log(LetterCapitalize("hello world"));

    //############################################
    static CheckNums(num1, num2) {
        let boolStr = 'false';
        if (Number.isInteger(parseInt(num1)) && Number.isInteger(parseInt(num2))) {
            if (num2 > num1) boolStr = 'true';
        }
        return boolStr;
    }
    // console.log(CheckNums(54, 21));

    //############################################
    static TimeConvert(num) {
        let result = undefined,
            minsInHour = 60;
        if (Number.isInteger(parseInt(num))) {
            num = parseInt(num);
            result = `${Math.floor(num / minsInHour)}:${num % minsInHour}`;
        }
        return result;
    }
    // console.log(TimeConvert(344)); //'2f' 'f2'

    //############################################
    static AlphabetSoup(str) {
        let charArr = str.split(''),
            charNumArr = [];

        charArr.forEach((char) => {
            charNumArr.push(char.charCodeAt(0));
        });
        charNumArr.sort((a, b) => a - b);

        charArr = [];
        charNumArr.forEach((numb) => {
            charArr.push(String.fromCharCode(numb));
        });
        return charArr.join('');
    }
    // console.log(AlphabetSoup('hooplah'));

    //############################################
    static ArrayAddition(arr) {
        let result = 0,
            largestNumb,
            worked = false;

        arr = arr.sort((a, b) => a - b);
        largestNumb = arr[arr.length - 1];

        for (let i = 0; i < arr.length - 1; i++) {
            result += arr[i];
        }

        let tmpDiff = result - largestNumb;
        if (tmpDiff !== 0) {
            if (arr.includes(tmpDiff)) {
                worked = true;
            }
        } else if (tmpDiff === 0) worked = true;

        return worked;
    }
    // console.log(ArrayAddition([5,7,16,1,2]));

    //############################################
    static LongestIncreasingSequence(nums) {
        // Create dp array
        const initialLengths = Array.from(nums, () => 1);

        // Max subsequence length
        let max = 1;

        // Check all increasing subsequences up to the current ith number in nums
        for (let i = 1; i < nums.length; i++) {
            // Keep track of subsequence length in the initialLengths array
            for (let j = 0; j < i; j++) {
                // Only change dp value if the numbers are increasing
                if (nums[i] > nums[j]) {
                    // Set the value to be the largest subsequence length
                    initialLengths[i] = Math.max(initialLengths[i], initialLengths[j] + 1);

                    // Check if this subsequence is the largest
                    max = Math.max(initialLengths[i], max);
                }
            }
        }
        return max;
    }
    // console.log(LongestIncreasingSequence([10, 22, 9, 33, 21, 50, 41, 60, 22, 68, 90]));

    //############################################
    static SumMultiplier(arr) {
        let worked = false,
            result = 0;

        arr.sort((a, b) => a - b);
        for (let i = 0; i < arr.length; i++) {
            result += arr[i];
        }
        result *= 2;

        for (let i = arr.length - 1; i >= 0; i--) {
            if (arr[i] * arr[i - 1] > result) {
                worked = true;
                break;
            }
        }
        return worked;
    }
    // console.log(SumMultiplier([1, 1, 2, 10, 3, 1, 12]));

    //############################################
    static VowelCount(str) {
        let charArr = str.split(''),
            vowles = ['a', 'e', 'i', 'o', 'u'],
            vowelCount = 0;

        charArr.forEach((char) => {
            if (vowles.includes(char.toLowerCase())) vowelCount++;
        });
        return vowelCount;
    }
    // console.log(VowelCount('some special string'));

    // ############################################
    static FindMissingNumbers() {
        let fullStringInput = '38?5 * 3 = 1?595',
            unknownChar = '?',
            operatorsRegex = /[+\-*/]/,
            operators = {
                '+': { flipped: '-' },
                '-': { flipped: '+' },
                '*': { flipped: '/' },
                '/': { flipped: '*' }
            },
            operator,
            operatorFlip,
            variableTerm,
            staticTerm,
            equationSides,
            resultMissingStr,
            testNumbs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            answer = [];

        parseInputStr(fullStringInput);

        testNumbs.forEach((numb, idx, arr) => {
            let resultNumb = parseInt(resultMissingStr.replace(unknownChar, numb)),
                calcResult,
                moduloTest;

            if (resultNumb !== null) {
                moduloTest = parseInt(resultNumb) % parseInt(staticTerm);

                if (answer.length < 1 && moduloTest < 1) {
                    calcResult = Math.floor(calcFromString(`${resultNumb}${operatorFlip}${staticTerm}`));

                    let calcStr = calcResult.toString();
                    if (calcStr.startsWith(variableTerm.split(unknownChar)[0])) {
                        let markIdx = variableTerm.indexOf(unknownChar);
                        answer = [calcStr.substring(markIdx, markIdx + 1), numb.toString()];
                        arr.length++;
                    }
                }
            }
        });

        function parseInputStr(fullStrInput) {
            fullStrInput = fullStrInput.replace(/\s/g, '');
            equationSides = fullStrInput.split('=');

            for (let i = 0; i < equationSides.length; i++) {
                if (operatorsRegex.test(equationSides[i])) {
                    let operatorList = Object.keys(operators);
                    for (let j = 0; j < operatorList.length; j++) {
                        if (equationSides[i].includes(operatorList[j])) setOperAndFlip(operatorList[j]);
                    }

                    let stmtParts = equationSides[i].split(operator);
                    for (let j = 0; j < stmtParts.length; j++) {
                        if (stmtParts[j].includes(unknownChar)) variableTerm = stmtParts[j];
                        else staticTerm = stmtParts[j];
                    }
                } else {
                    resultMissingStr = equationSides[i];
                }
            }
        }

        function setOperAndFlip(operStr = '+') {
            operator = operStr;
            operatorFlip = operators[operStr].flipped;
        }

        function calcFromString(str) {
            return Function(`'use strict'; return (${str})`)();
        }

        return answer;
    }
    // console.log(FindMissingNumbers("38?5 * 3 = 1?595"));

    static protoExample1() {
        let otherProto = function () {
            this.prop1 = 456; // this means the instance of the object we are creating
            this.inner = function () {
                console.log('inner method on instance');
            };
            //automatically returns the instance of the object
        };
        otherProto.prototype.someMethod = function () {
            console.log('this is otherProto');
        };
        let obj = new otherProto();

        console.log(obj.prop1); // 456
        obj.inner();
        obj.someMethod();
        console.log(obj.toString());

        //obj.__proto__.inner(); // fail
        //Object.getPrototypeOf(obj).inner(); // fail
        //Object.getPrototypeOf(obj).someMethod(); //yes
    }

    static protoExample2() {
        let protoObj = {
            prop1: 456,
            someMethod: function () {
                console.log('this is someMethod');
            }
        }; //Object.getPrototypeOf(protoObj).otherMethod = function(){}
        protoObj.__proto__.otherMethod = function () {
            console.log('this is otherMethod added to prototype');
        };

        console.log(protoObj);
        console.log(protoObj.otherMethod());
    }

    static protoExample3() {
        let protoObj = {
            prop1: 456,
            someMethod: function () {
                console.log('this is someMethod');
            }
        };

        //3.  childObj --->  protoObj  --->  Object.prototype  --> null
        let childObj = {};
        Object.setPrototypeOf(childObj, protoObj);
        console.log(childObj.prop1);
        // childObj.someMethod();
        // childObj.otherMethod();
        // childObj.nonmethod();
    }

    static protoExample4() {
        let protoObj = {
            prop1: 456,
            someMethod: function () {
                console.log('this is someMethod');
            }
        };

        let childObj2 = Object.create(protoObj);
        console.log(childObj2.prop1); //456  coming from protoObj
        childObj2.prop1 = 777; // created a new property inside childObj2 called prop1
        console.log(childObj2.prop1, childObj2.__proto__.prop1);
        childObj2.someMethod(); //calls the one inside protoObj
        childObj2.someMethod = function () {
            console.log('new method inside childObj2');
        };
        childObj2.someMethod();
        childObj2.__proto__.someMethod();
    }
}
