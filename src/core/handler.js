module.exports = function handler(fn) {
    return (req, res) => {
        console.log(`${this.constructor.name}.handler(fn)((req, res) -> ${fn.name})`);

        return new Promise((resolve, reject) => {
            try {
                var results = fn(req, res);
                resolve(results);
            } catch (e) {
                reject(e);
            }
        })
            .then((data) => {
                res.send({
                    success: true,
                    data: data || []
                });
            })
            .catch((error) => {
                console.error(error);
                res.status(500).send({
                    success: false,
                    error: error.message
                });
            });
    };
};
