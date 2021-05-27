const dns = require('dns');
const net = require('net');
const DNSLookupCache = require('./DNSLookupCache.js');
const DNSLookupPool = require('./DNSLookupPool.js');

/** Max dns lookup hostname at the same time */
const MAX_LOOKUP_SIZE = 5;
const DEFAULT_OPTIONS = {
    // DNS nameservers
    // IMPORTANT: not like rules as `/etc/resolv.conf`, it will resolved by sequence.
    servers: [],
    // IP hosts
    // Same with `/etc/hosts`. egg: '127.0.0.1 local localhost'
    hosts: [],
};
const pool = new DNSLookupPool(MAX_LOOKUP_SIZE);

/**
 * DNSLookup
 *
 * Provide an improved `.lookup()` alternatively for native `dns.lookup()`.
 *
 * Every DNSLookup instance has it's own cache, but all instances share
 * the same pool, which means the max native dns lookups will not exceed
 * pool size in the process.
 *
 * @example
 * ```javascript
 * const ns = require('node-dnslookup');
 *
 * http.reuqest({ lookup: ns.lookup });
 * ns.use(http.globalAgent); // globally
 *
 * new DNSLookup(options).lookup; // or pass some options
 * ```
 *
 * @param {object} options
 */
function DNSLookup(options = DEFAULT_OPTIONS) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const { hosts, servers } = opts;

    this.resolvers = [];
    this._cache = new DNSLookupCache();
    this._resolveHosts(hosts);
    this.lookup = this.lookup.bind(this);

    // Add dns servers
    for (let i = 0, len = servers.length; i < len; i++) {
        const resolver = new dns.Resolver();

        resolver.setServers([servers[i]]);
        this.resolvers.push(resolver);
    }
}

/**
 * Improved functionality
 *
 * @param  {...any} args same with the native `dns.lookup`
 * @link https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback
 */
function lookup(hostname, options, callback) {
    let family = 0;
    let all = false;
    let optType = typeof options;

    if (optType === 'function') {
        callback = options;
    } else if (optType === 'number') {
        family = options;
    } else if (optType === 'object') {
        family = options.family || family;
        all = options.all || all;
    }

    const nsOptions = {
        hostname,
        family,
        all,
    };
    const cache = this._cache;

    // Read from memory cache
    const result = cache.query(nsOptions);
    if (result) {
        callback(null, result.address, result.family);
        return;
    }

    // Resolve hostname by user defined nameservers
    // If the family is 0, only resolve ipv4
    this._resolveByServers(nsOptions, (err, res) => {
        if (err) {
            fallback();
            return;
        }

        callback(null, res.address, res.family);
        cache.set(res);
    });

    // Use finally dns.lookup as fallback
    function fallback() {
        const task = () => {
            if (optType === 'function') {
                dns.lookup(hostname, DICallback);
                return;
            }

            dns.lookup(hostname, options, DICallback);
        };

        // Put lookup tasks into pool, for limit the max size
        pool.submit(task);

        // Inject the code so that able to call next task
        function DICallback(err, address, realFamily) {
            callback(err, address, realFamily);

            cache.set({
                hostname,
                address,
                family: realFamily,
            });
            pool.free();
            // Remove all variables used in closure
            optType = null;
            // DICallback = null;
            // hostname = null;
            // options = null;
            // callback = null;
        }
    }
}

/**
 * Add hosts to cache
 *
 * @param {string[]} hosts
 */
function resolveHosts(hosts) {
    for (let i = 0, len = hosts.length; i < len; i++) {
        const record = hosts[i];

        if (typeof record === 'string') {
            const addresses = record.split(' ');
            const ip = addresses[0];
            const family = net.isIP(ip);

            if (family > 0) {
                for (let j = 1, lenName = addresses.length; j < lenName; j++) {
                    this._cache.set({
                        hostname: addresses[j],
                        address: ip,
                        family,
                    });
                }
            }
        }
    }
}

const RESOLVE_NO_SERVERS = 1;
const RESOLVE_TIMEOUT = 2;
const RESOLVE_FAILED = 3;
/**
 * Resolve hostname by Sequence
 *
 * Just returns the first ip in `dns.resolve4()` addresses list.
 *
 * @param {*} nsOptions
 * @param {function} callback
 */
function resolveByServers(nsOptions, callback) {
    const { hostname, family: resolveFamily } = nsOptions;
    const len = this.resolvers.length;

    if (len === 0) {
        callback(RESOLVE_NO_SERVERS);
        return;
    }

    const family = resolveFamily === 0 ? 4 : resolveFamily;
    const TIMEOUT = 3500;
    let timer;
    let completed = false;

    // Resolve by sequence
    function resolve(idx) {
        const dnsResolveCallback = (err, addresses) => {
            clearTimeout(timer);
            // Once completed, give up any resolver's result
            if (completed) return;
            if (err) {
                // Last dns server returns error, fallback
                if (idx === len - 1) {
                    completed = true;
                    callback(RESOLVE_FAILED);
                    return;
                }

                // Call next resolver
                resolve(idx + 1);
                return;
            }

            completed = true;
            callback(null, {
                hostname,
                // Return the first ip of addresses
                address: addresses[0],
                family,
            });
        };
        const resolver = this.resolvers[idx];

        // dns.resolve4()
        resolver[`resolve${family}`](hostname, dnsResolveCallback);
        // Simply set resolve timeout
        timer = setTimeout(() => {
            if (!completed) {
                resolver.cancel();
            }
        }, TIMEOUT);
    }

    resolve(0);
}

// TODO:
function flush(hostname, family) {
    // Clear all cache
    if (hostname === undefined) {
        this._cache.clear();
        return;
    }

    this._cache.remove(hostname, family);
}

DNSLookup.prototype._resolveHosts = resolveHosts;
DNSLookup.prototype._resolveByServers = resolveByServers;
DNSLookup.prototype.lookup = lookup;

module.exports = DNSLookup;
