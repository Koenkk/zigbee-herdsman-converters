import type {Models as ZHModels} from "zigbee-herdsman";

import {Zcl} from "zigbee-herdsman";
import type {Cluster} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";

import {logger} from "./logger";
import * as m from "./modernExtend";
import * as philips from "./philips";
import type {DefinitionWithExtend, ModernExtend, Zh} from "./types";
import {getClusterAttributeValue} from "./utils";

const NS = "zhc:gendef";

interface GeneratedExtend {
    getExtend(): ModernExtend;
    getSource(): string;
    lib?: string;
}

// Generator allows to define instances of GeneratedExtend that have typed arguments to extender.
class ExtendGenerator<T> implements GeneratedExtend {
    extend: (a: T) => ModernExtend;
    args?: T;
    source: string;
    lib?: string;

    constructor(args: {extend: (a: T) => ModernExtend; args?: T; source: string; lib?: string}) {
        this.extend = args.extend;
        this.args = args.args;
        this.source = args.source;
        this.lib = args.lib;
    }

    getExtend(): ModernExtend {
        return this.extend(this.args);
    }

    getSource(): string {
        let jsonArgs = JSON.stringify(this.args);
        if (!this.args || jsonArgs === "{}") {
            jsonArgs = "";
        }

        return `${this.source}(${jsonArgs})`;
    }
}

// Device passed as the first argument mostly to check
// if passed endpoint(if only one) is the first endpoint in the device.
type ExtenderGenerator = (device: Zh.Device, endpoints: Zh.Endpoint[]) => Promise<GeneratedExtend[]> | GeneratedExtend[];
type Extender = [string[], ExtenderGenerator];

type DefinitionWithZigbeeModel = DefinitionWithExtend & {zigbeeModel: string[]};

// If generator will have endpoint argument - generator implementation
// should not provide it if only the first device endpoint is passed in.
// If multiple endpoints provided(maybe including the first device endpoint) -
// they all should be passed as an argument, where possible, to be explicit.
const INPUT_EXTENDERS: Extender[] = [
    [
        ["msTemperatureMeasurement"],
        async (d, eps) => [new ExtendGenerator({extend: m.temperature, args: maybeEndpointArgs(d, eps), source: "temperature"})],
    ],
    [["msPressureMeasurement"], async (d, eps) => [new ExtendGenerator({extend: m.pressure, args: maybeEndpointArgs(d, eps), source: "pressure"})]],
    [["msRelativeHumidity"], async (d, eps) => [new ExtendGenerator({extend: m.humidity, args: maybeEndpointArgs(d, eps), source: "humidity"})]],
    [["msCO2"], async (d, eps) => [new ExtendGenerator({extend: m.co2, args: maybeEndpointArgs(d, eps), source: "co2"})]],
    [["genPowerCfg"], async (d, eps) => [new ExtendGenerator({extend: m.battery, source: "battery"})]],
    [["genOnOff", "genLevelCtrl", "lightingColorCtrl"], extenderOnOffLight],
    [["seMetering", "haElectricalMeasurement"], extenderElectricityMeter],
    [["closuresDoorLock"], extenderLock],
    [
        ["msIlluminanceMeasurement"],
        async (d, eps) => [new ExtendGenerator({extend: m.illuminance, args: maybeEndpointArgs(d, eps), source: "illuminance"})],
    ],
    [["msOccupancySensing"], async (d, eps) => [new ExtendGenerator({extend: m.occupancy, source: "occupancy"})]],
    [
        ["ssIasZone"],
        async (d, eps) => [
            new ExtendGenerator({
                extend: m.iasZoneAlarm,
                args: {
                    zoneType: "generic",
                    zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"],
                },
                source: "iasZoneAlarm",
            }),
        ],
    ],
    [["ssIasWd"], async (d, eps) => [new ExtendGenerator({extend: m.iasWarning, source: "iasWarning"})]],
    [
        ["genDeviceTempCfg"],
        async (d, eps) => [new ExtendGenerator({extend: m.deviceTemperature, args: maybeEndpointArgs(d, eps), source: "deviceTemperature"})],
    ],
    [["pm25Measurement"], async (d, eps) => [new ExtendGenerator({extend: m.pm25, args: maybeEndpointArgs(d, eps), source: "pm25"})]],
    [["msFlowMeasurement"], async (d, eps) => [new ExtendGenerator({extend: m.flow, args: maybeEndpointArgs(d, eps), source: "flow"})]],
    [["msSoilMoisture"], async (d, eps) => [new ExtendGenerator({extend: m.soilMoisture, args: maybeEndpointArgs(d, eps), source: "soilMoisture"})]],
    [
        ["closuresWindowCovering"],
        async (d, eps) => [new ExtendGenerator({extend: m.windowCovering, args: {controls: ["lift", "tilt"]}, source: "windowCovering"})],
    ],
    [["genBinaryInput"], extenderBinaryInput],
    [["genBinaryOutput"], extenderBinaryOutput],
    [["genAnalogInput"], extenderAnalogInput],
    [["genAnalogOutput"], extenderAnalogOutput],
];

