'use strict';

const devices = require('./devices');
const toZigbee = require('./converters/toZigbee');
const fromZigbee = require('./converters/fromZigbee');

const byZigbeeModel = new Map();
for (const device of devices) {
    for (const zigbeeModel of device.zigbeeModel) {
        byZigbeeModel.set(zigbeeModel.toLowerCase(), device);
    }
}

module.exports = {
    devices,
    findByZigbeeModel: (model) => {
        if (!model) {
            return null;
        }

        model = model.toLowerCase();

        let device = byZigbeeModel.get(model);

        if (!device) {
            device = byZigbeeModel.get(model.replace(/\0.*$/g, '').trim());
        }

        return device;
    },
    toZigbeeConverters: toZigbee,
    fromZigbeeConverters: fromZigbee,
    // Can be used to handle events for devices which are not fully paired yet (no modelID).
    // Example usecase: https://github.com/Koenkk/zigbee2mqtt/issues/2399#issuecomment-570583325
    onEvent: async (type, data, device) => {
    },
};
