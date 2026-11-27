import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

// genLevelCtrl uses a 0-100 scale instead of 0-254 (moveToLevel above 100 is ignored)
const vibrantLight = (args: m.LightArgs): ModernExtend => {
    const scale = (value: unknown, from: number, to: number) => (value == null ? value : Math.round((Number(value) * to) / from));
    const tzBrightness: Tz.Converter = {
        ...tz.light_onoff_brightness,
        convertSet: async (entity, key, value, meta) => {
            const {brightness_percent: percent, ...message} = meta.message;
            if (percent != null) message.brightness = utils.mapNumberRange(Number(percent), 0, 100, 0, 254);
            // A plain "on" makes the bulb go to full brightness instead of its previous level
            const onOff = typeof message.state === "string" ? message.state.toUpperCase() : undefined;
            if (
                message.brightness == null &&
                meta.state.brightness != null &&
                (onOff === "ON" || (onOff === "TOGGLE" && meta.state.state === "OFF"))
            ) {
                message.state = "ON";
                message.brightness = meta.state.brightness;
            }
            message.brightness = scale(message.brightness, 254, 100);
            const state = {...meta.state, brightness: scale(meta.state.brightness, 254, 100)};
            const result = await tz.light_onoff_brightness.convertSet(entity, key, value, {...meta, message, state});
            if (result && result.state?.brightness != null) result.state.brightness = scale(result.state.brightness, 100, 254);
            return result;
        },
    };
    const fzBrightness: Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]> = {
        ...fz.brightness,
        convert: (model, msg, publish, options, meta) => {
            const result = fz.brightness.convert(model, msg, publish, options, meta) as KeyValueAny;
            if (result?.brightness != null) result.brightness = scale(result.brightness, 100, 254);
            return result;
        },
    };
    const extend = m.light(args);
    extend.toZigbee = extend.toZigbee.map((c) => (c === tz.light_onoff_brightness ? tzBrightness : c));
    extend.fromZigbee = extend.fromZigbee.map((c) => (c === fz.brightness ? fzBrightness : c));
    return extend;
};

const e = exposes.presets;

// SR260 keys, indexed by the key code in its "c4.zr.bb/bh/be <code>" text frames
const sr260Keys = [
    "room_off",
    "watch",
    "control4",
    "listen",
    "list",
    "custom_1",
    "custom_2",
    "custom_3",
    "guide",
    "page_up",
    "page_down",
    "prev",
    "volume_up",
    "up",
    "channel_up",
    "left",
    "select",
    "right",
    "volume_down",
    "down",
    "channel_down",
    "mute",
    "info",
    "menu",
    "cancel",
    "rewind",
    "dvr",
    "fast_forward",
    "skip_back",
    "play",
    "skip_forward",
    "record",
    "pause",
    "stop",
    "red",
    "green",
    "yellow",
    "blue",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "star",
    "0",
    "pound",
];
const sr260Gestures: KeyValueAny = {"c4.zr.bb": "press", "c4.zr.bh": "hold", "c4.zr.be": "release"};

// The SR260 keeps rejoining until its controller identity (attributes 8-10 on cluster 0x0001,
// profile 0xC25D, endpoint 2) is answered. It also expects it back on its periodic check-in.
// Key presses and battery arrive as ASCII text on endpoint 0xC5, e.g. "0t422c sa c4.zr.bb 02 0000 0000".
const sr260 = (): ModernExtend => {
    const options = {profileId: 0xc25d, srcEndpoint: 2, disableDefaultResponse: true};
    const identity = (device: Zh.Device) => ({
        8: {value: 0, type: Zcl.DataType.UINT16},
        9: {value: device.meta.c4Coordinator, type: Zcl.DataType.IEEE_ADDR},
        10: {value: 2, type: Zcl.DataType.UINT8},
    });
    const fromZigbee = [
        {
            cluster: "genPowerCfg",
            type: ["raw"],
            convert: (model, msg, publish, opts, meta) => {
                if (msg.endpoint.ID !== 0xc5 || !Buffer.isBuffer(msg.data)) return;
                const [, verb, command, arg] = msg.data.toString("latin1").trim().split(/\s+/);
                if (verb !== "sa") return;
                const n = Number.parseInt(arg, 16);
                if (sr260Gestures[command] && sr260Keys[n]) return {action: `${sr260Keys[n]}_${sr260Gestures[command]}`};
                if (command === "c4.zr.mot") return {action: "wake"};
                if (command === "c4.zr.bl" && n <= 100) return {battery: n};
            },
        } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
        {
            cluster: "genPowerCfg",
            type: ["attributeReport"],
            convert: (model, msg, publish, opts, meta) => {
                if (msg.endpoint.ID === 2 && (msg.data as KeyValueAny)[7] !== undefined) {
                    msg.endpoint.report("genPowerCfg", identity(meta.device), options).catch(() => {});
                }
            },
        } satisfies Fz.Converter<"genPowerCfg", undefined, ["attributeReport"]>,
    ];
    return {
        fromZigbee,
        exposes: [e.battery(), e.action([...sr260Keys.flatMap((k) => Object.values(sr260Gestures).map((g) => `${k}_${g}`)), "wake"])],
        configure: [
            (device, coordinatorEndpoint) => {
                device.meta.c4Coordinator = coordinatorEndpoint.deviceIeeeAddress;
                device.save();
            },
        ],
        onEvent: [
            (event) => {
                if (event.type !== "start") return;
                const {device} = event.data;
                device.customReadResponse = (frame, endpoint) => {
                    if (endpoint.ID !== 2 || !frame.isCluster("genPowerCfg")) return false;
                    endpoint.readResponse("genPowerCfg", frame.header.transactionSequenceNumber, identity(device), options).catch(() => {});
                    return true;
                };
            },
        ],
        isModernExtend: true,
    };
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["C4-VB-FTW-A19"],
        model: "VB-FTW-A19",
        vendor: "Control4",
        description: "Vibrant tunable white A19 lamp",
        extend: [m.identify(), vibrantLight({colorTemp: {range: [153, 555]}})],
        ota: true,
    },
    {
        zigbeeModel: ["C4-VB-RGBTW-A19"],
        model: "VB-RGBTW-A19",
        vendor: "Control4",
        description: "Vibrant RGB tunable white A19 lamp",
        extend: [m.identify(), vibrantLight({colorTemp: {range: [153, 555]}, color: {modes: ["xy"]}})],
        ota: true,
    },
    {
        // No genBasic: zigbee-herdsman's Control4 interview quirk sets the modelID
        fingerprint: [{modelID: "C4-Zigbee", type: "EndDevice"}],
        model: "C4-SR260",
        vendor: "Control4",
        description: "System remote",
        extend: [sr260()],
    },
];
