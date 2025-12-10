import assert from "node:assert";
import {Zcl} from "zigbee-herdsman";
import * as fromZigbee from "./converters/fromZigbee";
import * as toZigbee from "./converters/toZigbee";
import * as exposesLib from "./lib/exposes";
import {
    access,
    Binary,
    Climate,
    Composite,
    Cover,
    Enum,
    Enum as EnumClass,
    Fan,
    Feature,
    Light,
    List,
    Lock,
    Numeric,
    Switch,
    Text,
} from "./lib/exposes";
import {generateDefinition} from "./lib/generateDefinition";
import {logger} from "./lib/logger";
import {
    type Configure,
    Definition,
    type DefinitionExposes,
    type DefinitionExposesFunction,
    DefinitionWithExtend,
    Expose,
    ExternalDefinitionWithExtend,
    type Fingerprint,
    type KeyValue,
    type OnEvent,
    Option,
    Tz,
    type Zh,
} from "./lib/types";
import * as utils from "./lib/utils";
// @ts-expect-error dynamically built
import modelsIndexJson from "./models-index.json";

const NS = "zhc";

type ModelIndex = [module: string, index: number];

const MODELS_INDEX = modelsIndexJson as Record<string, ModelIndex[]>;

export {ACTIONS, MqttRawPayload} from "./converters/actions";
export type {Ota} from "./lib/types";
export {
    DefinitionWithExtend,
    ExternalDefinitionWithExtend,
    access,
    Definition,
    Feature,
    Expose,
    Option,
    Numeric,
    Binary,
    Enum,
    Text,
    Composite,
    List,
    Light,
    Climate,
    Switch,
    Lock,
    Cover,
    Fan,
    toZigbee,
    fromZigbee,
    Tz,
    type OnEvent,
};
export {getConfigureKey} from "./lib/configureKey";
export {setLogger} from "./lib/logger";
export * as ota from "./lib/ota";
export {clear as clearGlobalStore} from "./lib/store";

// key: zigbeeModel, value: array of definitions (most of the times 1)
const externalDefinitionsLookup = new Map<string, DefinitionWithExtend[]>();
export const externalDefinitions: DefinitionWithExtend[] = [];

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

function addToExternalDefinitionsLookup(zigbeeModel: string | undefined, definition: DefinitionWithExtend): void {
    const lookupModel = zigbeeModel ? zigbeeModel.toLowerCase() : "null";

    if (!externalDefinitionsLookup.has(lookupModel)) {
        externalDefinitionsLookup.set(lookupModel, []);
    }

    // key created above
    // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
    if (!externalDefinitionsLookup.get(lookupModel)!.includes(definition)) {
        // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
        externalDefinitionsLookup.get(lookupModel)!.splice(0, 0, definition);
    }
}

function removeFromExternalDefinitionsLookup(zigbeeModel: string | undefined, definition: DefinitionWithExtend): void {
    const lookupModel = zigbeeModel ? zigbeeModel.toLowerCase() : "null";

    if (externalDefinitionsLookup.has(lookupModel)) {
        // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
        const i = externalDefinitionsLookup.get(lookupModel)!.indexOf(definition);

        if (i > -1) {
            // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
            externalDefinitionsLookup.get(lookupModel)!.splice(i, 1);
        }

        // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
        if (externalDefinitionsLookup.get(lookupModel)!.length === 0) {
            externalDefinitionsLookup.delete(lookupModel);
        }
    }
}

function getFromExternalDefinitionsLookup(zigbeeModel: string | undefined): DefinitionWithExtend[] | undefined {
    const lookupModel = zigbeeModel ? zigbeeModel.toLowerCase() : "null";

    if (externalDefinitionsLookup.has(lookupModel)) {
        return externalDefinitionsLookup.get(lookupModel);
    }

    return externalDefinitionsLookup.get(lookupModel.replace(/\0(.|\n)*$/g, "").trim());
}

