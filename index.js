'use strict';

const devices = require('./devices');
const toZigbee = require('./converters/toZigbee');
const fromZigbee = require('./converters/fromZigbee');

// key: zigbeeModel, value: array of definitions (most of the times 1)
const lookup = new Map();
const definitions = [];

function arrayEquals(as, bs) {
    if (as.length !== bs.length) return false;
    for (const a of as) if (!bs.includes(a)) return false;
    return true;
}

function addToLookup(zigbeeModel, definition) {
    zigbeeModel = zigbeeModel ? zigbeeModel.toLowerCase() : null;
    if (!lookup.has(zigbeeModel)) {
        lookup.set(zigbeeModel, []);
    }

    if (!lookup.get(zigbeeModel).includes(definition)) {
        lookup.get(zigbeeModel).push(definition);
    }
}

function getFromLookup(zigbeeModel) {
    zigbeeModel = zigbeeModel ? zigbeeModel.toLowerCase() : null;
    if (lookup.has(zigbeeModel)) {
        return lookup.get(zigbeeModel);
    }

    zigbeeModel = zigbeeModel ? zigbeeModel.replace(/\0.*$/g, '').trim() : null;
    return lookup.get(zigbeeModel);
}

function addDefinition(definition) {
    definitions.push(definition);

    if (definition.hasOwnProperty('fingerprint')) {
        for (const fingerprint of definition.fingerprint) {
            addToLookup(fingerprint.modelID, definition);
        }
    }

    if (definition.hasOwnProperty('zigbeeModel')) {
        for (const zigbeeModel of definition.zigbeeModel) {
            addToLookup(zigbeeModel, definition);
        }
    }
}

for (const definition of devices) {
    addDefinition(definition);
}

function findByZigbeeModel(zigbeeModel) {
    if (!zigbeeModel) {
        return null;
    }

    const candidates = getFromLookup(zigbeeModel);
    return candidates ? candidates[0] : null;
}

function findByDevice(device) {
    if (!device) {
        return null;
    }

    const candidates = getFromLookup(device.modelID);
    if (!candidates) {
        return null;
    } else if (candidates.length === 1 && candidates[0].hasOwnProperty('zigbeeModel')) {
        return candidates[0];
    } else {
        // Multiple candidates possible, first try to match based on fingerprint, return the first matching one.
        for (const candidate of candidates) {
            if (candidate.hasOwnProperty('fingerprint')) {
                for (const fingerprint of candidate.fingerprint) {
                    if (fingerprintMatch(fingerprint, device)) {
                        return candidate;
                    }
                }
            }
        }

        // Match based on fingerprint failed, return first matching definition based on zigbeeModel
        for (const candidate of candidates) {
            if (candidate.hasOwnProperty('zigbeeModel') && candidate.zigbeeModel.includes(device.modelID)) {
                return candidate;
            }
        }
    }

    return null;
}

function fingerprintMatch(fingerprint, device) {
    let match =
        (!fingerprint.applicationVersion || device.applicationVersion === fingerprint.applicationVersion) &&
        (!fingerprint.manufacturerID || device.manufacturerID === fingerprint.manufacturerID) &&
        (!fingerprint.type || device.type === fingerprint.type) &&
        (!fingerprint.dateCode || device.dateCode === fingerprint.dateCode) &&
        (!fingerprint.hardwareVersion || device.hardwareVersion === fingerprint.hardwareVersion) &&
        (!fingerprint.manufacturerName || device.manufacturerName === fingerprint.manufacturerName) &&
        (!fingerprint.modelID || device.modelID === fingerprint.modelID) &&
        (!fingerprint.powerSource || device.powerSource === fingerprint.powerSource) &&
        (!fingerprint.softwareBuildID || device.softwareBuildID === fingerprint.softwareBuildID) &&
        (!fingerprint.stackVersion || device.stackVersion === fingerprint.stackVersion) &&
        (!fingerprint.zclVersion || device.zclVersion === fingerprint.zclVersion) &&
        (!fingerprint.endpoints ||
            arrayEquals(device.endpoints.map((e) => e.ID), fingerprint.endpoints.map((e) => e.ID)));

    if (match && fingerprint.endpoints) {
        for (const fingerprintEndpoint of fingerprint.endpoints) {
            const deviceEndpoint = device.getEndpoint(fingerprintEndpoint.ID);
            match = match &&
                (!fingerprintEndpoint.deviceID || deviceEndpoint.deviceID === fingerprintEndpoint.deviceID) &&
                (!fingerprintEndpoint.profileID || deviceEndpoint.profileID === fingerprintEndpoint.profileID) &&
                (!fingerprintEndpoint.inputClusters ||
                        arrayEquals(deviceEndpoint.inputClusters, fingerprintEndpoint.inputClusters)) &&
                (!fingerprintEndpoint.outputClusters ||
                        arrayEquals(deviceEndpoint.outputClusters, fingerprintEndpoint.outputClusters));
        }
    }

    return match;
}

module.exports = {
    devices: definitions,
    findByZigbeeModel, // Legacy method, use findByDevice instead.
    findByDevice,
    toZigbeeConverters: toZigbee,
    fromZigbeeConverters: fromZigbee,
    addDeviceDefinition: addDefinition,
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
