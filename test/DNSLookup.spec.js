/* eslint-disable no-return-assign */
const { expect } = require('chai');
const DNSLookup = require('../lib/DNSLookup.js');

describe('DNSLookup', () => {
    it('lookup by local hosts', async () => {
        const hosts = [
            '1.1.1.1 a.com www.a.com',
            '23.52.12.23 b.com m.b.com',
            '2001:db8:2de::e13 ipv6.com',
            '127.001 foo bar',
        ];
        const result = {
            'a.com': { address: '1.1.1.1', family: 4 },
            'm.b.com': { address: '23.52.12.23', family: 4 },
            'ipv6.com': { address: '2001:db8:2de::e13', family: 6 },
        };
        const ns = new DNSLookup({ hosts });
        const lookup = promisify(ns.lookup);
        const lookupPromises = Object.keys(result).map((host) => lookup(host));

        const res = await Promise.all(lookupPromises);

        Object.keys(result).forEach((hostname, i) => {
            expect(res[i]).to.deep.equals(result[hostname]);
        });
    });

    it('lookup by DNS servers', async function () {
        const servers = ['127.0.0.1', '8.8.8.8'];
        const ns = new DNSLookup({ servers });
        const lookup = promisify(ns.lookup);

        const res = await lookup('google.com');
        const cachedRes = await lookup('google.com');

        this.timeout(0);
        expect(res).to.have.property('address');
        expect(res.family).to.equals(4);
        expect(cachedRes.address).to.equals(res.address);

        const resV6 = await lookup('ipv6.google.com', 6);

        expect(resV6.family).to.equals(6);
    });

    it('native dns.lookup() call', async () => {
        const ns = new DNSLookup();
        const lookup = promisify(ns.lookup);

        const res = await lookup('google.com');
        const resAll = await lookup('google.com', { all: true });

        expect(res).to.have.property('address');
        // res = await lookup('ipv6.google.com', 6);
        // expect(res.family).to.equals(6);
        expect(resAll.address).to.be.an('array');

        const times = 6;
        const lookupPromises = Array(times).fill(lookup('google.com', { family: 4 }));
        const cachedRes = await Promise.all(lookupPromises);
        const cachedAddr = cachedRes.map(({ address }) => address);

        expect(cachedAddr).to.deep.equals(Array(times).fill(res.address));
    });

    it('some exceptions(can be ignored)', async function () {
        const timeoutNS = new DNSLookup({ servers: ['8.8.8.80', '8.8.8.8'] });
        const lookup = promisify(timeoutNS.lookup);

        this.timeout(0);
        await lookup('localhost');
        await lookup('ipv6.google.com', 6); // locally network may causes error
        await lookup(111, 222, 33).catch(() => {});
    });
});

// helpers
function promisify(fn) {
    return (...args) => new Promise((resolve, reject) => {
        fn.call(this, ...args, (err, address, family) => {
            if (err) {
                reject(err);
            }

            const o = { address };

            if (family) o.family = family;
            resolve(o);
        });
    });
}