export function removeExternalDefinitions(converterName?: string): void {
    for (let i = 0; i < externalDefinitionsCount; i++) {
        const definition = externalDefinitions[i];

        if (converterName && definition.externalConverterName !== converterName) {
            continue;
        }

        if (definition.zigbeeModel) {
            for (const zigbeeModel of definition.zigbeeModel) {
                removeFromExternalDefinitionsLookup(zigbeeModel, definition);
            }
        }

        if (definition.fingerprint) {
            for (const fingerprint of definition.fingerprint) {
                removeFromExternalDefinitionsLookup(fingerprint.modelID, definition);
            }
        }

        externalDefinitions.splice(i, 1);

        externalDefinitionsCount--;
        i--;
    }
}

export function addExternalDefinition(definition: ExternalDefinitionWithExtend): void {
    externalDefinitions.splice(0, 0, definition);
    externalDefinitionsCount++;

    if (definition.fingerprint) {
        for (const fingerprint of definition.fingerprint) {
            addToExternalDefinitionsLookup(fingerprint.modelID, definition);
        }
    }

    if (definition.zigbeeModel) {
        for (const zigbeeModel of definition.zigbeeModel) {
            addToExternalDefinitionsLookup(zigbeeModel, definition);
        }
    }
}

async function getDefinitions(indexes: ModelIndex[]): Promise<DefinitionWithExtend[]> {
    const indexedDefs: DefinitionWithExtend[] = [];
    // local cache for models with lots of matches (tuya...)
    const defs: Record<string, DefinitionWithExtend[]> = {};

    for (const [moduleName, index] of indexes) {
        if (!defs[moduleName]) {
            // NOTE: modules are cached by nodejs until process is stopped
            // currently using `commonjs`, so strip `.js` file extension, XXX: creates a warning with vitest (expects static `.js`)
            const {definitions} = (await import(`./devices/${moduleName.slice(0, -3)}`)) as {definitions: DefinitionWithExtend[]};

            defs[moduleName] = definitions;
        }

        indexedDefs.push(defs[moduleName][index]);
    }

    return indexedDefs;
}

async function getFromIndex(zigbeeModel: string | undefined): Promise<DefinitionWithExtend[] | undefined> {
    const lookupModel = zigbeeModel ? zigbeeModel.toLowerCase() : "null";
    let indexes = MODELS_INDEX[lookupModel];

    if (indexes) {
        logger.debug(`Getting definitions for: ${indexes}`, NS);

        return await getDefinitions(indexes);
    }

    indexes = MODELS_INDEX[lookupModel.replace(/\0(.|\n)*$/g, "").trim()];

    if (indexes) {
        logger.debug(`Getting definitions for: ${indexes}`, NS);

        return await getDefinitions(indexes);
    }
}

const converterRequiredFields = {
    model: "String",
    vendor: "String",
    description: "String",
    fromZigbee: "Array",
    toZigbee: "Array",
};

function validateDefinition(definition: Definition): asserts definition is Definition {
    for (const [field, expectedType] of Object.entries(converterRequiredFields)) {
        const val = definition[field as keyof Definition];

        assert(val !== null, `Converter field ${field} is null`);
        assert(val !== undefined, `Converter field ${field} is undefined`);
        assert(val.constructor.name === expectedType, `Converter field ${field} expected type doenst match to ${val}`);
    }

    assert.ok(Array.isArray(definition.exposes) || typeof definition.exposes === "function", "Exposes incorrect");
}

