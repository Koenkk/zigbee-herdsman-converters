import {Zcl} from "zigbee-herdsman";

import * as m from "../lib/modernExtend";
import type {Configure, DefinitionExposesFunction, DefinitionWithExtend, DummyDevice, Expose, ModernExtend, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const AIR_QUALITY_CLUSTER = "aircubeAirQuality";

/**
 * The AirCube ships as two hardware variants that enumerate with the SAME
 * `modelID` ("AirCube") from a single firmware image:
 *   - Base: ENS210 (temp/RH) + ENS16x (eCO2, tVOC, VOC level).
 *   - Pro : SCD41 (true CO2, msCO2 cluster) + VCNL4040 (ambient light,
 *           msIlluminanceMeasurement cluster) on top of the ENS16x set.
 * The Pro-only clusters are only added to the endpoint when the hardware is a
 * Pro, so CO2 and illuminance are exposed only when the device actually
 * implements the cluster. Both the exposes and the configure are gated: an
 * ungated m.co2()/m.illuminance() configure calls getEndpointsWithCluster(),
 * which throws on a Base unit that has no such cluster. Pattern mirrors
 * third_reality.ts conditionalPressure().
 */
function whenClusterPresent(cluster: string, extend: ModernExtend): ModernExtend {
    const present = (device: Zh.Device | DummyDevice): boolean => {
        if (utils.isDummyDevice(device)) return true; // documentation generation: always show
        return device.endpoints?.some((endpoint: Zh.Endpoint) => endpoint.supportsInputCluster(cluster)) ?? false;
    };

    const exposeFn: DefinitionExposesFunction = (device, options) => {
        if (!present(device)) return [];
        const result: Expose[] = [];
        for (const item of extend.exposes ?? []) {
            if (typeof item === "function") result.push(...item(device, options));
            else result.push(item);
        }
        return result;
    };

    return {
        ...extend,
        exposes: [exposeFn],
        configure: (extend.configure ?? []).map((configureFn): Configure => {
            return async (device, coordinatorEndpoint, definition) => {
                if (present(device)) await configureFn(device, coordinatorEndpoint, definition);
            };
        }),
        isModernExtend: true,
    };
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["AirCube"],
        model: "AirCube",
        vendor: "StuckAtPrototype",
        description: "AirCube air quality monitor",
        extend: [
            m.deviceAddCustomCluster(AIR_QUALITY_CLUSTER, {
                name: AIR_QUALITY_CLUSTER,
                ID: 0xfc01,
                attributes: {
                    eco2: {name: "eco2", ID: 0x0000, type: Zcl.DataType.UINT16},
                    etvoc: {name: "etvoc", ID: 0x0001, type: Zcl.DataType.UINT16},
                    aqi: {name: "aqi", ID: 0x0002, type: Zcl.DataType.UINT16},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.temperature({reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 50}}),
            m.humidity({reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 100}}),
            m.numeric({
                name: "eco2",
                cluster: AIR_QUALITY_CLUSTER,
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT16},
                label: "Equivalent CO2",
                description: "Equivalent CO2 estimated from VOC (ENS16x)",
                unit: "ppm",
                access: "STATE_GET",
                valueMin: 400,
                valueMax: 8192,
                reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 50},
            }),
            m.numeric({
                name: "voc",
                cluster: AIR_QUALITY_CLUSTER,
                attribute: {ID: 0x0001, type: Zcl.DataType.UINT16},
                label: "VOC parts",
                description: "Equivalent total VOC (tVOC)",
                unit: "ppb",
                access: "STATE_GET",
                valueMin: 0,
                valueMax: 65535,
                reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 10},
            }),
            m.numeric({
                name: "aqi",
                cluster: AIR_QUALITY_CLUSTER,
                attribute: {ID: 0x0002, type: Zcl.DataType.UINT16},
                label: "VOC level",
                description: "TVOC-derived VOC level (0-500)",
                access: "STATE_GET",
                valueMin: 0,
                valueMax: 500,
                reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 5},
            }),
            m.numeric({
                name: "brightness",
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                label: "Brightness",
                description: "LED brightness",
                unit: "%",
                access: "ALL",
                valueMin: 0,
                valueMax: 100,
                valueStep: 1,
                precision: 0,
                reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 5},
            }),
            whenClusterPresent("msCO2", m.co2()),
            whenClusterPresent("msIlluminanceMeasurement", m.illuminance()),
            m.identify(),
        ],
    },
];