const OUTPUT_EXTENDERS: Extender[] = [
    [["genOnOff"], async (d, eps) => [new ExtendGenerator({extend: m.commandsOnOff, args: maybeEndpointArgs(d, eps), source: "commandsOnOff"})]],
    [
        ["genLevelCtrl"],
        async (d, eps) => [new ExtendGenerator({extend: m.commandsLevelCtrl, args: maybeEndpointArgs(d, eps), source: "commandsLevelCtrl"})],
    ],
    [
        ["lightingColorCtrl"],
        async (d, eps) => [new ExtendGenerator({extend: m.commandsColorCtrl, args: maybeEndpointArgs(d, eps), source: "commandsColorCtrl"})],
    ],
    [
        ["closuresWindowCovering"],
        async (d, eps) => [
            new ExtendGenerator({extend: m.commandsWindowCovering, args: maybeEndpointArgs(d, eps), source: "commandsWindowCovering"}),
        ],
    ],
];

function generateSource(definition: DefinitionWithZigbeeModel, generatedExtend: GeneratedExtend[]): string {
    const imports = [...new Set(generatedExtend.map((e) => e.lib ?? "modernExtend"))];
    const importsStr = imports.map((e) => `import * as ${e === "modernExtend" ? "m" : e} from 'zigbee-herdsman-converters/lib/${e}';`).join("\n");
    return `${importsStr}

export default {
    zigbeeModel: ['${definition.zigbeeModel}'],
    model: '${definition.model}',
    vendor: '${definition.vendor}',
    description: 'Automatically generated definition',
    extend: [${generatedExtend.map((e) => `${e.lib ?? "m"}.${e.getSource()}`).join(", ")}],
    meta: ${JSON.stringify(definition.meta || {})},
};
`;
}

function generateGreenPowerSource(definition: DefinitionWithExtend, ieeeAddr: string): string {
    return `import {genericGreenPower} from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    fingerprint: [{modelID: '${definition.model}', ieeeAddr: new RegExp('^${ieeeAddr}$')}],
    model: '${definition.model}',
    vendor: '${definition.vendor}',
    description: 'Automatically generated definition for Green Power',
    extend: [genericGreenPower()],
};`;
}