function processExtensions(definition: DefinitionWithExtend): Definition {
    if ("extend" in definition) {
        if (!Array.isArray(definition.extend)) {
            assert.fail(`'${definition.model}' has legacy extend which is not supported anymore`);
        }

        // Modern extend, merges properties, e.g. when both extend and definition has toZigbee, toZigbee will be combined
        let {
            extend,
            toZigbee,
            fromZigbee,
            exposes: definitionExposes,
            meta,
            endpoint,
            ota,
            configure: definitionConfigure,
            onEvent: definitionOnEvent,
            options,
            ...definitionWithoutExtend
        } = definition;

        // Exposes can be an Expose[] or DefinitionExposesFunction. In case it's only Expose[] we return an array
        // Otherwise return a DefinitionExposesFunction.
        const allExposesIsExposeOnly = (allExposes: (Expose | DefinitionExposesFunction)[]): allExposes is Expose[] => {
            return !allExposes.find((e) => typeof e === "function");
        };
        let allExposes: (Expose | DefinitionExposesFunction)[] = [];

        if (definitionExposes) {
            if (typeof definitionExposes === "function") {
                allExposes.push(definitionExposes);
            } else {
                allExposes.push(...definitionExposes);
            }
        }

        toZigbee = [...(toZigbee ?? [])];
        fromZigbee = [...(fromZigbee ?? [])];
        options = [...(options ?? [])];

        const configures: Configure[] = definitionConfigure ? [definitionConfigure] : [];
        const onEvents: OnEvent.Handler[] = definitionOnEvent ? [definitionOnEvent] : [];

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

            if (ext.options) {
                options.push(...ext.options);
            }

            if (ext.exposes) {
                allExposes.push(...ext.exposes);
            }

            if (ext.meta) {
                meta = Object.assign({}, ext.meta, meta);
            }

            // Filter `undefined` configures, e.g. returned by setupConfigureForReporting.
            if (ext.configure) {
                configures.push(...ext.configure.filter((c) => c !== undefined));
            }

            if (ext.onEvent) {
                onEvents.push(...ext.onEvent.filter((c) => c !== undefined));
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
        const actionExposes = allExposes.filter((e) => typeof e !== "function" && e.name === "action");
        allExposes = allExposes.filter((e) => e.name !== "action");

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

        let onEvent: OnEvent.Handler | undefined;

        if (onEvents.length !== 0) {
            onEvent = async (event) => {
                for (const func of onEvents) {
                    await func(event);
                }
            };
        }

        // In case there is a function in allExposes, return a function, otherwise just an array.
        let exposes: DefinitionExposes;

        if (allExposesIsExposeOnly(allExposes)) {
            exposes = allExposes;
        } else {
            exposes = (device, options) => {
                const result: Expose[] = [];

                for (const item of allExposes) {
                    if (typeof item === "function") {
                        try {
                            const deviceExposes = item(device, options);

                            result.push(...deviceExposes);
                        } catch (error) {
                            const ieeeAddr = utils.isDummyDevice(device) ? "dummy-device" : device.ieeeAddr;
                            logger.error(`Failed to process exposes for '${ieeeAddr}' (${(error as Error).stack})`, NS);
                        }
                    } else {
                        result.push(item);
                    }
                }

                return result;
            };
        }

        return {toZigbee, fromZigbee, exposes, meta, configure, endpoint, onEvent, ota, options, ...definitionWithoutExtend};
    }

    return {...definition};
}

export function prepareDefinition(definition: DefinitionWithExtend): Definition {
    const finalDefinition = processExtensions(definition);

    finalDefinition.toZigbee = [
        ...finalDefinition.toZigbee,
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
    ];

    if (definition.externalConverterName) {
        validateDefinition(finalDefinition);
    }

    // Add all the options
    finalDefinition.options = [...(finalDefinition.options ?? [])];
    const optionKeys = finalDefinition.options.map((o) => o.name);

    // Add calibration/precision options based on expose
    for (const expose of Array.isArray(finalDefinition.exposes) ? finalDefinition.exposes : finalDefinition.exposes({isDummyDevice: true}, {})) {
        if (
            !optionKeys.includes(expose.name) &&
            utils.isNumericExpose(expose) &&
            expose.name in utils.calibrateAndPrecisionRoundOptionsDefaultPrecision
        ) {
            // Battery voltage is not calibratable
            if (expose.name === "voltage" && expose.unit === "mV") {
                continue;
            }

            const type = utils.calibrateAndPrecisionRoundOptionsIsPercentual(expose.name) ? "percentual" : "absolute";

            finalDefinition.options.push(exposesLib.options.calibration(expose.name, type).withValueStep(0.1));

            if (utils.calibrateAndPrecisionRoundOptionsDefaultPrecision[expose.name] !== 0) {
                finalDefinition.options.push(exposesLib.options.precision(expose.name));
            }

            optionKeys.push(expose.name);
        }
    }

    for (const converter of [...finalDefinition.toZigbee, ...finalDefinition.fromZigbee]) {
        if (converter.options) {
            const options = typeof converter.options === "function" ? converter.options(finalDefinition) : converter.options;

            for (const option of options) {
                if (!optionKeys.includes(option.name)) {
                    finalDefinition.options.push(option);
                    optionKeys.push(option.name);
                }
            }
        }
    }

    return finalDefinition;
}

export function postProcessConvertedFromZigbeeMessage(definition: Definition, payload: KeyValue, options: KeyValue, device: Zh.Device): void {
    // Apply calibration/precision options
    for (const [key, value] of Object.entries(payload)) {
        const definitionExposes = Array.isArray(definition.exposes) ? definition.exposes : definition.exposes(device, {});
        const expose = definitionExposes.find((e) => e.property === key);

        if (expose?.name && expose.name in utils.calibrateAndPrecisionRoundOptionsDefaultPrecision && value !== "" && utils.isNumber(value)) {
            try {
                payload[key] = utils.calibrateAndPrecisionRoundOptions(value, options, expose.name);
            } catch (error) {
                logger.error(`Failed to apply calibration to '${expose.name}': ${(error as Error).message}`, NS);
            }
        }
    }
}

export async function findByDevice(device: Zh.Device, generateForUnknown = false): Promise<Definition | undefined> {
    let definition = await findDefinition(device, generateForUnknown);

    if (definition) {
        if (definition.whiteLabel) {
            const match = definition.whiteLabel.find((w) => "fingerprint" in w && w.fingerprint.find((f) => isFingerprintMatch(f, device)));

            if (match) {
                definition = {
                    ...definition,
                    model: match.model,
                    vendor: match.vendor ?? definition.vendor,
                    description: match.description ?? definition.description,
                };
            }
        }

        return prepareDefinition(definition);
    }
}

export async function findDefinition(device: Zh.Device, generateForUnknown = false): Promise<DefinitionWithExtend | undefined> {
    if (!device || device.type === "Coordinator") {
        return undefined;
    }

    let candidates = await getFromIndex(device.modelID);
    if (externalDefinitionsCount > 0) {
        const extCandidates = getFromExternalDefinitionsLookup(device.modelID);

        if (extCandidates) {
            if (candidates) {
                candidates.unshift(...extCandidates);
            } else {
                candidates = extCandidates;
            }
        }
    }

    if (candidates) {
        if (candidates.length === 1 && candidates[0].zigbeeModel) {
            return candidates[0];
        }

        logger.debug(() => `Candidates for ${device.ieeeAddr}/${device.modelID}: ${candidates.map((c) => `${c.model}/${c.vendor}`)}`, NS);

        // First try to match based on fingerprint, return the first matching one.
        const fingerprintMatch: {priority?: number; definition?: DefinitionWithExtend} = {priority: undefined, definition: undefined};

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

    if (!generateForUnknown) {
        return undefined;
    }

    const {definition} = await generateDefinition(device);

    return definition;
}

export async function generateExternalDefinitionSource(device: Zh.Device): Promise<string> {
    return (await generateDefinition(device)).externalDefinitionSource;
}

export async function generateExternalDefinition(device: Zh.Device): Promise<Definition> {
    const {definition} = await generateDefinition(device);

    return prepareDefinition(definition);
}

function isFingerprintMatch(fingerprint: Fingerprint, device: Zh.Device): boolean {
    let match =
        (fingerprint.applicationVersion === undefined || device.applicationVersion === fingerprint.applicationVersion) &&
        (fingerprint.manufacturerID === undefined || device.manufacturerID === fingerprint.manufacturerID) &&
        (!fingerprint.type || device.type === fingerprint.type) &&
        (!fingerprint.dateCode || device.dateCode === fingerprint.dateCode) &&
        (fingerprint.hardwareVersion === undefined || device.hardwareVersion === fingerprint.hardwareVersion) &&
        (!fingerprint.manufacturerName || device.manufacturerName === fingerprint.manufacturerName) &&
        (!fingerprint.modelID || device.modelID === fingerprint.modelID) &&
        (!fingerprint.powerSource || device.powerSource === fingerprint.powerSource) &&
        (!fingerprint.softwareBuildID || device.softwareBuildID === fingerprint.softwareBuildID) &&
        (fingerprint.stackVersion === undefined || device.stackVersion === fingerprint.stackVersion) &&
        (fingerprint.zclVersion === undefined || device.zclVersion === fingerprint.zclVersion) &&
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
                (fingerprintEndpoint.deviceID === undefined ||
                    (deviceEndpoint !== undefined && deviceEndpoint.deviceID === fingerprintEndpoint.deviceID)) &&
                (fingerprintEndpoint.profileID === undefined ||
                    (deviceEndpoint !== undefined && deviceEndpoint.profileID === fingerprintEndpoint.profileID)) &&
                (!fingerprintEndpoint.inputClusters ||
                    (deviceEndpoint !== undefined && arrayEquals(deviceEndpoint.inputClusters, fingerprintEndpoint.inputClusters))) &&
                (!fingerprintEndpoint.outputClusters ||
                    (deviceEndpoint !== undefined && arrayEquals(deviceEndpoint.outputClusters, fingerprintEndpoint.outputClusters)));
        }
    }

    return match;
}

