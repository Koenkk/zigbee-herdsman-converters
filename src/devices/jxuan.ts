import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueNumberString, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const jxuanExtend = {
    addJxuanGenOnOffCluster: () =>
        m.deviceAddCustomCluster("genOnOff", {
            name: "genOnOff",
            ID: Zcl.Clusters.genOnOff.ID,
            attributes: {
                powerOutageMemory: {name: "powerOutageMemory", ID: 0x2000, type: Zcl.DataType.UINT8},
            },
            commands: {},
            commandsResponse: {},
        }),
};

const tzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    SPZ01_power_outage_memory: {
        key: ["power_outage_memory"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("genOnOff", {8192: {value: value ? 0x01 : 0x00, type: 0x20}});
            return {state: {power_outage_memory: value}};
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    WSZ01_on_off_action: {
        cluster: 65029,
        type: "attributeReport",
        convert: (model, msg, publish, options, meta) => {
            const clickMapping: KeyValueNumberString = {0: "release", 1: "single", 2: "double", 3: "hold"};
            return {action: `${clickMapping[msg.data["1"]]}`};
        },
    } satisfies Fz.Converter<65029, undefined, "attributeReport">,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["wall pir"],
        model: "PRZ01",
        vendor: "J.XUAN",
        description: "Human body movement sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ["door sensor"],
        model: "DSZ01",
        vendor: "J.XUAN",
        description: "Door or window contact switch",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ["JD-SWITCH\u000002"],
        model: "WSZ01",
        vendor: "J.XUAN",
        description: "Wireless switch",
        fromZigbee: [fzLocal.WSZ01_on_off_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(["release", "single", "double", "hold"]), e.battery()],
    },
    {
        zigbeeModel: ["00090bdc"],
        model: "SPZ01",
        vendor: "J.XUAN",
        description: "plug",
        extend: [jxuanExtend.addJxuanGenOnOffCluster()],
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        exposes: [e.switch(), e.power(), e.power_outage_memory().withAccess(ea.STATE_SET)],
        toZigbee: [tz.on_off, tzLocal.SPZ01_power_outage_memory],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
        },
    },
];
