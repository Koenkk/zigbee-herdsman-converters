import * as configureKey from './lib/configureKey';
import * as exposes from './lib/exposes';
import toZigbee from './converters/toZigbee';
import fromZigbee from './converters/fromZigbee';
import assert from 'assert';
import allDefinitions from './devices';
import { Definition, Fingerprint, Zh, OnEventData, OnEventType } from './lib/types';

// key: zigbeeModel, value: array of definitions (most of the times 1)
const lookup = new Map();
const definitions: Definition[] = [];

function arrayEquals<T>(as: T[], bs: T[]) {
    if (as.length !== bs.length) return false;
    for (const a of as) if (!bs.includes(a)) return false;
    return true;
}

function addToLookup(zigbeeModel: string, definition: Definition) {
    zigbeeModel = zigbeeModel ? zigbeeModel.toLowerCase() : null;
    if (!lookup.has(zigbeeModel)) {
        lookup.set(zigbeeModel, []);
    }

    if (!lookup.get(zigbeeModel).includes(definition)) {
        lookup.get(zigbeeModel).splice(0, 0, definition);
    }
}

function getFromLookup(zigbeeModel: string) {
    zigbeeModel = zigbeeModel ? zigbeeModel.toLowerCase() : null;
    if (lookup.has(zigbeeModel)) {
        return lookup.get(zigbeeModel);
    }

    zigbeeModel = zigbeeModel ? zigbeeModel.replace(/\0(.|\n)*$/g, '').trim() : null;
    return lookup.get(zigbeeModel);
}

const converterRequiredFields = {
    model: 'String',
    vendor: 'String',
    description: 'String',
    fromZigbee: 'Array',
    toZigbee: 'Array',
};

function validateDefinition(definition: Definition) {
    for (const [field, expectedType] of Object.entries(converterRequiredFields)) {
        // @ts-expect-error
        assert.notStrictEqual(null, definition[field], `Converter field ${field} is null`);
        // @ts-expect-error
        assert.notStrictEqual(undefined, definition[field], `Converter field ${field} is undefined`);
        // @ts-expect-error
        const msg = `Converter field ${field} expected type doenst match to ${definition[field]}`;
        // @ts-expect-error
        assert.strictEqual(definition[field].constructor.name, expectedType, msg);
    }
    assert.ok(Array.isArray(definition.exposes) || typeof definition.exposes === 'function', 'Exposes incorrect');
}

function addDefinition(definition: Definition) {
    if ('extend' in definition) {
        if (Array.isArray(definition.extend)) {
            // Modern extend, merges properties, e.g. when both extend and definition has toZigbee, toZigbee will be combined
            let {extend, toZigbee, fromZigbee, exposes, meta, configure, onEvent, ota, ...definitionWithoutExtend} = definition;
            if (typeof exposes === 'function') {
                assert.fail(`'${definition.model}' has function exposes which is not allowed`);
            }

            toZigbee = [...toZigbee ?? []];
            fromZigbee = [...fromZigbee ?? []];
            exposes = [...exposes ?? []];

            for (const ext of extend) {
                if (!ext.isModernExtend) {
                    assert.fail(`'${definition.model}' has legacy extend in modern extend`);
                }
                if (ext.toZigbee) toZigbee.push(...ext.toZigbee);
                if (ext.fromZigbee) fromZigbee.push(...ext.fromZigbee);
                if (ext.exposes) exposes.push(...ext.exposes);
                if (ext.meta) meta = {...ext.meta, ...meta};
                if (ext.configure) {
                    if (configure) {
                        assert.fail(`'${definition.model}' has multiple 'configure', this is not allowed`);
                    }
                    configure = ext.configure;
                }
                if (ext.ota) {
                    if (ota) {
                        assert.fail(`'${definition.model}' has multiple 'ota', this is not allowed`);
                    }
                    ota = ext.ota;
                }
                if (ext.onEvent) {
                    if (onEvent) {
                        assert.fail(`'${definition.model}' has multiple 'onEvent', this is not allowed`);
                    }
                    onEvent = ext.onEvent;
                }
            }
            definition = {toZigbee, fromZigbee, exposes, meta, configure, onEvent, ota, ...definitionWithoutExtend};
        } else {
            // Legacy extend, overrides properties, e.g. when both extend and definition has toZigbee, definition toZigbee will be used
            const {extend, ...definitionWithoutExtend} = definition;

            if (extend.isModernExtend) {
                assert.fail(`'${definition.model}' has modern extend in legacy extend`);
            }
            if (extend.configure && definition.configure) {
                assert.fail(`'${definition.model}' has configure in extend and definition, this is not allowed`);
            }
            if (extend.ota && definition.ota) {
                assert.fail(`'${definition.model}' has OTA in extend and definition, this is not allowed`);
            }
            if (extend.onEvent && definition.onEvent) {
                assert.fail(`'${definition.model}' has onEvent in extend and definition, this is not allowed`);
            }
            if (typeof definition.exposes === 'function') {
                assert.fail(`'${definition.model}' has function exposes which is not allowed`);
            }
    
            const toZigbee = [...definition.toZigbee ?? [], ...extend.toZigbee];
            const fromZigbee = [...definition.fromZigbee ?? [], ...extend.fromZigbee];
            const exposes = [...definition.exposes ?? [], ...extend.exposes];
            const meta = extend.meta || definitionWithoutExtend.meta ? {
                ...extend.meta,
                ...definitionWithoutExtend.meta,
            } : undefined;
    
            definition = {...extend, toZigbee, fromZigbee, exposes, meta, ...definitionWithoutExtend};
        }
    }

    definition.toZigbee.push(
        toZigbee.scene_store, toZigbee.scene_recall, toZigbee.scene_add, toZigbee.scene_remove, toZigbee.scene_remove_all, 
        toZigbee.scene_rename, toZigbee.read, toZigbee.write,
        toZigbee.command, toZigbee.factory_reset);

    if (definition.exposes && Array.isArray(definition.exposes) && !definition.exposes.find((e) => e.name === 'linkquality')) {
        definition.exposes = definition.exposes.concat([exposes.presets.linkquality()]);
    }

    validateDefinition(definition);
    definitions.splice(0, 0, definition);

    if (!definition.options) definition.options = [];
    const optionKeys = definition.options.map((o) => o.name);
    for (const converter of [...definition.toZigbee, ...definition.fromZigbee]) {
        if (converter.options) {
            const options = typeof converter.options === 'function' ? converter.options(definition) : converter.options;
            for (const option of options) {
                if (!optionKeys.includes(option.name)) {
                    definition.options.push(option);
                    optionKeys.push(option.name);
                }
            }
        }
    }

    if ('fingerprint' in definition) {
        for (const fingerprint of definition.fingerprint) {
            addToLookup(fingerprint.modelID, definition);
        }
    }

    if ('zigbeeModel' in definition) {
        for (const zigbeeModel of definition.zigbeeModel) {
            addToLookup(zigbeeModel, definition);
        }
    }
}

