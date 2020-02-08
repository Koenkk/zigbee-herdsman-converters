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
        // support Legrand security protocol
        // when pairing, a powered device will send a read frame to every device on the network
        // it expects at least one answer. The payload contains the number of seconds
        // since when the device is powered. If the value is too high, it will leave & not pair
        // 23 works, 200 doesn't
        if (data.meta && data.meta.manufacturerCode === 0x1021 && type === 'message' && data.type === 'read' &&
            data.cluster === 'genBasic' && data.data && data.data.includes(61440)) {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
            const payload = {0xf00: {value: 23, type: 35}};
            await endpoint.readResponse('genBasic', data.meta.zclTransactionSequenceNumber, payload, options);
        }
    },
};
