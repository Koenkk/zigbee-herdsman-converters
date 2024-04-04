import * as configureKey from './lib/configureKey';
import * as exposesLib from './lib/exposes';
import type {Feature, Numeric, Enum, Binary, Text, Composite, List, Light, Climate, Switch, Lock, Cover, Fan} from './lib/exposes';
import {Enum as EnumClass} from './lib/exposes';
import toZigbee from './converters/toZigbee';
import fromZigbee from './converters/fromZigbee';
import assert from 'assert';
import * as ota from './lib/ota';
import allDefinitions from './devices';
import * as utils from './lib/utils';
import {Definition, Fingerprint, Zh, OnEventData, OnEventType, Configure, Expose, Tz, OtaUpdateAvailableResult, KeyValue} from './lib/types';
import {generateDefinition} from './lib/generateDefinition';
import {Zcl} from 'zigbee-herdsman';
import * as logger from './lib/logger';

const NS = 'zhc';

export {
    Definition as Definition,
    OnEventType as OnEventType,
    Feature as Feature,
    Expose as Expose,
    Numeric as Numeric,
    Binary as Binary,
    Enum as Enum,
    Text as Text,
    Composite as Composite,
    List as List,
    Light as Light,
    Climate as Climate,
    Switch as Switch,
    Lock as Lock,
    Cover as Cover,
    Fan as Fan,
    toZigbee as toZigbee,
    fromZigbee as fromZigbee,
    Tz as Tz,
    OtaUpdateAvailableResult as OtaUpdateAvailableResult,
    ota as ota,
};

export const getConfigureKey = configureKey.getConfigureKey;


// key: zigbeeModel, value: array of definitions (most of the times 1)
const lookup = new Map();
export const definitions: Definition[] = [];

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

function processExtensions(definition: Definition): Definition {
    if ('extend' in definition) {
        if (!Array.isArray(definition.extend)) {
            assert.fail(`'${definition.model}' has legacy extend which is not supported anymore`);
        }
        // Modern extend, merges properties, e.g. when both extend and definition has toZigbee, toZigbee will be combined
        let {extend, toZigbee, fromZigbee, exposes, meta, endpoint, configure: definitionConfigure, onEvent, ota, ...definitionWithoutExtend} = definition;
        if (typeof exposes === 'function') {
            assert.fail(`'${definition.model}' has function exposes which is not allowed`);
        }

        exposes = [...exposes ?? []]
        toZigbee = [...toZigbee ?? []];
        fromZigbee = [...fromZigbee ?? []];

        const configures: Configure[] = definitionConfigure ? [definitionConfigure] : [];

        for (const ext of extend) {
            if (!ext.isModernExtend) {
                assert.fail(`'${definition.model}' has legacy extend in modern extend`);
            }
            if (ext.toZigbee) toZigbee.push(...ext.toZigbee);
            if (ext.fromZigbee) fromZigbee.push(...ext.fromZigbee);
            if (ext.exposes) exposes.push(...ext.exposes);
            if (ext.meta) meta = {...ext.meta, ...meta};
            if (ext.configure) configures.push(ext.configure);
            if (ext.ota) {
                if (ota) {
                    assert.fail(`'${definition.model}' has multiple 'ota', this is not allowed`);
                }
                ota = ext.ota;
            }
            if (ext.endpoint) {
                if (endpoint) {
                    assert.fail(`'${definition.model}' has multiple 'endpoint', this is not allowed`);
                }
                endpoint = ext.endpoint;
            }
            if (ext.onEvent) {
                if (onEvent) {
                    assert.fail(`'${definition.model}' has multiple 'onEvent', this is not allowed`);
                }
                onEvent = ext.onEvent;
            }
        }

        // Filtering out action exposes to combine them one
        const actionExposes = exposes.filter((e) => e.name === 'action');
        exposes = exposes.filter((e) => e.name !== 'action');
        if (actionExposes.length > 0) {
            const actions: string[] = [];
            for (const expose of actionExposes) {
                if (expose instanceof EnumClass) {
                    for (const action of expose.values) {
                        actions.push(action.toString())
                    } 
                }
            } 
            const uniqueActions = actions.filter((value, index, array) => array.indexOf(value) === index);
            exposes.push(exposesLib.presets.action(uniqueActions));
        }

        let configure: Configure = null;
        if (configures.length !== 0) {
            configure = async (device, coordinatorEndpoint) => {
                for (const func of configures) {
                    await func(device, coordinatorEndpoint);
                }
            }
        }
        definition = {toZigbee, fromZigbee, exposes, meta, configure, endpoint, onEvent, ota, ...definitionWithoutExtend};
    }

    return definition
}

