# node-dnslookup

Improve your dns lookup in NodeJS, more customizable.

#### Features

+ DNS cache in memory
+ Local hosts map like `/etc/hosts`
+ Use specific DNS servers

## Usage

Install via npm.

```shell
npm install --save node-dnslookup
```

Quck examples:

```javascript
const ns = require('node-dnslookup');

https.request('example.org', {
    lookup: ns.lookup,
});

// Apply to all requests
ns.use(https.globalAgent);

// With options
new ns.DNSLookup(options).lookup
// Or
ns.use(agent, options);
```

Options table:

|property|description|default|example|
|-|-|-|-|
|hosts|self-defined local hosts|`[]`|`['127.0.0.1 local localhost', '::1 ipv6.local']`|
|servers|DNS servers. Useful for private network|`[]`|`['8.8.8.8']`|

## More

Inspired by `cacheable-lookup`; Related post: [Fixing DNS in Node.js](https://httptoolkit.tech/blog/configuring-nodejs-dns/).

#### Reason

The native [`dns.lookup`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) is implemented as a synchronous call on libuv's threadpool. So when you have a lot of network requests in short time, the process may be blocked becauseof DNS lookups, even causes itself or other unrelated node scripts hang up and be a "zombie" process.

> No benchmark data proves better performance in production, but it theoretically does. It's not recommanded if no problems come with you.

<!-- In my case, there is a spider script that makes lot of https request, run long time with loops, on 1vCore 2G cloud server. It always hang up after several hours, finally this resolve my problem. -->