export async function generateDefinition(device: Zh.Device): Promise<{externalDefinitionSource: string; definition: DefinitionWithExtend}> {
    if (device.type === "GreenPower") {
        return generateGreenPowerDefinition(device);
    }

    // Map cluster to all endpoints that have this cluster.
    const mapClusters = (endpoint: ZHModels.Endpoint, clusters: Cluster[], clusterMap: Map<string, ZHModels.Endpoint[]>) => {
        for (const cluster of clusters) {
            if (!clusterMap.has(cluster.name)) {
                clusterMap.set(cluster.name, []);
            }

            const endpointsWithCluster = clusterMap.get(cluster.name);
            endpointsWithCluster.push(endpoint);
        }
    };

    const knownInputClusters = INPUT_EXTENDERS.flatMap((ext) => ext[0]);
    const knownOutputClusters = OUTPUT_EXTENDERS.flatMap((ext) => ext[0]);

    const inputClusterMap = new Map<string, ZHModels.Endpoint[]>();
    const outputClusterMap = new Map<string, ZHModels.Endpoint[]>();

    for (const endpoint of device.endpoints) {
        // Filter clusters to leave only the ones that we can generate extenders for.
        const inputClusters = endpoint.getInputClusters().filter((c) => knownInputClusters.find((known) => known === c.name));
        const outputClusters = endpoint.getOutputClusters().filter((c) => knownOutputClusters.find((known) => known === c.name));

        mapClusters(endpoint, inputClusters, inputClusterMap);
        mapClusters(endpoint, outputClusters, outputClusterMap);
    }
    // Generate extenders
    const usedExtenders: Extender[] = [];
    const generatedExtend: GeneratedExtend[] = [];

    const addGenerators = async (clusterName: string, endpoints: Zh.Endpoint[], extenders: Extender[]) => {
        const extender = extenders.find((e) => e[0].includes(clusterName));
        if (!extender || usedExtenders.includes(extender)) {
            return;
        }
        usedExtenders.push(extender);
        generatedExtend.push(...(await extender[1](device, endpoints)));
    };

    for (const [cluster, endpoints] of inputClusterMap) {
        await addGenerators(cluster, endpoints, INPUT_EXTENDERS);
    }

    for (const [cluster, endpoints] of outputClusterMap) {
        await addGenerators(cluster, endpoints, OUTPUT_EXTENDERS);
    }

    const extenders = generatedExtend.map((e) => e.getExtend());
    // Generated definition below will provide this.
    for (const extender of extenders) {
        extender.endpoint = undefined;
    }

    // Currently multiEndpoint is enabled if device has more then 1 endpoint.
    // It is possible to better check if device should be considered multiEndpoint
    // based, for example, on generator arguments(i.e. presence of "endpointNames"),
    // but this will be enough for now.
    const endpointsWithoutGreenPower = device.endpoints.filter((e) => e.ID !== 242);
    const multiEndpoint = endpointsWithoutGreenPower.length > 1;

    if (multiEndpoint) {
        const endpoints: {[n: string]: number} = {};
        for (const endpoint of endpointsWithoutGreenPower) {
            endpoints[endpoint.ID.toString()] = endpoint.ID;
        }
        // Add to beginning for better visibility.
        generatedExtend.unshift(new ExtendGenerator({extend: m.deviceEndpoints, args: {endpoints}, source: "deviceEndpoints"}));
        extenders.unshift(generatedExtend[0].getExtend());
    }

    const definition: DefinitionWithExtend = {
        zigbeeModel: [device.modelID],
        model: device.modelID ?? "",
        vendor: device.manufacturerName ?? "",
        description: "Automatically generated definition",
        extend: extenders,
        generated: true,
    };

    if (multiEndpoint) {
        definition.meta = {multiEndpoint};
    }

    const externalDefinitionSource = generateSource(definition, generatedExtend);
    return {externalDefinitionSource, definition};
}

export function generateGreenPowerDefinition(device: Zh.Device): {externalDefinitionSource: string; definition: DefinitionWithExtend} {
    const definition: DefinitionWithExtend = {
        fingerprint: [{modelID: device.modelID, ieeeAddr: new RegExp(`^${device.ieeeAddr}$`)}],
        model: device.modelID ?? "",
        vendor: device.manufacturerName ?? "",
        description: "Automatically generated definition for Green Power",
        extend: [m.genericGreenPower()],
        generated: true,
    };

    const externalDefinitionSource = generateGreenPowerSource(definition, device.ieeeAddr);
    return {externalDefinitionSource, definition};
}