for (const definition of allDefinitions) {
    addDefinition(definition);
}

function findByZigbeeModel(zigbeeModel: string) {
    if (!zigbeeModel) {
        return null;
    }

    const candidates = getFromLookup(zigbeeModel);
    // Multiple candidates possible, to use external converters in priority, use last one.
    return candidates ? candidates[candidates.length-1] : null;
}

function findByDevice(device: Zh.Device) {
    let definition = findDefinition(device);
    if (definition && definition.whiteLabel) {
        const match = definition.whiteLabel.find((w) => 'fingerprint' in w && w.fingerprint.find((f) => isFingerprintMatch(f, device)));
        if (match) {
            definition = {
                ...definition,
                model: match.model,
                vendor: match.vendor,
                description: match.description || definition.description,
            };
        }
    }
    return definition;
}

function findDefinition(device: Zh.Device): Definition {
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
        const fingerprintMatch: {priority: number, definition: Definition} = {priority: null, definition: null};
        for (const candidate of candidates) {
            if (candidate.hasOwnProperty('fingerprint')) {
                for (const fingerprint of candidate.fingerprint) {
                    const priority = fingerprint.hasOwnProperty('priority') ? fingerprint.priority : 0;
                    if (isFingerprintMatch(fingerprint, device) && (!fingerprintMatch.definition || priority > fingerprintMatch.priority)) {
                        fingerprintMatch.definition = candidate;
                        fingerprintMatch.priority = priority;
                    }
                }
            }
        }

        if (fingerprintMatch.definition) {
            return fingerprintMatch.definition;
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

function isFingerprintMatch(fingerprint: Fingerprint, device: Zh.Device) {
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

function findByModel(model: string){
    /*
    Search device description by definition model name.
    Useful when redefining, expanding device descriptions in external converters.
    */
    model = model.toLowerCase();
    return definitions.find((definition) => {
        const whiteLabelMatch = definition.whiteLabel && definition.whiteLabel.find((dd) => dd.model.toLowerCase() === model);
        return definition.model.toLowerCase() == model || whiteLabelMatch;
    });
}

module.exports = {
    getConfigureKey: configureKey.getConfigureKey,
    devices: definitions,
    exposes,
    definitions,
    findByZigbeeModel, // Legacy method, use findByDevice instead.
    findByDevice,
    findByModel,
    toZigbeeConverters: toZigbee,
    fromZigbeeConverters: fromZigbee,
    addDeviceDefinition: addDefinition,
    // Can be used to handle events for devices which are not fully paired yet (no modelID).
    // Example usecase: https://github.com/Koenkk/zigbee2mqtt/issues/2399#issuecomment-570583325
    onEvent: async (type: OnEventType, data: OnEventData, device: Zh.Device) => {
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
        // Aqara feeder C1 polls the time during the interview, need to send back the local time instead of the UTC.
        // The device.definition has not yet been set - therefore the device.definition.onEvent method does not work.
        if (type === 'message' && data.type === 'read' && data.cluster === 'genTime' &&
            device.modelID === 'aqara.feeder.acn001') {
            device.skipTimeResponse = true;
            const oneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();
            const secondsUTC = Math.round(((new Date()).getTime() - oneJanuary2000) / 1000);
            const secondsLocal = secondsUTC - (new Date()).getTimezoneOffset() * 60;
            await device.getEndpoint(1).readResponse('genTime', data.meta.zclTransactionSequenceNumber, {time: secondsLocal});
        }
    },
};
