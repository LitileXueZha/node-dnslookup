const http = require('http');
const DNSLookup = require('./DNSLookup.js');

/**
 * Easily apply DNSLookup to `agent`
 *
 * @param {http.Agent} agent
 * @param {object?} options DNSLookup options
 */
function use(agent, options) {
    if (!(agent instanceof http.Agent)) {
        throw new Error('DNSLookup(use): Not an instance of http.Agent');
    }

    const ns = new DNSLookup(options);
    const { createConnection } = agent;

    // Monkey patch
    agent.createConnection = (opts, cb) => {
        // INFO:
        // Is there make sense for handle user/other lookup? Wait some thinks.
        // ns.handle(opts.lookup);

        // Rebind on agent options
        opts.lookup = ns.lookup;
        return createConnection.call(agent, opts, cb);
    };
}

module.exports = {
    lookup: new DNSLookup().lookup,
    use,
    DNSLookup,
};
