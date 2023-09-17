const os = require('os');

class Network {

    static regex = {
        _0_TO_255_: `(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)`
    }

    static getHostname() {
        return os.hostname();
    }

    static getHostInterface() {
        const interfaceCategories = ['en', 'eth'];
        const networkInterfaces = os.networkInterfaces();
        const addresses = [];

        for (const [category, interfaces] of Object.entries(networkInterfaces)) {

            const matchesCategory = interfaceCategories
                .filter(interfaceCategoryPrefix => category.startsWith(interfaceCategoryPrefix))
                .length ? true : false;

            if (!matchesCategory) continue;

            const [networkInterface] = interfaces
                .filter(networkInterface => String(networkInterface.family).endsWith('4'));

            if (networkInterface) {
                addresses.push(networkInterface);
            }
        }
        return addresses[addresses.length - 1];
    }

    static getHostAddress() {
        return this.getHostInterface()?.address;
    }

    static getHostNetmask() {
        return this.getHostInterface()?.netmask;
    }

    static getHostCidr() {
        return this.getHostInterface()?.cidr;
    }

    static getAddressOctets(address) {
        const {_0_TO_255_} = this.regex;
        const results = new RegExp(`^${_0_TO_255_}\.${_0_TO_255_}\.${_0_TO_255_}\.${_0_TO_255_}$`, 'gi').exec(address);
        const octets = [results[1], results[2], results[3], results[4]];
        return octets;
    }

    static getNetwork(mask) {
        const octets = this.getAddressOctets(mask);
        const network = octets.filter(octet => Number(octet) > 0).join('.');
        return network;
    }

    static getNetworkHost(mask) {
        const octets = this.getAddressOctets(mask);
        const host = octets.filter(octet => Number(octet) < 255).join('.');
        return host;
    }

    static getBinaryAddress(address) {
        const binaries = [];
        const octets = this.getAddressOctets(address);
        octets.forEach(c => {
            const binary = Number(c).toString(2).padStart(8, '0');
            binaries.push(binary);
        });
        return binaries.join('.');
    }
}
module.exports = Network;
