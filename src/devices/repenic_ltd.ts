import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const ea = exposes.access;

const attrIdMin = 0xa000;
const attrIdMax = 0xa003;
const attrIdStartBrightness = "onLevel";
const attrIdBoost = 0xa004;
const attrIdDimmingMode = 0xb000;
const attrIdDefaultMoveRate = "defaultMoveRate";
const fzLocal = {
    repenic_ltd_cluster: {
        cluster: "genLevelCtrl",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data as KeyValue;
            const result: KeyValue = {};
            if (Object.hasOwn(data, attrIdMin)) {
                result.min_brightness = data[attrIdMin];
            }
            if (Object.hasOwn(data, attrIdMax)) {
                result.max_brightness = data[attrIdMax];
            }
            if (Object.hasOwn(data, attrIdStartBrightness)) {
                result.start_brightness = data[attrIdStartBrightness];
            }
            if (Object.hasOwn(data, attrIdBoost)) {
                result.boost = data[attrIdBoost] === 1 ? "ON" : "OFF";
            }
            if (Object.hasOwn(data, attrIdDimmingMode)) {
                const modeMap: KeyValue = {0: "Leading edge", 1: "Trailing edge"};
                const val = data[attrIdDimmingMode];
                if (typeof val === "number" && Object.hasOwn(modeMap, val)) {
                    result.dimming_mode = modeMap[val];
                }
            }
            if (Object.hasOwn(data, attrIdDefaultMoveRate)) {
                result.default_move_rate = data[attrIdDefaultMoveRate];
            }
            return result;
        },
    } satisfies Fz.Converter<"genLevelCtrl">,
};

const tzLocal = {
    min_brightness: {
        key: ["min_brightness"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const payload = [{attrId: 0xa000, dataType: 0x20, attrData: value}];
            await entity.zclCommand(0x8, "write", payload, {
                disableDefaultResponse: true,
                sendPolicy: "immediate",
            });
            return {state: {min_brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", [0xa000]);
        },
    } satisfies Tz.Converter,
    max_brightness: {
        key: ["max_brightness"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const payload = [{attrId: 0xa003, dataType: 0x20, attrData: value}];
            await entity.zclCommand(0x8, "write", payload, {
                disableDefaultResponse: true,
                sendPolicy: "immediate",
            });
            return {state: {max_brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", [0xa003]);
        },
    } satisfies Tz.Converter,
    start_brightness: {
        key: ["start_brightness"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const payload = [{attrId: 0x0011, dataType: 0x20, attrData: value}];
            await entity.zclCommand(0x8, "write", payload, {
                disableDefaultResponse: true,
                sendPolicy: "immediate",
            });
            return {state: {start_brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", [0x0011]);
        },
    } satisfies Tz.Converter,
    boost: {
        key: ["boost"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const boostValue = value === "ON" ? 1 : 0;
            const payload = [{attrId: 0xa004, dataType: 0x20, attrData: boostValue}];
            await entity.zclCommand(0x8, "write", payload, {
                disableDefaultResponse: true,
                sendPolicy: "immediate",
            });
            return {state: {boost: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", [0xa004]);
        },
    } satisfies Tz.Converter,
    dimming_mode: {
        key: ["dimming_mode"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const modeMap: KeyValue = {"Leading edge": 0, "Trailing edge": 1};
            const val = modeMap[value as string];
            const payload = [{attrId: 0xb000, dataType: 0x30, attrData: val}];
            await entity.zclCommand(0x8, "write", payload, {
                disableDefaultResponse: true,
                sendPolicy: "immediate",
            });
            return {state: {dimming_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", [0xb000]);
        },
    } satisfies Tz.Converter,
    default_move_rate: {
        key: ["default_move_rate"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            const payload = [{attrId: 0x0014, dataType: 0x20, attrData: value}];
            await entity.zclCommand(0x8, "write", payload, {
                disableDefaultResponse: true,
                sendPolicy: "immediate",
            });
            return {state: {default_move_rate: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", [0x0014]);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RD-250ZG"],
        model: "RD-250ZG",
        vendor: "Repenic Ltd.",
        description: "Dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
        fromZigbee: [fzLocal.repenic_ltd_cluster],
        toZigbee: [
            tzLocal.min_brightness,
            tzLocal.max_brightness,
            tzLocal.start_brightness,
            tzLocal.boost,
            tzLocal.dimming_mode,
            tzLocal.default_move_rate,
        ],
        exposes: [
            exposes.numeric("min_brightness", ea.ALL).withValueMin(1).withValueMax(99).withDescription("Minimum brightness (≈1–99%)"),
            exposes.numeric("max_brightness", ea.ALL).withValueMin(1).withValueMax(100).withDescription("Maximum brightness (≈1–100%)"),
            exposes
                .numeric("start_brightness", ea.ALL)
                .withValueMin(0)
                .withValueMax(254)
                .withDescription("Default brightness at power-on/startup (0-254)"),
            exposes.binary("boost", ea.ALL, "ON", "OFF").withDescription("Boost function"),
            exposes.enum("dimming_mode", ea.ALL, ["Leading edge", "Trailing edge"]).withDescription("Dimming mode"),
            exposes.numeric("default_move_rate", ea.ALL).withValueMin(1).withValueMax(10).withDescription("Default Move Rate"),
        ],
        configure: async (device, coordinatorEndpoint, definition) => {
            const endpoint = device.getEndpoint(1) || device.endpoints[0];

            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genGroups", "genScenes", "genOnOff", "genLevelCtrl"]);

            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await endpoint.read("genLevelCtrl", [attrIdMin, attrIdMax, attrIdStartBrightness, attrIdBoost, attrIdDimmingMode, attrIdDefaultMoveRate]);
        },
    },
];
