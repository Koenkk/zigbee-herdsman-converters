// Execute in root with: node scripts/splitDevices.js
const fs = require('fs');

const devices = fs.readFileSync('devices.js', 'utf-8');
fs.rmdirSync('devices', {recursive: true});
fs.mkdirSync('devices');

const vendorStart = '    // ';

let current = null;

const includes = [
    'const assert = require(\'assert\');',
    'const fz = {...require(\'../converters/fromZigbee\'), legacy: require(\'../lib/legacy\').fromZigbee};',
    'const tz = require(\'../converters/toZigbee\');',
    'const globalStore = require(\'../lib/store\');',
    'const ota = require(\'../lib/ota\');',
    'const tuya = require(\'../lib/tuya\');',
    'const ikea = require(\'../lib/ikea\');',
    'const constants = require(\'../lib/constants\');',
    'const livolo = require(\'../lib/livolo\');',
    'const legrand = require(\'../lib/legrand\');',
    'const xiaomi = require(\'../lib/xiaomi\');',
    'const reporting = require(\'../lib/reporting\');',
    'const extend = require(\'../lib/extend\');',
    'const utils = require(\'../lib/utils\');',
    'const e = exposes.presets;',
    'const ea = exposes.access;',
];

const writeVendor = () => {
    current.lines.shift();
    let content = `
${includes.map((i) => {
        const include = i.split(' ')[1];
        return current.lines.find((l) => l.includes(`${include}.`)) ? i : null;
    }).filter((l) => l).join('\n')}

module.exports = [
${current.lines.join('\n')}
];`.trim() + '\n';

    if (content.includes('exposes.')) {
        content = `const exposes = require('../lib/exposes');\n` + content;
    }

    fs.writeFileSync(`devices/${current.vendorFile}.js`, content);
};

const newDevices = [];
const lines = devices.split('\n');
for (const line of lines) {
    if (line.startsWith(vendorStart)) {
        if (current) {
            writeVendor();
            newDevices.push(`    ...require('./devices/${current.vendorFile}'),`);
        }

        const vendor = line.split(vendorStart)[1];
        const vendorFile = vendor.toLowerCase().split(' ').join('_').split(',').join('')
            .split('(').join('').split('/').join('').split(')').join('');
        current = {vendor, lines: [line], start: lines.indexOf(line), vendorFile};
    } else if (current) {
        current.lines.push(line);
    } else {
        newDevices.push(line);
    }
}

newDevices.push(...current.lines);

fs.writeFileSync('devices.js', newDevices.join('\n'));
