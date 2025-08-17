module.exports = createWorkflow;

/**
 *
 * @example
 * const myWorkflow = createWorkflow(
 *     function step1(initialInput) {
 *         console.log(initialInput);
 *         return new Promise((resolve, reject) => {
 *             setTimeout(() => resolve(initialInput + 1), 1000);
 *         });
 *     },
 *     async function step2(input) {
 *         console.log(input);
 *         if (input > 2) throw new Error(`you did it wrong, yo!`);
 *         return input + 1;
 *     },
 *     function step3(input) {
 *         console.log(input);
 *         return new Promise((resolve, reject) => {
 *             setTimeout(() => resolve(input + 1), 1000);
 *         });
 *     },
 *     function step4(input) {
 *     		console.log(input);
 *         return input + 1;
 *     }
 * );
 *
 * // runs to completion
 * myWorkflow(0).then(console.log).catch(console.error);
 *
 * // causes error
 * myWorkflow(2).then(console.log).catch(console.error);
 */
function createWorkflow(...functions) {
    return async function workflow(initialInput) {
        let error
        let result = await functions.reduce(async function (result, fn, fnIndex, fnList) {
            let input, output

            try {
                input = await result
                console.debug(`Workflow Step #${fnIndex + 1}, function: '${fn.name}'`)
                output = await fn(input)
                return output
            } catch (stepError) {
                console.debug(`Workflow Step #${fnIndex + 1} Error function: '${fn.name}'`, {
                    input,
                    output,
                    error: stepError
                })

                error = stepError

                /**
                 * Abort workflow by removing all remaining functions.
                 */
                fnList.splice(1)
            }
        }, initialInput)

        if (error) {
            throw error
        } else {
            return result
        }
    }
}


