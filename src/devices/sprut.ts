import {Zcl} from "zigbee-herdsman";
import * as exp from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, ModernExtend, Tz} from "../lib/types";

const manufacturerId = 26214;

function sendCommand(args: {name: string; cluster: string | number; command: string | number; description: string}): ModernExtend {
    const {name, cluster, command, description} = args;
    const exposes = [exp.enum(name, exp.access.SET, ["SEND"]).withDescription(description)];

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet: async (entity, key, value, meta) => {
                // @ts-expect-error ignore
                const payload = value.payload != null ? value.payload : {};
                await entity.command(cluster, command, payload, {manufacturerCode: manufacturerId});
            },
        },
    ];

    return {exposes, toZigbee, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Bed.box"],
        model: "Bed.box",
        vendor: "Sprut.device",
        description: "Sprut bed.box ergomotion controller",
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    light: 1,
                    head_control: 2,
                    foot_control: 3,
                    head_massage_intensity: 4,
                    foot_massage_intensity: 5,
                    massage_duration: 6,
                    flat: 7,
                    zero_gravity: 8,
                    reading: 9,
                    tv: 10,
                    head_feedback: 11,
                    foot_feedback: 12,
                    clear_angles_settings: 16,
                    massage: 21,
                    anti_snoring: 24,
                    move: 26,
                    stop: 27,
                },
            }),
            m.numeric({
                name: "head_position",
                endpointNames: ["head_control"],
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Head position (0-100%)",
                valueMin: 0,
                valueMax: 100,
                unit: "%",
                reporting: {
                    min: 1,
                    max: 100,
                    change: 1,
                },
            }),
            m.numeric({
                name: "foot_position",
                endpointNames: ["foot_control"],
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Foot position (0-100%)",
                valueMin: 0,
                valueMax: 100,
                unit: "%",
                reporting: {
                    min: 1,
                    max: 100,
                    change: 1,
                },
            }),
            m.numeric({
                name: "current_head_position",
                endpointNames: ["head_feedback"],
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                description: "Current head position",
                access: "STATE_GET",
                unit: "%",
            }),
            m.numeric({
                name: "current_foot_position",
                endpointNames: ["foot_feedback"],
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                description: "Current foot position",
                access: "STATE_GET",
                unit: "%",
            }),
            m.enumLookup({
                name: "head_massage_intensity",
                endpointName: "head_massage_intensity",
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Head massage intensity (0-6)",
                lookup: {off: 0, one: 1, two: 2, three: 3, four: 4, five: 5},
            }),
            m.enumLookup({
                name: "foot_massage_intensity",
                endpointName: "foot_massage_intensity",
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Foot massage intensity (0-6)",
                lookup: {off: 0, one: 1, two: 2, three: 3, four: 4, five: 5},
            }),
            m.enumLookup({
                name: "massage_duration",
                endpointName: "massage_duration",
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Massage duration (0=off, 1=10min, 2=20min, 3=30min)",
                lookup: {off: 0, ten_min: 1, twenty_min: 2, thirty_min: 3},
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["light"],
                description: "Backlight",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["flat"],
                description: "Flat mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["zero_gravity"],
                description: "Zero gravity mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["reading"],
                description: "Reading mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["tv"],
                description: "TV mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["clear_angles_settings"],
                description: "Clear angle settings",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["massage"],
                description: "Massage",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["anti_snoring"],
                description: "Anti snoring mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["move"],
                description: "Move",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["stop"],
                description: "Stop",
            }),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genOnOff"]);

            for (const ep of device.endpoints) {
                if ([2, 3, 4, 5, 6].includes(ep.ID)) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genMultistateInput"]);
                }

                if ([11, 12].includes(ep.ID)) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genMultistateOutput"]);
                }
            }
        },
    },
    {
        zigbeeModel: ["Drivent"],
        model: "Drivent",
        vendor: "Sprut.device",
        description: "Drivent window drive",
        ota: true,
        extend: [
            m.deviceAddCustomCluster("closuresWindowCovering", {
                ID: 258,
                attributes: {},
                commands: {
                    resetLimit: {ID: 0x0000, parameters: []},
                    openLimit: {ID: 0x0001, parameters: []},
                    closeLimit: {ID: 0x0002, parameters: []},
                    resetBlock: {ID: 0x0003, parameters: []},
                },
                commandsResponse: {},
            }),
            m.windowCovering({controls: ["lift"]}),
            m.enumLookup({
                name: "drive_state",
                cluster: "closuresWindowCovering",
                attribute: {ID: 0x6609, type: Zcl.DataType.UINT8},
                lookup: {closing: 0, opening: 1, stopped: 2},
                description: "Drive state",
                zigbeeCommandOptions: {manufacturerCode: manufacturerId},
                access: "STATE_GET",
            }),
            m.binary({
                name: "blocked_jam",
                valueOn: ["ON", true],
                valueOff: ["OFF", false],
                cluster: "closuresWindowCovering",
                attribute: {ID: 0x660a, type: Zcl.DataType.BOOLEAN},
                description: "Blocked after 5 jam",
                zigbeeCommandOptions: {manufacturerCode: manufacturerId},
                access: "STATE_GET",
            }),
            m.binary({
                name: "blocked_many",
                valueOn: ["ON", true],
                valueOff: ["OFF", false],
                cluster: "closuresWindowCovering",
                attribute: {ID: 0x660b, type: Zcl.DataType.BOOLEAN},
                description: "Blocked after 45 attempts",
                zigbeeCommandOptions: {manufacturerCode: manufacturerId},
                access: "STATE_GET",
            }),
            sendCommand({
                name: "reset_block",
                cluster: "closuresWindowCovering",
                command: 0x0003,
                description: "Reset block",
            }),
            m.numeric({
                name: "speed",
                cluster: "closuresWindowCovering",
                attribute: {ID: 0x6606, type: Zcl.DataType.UINT8},
                valueMin: 0,
                valueMax: 100,
                valueStep: 25,
                unit: "%",
                description: "Speed",
                zigbeeCommandOptions: {manufacturerCode: manufacturerId},
                access: "ALL",
            }),
            sendCommand({
                name: "open_limit",
                cluster: "closuresWindowCovering",
                command: 0x0001,
                description: "Set open limit",
            }),
            sendCommand({
                name: "close_limit",
                cluster: "closuresWindowCovering",
                command: 0x0002,
                description: "Set close limit",
            }),
            sendCommand({
                name: "reset_limit",
                cluster: "closuresWindowCovering",
                command: 0x0000,
                description: "Reset limits",
            }),
            m.binary({
                name: "calibrate",
                valueOn: ["ON", true],
                valueOff: ["OFF", false],
                cluster: "closuresWindowCovering",
                attribute: {ID: 0x6605, type: Zcl.DataType.BOOLEAN},
                description: "Calibration",
                zigbeeCommandOptions: {manufacturerCode: manufacturerId},
                access: "ALL",
            }),
            m.binary({
                name: "wifi",
                valueOn: ["ON", true],
                valueOff: ["OFF", false],
                cluster: 0x6600,
                attribute: {ID: 0x6600, type: Zcl.DataType.BOOLEAN},
                description: "Enable Wifi AP",
                zigbeeCommandOptions: {manufacturerCode: manufacturerId},
                access: "ALL",
            }),
        ],
    },
];
