import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import * as m from "../lib/modernExtend";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_dd8wwzcy"]),
        model: "MG-AUZG01",
        vendor: "MakeGood",
        description: "Double Zigbee power point",
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, indicatorMode: true, endpoints: ["l1", "l2"], electricalMeasurements: true})],
        meta: {multiEndpointSkip: ["power", "current", "voltage", "energy"], multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 100, multiplier: 1});
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3210_bep7ccew"]),
        model: "MG-GPO01",
        vendor: "MakeGood",
        description: "Double Zigbee power point",
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power],
        extend: [
            m.deviceEndpoints({endpoints: {right: 1, left: 2}}),
            m.identify(),
            tuya.modernExtend.tuyaOnOff({
                endpoints: ["right", "left"],
                powerOutageMemory: true,
                indicatorMode: true,
                childLock: true,
                onOffCountdown: true,
                electricalMeasurements: true,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint1);
            await reporting.rmsVoltage(endpoint1, {min: 5, max: 3600, change: 1});
            await reporting.rmsCurrent(endpoint1, {min: 5, max: 3600, change: 1});
            await reporting.activePower(endpoint1, {min: 5, max: 3600, change: 1});
            await reporting.currentSummDelivered(endpoint1, {min: 5, max: 3600, change: 5});
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            endpoint1.saveClusterAttributeKeyValue("haElectricalMeasurement", {
                acCurrentDivisor: 1000,
                acCurrentMultiplier: 1,
                acPowerDivisor: 1,
                acPowerMultiplier: 1,
                acVoltageDivisor: 1,
                acVoltageMultiplier: 1,
            });
            endpoint1.saveClusterAttributeKeyValue("seMetering", {
                divisor: 100,
                multiplier: 1,
            });
            device.save();
        },
        meta: {
            multiEndpoint: true,
            multiEndpointSkip: ["power", "current", "voltage", "energy"],
            tuyaDatapoints: [
                [1, "state_right", tuya.valueConverter.onOff],
                [2, "state_left", tuya.valueConverter.onOff],
                [9, "countdown_right", tuya.valueConverter.raw],
                [10, "countdown_left", tuya.valueConverter.raw],
                [17, "energy", tuya.valueConverter.divideBy100],
                [18, "current", tuya.valueConverter.divideBy1000],
                [19, "power", tuya.valueConverter.raw],
                [20, "voltage", tuya.valueConverter.divideBy10],
                [26, "fault", tuya.valueConverter.trueFalse0],
                [27, "power_outage_memory", tuya.valueConverterBasic.lookup({off: 0, on: 1, restore: 2})],
                [28, "indicator_mode", tuya.valueConverterBasic.lookup({off: 0, "off/on": 1, "on/off": 2, on: 3})],
                [29, "child_lock", tuya.valueConverter.lockUnlock],
            ],
        },
    },
];
