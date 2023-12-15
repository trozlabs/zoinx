module.exports = class StringUtil {

    /**
     * Finds the least indented line from a multi-line string
     * and removes that amount of leading whitespace from all lines.
     *
     * *The first, last and empty lines are not counted towards the indent
     * level subtracted from all lines.
     *
     * @param {string} string
     * @returns {string}
     * @example
     * if (true) {
     *      console.log(normalizeMultiLineIndent(`
     *              ----------------------------------------------
     *          ==================================================
     *              - line 1
     *                  - line 2
     *                      - line 3
     *          ==================================================
     *              ----------------------------------------------
     *      `));
     * }
     *
     * // outputs:
     * //    ----------------------------------------------
     * //==================================================
     * //    - line 1
     * //        - line 2
     * //            - line 3
     * //==================================================
     * //    ----------------------------------------------
     */
    static normalizeMultiLineIndent(string) {
        // Split the string into lines
        const lines = String(string).split('\n');

        // Find the minimum indentation, ignoring the first and last lines
        const minIndentation = lines.slice(1, -1).filter(line => line.trim()).reduce((min, line) => {
            const match = line.match(/^\s*/);
            return match ? Math.min(min, match[0].length) : min;
        }, Infinity);

        // Remove the minimum indentation from each line
        return lines.map((line, index) => {
            if (index === 0 || index === lines.length - 1) {
                return line;
            } else {
                return line.slice(minIndentation);
            }
        }).join('\n')
    }
}
