// Execute in root with: node scripts/splitDevices.js
const fs = require('fs');

const devices = fs.readFileSync('devices.js', 'utf-8');
fs.rmdirSync('devices', {recursive: true});
fs.mkdirSync('devices');

const vendorStart = '    // ';

let current = null;

const writeVendor = () => {
    const content = `
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const ota = require('../lib/ota');
const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');
const ikea = require('../lib/ikea');
const constants = require('../lib/constants');
const livolo = require('../lib/livolo');
const legrand = require('../lib/legrand');
const xiaomi = require('../lib/xiaomi');
const {repInterval, defaultBindGroup, OneJanuary2000} = require('../lib/constants');
const reporting = require('../lib/reporting');
const preset = require('../lib/presets');

const e = exposes.presets;
const ea = exposes.access;

module.exports = [
${current.lines.join('\n')}
]`.trim();

    fs.writeFileSync(`devices/${current.vendorFile}.js`, content);
};

const newDevices = [];
const lines = devices.split('\n');
for (const line of lines) {
    if (line.startsWith(vendorStart)) {
        if (current && current.lines.length > 100) {
            writeVendor();
            newDevices.push(`    // ${current.vendor}`);
            newDevices.push(`    ...require('./devices/${current.vendorFile}'),`);
            newDevices.push('');
        } else if (current) {
            newDevices.push(...current.lines);
        }

        const vendor = line.split(vendorStart)[1];
        const vendorFile = vendor.toLowerCase().split(' ').join('_').split(',').join('').split('(').join('').split(')').join('');
        current = {vendor, lines: [line], start: lines.indexOf(line), vendorFile};
    } else if (current) {
        current.lines.push(line);
    } else {
        newDevices.push(line);
    }
}

newDevices.push(...current.lines);

fs.writeFileSync('devices.js', newDevices.join('\n'));