function prepareDefinition(definition: Definition): Definition {
    definition = processExtensions(definition);

    definition.toZigbee.push(
        toZigbee.scene_store, toZigbee.scene_recall, toZigbee.scene_add, toZigbee.scene_remove, toZigbee.scene_remove_all, 
        toZigbee.scene_rename, toZigbee.read, toZigbee.write,
        toZigbee.command, toZigbee.factory_reset, toZigbee.zcl_command);

    if (definition.exposes && Array.isArray(definition.exposes) && !definition.exposes.find((e) => e.name === 'linkquality')) {
        definition.exposes = definition.exposes.concat([exposesLib.presets.linkquality()]);
    }

    validateDefinition(definition);

    // Add all the options
    if (!definition.options) definition.options = [];
    const optionKeys = definition.options.map((o) => o.name);

    // Add calibration/precision options based on expose
    for (const expose of Array.isArray(definition.exposes) ? definition.exposes : definition.exposes(null, null)) {
        if (!optionKeys.includes(expose.name) && utils.isNumericExposeFeature(expose) && expose.name in utils.calibrateAndPrecisionRoundOptionsDefaultPrecision) {
            // Battery voltage is not calibratable
            if (expose.name === 'voltage' && expose.unit === 'mV') continue;
            const type = utils.calibrateAndPrecisionRoundOptionsIsPercentual(expose.name) ? 'percentual' : 'absolute';
            definition.options.push(exposesLib.options.calibration(expose.name, type));
            if (utils.calibrateAndPrecisionRoundOptionsDefaultPrecision[expose.name] !== 0) {
                definition.options.push(exposesLib.options.precision(expose.name));
            }
            optionKeys.push(expose.name);
        }
    }

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

    return definition
}

export function postProcessConvertedFromZigbeeMessage(definition: Definition, payload: KeyValue, options: KeyValue) {
    // Apply calibration/precision options
    for (const [key, value] of Object.entries(payload)) {
        const definitionExposes = Array.isArray(definition.exposes) ? definition.exposes : definition.exposes(null, null);
        const expose = definitionExposes.find((e) => e.property === key);
        if (expose?.name in utils.calibrateAndPrecisionRoundOptionsDefaultPrecision && utils.isNumber(value)) {
            try {
                payload[key] = utils.calibrateAndPrecisionRoundOptions(value, options, expose.name);
            } catch (error) {
                logger.logger.error(`Failed to apply calibration to '${expose.name}': ${error.message}`, NS);
            }
        }
    }
}

export function addDefinition(definition: Definition) {
    definition = prepareDefinition(definition)

    definitions.splice(0, 0, definition);

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

export async function findByDevice(device: Zh.Device, generateForUnknown: boolean = false) {
    let definition = await findDefinition(device, generateForUnknown);
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

export async function findDefinition(device: Zh.Device, generateForUnknown: boolean = false): Promise<Definition> {
    if (!device) {
        return null;
    }

    const candidates = getFromLookup(device.modelID);
    if (!candidates) {
        if (!generateForUnknown || device.type === 'Coordinator') {
            return null;
        }

        // Do not add this definition to cache,
        // as device configuration might change.
        return prepareDefinition((await generateDefinition(device)).definition);
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

export async function generateExternalDefinitionSource(device: Zh.Device): Promise<string> {
    return (await generateDefinition(device)).externalDefinitionSource;
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

export function findByModel(model: string){
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

// Can be used to handle events for devices which are not fully paired yet (no modelID).
// Example usecase: https://github.com/Koenkk/zigbee2mqtt/issues/2399#issuecomment-570583325
export async function onEvent(type: OnEventType, data: OnEventData, device: Zh.Device) {
    // support Legrand security protocol
    // when pairing, a powered device will send a read frame to every device on the network
    // it expects at least one answer. The payload contains the number of seconds
    // since when the device is powered. If the value is too high, it will leave & not pair
    // 23 works, 200 doesn't
    if (device.manufacturerID === Zcl.ManufacturerCode.LEGRAND_GROUP && !device.customReadResponse) {
        device.customReadResponse = (frame, endpoint) => {
            if (frame.isCluster('genBasic') && frame.Payload.find((i: {attrId: number}) => i.attrId === 61440)) {
                const options = {manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP, disableDefaultResponse: true};
                const payload = {0xf00: {value: 23, type: 35}};
                endpoint.readResponse('genBasic', frame.Header.transactionSequenceNumber, payload, options).catch((e) => {
                    logger.logger.warning(`Legrand security read response failed: ${e}`, NS);
                })
                return true;
            }
            return false;
        }
    }

    // Aqara feeder C1 polls the time during the interview, need to send back the local time instead of the UTC.
    // The device.definition has not yet been set - therefore the device.definition.onEvent method does not work.
    if (device.modelID === 'aqara.feeder.acn001' && !device.customReadResponse) {
        device.customReadResponse = (frame, endpoint) => {
            if (frame.isCluster('genTime')) {
                const oneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();
                const secondsUTC = Math.round(((new Date()).getTime() - oneJanuary2000) / 1000);
                const secondsLocal = secondsUTC - (new Date()).getTimezoneOffset() * 60;
                endpoint.readResponse('genTime', frame.Header.transactionSequenceNumber, {time: secondsLocal}).catch((e) => {
                    logger.logger.warning(`ZNCWWSQ01LM custom time response failed: ${e}`, NS);
                })
                return true;
            }
            return false;
        }
    }
}

export const setLogger = logger.setLogger;
