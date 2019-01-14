'use strict';

const devices = require('./devices');
const toZigbee = require('./converters/toZigbee');
const fromZigbee = require('./converters/fromZigbee');

const byZigbeeModel = new Map();
for (const device of devices) {
    for (const zigbeeModel of device.zigbeeModel) {
        byZigbeeModel.set(zigbeeModel, device);
    }
}

module.exports = {
    devices,
    findByZigbeeModel: (model) => {
        let device = byZigbeeModel.get(model);

        if (!device) {
            device = byZigbeeModel.get(model.replace(/\0.*$/g, '').trim());
        }

        return device;
    },
    toZigbeeConverters: toZigbee,
    fromZigbeeConverters: fromZigbee,
};
