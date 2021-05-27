/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const DNSLookupCache = require('../lib/DNSLookupCache.js');

// fixtures
const cache = new DNSLookupCache();
const dnsInfo = [{
    hostname: 'a.com',
    family: 4,
    address: '0.0.0.0',
}, {
    hostname: 'b.com',
    family: 6,
    address: '::1',
}, {
    hostname: 'c.com',
    address: ['0.0.0.0', '::1'],
}];

describe('DNSLookupCache', () => {
    before(() => {
        dnsInfo.forEach((info) => cache.set(info));
    });

    it('no cache', () => {
        const emptyCache = new DNSLookupCache();
        const result = emptyCache.query({ hostname: 'abc' });
        const result1 = cache.query({ hostname: 'abc.com' });

        expect(result).to.be.false;
        expect(result1).to.be.false;
    });

    it('query cache correctly', () => {
        const queryOpts = [{
            hostname: 'a.com',
            family: 4,
        }, {
            hostname: 'c.com',
            all: true,
        }, {
            hostname: 'a.com',
            family: 0,
        }, {
            hostname: 'b.com',
            family: 0,
        }];
        const results = [{
            family: 4,
            address: dnsInfo[0].address,
        }, {
            address: dnsInfo[2].address,
        }, {
            family: 4,
            address: dnsInfo[0].address,
        }, {
            family: 6,
            address: dnsInfo[1].address,
        }];

        for (let i = 0, len = queryOpts.length; i < len; i++) {
            const res = cache.query(queryOpts[i]);

            expect(res).to.deep.equals(results[i]);
        }

        const noResult = cache.query({ hostname: 'b.com', family: 4 });

        expect(noResult).to.be.false;
    });
});
