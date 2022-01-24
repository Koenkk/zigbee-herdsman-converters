'use strict';

const configureKey = require('./lib/configureKey');
const exposes = require('./lib/exposes');
const toZigbee = require('./converters/toZigbee');
const fromZigbee = require('./converters/fromZigbee');
const assert = require('assert');
const tz = require('./converters/toZigbee');
const fs = require('fs');
const path = require('path');

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
        lookup.get(zigbeeModel).splice(0, 0, definition);
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

const converterRequiredFields = {
    model: 'String',
    vendor: 'String',
    description: 'String',
    fromZigbee: 'Array',
    toZigbee: 'Array',
};

function validateDefinition(definition) {
    for (const [field, expectedType] of Object.entries(converterRequiredFields)) {
        assert.notStrictEqual(null, definition[field], `Converter field ${field} is null`);
        assert.notStrictEqual(undefined, definition[field], `Converter field ${field} is undefined`);
        const msg = `Converter field ${field} expected type doenst match to ${definition[field]}`;
        assert.strictEqual(definition[field].constructor.name, expectedType, msg);
    }
    assert.ok(Array.isArray(definition.exposes) || typeof definition.exposes === 'function', 'Exposes incorrect');
}

function addDefinition(definition) {
    const {extend, ...definitionWithoutExtend} = definition;
    if (extend) {
        if (extend.hasOwnProperty('configure') && definition.hasOwnProperty('configure')) {
            console.log(`'${definition.model}' has configure in extend and device, this is not allowed`);
        }

        definition = {
            ...extend,
            ...definitionWithoutExtend,
            meta: extend.meta || definitionWithoutExtend.meta ? {
                ...extend.meta,
                ...definitionWithoutExtend.meta,
            } : undefined,
        };
    }

    definition.toZigbee.push(tz.scene_store, tz.scene_recall, tz.scene_add, tz.scene_remove, tz.scene_remove_all, tz.read, tz.write);

    if (definition.exposes && Array.isArray(definition.exposes) && !definition.exposes.find((e) => e.name === 'linkquality')) {
        definition.exposes = definition.exposes.concat([exposes.presets.linkquality()]);
    }

    validateDefinition(definition);
    definitions.splice(0, 0, definition);

    if (!definition.options) definition.options = [];
    const optionKeys = definition.options.map((o) => o.name);
    for (const converter of [...definition.toZigbee, ...definition.fromZigbee]) {
        if (converter.options) {
            for (const option of converter.options) {
                if (!optionKeys.includes(option.name)) {
                    definition.options.push(option);
                    optionKeys.push(option.name);
                }
            }
        }
    }

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

// Load all definitions from devices folder
const devicesPath = path.join(__dirname, 'devices');
for (const file of fs.readdirSync(devicesPath)) {
    for (const definition of require(path.join(devicesPath, file))) {
        addDefinition(definition);
    }
}

function findByZigbeeModel(zigbeeModel) {
    if (!zigbeeModel) {
        return null;
    }

    const candidates = getFromLookup(zigbeeModel);
    // Multiple candidates possible, to use external converters in priority, use last one.
    return candidates ? candidates[candidates.length-1] : null;
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
        // First try to match based on fingerprint, return the first matching one.
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
        (!fingerprint.ieeeAddr || device.ieeeAddr.match(fingerprint.ieeeAddr)) &&
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
    getConfigureKey: configureKey.getConfigureKey,
    devices: definitions,
    exposes,
    definitions,
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
