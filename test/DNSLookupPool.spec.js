/* eslint-disable no-return-assign */
const { expect } = require('chai');
const DNSLookupPool = require('../lib/DNSLookupPool.js');

describe('DNSLookupPool', () => {
    it('run tasks in fixed pool size', () => {
        const size = 3;
        const pool = new DNSLookupPool(size);
        let i = 0;
        const task = () => i++;

        for (let j = 0; j < size * 2; j++) {
            pool.submit(task);
        }

        expect(i).to.equals(3);
    });

    it('run next task through free pool', () => {
        const pool = new DNSLookupPool(1);
        let i = 1;
        const add = () => i += 1;
        const multiply = () => i *= 2;

        pool.submit(add);
        pool.submit(multiply);
        pool.submit(add);
        pool.submit(add);
        pool.free();
        expect(i).to.equals(4);
        pool.free();
        expect(i).to.equals(5);
        pool.free();
        expect(i).to.equals(6);
        // eslint-disable-next-line
        expect(pool.free()).to.be.false;
    });

    it('callbackify free pool', () => {
        const pool = new DNSLookupPool(2);
        let i = 0;
        const task = () => {
            i += 1;
            pool.free();
        };

        pool.submit(task);
        pool.submit(task);
        pool.submit(task);
        pool.submit(task);
        expect(i).to.equals(4);
    });
});
