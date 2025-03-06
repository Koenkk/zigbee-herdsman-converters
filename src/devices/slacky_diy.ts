import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
//import type {Configure, DefinitionWithExtend, Expose, Fz, ModernExtend, OnEvent} from "../lib/types";
import type {DefinitionWithExtend, Expose, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const defaultReporting = {min: 0, max: 300, change: 0};
const co2Reporting = {min: 10, max: 300, change: 0.000001};
const batReporting = {min: 3600, max: 0, change: 0};

const e = exposes.presets;
const ea = exposes.access;

function waterPreset(): ModernExtend {
    const exposes: Expose[] = [
        e
            .composite("preset", "preset", ea.SET)
            .withFeature(
                e
                    .numeric("hot_water_preset", ea.SET)
                    .withValueMin(0)
                    .withValueMax(99999999)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset hot water"),
            )
            .withFeature(
                e
                    .numeric("cold_water_preset", ea.SET)
                    .withValueMin(0)
                    .withValueMax(99999999)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset cold water"),
            )
            .withFeature(
                e
                    .numeric("step_water_preset", ea.SET)
                    .withValueMin(1)
                    .withValueMax(100)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset step water"),
            ),
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ["preset"],
            convertSet: async (entity, key, value, meta) => {
                const endpoint = meta.device.getEndpoint(3);
                const values = {
                    hot_water: (value as any).hot_water_preset,
                    cold_water: (value as any).cold_water_preset,
                    step_water: (value as any).step_water_preset,
                };
                if (values.hot_water !== undefined && values.hot_water >= 0) {
                    const hot_water_preset = Number.parseInt(values.hot_water);
                    await endpoint.write("seMetering", {61440: {value: hot_water_preset, type: 0x23}});
                }
                if (values.cold_water !== undefined && values.cold_water >= 0) {
                    const cold_water_preset = Number.parseInt(values.cold_water);
                    await endpoint.write("seMetering", {61441: {value: cold_water_preset, type: 0x23}});
                }
                if (values.step_water !== undefined && values.step_water >= 0) {
                    const step_water_preset = Number.parseInt(values.step_water);
                    await endpoint.write("seMetering", {61442: {value: step_water_preset, type: 0x21}});
                }
            },
        },
    ];
    return {toZigbee, exposes, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Tuya_CO2Sensor_r01"],
        model: "Tuya_CO2Sensor_r01",
        vendor: "Slacky-DIY",
        description: "Tuya CO2 sensor with custom Firmware",
        extend: [m.co2({reporting: co2Reporting})],
        ota: true,
    },
    {
        zigbeeModel: ["Watermeter_TLSR8258"],
        model: "Watermeter_TLSR8258",
        vendor: "Slacky-DIY",
        description: "Water Meter",
        configure: async (device, coordinatorEndpoint, logger) => {
            const thirdEndpoint = device.getEndpoint(3);
            await thirdEndpoint.read("seMetering", [0xf000, 0xf001, 0xf002]);
        },
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    "1": 1,
                    "2": 2,
                    "3": 3,
                    "4": 4,
                    "5": 5,
                },
            }),
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1"]}),
            m.battery({
                voltage: true,
                voltageReporting: true,
                percentageReportingConfig: batReporting,
                voltageReportingConfig: batReporting,
            }),
            m.enumLookup({
                name: "switch_actions",
                endpointName: "4",
                lookup: {on_off: 0, off_on: 1, toggle: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch 1",
            }),
            m.enumLookup({
                name: "switch_actions",
                endpointName: "5",
                lookup: {on_off: 0, off_on: 1, toggle: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch 2",
            }),
            m.numeric({
                name: "volume",
                endpointNames: ["1"],
                access: "STATE_GET",
                cluster: "seMetering",
                attribute: "currentSummDelivered",
                reporting: {min: 0, max: 300, change: 0},
                unit: "L",
                description: "Hot water",
            }),
            m.numeric({
                name: "volume",
                endpointNames: ["2"],
                access: "STATE_GET",
                cluster: "seMetering",
                attribute: "currentSummDelivered",
                reporting: {min: 0, max: 300, change: 0},
                unit: "L",
                description: "Cold water",
            }),
            waterPreset(),
        ],
        ota: true,
        meta: {multiEndpoint: true},
    },
];
