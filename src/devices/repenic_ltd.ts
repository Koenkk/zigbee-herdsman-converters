import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, KeyValueNumberString, ModernExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const actionLookup: KeyValueNumberString = {2: "hold", 4: "release", 8: "double", 16: "triple"};

interface RepenicPrivateE003Cluster {
    attributes: {sceneMode: number};
    commands: {setSleepPattern: {pattern: Buffer}; setWakeupPattern: {pattern: Buffer}; setNightPattern: {pattern: Buffer}};
    commandResponses: never;
}

const hour = (name = "hour") => e.numeric(name, ea.SET).withValueMin(0).withValueMax(23);
const minute = (name = "minute") => e.numeric(name, ea.SET).withValueMin(0).withValueMax(59);
const brightness = () => e.numeric("brightness", ea.SET).withValueMin(1).withValueMax(100).withUnit("%");
const duration = () => e.enum("duration", ea.SET, [10, 20, 30]).withDescription("Duration in minutes");

const pattern = (
    name: string,
    command: keyof RepenicPrivateE003Cluster["commands"],
    description: string,
    features: exposes.Feature[],
    toBytes: (v: KeyValueAny) => number[],
): ModernExtend => ({
    exposes: [
        [e.binary("state", ea.SET, "ON", "OFF"), hour(), minute(), ...features].reduce<exposes.Composite>(
            (composite, feature) => composite.withFeature(feature),
            e.composite(name, name, ea.SET).withDescription(description),
        ),
    ],
    toZigbee: [
        {
            key: [name],
            convertSet: async (entity, key, value: KeyValueAny, meta) => {
                const pattern = Buffer.from([value.state === "ON" ? 1 : 0, value.hour, value.minute, ...toBytes(value)]);
                await entity.command<"repenicPrivateE003", typeof command, RepenicPrivateE003Cluster>("repenicPrivateE003", command, {pattern});
                return {state: {[name]: value}};
            },
        },
    ],
    isModernExtend: true,
});

interface RepenicPrivateE00BCluster {
    attributes: {remoteMode: number};
    commands: never;
    commandResponses: never;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RD-250ZG"],
        model: "RD-250ZG",
        vendor: "Repenic Ltd.",
        description: "Dimmer",
        extend: [
            m.light({effect: false, configureReporting: true}),
            m.electricityMeter(),
            m.numeric({
                name: "min_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa000, type: 0x20},
                description: "Minimum brightness (≈1–99%)",
                valueMin: 1,
                valueMax: 99,
            }),
            m.numeric({
                name: "max_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa003, type: 0x20},
                description: "Maximum brightness (≈1–100%)",
                valueMin: 1,
                valueMax: 100,
            }),
            m.numeric({
                name: "start_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0x0011, type: 0x20},
                description: "Default brightness at power-on/startup (0-254)",
                valueMin: 0,
                valueMax: 254,
            }),
            m.binary({
                name: "boost",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa004, type: 0x20},
                description: "Boost function",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
            }),
            m.enumLookup({
                name: "dimming_mode",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xb000, type: 0x30},
                description: "Dimming mode",
                lookup: {"Leading edge": 0, "Trailing edge": 1},
            }),
            m.numeric({
                name: "default_move_rate",
                cluster: "genLevelCtrl",
                attribute: {ID: 0x0014, type: 0x20},
                description: "Default Move Rate",
                valueMin: 1,
                valueMax: 10,
            }),
            m.deviceAddCustomCluster("repenicPrivateE003", {
                ID: 0xe003,
                name: "repenicPrivateE003",
                attributes: {
                    sceneMode: {ID: 0x0003, name: "sceneMode", type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                },
                commands: {
                    setSleepPattern: {ID: 0x00, name: "setSleepPattern", parameters: [{name: "pattern", type: Zcl.BuffaloZclDataType.BUFFER}]},
                    setWakeupPattern: {ID: 0x01, name: "setWakeupPattern", parameters: [{name: "pattern", type: Zcl.BuffaloZclDataType.BUFFER}]},
                    setNightPattern: {ID: 0x02, name: "setNightPattern", parameters: [{name: "pattern", type: Zcl.BuffaloZclDataType.BUFFER}]},
                },
                commandsResponse: {},
            }),
            pattern("sleep_pattern", "setSleepPattern", "Co-sleeping mode", [duration()], (v) => [0, v.duration, 0]),
            pattern("wakeup_pattern", "setWakeupPattern", "Sunrise mode", [brightness(), duration()], (v) => [
                Math.trunc(v.brightness * 2.54),
                v.duration,
                0,
            ]),
            pattern(
                "night_pattern",
                "setNightPattern",
                "Moonlight mode, ends the next day",
                [brightness(), hour("end_hour"), minute("end_minute")],
                (v) => [Math.trunc(v.brightness * 2.54), v.end_hour, v.end_minute],
            ),
            m.binary<"repenicPrivateE003", RepenicPrivateE003Cluster>({
                name: "scene_mode",
                cluster: "repenicPrivateE003",
                attribute: "sceneMode",
                description: "Scene mode",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
            }),
            {
                fromZigbee: [
                    {
                        cluster: 0xe004,
                        type: ["raw"],
                        convert: (model, msg, publish, options, meta) => {
                            const value = msg.data.findLast((byte) => byte in actionLookup);
                            if (value !== undefined) return {action: actionLookup[value]};
                        },
                    } satisfies Fz.Converter<0xe004, undefined, ["raw"]>,
                ],
                exposes: [e.action(Object.values(actionLookup))],
                isModernExtend: true,
            },
        ],
    },
    {
        zigbeeModel: ["RS-T03AZG", "RS-R03AZG"],
        model: "RS-T03AZG",
        vendor: "Repenic Ltd.",
        description: "Smart plug with power monitoring",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter(),
            m.deviceAddCustomCluster("repenicPrivateE00B", {
                ID: 0xe00b,
                name: "repenicPrivateE00B",
                attributes: {
                    remoteMode: {ID: 0x0000, name: "remoteMode", type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup<"repenicPrivateE00B", RepenicPrivateE00BCluster>({
                name: "remote_mode",
                cluster: "repenicPrivateE00B",
                attribute: "remoteMode",
                description: "Remote controller mode: with load or remote only",
                lookup: {load: 0, remote: 1},
            }),
        ],
    },
];
