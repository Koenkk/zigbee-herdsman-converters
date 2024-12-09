import type {Binary, Climate, Composite, Cover, Enum, Fan, Feature, Light, List, Lock, Numeric, Switch, Text} from './lib/exposes';

import assert from 'assert';

import {Zcl} from 'zigbee-herdsman';

import fromZigbee from './converters/fromZigbee';
import toZigbee from './converters/toZigbee';
import allDefinitions from './devices';
import * as configureKey from './lib/configureKey';
import * as exposesLib from './lib/exposes';
import {Enum as EnumClass} from './lib/exposes';
import {generateDefinition} from './lib/generateDefinition';
import * as logger from './lib/logger';
import {
    Configure,
    Definition,
    DefinitionExposes,
    DefinitionExposesFunction,
    DefinitionWithExtend,
    Expose,
    Fingerprint,
    KeyValue,
    OnEvent,
    OnEventData,
    OnEventMeta,
    OnEventType,
    Option,
    Tz,
    Zh,
} from './lib/types';
import * as utils from './lib/utils';

const NS = 'zhc';

export type {Ota} from './lib/types';
export {
    Definition as Definition,
    OnEventType as OnEventType,
    Feature as Feature,
    Expose as Expose,
    Option as Option,
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
};
export * as ota from './lib/ota';

export const getConfigureKey = configureKey.getConfigureKey;

// key: zigbeeModel, value: array of definitions (most of the times 1)
const lookup = new Map<string, Definition[]>();
export const definitions: Definition[] = [];

// expected to be at the beginning of `definitions` array
let externalDefinitionsCount = 0;

function arrayEquals<T>(as: T[], bs: T[]): boolean {
    if (as.length !== bs.length) {
        return false;
    }

    for (const a of as) {
        if (!bs.includes(a)) {
            return false;
        }
    }

    return true;
}

function addToLookup(zigbeeModel: string | undefined, definition: Definition): void {
    const lookupModel = zigbeeModel ? zigbeeModel.toLowerCase() : 'null';

    if (!lookup.has(lookupModel)) {
        lookup.set(lookupModel, []);
    }

    // key created above as needed
    if (!lookup.get(lookupModel)!.includes(definition)) {
        lookup.get(lookupModel)!.splice(0, 0, definition);
    }
}

function removeFromLookup(zigbeeModel: string | undefined, definition: Definition): void {
    const lookupModel = zigbeeModel ? zigbeeModel.toLowerCase() : 'null';

    if (lookup.has(lookupModel)) {
        const i = lookup.get(lookupModel)!.indexOf(definition);

        if (i > -1) {
            lookup.get(lookupModel)!.splice(i, 1);
        }

        if (lookup.get(lookupModel)!.length === 0) {
            lookup.delete(lookupModel);
        }
    }
}

function getFromLookup(zigbeeModel: string | undefined): Definition[] | undefined {
    const lookupModel = zigbeeModel ? zigbeeModel.toLowerCase() : 'null';

    if (lookup.has(lookupModel)) {
        return lookup.get(lookupModel);
    }

    return lookup.get(lookupModel.replace(/\0(.|\n)*$/g, '').trim());
}

const converterRequiredFields = {
    model: 'String',
    vendor: 'String',
    description: 'String',
    fromZigbee: 'Array',
    toZigbee: 'Array',
};

function validateDefinition(definition: Definition): asserts definition is Definition {
    for (const [field, expectedType] of Object.entries(converterRequiredFields)) {
        const val = definition[field as keyof Definition];

        assert(val !== null, `Converter field ${field} is null`);
        assert(val !== undefined, `Converter field ${field} is undefined`);
        assert(val.constructor.name === expectedType, `Converter field ${field} expected type doenst match to ${val}`);
    }

    assert.ok(Array.isArray(definition.exposes) || typeof definition.exposes === 'function', 'Exposes incorrect');
}

