'use strict';

const devices = require('./devices');
const toZigbee = require('./converters/toZigbee');
const fromZigbee = require('./converters/fromZigbee');

const byZigbeeModel = new Map();
const withFingerprint = [];

function arrayEquals(as, bs) {
    if (as.length !== bs.length) return false;
    for (const a of as) if (!bs.includes(a)) return false;
    return true;
}

for (const device of devices) {
    if (device.hasOwnProperty('fingerprint')) {
        withFingerprint.push(device);
    } else {
        for (const zigbeeModel of device.zigbeeModel) {
            byZigbeeModel.set(zigbeeModel.toLowerCase(), device);
        }
    }
}

function findByZigbeeModel(model) {
    if (!model) {
        return null;
    }

    model = model.toLowerCase();

    let definition = byZigbeeModel.get(model);

    if (!definition) {
        definition = byZigbeeModel.get(model.replace(/\0.*$/g, '').trim());
    }

    return definition;
}

function findByDevice(device) {
    let definition = findByZigbeeModel(device.modelID);

    if (!definition) {
        // Find by fingerprint
        loop:
        for (const definitionWithFingerprint of withFingerprint) {
            for (const fingerprint of definitionWithFingerprint.fingerprint) {
                if (fingerprintMatch(fingerprint, device)) {
                    definition = definitionWithFingerprint;
                    break loop;
                }
            }
        }
    }

    return definition;
}

function fingerprintMatch(fingerprint, device) {
    let match =
        device.applicationVersion === fingerprint.applicationVersion &&
        device.manufacturerID === fingerprint.manufacturerID &&
        device.type === fingerprint.type &&
        device.dateCode === fingerprint.dateCode &&
        device.hardwareVersion === fingerprint.hardwareVersion &&
        device.manufacturerName === fingerprint.manufacturerName &&
        device.modelID === fingerprint.modelID &&
        device.powerSource === fingerprint.powerSource &&
        device.softwareBuildID === fingerprint.softwareBuildID &&
        device.stackVersion === fingerprint.stackVersion &&
        device.stackVersion === fingerprint.stackVersion &&
        device.zclVersion === fingerprint.zclVersion &&
        arrayEquals(device.endpoints.map((e) => e.ID), fingerprint.endpoints.map((e) => e.ID));

    if (match) {
        for (const fingerprintEndpoint of fingerprint.endpoints) {
            const deviceEndpoint = device.getEndpoint(fingerprintEndpoint.ID);
            match = match &&
                deviceEndpoint.deviceID === fingerprintEndpoint.deviceID &&
                deviceEndpoint.profileID === fingerprintEndpoint.profileID &&
                arrayEquals(deviceEndpoint.inputClusters, fingerprintEndpoint.inputClusters) &&
                arrayEquals(deviceEndpoint.outputClusters, fingerprintEndpoint.outputClusters);
        }
    }

    return match;
}

module.exports = {
    devices,
    findByZigbeeModel,
    findByDevice,
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
