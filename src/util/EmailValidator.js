// Purely a regex check now but could send confirmation emails.
module.exports = class EmailValidator {
    #email;

    constructor(email) {
        if (email) this.#email = email;
    }

    isValid(email) {
        if (!email) return false;

        let regex = RegExp(
            `^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$`
        );
        return regex.test(email);
    }
};