function processExtensions(definition: DefinitionWithExtend): Definition {
    if ('extend' in definition) {
        if (!Array.isArray(definition.extend)) {
            assert.fail(`'${definition.model}' has legacy extend which is not supported anymore`);
        }

        // Modern extend, merges properties, e.g. when both extend and definition has toZigbee, toZigbee will be combined
        let {
            // eslint-disable-next-line prefer-const
            extend,
            toZigbee,
            fromZigbee,
            // eslint-disable-next-line prefer-const
            exposes: definitionExposes,
            meta,
            endpoint,
            ota,
            // eslint-disable-next-line prefer-const
            configure: definitionConfigure,
            // eslint-disable-next-line prefer-const
            onEvent: definitionOnEvent,
            // eslint-disable-next-line prefer-const
            ...definitionWithoutExtend
        } = definition;

        // Exposes can be an Expose[] or DefinitionExposesFunction. In case it's only Expose[] we return an array
        // Otherwise return a DefinitionExposesFunction.
        const allExposesIsExposeOnly = (allExposes: (Expose | DefinitionExposesFunction)[]): allExposes is Expose[] => {
            return !allExposes.find((e) => typeof e === 'function');
        };
        let allExposes: (Expose | DefinitionExposesFunction)[] = [];

        if (definitionExposes) {
            if (typeof definitionExposes === 'function') {
                allExposes.push(definitionExposes);
            } else {
                allExposes.push(...definitionExposes);
            }
        }

        toZigbee = [...(toZigbee ?? [])];
        fromZigbee = [...(fromZigbee ?? [])];

        const configures: Configure[] = definitionConfigure ? [definitionConfigure] : [];
        const onEvents: OnEvent[] = definitionOnEvent ? [definitionOnEvent] : [];

        for (const ext of extend) {
            if (!ext.isModernExtend) {
                assert.fail(`'${definition.model}' has legacy extend in modern extend`);
            }

            if (ext.toZigbee) {
                toZigbee.push(...ext.toZigbee);
            }

            if (ext.fromZigbee) {
                fromZigbee.push(...ext.fromZigbee);
            }

            if (ext.exposes) {
                allExposes.push(...ext.exposes);
            }

            if (ext.meta) {
                meta = Object.assign({}, ext.meta, meta);
            }

            // Filter `undefined` configures, e.g. returned by setupConfigureForReporting.
            if (ext.configure) {
                configures.push(...ext.configure.filter((c) => c != undefined));
            }

            if (ext.onEvent) {
                onEvents.push(ext.onEvent);
            }

            if (ext.ota) {
                ota = ext.ota;
            }

            if (ext.endpoint) {
                if (endpoint) {
                    assert.fail(`'${definition.model}' has multiple 'endpoint', this is not allowed`);
                }

                endpoint = ext.endpoint;
            }
        }

        // Filtering out action exposes to combine them one
        const actionExposes = allExposes.filter((e) => typeof e !== 'function' && e.name === 'action');
        allExposes = allExposes.filter((e) => e.name !== 'action');

        if (actionExposes.length > 0) {
            const actions: string[] = [];

            for (const expose of actionExposes) {
                if (expose instanceof EnumClass) {
                    for (const action of expose.values) {
                        actions.push(action.toString());
                    }
                }
            }

            const uniqueActions = actions.filter((value, index, array) => array.indexOf(value) === index);

            allExposes.push(exposesLib.presets.action(uniqueActions));
        }

        let configure: Configure | undefined;

        if (configures.length !== 0) {
            configure = async (device, coordinatorEndpoint, configureDefinition) => {
                for (const func of configures) {
                    await func(device, coordinatorEndpoint, configureDefinition);
                }
            };
        }

        let onEvent: OnEvent | undefined;

        if (onEvents.length !== 0) {
            onEvent = async (type, data, device, settings, state) => {
                for (const func of onEvents) {
                    await func(type, data, device, settings, state);
                }
            };
        }

        // In case there is a function in allExposes, return a function, otherwise just an array.
        let exposes: DefinitionExposes;

        if (allExposesIsExposeOnly(allExposes)) {
            exposes = allExposes;
        } else {
            exposes = (device: Zh.Device | undefined, options: KeyValue | undefined) => {
                const result: Expose[] = [];

                for (const item of allExposes) {
                    if (typeof item === 'function') {
                        result.push(...item(device, options));
                    } else {
                        result.push(item);
                    }
                }

                return result;
            };
        }

        definition = {toZigbee, fromZigbee, exposes, meta, configure, endpoint, onEvent, ota, ...definitionWithoutExtend};
    }

    return definition;
}

