import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, OnEvent, Tz} from "../lib/types";
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

// Control4 SR260 system remote. It talks to its controller on two custom
// profiles, both on cluster 0x0001 (which is not Power Configuration there):
// - 0xC25D, endpoint 2: ZCL-shaped. Right after joining it reads attributes
//   0x0008-0x000A and keeps rejoining until they are answered with the
//   controller identity (uint16 0, the coordinator's EUI64, uint8 2). Its
//   periodic check-in, a report carrying its model in attribute 0x0007, wants
//   the same identity back as a report.
// - 0xC25C, endpoint 0xC5: one ASCII line per frame, e.g.
//   "0t422c sa c4.zr.bb 02 0000 0000\r\n" (bb press, bh hold, be release,
//   mot motion wake, bl battery percent in hex).
const C4_IDENTITY_PROFILE = 0xc25d;
const C4_IDENTITY_ENDPOINT = 2;
const C4_TEXT_ENDPOINT = 0xc5;
const SR260_KEYS = [
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
const SR260_GESTURES: KeyValueAny = {"c4.zr.bb": "press", "c4.zr.bh": "hold", "c4.zr.be": "release"};

const c4Identity = (coordinator: string) => ({
    8: {value: 0, type: Zcl.DataType.UINT16},
    9: {value: coordinator, type: Zcl.DataType.IEEE_ADDR},
    10: {value: 2, type: Zcl.DataType.UINT8},
});
const c4IdentityOptions = {profileId: C4_IDENTITY_PROFILE, srcEndpoint: C4_IDENTITY_ENDPOINT, disableDefaultResponse: true};

const fzLocal = {
    sr260_text: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID !== C4_TEXT_ENDPOINT || !Buffer.isBuffer(msg.data)) return;
            const [seq, verb, command, arg] = msg.data.toString("latin1").trim().split(/\s+/);
            if (!seq?.startsWith("0t") || verb !== "sa") return;
            const n = Number.parseInt(arg, 16);
            if (SR260_GESTURES[command] && SR260_KEYS[n]) return {action: `${SR260_KEYS[n]}_${SR260_GESTURES[command]}`};
            if (command === "c4.zr.mot") return {action: "wake"};
            if (command === "c4.zr.bl" && n <= 100) return {battery: n};
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    c4_checkin: {
        cluster: "genPowerCfg",
        type: ["attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            const coordinator = meta.device.meta.c4Coordinator;
            if (msg.endpoint.ID !== C4_IDENTITY_ENDPOINT || (msg.data as KeyValueAny)[7] === undefined || !coordinator) return;
            msg.endpoint.report("genPowerCfg", c4Identity(coordinator), c4IdentityOptions).catch(() => {});
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["attributeReport"]>,
};

// Answer reads on the identity endpoint as a Control4 controller does, on its
// own profile: the identity, anything else unsupported.
const c4AnswerIdentity: OnEvent.Handler = (event) => {
    if (event.type === "stop") return;
    const {device} = event.data;
    device.customReadResponse = (frame, endpoint) => {
        const coordinator = device.meta.c4Coordinator;
        if (endpoint.ID !== C4_IDENTITY_ENDPOINT || !frame.isCluster("genPowerCfg") || !coordinator) return false;
        const identity: KeyValueAny = c4Identity(coordinator);
        const records: KeyValueAny = {};
        for (const {attrId} of frame.payload as {attrId: number}[]) {
            records[attrId] = identity[attrId] ?? {value: undefined, type: Zcl.DataType.NO_DATA};
        }
        endpoint.readResponse("genPowerCfg", frame.header.transactionSequenceNumber, records, c4IdentityOptions).catch(() => {});
        return true;
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
        // No genBasic: zigbee-herdsman's Control4 interview quirk names every Control4 device C4-Zigbee.
        // A sleeping remote can miss that quirk (its node descriptor arrives late), so match the code too.
        fingerprint: [
            {modelID: "C4-Zigbee", type: "EndDevice"},
            {manufacturerID: 0xabcd, type: "EndDevice"},
        ],
        model: "C4-SR260",
        vendor: "Control4",
        description: "SR260 system remote",
        fromZigbee: [fzLocal.sr260_text, fzLocal.c4_checkin],
        toZigbee: [],
        exposes: [e.battery(), e.action([...SR260_KEYS.flatMap((k) => Object.values(SR260_GESTURES).map((g) => `${k}_${g}`)), "wake"])],
        configure: (device, coordinatorEndpoint) => {
            device.meta.c4Coordinator = coordinatorEndpoint.deviceIeeeAddress;
            device.save();
        },
        onEvent: c4AnswerIdentity,
    },
];
