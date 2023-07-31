
/**
 * any whitespace character, newline, tab, etc
 */ 
exports.EXCESSIVE_WHITESPACE = /(\s)+/gmi

/**
 * captures anything between open and close banana-braces™: `(...)`
 */ 
exports.BETWEEN_BANANAS = /\.?(\(|\))/gmi

/**
 * captures anything between open and close curly braces: `{...}`
 */ 
exports.BETWEEN_CURLIES = /\.?(\{.+\})/gmi

/**
 * captures anything between open and close square brackets: `[...]`
 */ 
exports.BETWEEN_BRACKETS = /\.?(\[.+\])/gmi

/**
 * captures anything between open and close carrots: `<...>`
 */ 
exports.BETWEEN_CARROTS = /\.?(\<.+\>)/gmi

/**
 * will capture first line of a function string `function fnName(...) {`
 */
exports.FUNCTION_SIGNATURE = /^.+{$/gmi

/**
 * captures the basically the function signature, but not the function body
 * `function fnName(args) {`
 * `async function fnName(args) {`
 * `fnName(args) {}`
 * `fnName = (args) => {}`
 * `fnName = args => args.value`
 * `fnName = ({ value }) => value`
 */
exports.FUNCTION_METHOD_ARROW_SIGNATURE = /^.+(?=(\{|\=\>))/gmi

/**
 * captures the function arguments signature
 * `fnName(a) {}` -> `a`
 * `fnName(a=1) {}` -> `a=1`
 * `fnName(a=1, b, c = [1, 2, 3]) {}` -> `a=1, b, c = [1, 2, 3]`
 */
exports.FUNCTION_ARGUMENTS_SIGNATURES = /(\.{3}\w+.?)|\w+\s*(=\s*(?:\{[^\}]*\}|\[[^\]]*\]|"[^"]*"|[^,]*))?/gmi