function stringifyEps(endpoints: ZHModels.Endpoint[]): string[] {
    return endpoints.map((e) => e.ID.toString());
}

// This function checks if provided array of endpoints contain
// only first device endpoint, which is passed in as `firstEndpoint`.
function onlyFirstDeviceEnpoint(device: Zh.Device, endpoints: ZHModels.Endpoint[]): boolean {
    return endpoints.length === 1 && endpoints[0].ID === device.endpoints[0].ID;
}

// maybeEndpoints returns either `toExtend` if only first device endpoint is provided
// as `endpoints`, or `endpointNames` with `toExtend`.
// This allows to drop unnecessary `endpointNames` argument if it is not needed.
function maybeEndpointArgs<T>(device: Zh.Device, endpoints: Zh.Endpoint[], toExtend?: T): T | undefined {
    if (onlyFirstDeviceEnpoint(device, endpoints)) {
        return toExtend;
    }

    return {endpointNames: stringifyEps(endpoints), ...toExtend};
}

async function extenderLock(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    // TODO: Support multiple endpoints
    if (endpoints.length > 1) {
        logger.warning("extenderLock can accept only one endpoint", NS);
    }

    const endpoint = endpoints[0];

    const pinCodeCount = await getClusterAttributeValue(endpoint, "closuresDoorLock", "numOfPinUsersSupported", 50);
    return [new ExtendGenerator({extend: m.lock, args: {pinCodeCount}, source: "lock"})];
}

async function extenderOnOffLight(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];

    const lightEndpoints = endpoints.filter((e) => e.supportsInputCluster("lightingColorCtrl") || e.supportsInputCluster("genLevelCtrl"));
    const onOffEndpoints = endpoints.filter((e) => lightEndpoints.findIndex((ep) => e.ID === ep.ID) === -1);

    if (onOffEndpoints.length !== 0) {
        let endpointNames: string[] | undefined;
        if (!onlyFirstDeviceEnpoint(device, endpoints)) {
            endpointNames = endpoints.map((e) => e.ID.toString());
        }
        generated.push(new ExtendGenerator({extend: m.onOff, args: {powerOnBehavior: false, endpointNames}, source: "onOff"}));
    }

    for (const endpoint of lightEndpoints) {
        // In case read fails, support all features with 31
        let colorCapabilities = 0;
        if (endpoint.supportsInputCluster("lightingColorCtrl")) {
            colorCapabilities = await getClusterAttributeValue(endpoint, "lightingColorCtrl", "colorCapabilities", 31);
        }
        const supportsHueSaturation = (colorCapabilities & (1 << 0)) > 0;
        const supportsEnhancedHueSaturation = (colorCapabilities & (1 << 1)) > 0;
        const supportsColorXY = (colorCapabilities & (1 << 3)) > 0;
        const supportsColorTemperature = (colorCapabilities & (1 << 4)) > 0;
        const args: m.LightArgs = {};

        if (supportsColorTemperature) {
            const minColorTemp = await getClusterAttributeValue(endpoint, "lightingColorCtrl", "colorTempPhysicalMin", 150);
            const maxColorTemp = await getClusterAttributeValue(endpoint, "lightingColorCtrl", "colorTempPhysicalMax", 500);
            args.colorTemp = {range: [minColorTemp, maxColorTemp]};
        }

        if (supportsColorXY) {
            args.color = true;
            if (supportsHueSaturation || supportsEnhancedHueSaturation) {
                args.color = {};
                if (supportsHueSaturation) args.color.modes = ["xy", "hs"];
                if (supportsEnhancedHueSaturation) args.color.enhancedHue = true;
            }
        }

        if (endpoint.getDevice().manufacturerID === Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V) {
            generated.push(new ExtendGenerator({extend: philips.m.light, args, source: "m.light", lib: "philips"}));
        } else {
            generated.push(new ExtendGenerator({extend: m.light, args, source: "light"}));
        }
    }

    return generated;
}

