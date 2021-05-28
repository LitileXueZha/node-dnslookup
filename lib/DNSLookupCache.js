/**
 * Simple cache of dns info
 *
 * Storage in machine memory; Use `Map` datastructure
 */
class DNSLookupCache {
    constructor() {
        this.list = new Map();
    }

    set(dnsInfo) {
        const { hostname, address, family } = dnsInfo;
        let cache = this.list.get(hostname);

        // Add a new dns to cache
        if (!cache) {
            cache = new CacheUnit(hostname);
            this.list.set(hostname, cache);
        }

        if (address instanceof Array) {
            cache.all = address;
        } else {
            cache[family] = address;
        }
    }

    query(nsOptions) {
        const { hostname, family, all } = nsOptions;
        const cache = this.list.get(hostname);

        if (cache) {
            if (all) {
                if (cache.all) {
                    return { address: cache.all };
                }
                return false;
            }

            if (family === 0) {
                if (cache[4]) {
                    return { address: cache[4], family: 4 };
                }
                if (cache[6]) {
                    return { address: cache[6], family: 6 };
                }
                return false;
            }

            if (cache[family]) {
                return { address: cache[family], family };
            }
        }

        // Not found
        return false;
    }
}

function CacheUnit(id) {
    this.id = id; // hostname
    this[4] = false; // ipv4
    this[6] = false; // ipv6
    this.all = false; // all ip addresses
}

module.exports = DNSLookupCache;
