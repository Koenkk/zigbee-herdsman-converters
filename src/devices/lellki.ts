import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_air9m6af", "_TZ3000_9djocypn", "_TZ3000_bppxj3sf"]),
        zigbeeModel: ["JZ-ZB-005", "E220-KR5N0Z0-HA"],
        model: "WP33-EU/WP34-EU",
        vendor: "LELLKI",
        description: "Multiprise with 4 AC outlets and 2 USB super charging ports (16A)",
        toZigbee: [tuya.tz.power_on_behavior_2],
        fromZigbee: [tuya.fz.power_on_behavior_2],
        exposes: [e.power_on_behavior()],
        configure: tuya.configureMagicPacket,
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5}}),
            m.onOff({endpointNames: ["l1", "l2", "l3", "l4", "l5"], powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["JZ-ZB-001"],
        model: "JZ-ZB-001",
        description: "Smart plug (without power monitoring)",
        vendor: "LELLKI",
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["JZ-ZB-003"],
        model: "JZ-ZB-003",
        vendor: "LELLKI",
        description: "3 gang switch",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}), m.onOff({endpointNames: ["l1", "l2", "l3"]})],
    },
    {
        zigbeeModel: ["JZ-ZB-002"],
        model: "JZ-ZB-002",
        vendor: "LELLKI",
        description: "2 gang touch switch",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_twqctvna"]),
        model: "CM001",
        vendor: "LELLKI",
        description: "Circuit switch",
        extend: [m.onOff()],
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_z6fgd73r"]),
        model: "XF-EU-S100-1-M",
        description: "Touch switch 1 gang (with power monitoring)",
        vendor: "LELLKI",
        extend: [
            tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, electricalMeasurements: true}),
            tuya.modernExtend.electricityMeasurementPoll(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 100, multiplier: 1});
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_0yxeawjt"]),
        model: "WK34-EU",
        description: "Power socket EU (with power monitoring)",
        vendor: "LELLKI",
        extend: [
            tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, electricalMeasurements: true}),
            tuya.modernExtend.electricityMeasurementPoll(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 100, multiplier: 1});
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_c7nc9w3c", "_TZ3210_c7nc9w3c"]),
        model: "WP30-EU",
        description: "Power cord 4 sockets EU (with power monitoring)",
        vendor: "LELLKI",
        fromZigbee: [fz.on_off_force_multiendpoint, fz.electrical_measurement, fz.metering, tuya.fz.power_outage_memory],
        toZigbee: [tz.on_off, tuya.tz.power_on_behavior_1],
        extend: [tuya.modernExtend.electricityMeasurementPoll()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const ep of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ["genOnOff"]);
                await reporting.onOff(device.getEndpoint(ep));
            }
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.enum("power_outage_memory", ea.ALL, ["on", "off", "restore"]).withDescription("Recover state after power outage"),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
    },
];
