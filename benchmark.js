/**
 * Tutorial: https://github.com/nodejs/node/tree/master/benchmark
 *
 * Indicators:
 *
 * "N"         ==> run times
 * "#1"        ==> average cost time of every hostname first lookup
 * "max"       ==> maximum lookup cost time exclude the first
 * "min"       ==> minimum lookup cost time exclude the first
 * "min"       ==> average lookup cost time exclude the first
 * "faster(%)" ==> (count of cost time that less than `dns.lookup` minimum value) / total
 */
const dns = require('dns');
const ns = require('./lib/index.js');

// helpers
function promisify(fn) {
    return (hostname, opts) => new Promise((resolve, reject) => {
        fn(hostname, opts, (err, address) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(address);
        });
    });
}

const HOSTNAMES = [
    'google.com', 'www.google.com',
    'baidu.com', 'www.baidu.com',
    'ningtaostudy.cn', 'www.ningtaostudy.cn',
];
const N = 1e+4;
const BASE = 1e+6;

class Benchmark {
    constructor() {
        this.lookup = promisify(dns.lookup);
        this.nslookup = promisify(ns.lookup);
        this.marks = {
            first: BigInt(0), // "#1"
            min: BigInt(0),
            max: BigInt(0),
            avg: BigInt(0),
            thresholds: [
                1e+7, // 10ms
                1e+6, // 1ms
                1e+5, // 0.1ms
            ],
        };
        this.reports = [
            { function: 'dns.lookup' },
            { function: 'ns.lookup' },
        ];
    }

    async run() {
        console.time('Total');
        await this.lookup('localhost');
        await this.runTask(this.lookup, 0);
        await this.runTask(this.nslookup, 1);
        this.report();
        console.timeEnd('Total');
    }

    async runTask(fn, reportIndex) {
        let min = Number.MAX_SAFE_INTEGER;
        let max = Number.MIN_SAFE_INTEGER;
        const first = [];
        const hrtimes = [];

        for (let i = 0, len = HOSTNAMES.length; i < len; i++) {
            for (let j = 0; j < N; j++) {
                const ts = process.hrtime.bigint();

                // eslint-disable-next-line no-await-in-loop
                await fn(HOSTNAMES[i]);

                const costTs = process.hrtime.bigint() - ts;
                // console.log(Number(costTs)/1e6);

                if (j === 0) {
                    first.push(costTs);
                    continue;
                }
                if (costTs < min) min = costTs;
                if (costTs > max) max = costTs;
                hrtimes.push(costTs);
            }
            console.log(reportIndex, HOSTNAMES[i], '✓');
        }

        this.reports[reportIndex].min = min;
        this.reports[reportIndex].max = max;
        this.reports[reportIndex].first = Benchmark.average(first);
        this.reports[reportIndex].avg = Benchmark.average(hrtimes);
        this.reports[reportIndex].hrtimes = hrtimes;
    }

    report() {
        const { thresholds } = this.marks;
        const [lookup, nslookup] = this.reports;
        const { min } = lookup;
        const total = N * HOSTNAMES.length;
        let countFaster = 0;
        const countTsd1 = Array(thresholds.length).fill(0);
        const countTsd2 = [...countTsd1];

        // count every threshold
        for (let i = 0, len = lookup.hrtimes.length; i < len; i++) {
            const hrtime = lookup.hrtimes[i];
            const cIndex = thresholds.findIndex((t) => hrtime > t);

            if (cIndex > -1) {
                countTsd1[cIndex] += 1;
            }
        }
        for (let i = 0, len = nslookup.hrtimes.length; i < len; i++) {
            const hrtime = nslookup.hrtimes[i];
            const cIndex = thresholds.findIndex((t) => hrtime > t);

            if (hrtime < min) {
                countFaster += 1;
            }
            if (cIndex > -1) {
                countTsd2[cIndex] += 1;
            }
        }

        const thresholdMap = [countTsd1, countTsd2].map((arr) => {
            const map = {};

            for (let i = 0, len = arr.length; i < len; i++) {
                const k = `>${thresholds[i] / BASE}ms(%)`;
                const v = formatPercent(arr[i]);

                map[k] = v;
            }
            return map;
        });

        console.table([
            {
                function: 'dns.lookup',
                N,
                '#1': format(this.reports[0].first),
                max: format(this.reports[0].max),
                min: format(this.reports[0].min),
                avg: format(this.reports[0].avg),
                ...thresholdMap[0],
            },
            {
                function: 'ns.lookup',
                N,
                '#1': format(this.reports[1].first),
                max: format(this.reports[1].max),
                min: format(this.reports[1].min),
                avg: format(this.reports[1].avg),
                ...thresholdMap[1],
                'faster(%)': formatPercent(countFaster),
            },
        ]);

        function format(number) {
            return Number((Number(number) / BASE).toFixed(4));
        }
        function formatPercent(count) {
            return Number(((count / total) * 100).toFixed(4));
        }
    }

    static average(arr) {
        let sum = BigInt(0);
        const len = arr.length;

        if (len === 0) return sum;

        for (let i = 0; i < len; i++) {
            sum += arr[i];
        }

        return sum / BigInt(len);
    }
}

(new Benchmark()).run();
