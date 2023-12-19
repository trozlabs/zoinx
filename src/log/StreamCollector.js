
module.exports = function StreamCollector({ name, ws, onWrite=(data)=>{} }) {
    if (new.target === undefined) {
        throw new Error(`StreamCollector should be called using new StreamCollector`);
    }

    // private
    const ansiColorRegex = /\x1B\[[0-9;]*m/g;
    const ogWrite = ws.write;
    const ogWs = ws;

    // public
    this.name = name;
    this.onWrite = onWrite;
    this.enable = () => {
        ogWs.write = override;
    }
    this.disable = () => {
        ogWs.write = ogWrite;
    }
    const override = (chunk, encoding, callback) => {
        let timestamp = new Date();
        let raw = chunk.toString();
        let plain = raw.replace(ansiColorRegex, '');

        ogWrite.apply(ogWs, [chunk, encoding, callback]);

        this.disable();
        this.onWrite({ timestamp, name, raw, plain });
        this.enable();
    }

    this.enable();

    return this;
}
