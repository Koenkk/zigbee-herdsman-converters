import {Zcl} from "zigbee-herdsman";

import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

// Custom manufacturer cluster (0xFC00) that holds the NoDieby device settings.
// The firmware registers these as plain read/write attributes without a
// manufacturer code, so the cluster is defined without one here as well.
const NODIEBY_CLUSTER = "nodiebyConfig";

// Describes the custom cluster so the typed modernExtend helpers (numeric,
// enumLookup) accept the attribute names below.
interface NodiebyConfig {
    attributes: {
        ledBrightness: number;
        sirenVolume: number;
        sensitivity: number;
        alarmDuration: number;
        alarmDelay: number;
    };
    commands: never;
    commandResponses: never;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ND-01"],
        model: "ND-01",
        vendor: "NoDieby",
        description: "Infrasonic intrusion detector",
        extend: [
            // Endpoint 1 = alarm (motion, armed state, settings), endpoint 2 = siren.
            m.deviceEndpoints({endpoints: {alarm: 1, siren: 2}}),
            m.deviceAddCustomCluster(NODIEBY_CLUSTER, {
                name: NODIEBY_CLUSTER,
                ID: 0xfc00,
                attributes: {
                    ledBrightness: {name: "ledBrightness", ID: 0x0001, type: Zcl.DataType.UINT8, write: true, max: 100},
                    sirenVolume: {name: "sirenVolume", ID: 0x0002, type: Zcl.DataType.UINT8, write: true, max: 100},
                    sensitivity: {name: "sensitivity", ID: 0x0003, type: Zcl.DataType.UINT8, write: true, max: 2},
                    alarmDuration: {name: "alarmDuration", ID: 0x0004, type: Zcl.DataType.UINT16, write: true, max: 300},
                    alarmDelay: {name: "alarmDelay", ID: 0x0005, type: Zcl.DataType.UINT8, write: true, max: 120},
                },
                commands: {},
                commandsResponse: {},
            }),
            // Armed state on endpoint 1, siren on endpoint 2. powerOnBehavior is
            // disabled because the firmware does not implement startUpOnOff.
            m.onOff({powerOnBehavior: false, endpointNames: ["alarm", "siren"]}),
            // IAS Zone motion detection on endpoint 1, surfaced as occupancy.
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1"]}),
            // iasZoneAlarm is event-driven and never reads zoneStatus at join, so
            // occupancy stays unknown until the first notification. Read it once
            // during configure to initialise the state right after pairing.
            {
                isModernExtend: true,
                configure: [
                    async (device) => {
                        await device.getEndpoint(1).read("ssIasZone", ["zoneStatus"]);
                    },
                ],
            },
            m.numeric<typeof NODIEBY_CLUSTER, NodiebyConfig>({
                name: "led_brightness",
                cluster: NODIEBY_CLUSTER,
                attribute: "ledBrightness",
                valueMin: 0,
                valueMax: 100,
                unit: "%",
                description: "Brightness of the status LED",
                access: "ALL",
                entityCategory: "config",
                endpointNames: ["alarm"],
            }),
            m.numeric<typeof NODIEBY_CLUSTER, NodiebyConfig>({
                name: "volume",
                cluster: NODIEBY_CLUSTER,
                attribute: "sirenVolume",
                valueMin: 0,
                valueMax: 100,
                unit: "%",
                description: "Siren volume",
                access: "ALL",
                entityCategory: "config",
                endpointNames: ["alarm"],
            }),
            m.enumLookup<typeof NODIEBY_CLUSTER, NodiebyConfig>({
                name: "sensitivity",
                cluster: NODIEBY_CLUSTER,
                attribute: "sensitivity",
                lookup: {low: 0, medium: 1, high: 2},
                description: "Intrusion detection sensitivity",
                access: "ALL",
                entityCategory: "config",
                endpointName: "alarm",
            }),
            m.numeric<typeof NODIEBY_CLUSTER, NodiebyConfig>({
                name: "alarm_duration",
                cluster: NODIEBY_CLUSTER,
                attribute: "alarmDuration",
                valueMin: 1,
                valueMax: 300,
                unit: "s",
                description: "Siren duration once triggered",
                access: "ALL",
                entityCategory: "config",
                endpointNames: ["alarm"],
            }),
            m.numeric<typeof NODIEBY_CLUSTER, NodiebyConfig>({
                name: "alarm_delay",
                cluster: NODIEBY_CLUSTER,
                attribute: "alarmDelay",
                valueMin: 0,
                valueMax: 120,
                unit: "s",
                description: "Delay before the alarm triggers after detection",
                access: "ALL",
                entityCategory: "config",
                endpointNames: ["alarm"],
            }),
        ],
    },
];
