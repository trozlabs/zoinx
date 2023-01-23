/*
^(?=(?:.*[A-Z]){1,})(?=(?:.*[a-z]){2,})(?=(?:.*\d){1,})(?=(?:.*[!@#$%^&*()\-_=+{};:,<.>]){1,})(?!.*(.)\1{2})([A-Za-z0-9!@#$%^&*()\-_=+{};:,<.>]{8,32})$

^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,16}$
{
  min: 8,
  max: 32,
  upperCase: 1,
  lowerCase: 1,
  numeric: 1,
  symbol: 1
}
 */
module.exports = class PasswordValidator {
    #min = 8;
    #max = 32;
    #upperCase = 1;
    #lowerCase = 1;
    #numeric = 1;
    #symbol = 1;
    #requirementCount = 0;
    #validationMsg = '';

    constructor(config) {
        if (config && Object.keys(config).length > 0) {
            this.#min = config.min ? parseInt(config.min) : 0;
            this.#max = config.max ? parseInt(config.max) : 0;
            this.#upperCase = config.upperCase ? parseInt(config.upperCase) : 0;
            this.#lowerCase = config.lowerCase ? parseInt(config.lowerCase) : 0;
            this.#numeric = config.numeric ? parseInt(config.numeric) : 0;
            this.#symbol = config.symbol ? parseInt(config.symbol) : 0;
        }

        if (this.#min > 0 && this.#max > 0) this.#requirementCount = 1;
        if (this.#upperCase > 0) this.#requirementCount++;
        if (this.#lowerCase > 0) this.#requirementCount++;
        if (this.#numeric > 0) this.#requirementCount++;
        if (this.#symbol > 0) this.#requirementCount++;
    }

    get validationMsg() {
        return this.#validationMsg;
    }

    validate(password) {
        let validCount = 0;
        let isValid = false;

        if (!password) return isValid;

        let regex = RegExp(`^(?=.{${this.#min},${this.#max}}$)`);
        isValid = regex.test(password);
        if (isValid) validCount++;
        else {
            this.#validationMsg += `Password(${password.length}) must be between ${this.#min} and ${this.#max} characters long. `;
        }

        if (this.#upperCase > 0) {
            regex = RegExp(`^(?=(.*?[A-Z]){${this.#upperCase}}).{${this.#upperCase},}$`);
            isValid = regex.test(password);
            if (isValid) validCount++;
            else {
                this.#validationMsg += `Password must have ${this.#upperCase} upper case letter(s). `;
            }
        }

        if (this.#lowerCase > 0) {
            regex = RegExp(`^(?=(.*?[a-z]){${this.#lowerCase}}).{${this.#lowerCase},}$`);
            isValid = regex.test(password);
            if (isValid) validCount++;
            else {
                this.#validationMsg += `Password must have ${this.#lowerCase} upper case letter(s). `;
            }
        }

        if (this.#numeric > 0) {
            regex = RegExp(`^(?=(.*?[0-9]){${this.#numeric}}).{${this.#numeric},}$`);
            isValid = regex.test(password);
            if (isValid) validCount++;
            else {
                this.#validationMsg += `Password must have ${this.#numeric} numeric character(s). `;
            }
        }

        if (this.#symbol > 0) {
            regex = RegExp(`^(?=(.*?[!@#$%^&*()\\-_=+{};:,<.>]){${this.#symbol}}).{${this.#symbol},}$`);
            isValid = regex.test(password);
            if (isValid) validCount++;
            else {
                this.#validationMsg += `Password must have ${this.#symbol} symbol character(s). `;
            }
        }

        return validCount === this.#requirementCount;
    }
};