function extenderElectricityMeter(device: Zh.Device, endpoints: Zh.Endpoint[]): GeneratedExtend[] {
    // TODO: Support multiple endpoints
    if (endpoints.length > 1) {
        logger.warning("extenderElectricityMeter can accept only one endpoint", NS);
    }

    const endpoint = endpoints[0];

    const metering = endpoint.supportsInputCluster("seMetering");
    const electricalMeasurements = endpoint.supportsInputCluster("haElectricalMeasurement");
    const args: m.ElectricityMeterArgs = {};
    if (!metering || !electricalMeasurements) {
        args.cluster = metering ? "metering" : "electrical";
    }
    return [new ExtendGenerator({extend: m.electricityMeter, args, source: "electricityMeter"})];
}

async function extenderBinaryInput(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];
    for (const endpoint of endpoints) {
        const description = `binary_input_${endpoint.ID}`;
        const args: m.BinaryArgs<"genBinaryInput"> = {
            name: await getClusterAttributeValue(endpoint, "genBinaryInput", "description", description),
            cluster: "genBinaryInput",
            attribute: "presentValue",
            reporting: {min: "MIN", max: "MAX", change: 1},
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: description,
            access: "STATE_GET",
            endpointName: `${endpoint.ID}`,
        };
        generated.push(new ExtendGenerator({extend: m.binary, args, source: "binary"}));
    }
    return generated;
}

async function extenderBinaryOutput(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];
    for (const endpoint of endpoints) {
        const description = `binary_output_${endpoint.ID}`;
        const args: m.BinaryArgs<"genBinaryOutput"> = {
            name: await getClusterAttributeValue(endpoint, "genBinaryOutput", "description", description),
            cluster: "genBinaryOutput",
            attribute: "presentValue",
            reporting: {min: "MIN", max: "MAX", change: 1},
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: description,
            access: "ALL",
            endpointName: `${endpoint.ID}`,
        };
        generated.push(new ExtendGenerator({extend: m.binary, args, source: "binary"}));
    }
    return generated;
}

async function extenderAnalogInput(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];
    for (const endpoint of endpoints) {
        const description = `analog_input_${endpoint.ID}`;
        const args: m.NumericArgs<"genAnalogInput"> = {
            name: await getClusterAttributeValue(endpoint, "genAnalogInput", "description", description),
            cluster: "genAnalogInput",
            attribute: "presentValue",
            reporting: {min: "MIN", max: "MAX", change: 1},
            description: description,
            access: "STATE_GET",
            endpointNames: [`${endpoint.ID}`],
        };
        generated.push(new ExtendGenerator({extend: m.numeric, args, source: "numeric"}));
    }
    return generated;
}

async function extenderAnalogOutput(device: Zh.Device, endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];
    for (const endpoint of endpoints) {
        const description = `analog_output_${endpoint.ID}`;
        const args: m.NumericArgs<"genAnalogOutput"> = {
            name: await getClusterAttributeValue(endpoint, "genAnalogOutput", "description", description),
            valueMin: await getClusterAttributeValue(endpoint, "genAnalogOutput", "minPresentValue", undefined),
            valueMax: await getClusterAttributeValue(endpoint, "genAnalogOutput", "maxPresentValue", undefined),
            valueStep: await getClusterAttributeValue(endpoint, "genAnalogOutput", "resolution", undefined),
            cluster: "genAnalogOutput",
            attribute: "presentValue",
            reporting: {min: "MIN", max: "MAX", change: 1},
            description: description,
            access: "ALL",
            endpointNames: [`${endpoint.ID}`],
        };
        generated.push(new ExtendGenerator({extend: m.numeric, args, source: "numeric"}));
    }
    return generated;
}