function prepareDefinition(definition: DefinitionWithExtend): Definition {
    definition = processExtensions(definition);

    definition.toZigbee.push(
        toZigbee.scene_store,
        toZigbee.scene_recall,
        toZigbee.scene_add,
        toZigbee.scene_remove,
        toZigbee.scene_remove_all,
        toZigbee.scene_rename,
        toZigbee.read,
        toZigbee.write,
        toZigbee.command,
        toZigbee.factory_reset,
        toZigbee.zcl_command,
    );

    if (definition.exposes && Array.isArray(definition.exposes) && !definition.exposes.find((e) => e.name === 'linkquality')) {
        definition.exposes = definition.exposes.concat([exposesLib.presets.linkquality()]);
    }

    if (definition.externalConverterName) {
        validateDefinition(definition);
    }

    // Add all the options
    if (!definition.options) {
        definition.options = [];
    }

    const optionKeys = definition.options.map((o) => o.name);

    // Add calibration/precision options based on expose
    for (const expose of Array.isArray(definition.exposes) ? definition.exposes : definition.exposes(undefined, undefined)) {
        if (
            !optionKeys.includes(expose.name) &&
            utils.isNumericExpose(expose) &&
            expose.name in utils.calibrateAndPrecisionRoundOptionsDefaultPrecision
        ) {
            // Battery voltage is not calibratable
            if (expose.name === 'voltage' && expose.unit === 'mV') {
                continue;
            }

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

    return definition;
}

export function postProcessConvertedFromZigbeeMessage(definition: Definition, payload: KeyValue, options: KeyValue): void {
    // Apply calibration/precision options
    for (const [key, value] of Object.entries(payload)) {
        const definitionExposes = Array.isArray(definition.exposes) ? definition.exposes : definition.exposes(undefined, undefined);
        const expose = definitionExposes.find((e) => e.property === key);

        if (expose?.name && expose.name in utils.calibrateAndPrecisionRoundOptionsDefaultPrecision && value !== '' && utils.isNumber(value)) {
            try {
                payload[key] = utils.calibrateAndPrecisionRoundOptions(value, options, expose.name);
            } catch (error) {
                logger.logger.error(`Failed to apply calibration to '${expose.name}': ${(error as Error).message}`, NS);
            }
        }
    }
}

export function removeExternalDefinitions(converterName?: string): void {
    for (let i = 0; i < externalDefinitionsCount; i++) {
        const definition = definitions[i];

        if (converterName && definition.externalConverterName !== converterName) {
            continue;
        }

        if ('zigbeeModel' in definition && definition.zigbeeModel) {
            for (const zigbeeModel of definition.zigbeeModel) {
                removeFromLookup(zigbeeModel, definition);
            }
        }

        if ('fingerprint' in definition && definition.fingerprint) {
            for (const fingerprint of definition.fingerprint) {
                removeFromLookup(fingerprint.modelID, definition);
            }
        }

        definitions.splice(i, 1);

        externalDefinitionsCount--;
        i--;
    }
}

export function addDefinition(definition: DefinitionWithExtend): void {
    definition = prepareDefinition(definition);

    definitions.splice(0, 0, definition);

    if (definition.externalConverterName) {
        externalDefinitionsCount++;
    }

    if ('fingerprint' in definition && definition.fingerprint) {
        for (const fingerprint of definition.fingerprint) {
            addToLookup(fingerprint.modelID, definition);
        }
    }

    if ('zigbeeModel' in definition && definition.zigbeeModel) {
        for (const zigbeeModel of definition.zigbeeModel) {
            addToLookup(zigbeeModel, definition);
        }
    }
}

for (const definition of allDefinitions) {
    addDefinition(definition as DefinitionWithExtend);
}

export async function findByDevice(device: Zh.Device, generateForUnknown: boolean = false): Promise<Definition | undefined> {
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

export async function findDefinition(device: Zh.Device, generateForUnknown: boolean = false): Promise<Definition | undefined> {
    if (!device) {
        return undefined;
    }

    const candidates = getFromLookup(device.modelID);

    if (!candidates) {
        if (!generateForUnknown || device.type === 'Coordinator') {
            return undefined;
        }

        // Do not add this definition to cache,
        // as device configuration might change.
        return prepareDefinition((await generateDefinition(device)).definition);
    } else if (candidates.length === 1 && candidates[0].zigbeeModel) {
        return candidates[0];
    } else {
        // First try to match based on fingerprint, return the first matching one.
        const fingerprintMatch: {priority?: number; definition?: Definition} = {priority: undefined, definition: undefined};

        for (const candidate of candidates) {
            if (candidate.fingerprint) {
                for (const fingerprint of candidate.fingerprint) {
                    const priority = fingerprint.priority ?? 0;
                    if (
                        isFingerprintMatch(fingerprint, device) &&
                        (fingerprintMatch.priority === undefined || priority > fingerprintMatch.priority)
                    ) {
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
            if (candidate.zigbeeModel && device.modelID && candidate.zigbeeModel.includes(device.modelID)) {
                return candidate;
            }
        }
    }

    return undefined;
}

export async function generateExternalDefinitionSource(device: Zh.Device): Promise<string> {
    return (await generateDefinition(device)).externalDefinitionSource;
}

function isFingerprintMatch(fingerprint: Fingerprint, device: Zh.Device): boolean {
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
        (!fingerprint.ieeeAddr || device.ieeeAddr.match(fingerprint.ieeeAddr) !== null) &&
        (!fingerprint.endpoints ||
            arrayEquals(
                device.endpoints.map((e) => e.ID),
                fingerprint.endpoints.map((e) => e.ID),
            ));

    if (match && fingerprint.endpoints) {
        for (const fingerprintEndpoint of fingerprint.endpoints) {
            const deviceEndpoint = fingerprintEndpoint.ID !== undefined ? device.getEndpoint(fingerprintEndpoint.ID) : undefined;
            match =
                match &&
                (!fingerprintEndpoint.deviceID || (deviceEndpoint !== undefined && deviceEndpoint.deviceID === fingerprintEndpoint.deviceID)) &&
                (!fingerprintEndpoint.profileID || (deviceEndpoint !== undefined && deviceEndpoint.profileID === fingerprintEndpoint.profileID)) &&
                (!fingerprintEndpoint.inputClusters ||
                    (deviceEndpoint !== undefined && arrayEquals(deviceEndpoint.inputClusters, fingerprintEndpoint.inputClusters))) &&
                (!fingerprintEndpoint.outputClusters ||
                    (deviceEndpoint !== undefined && arrayEquals(deviceEndpoint.outputClusters, fingerprintEndpoint.outputClusters)));
        }
    }

    return match;
}

export function findByModel(model: string): Definition | undefined {
    /*
    Search device description by definition model name.
    Useful when redefining, expanding device descriptions in external converters.
    */
    model = model.toLowerCase();

    return definitions.find((definition) => {
        return (
            definition.model.toLowerCase() == model ||
            (definition.whiteLabel && definition.whiteLabel.find((dwl) => dwl.model.toLowerCase() === model))
        );
    });
}

// Can be used to handle events for devices which are not fully paired yet (no modelID).
// Example usecase: https://github.com/Koenkk/zigbee2mqtt/issues/2399#issuecomment-570583325
export async function onEvent(type: OnEventType, data: OnEventData, device: Zh.Device, meta: OnEventMeta): Promise<void> {
    // support Legrand security protocol
    // when pairing, a powered device will send a read frame to every device on the network
    // it expects at least one answer. The payload contains the number of seconds
    // since when the device is powered. If the value is too high, it will leave & not pair
    // 23 works, 200 doesn't
    if (device.manufacturerID === Zcl.ManufacturerCode.LEGRAND_GROUP && !device.customReadResponse) {
        device.customReadResponse = (frame, endpoint) => {
            if (frame.isCluster('genBasic') && frame.payload.find((i: {attrId: number}) => i.attrId === 61440)) {
                const options = {manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP, disableDefaultResponse: true};
                const payload = {0xf000: {value: 23, type: 35}};

                endpoint.readResponse('genBasic', frame.header.transactionSequenceNumber, payload, options).catch((e) => {
                    logger.logger.warning(`Legrand security read response failed: ${e}`, NS);
                });

                return true;
            }

            return false;
        };
    }

    // Aqara feeder C1 polls the time during the interview, need to send back the local time instead of the UTC.
    // The device.definition has not yet been set - therefore the device.definition.onEvent method does not work.
    if (device.modelID === 'aqara.feeder.acn001' && !device.customReadResponse) {
        device.customReadResponse = (frame, endpoint) => {
            if (frame.isCluster('genTime')) {
                const oneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();
                const secondsUTC = Math.round((new Date().getTime() - oneJanuary2000) / 1000);
                const secondsLocal = secondsUTC - new Date().getTimezoneOffset() * 60;

                endpoint.readResponse('genTime', frame.header.transactionSequenceNumber, {time: secondsLocal}).catch((e) => {
                    logger.logger.warning(`ZNCWWSQ01LM custom time response failed: ${e}`, NS);
                });

                return true;
            }

            return false;
        };
    }
}

export const setLogger = logger.setLogger;