// Can be used to handle events for devices which are not fully paired yet (no modelID).
// Example usecase: https://github.com/Koenkk/zigbee2mqtt/issues/2399#issuecomment-570583325
export function onEvent(event: OnEvent.Event): Promise<void> {
    if (event.type === "stop") return;
    const {device} = event.data;

    // support Legrand security protocol
    // when pairing, a powered device will send a read frame to every device on the network
    // it expects at least one answer. The payload contains the number of seconds
    // since when the device is powered. If the value is too high, it will leave & not pair
    // 23 works, 200 doesn't
    if (device.manufacturerID === Zcl.ManufacturerCode.LEGRAND_GROUP && !device.customReadResponse) {
        device.customReadResponse = (frame, endpoint) => {
            if (frame.isCluster("genBasic") && frame.payload.find((i: {attrId: number}) => i.attrId === 61440)) {
                const options = {manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP, disableDefaultResponse: true};
                const payload = {61440: {value: 23, type: 35}};

                endpoint.readResponse("genBasic", frame.header.transactionSequenceNumber, payload, options).catch((e) => {
                    logger.warning(`Legrand security read response failed: ${e}`, NS);
                });

                return true;
            }

            return false;
        };
    }

    // Aqara feeder C1 polls the time during the interview, need to send back the local time instead of the UTC.
    // The device.definition has not yet been set - therefore the device.definition.onEvent method does not work.
    if (device.modelID === "aqara.feeder.acn001" && !device.customReadResponse) {
        device.customReadResponse = (frame, endpoint) => {
            if (frame.isCluster("genTime")) {
                const oneJanuary2000 = new Date("January 01, 2000 00:00:00 UTC+00:00").getTime();
                const secondsUTC = Math.round((Date.now() - oneJanuary2000) / 1000);
                const secondsLocal = secondsUTC - new Date().getTimezoneOffset() * 60;

                endpoint.readResponse("genTime", frame.header.transactionSequenceNumber, {time: secondsLocal}).catch((e) => {
                    logger.warning(`ZNCWWSQ01LM custom time response failed: ${e}`, NS);
                });

                return true;
            }

            return false;
        };
    }

    return Promise.resolve();
}
