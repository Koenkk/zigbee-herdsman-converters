'use strict';

const devices = require('./devices');
const toZigbee = require('./converters/toZigbee');
const fromZigbee = require('./converters/fromZigbee');

module.exports = {
    devices: devices,
    findByZigbeeModel: (model) => devices.find((d) => d.zigbeeModel.includes(model)),
    toZigbeeConverters: toZigbee,
    fromZigbeeConverters: fromZigbee,
};
