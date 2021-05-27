const { expect } = require('chai');
const http = require('http');
const ns = require('../lib/index.js');

describe('index', () => {
    it('use non-instance of http.Agent', () => {
        expect(() => ns.use(1)).to.throw();
    });

    it('apply `.lookup()` to agent', () => {
        const myAgent = new http.Agent();
        const options = {};

        myAgent.createConnection = (opts) => opts;
        ns.use(myAgent);
        myAgent.createConnection(options);

        expect(options).to.have.property('lookup');
    });
});
