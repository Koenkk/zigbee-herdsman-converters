import * as tz from "../converters/toZigbee";
import * as libColor from "../lib/color";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {Configure, DefinitionWithExtend, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const NS = "zhc:gledopto";
const e = exposes.presets;

const SCENE_DATA = {
    ice_land_blue: [0x01, 0x15, 0x0a, 0x52, 0x52, 0xe0, 0x00, 0x00, 0x64, 0x00, 0xc1, 0x61, 0x00, 0xb4, 0x30, 0x00, 0xb5, 0x52, 0x00, 0xc4, 0x63],
    glacier_express: [0x01, 0x16, 0x0a, 0x64, 0x64, 0x60, 0x00, 0x00, 0x64, 0x00, 0x92, 0x5f, 0x00, 0xc6, 0x60],
    sea_of_clouds: [0x01, 0x17, 0x03, 0x5e, 0x5e, 0x60, 0x00, 0x00, 0x64, 0x00, 0x38, 0x2f, 0x00, 0x1e, 0x5c, 0x00, 0xd5, 0x45, 0x01, 0x1a, 0x64],
    fireworks_at_sea: [0x01, 0x18, 0x02, 0x64, 0x64, 0xe0, 0x00, 0x00, 0x64, 0x00, 0xb2, 0x39, 0x01, 0x0a, 0x64, 0x01, 0x2d, 0x64, 0x01, 0x3f, 0x64],
    firefly_night: [0x01, 0x1a, 0x03, 0x4b, 0x4b, 0xe0, 0x00, 0x00, 0x64, 0x00, 0xe0, 0x39, 0x01, 0x09, 0x53],
    grass_land: [0x01, 0x1c, 0x0a, 0x5a, 0x5a, 0xe0, 0x00, 0x00, 0x52, 0x00, 0x9d, 0x64, 0x00, 0x8e, 0x64],
    northern_lights: [0x01, 0x1d, 0x03, 0x52, 0x52, 0xe0, 0x00, 0x00, 0x64, 0x00, 0xae, 0x64, 0x00, 0xa6, 0x64, 0x00, 0xc1, 0x64, 0x00, 0xcc, 0x64],
    late_autumn: [
        0x01, 0x1e, 0x0a, 0x52, 0x52, 0xe0, 0x00, 0x00, 0x64, 0x00, 0x19, 0x64, 0x00, 0x22, 0x5e, 0x00, 0x2c, 0x5b, 0x00, 0x14, 0x64, 0x00, 0x0c,
        0x64,
    ],
    game: [0x01, 0x1f, 0x02, 0x5f, 0x5f, 0x60, 0x00, 0x00, 0x64, 0x01, 0x10, 0x64, 0x00, 0xd2, 0x64, 0x00, 0xad, 0x64, 0x00, 0x8b, 0x64],
    holiday: [0x01, 0x20, 0x0a, 0x55, 0x55, 0x60, 0x00, 0x00, 0x64, 0x00, 0xc2, 0x58, 0x01, 0x3e, 0x33, 0x00, 0xff, 0x46, 0x01, 0x1d, 0x64],
    party: [
        0x01, 0x22, 0x04, 0x64, 0x64, 0x60, 0x00, 0x00, 0x64, 0x00, 0xd7, 0x5c, 0x00, 0xbc, 0x53, 0x00, 0x37, 0x1e, 0x00, 0x2c, 0x3f, 0x01, 0x61,
        0x3f,
    ],
    trend: [0x01, 0x23, 0x02, 0x64, 0x64, 0x60, 0x00, 0x00, 0x64, 0x01, 0x08, 0x4b, 0x00, 0xb1, 0x2f, 0x00, 0xcd, 0x57],
    meditation: [0x01, 0x25, 0x03, 0x43, 0x43, 0x60, 0x00, 0x00, 0x64, 0x00, 0xb7, 0x35, 0x00, 0x9b, 0x54, 0x00, 0xcd, 0x61],
    dating: [0x01, 0x26, 0x01, 0x59, 0x59, 0xe0, 0x00, 0x00, 0x64, 0x01, 0x19, 0x47, 0x01, 0x49, 0x3d, 0x00, 0xcd, 0x61, 0x00, 0x26, 0x64],
    valentines_day: [0x01, 0x2a, 0x01, 0x64, 0x64, 0x60, 0x00, 0x00, 0x64, 0x01, 0x15, 0x64, 0x01, 0x05, 0x64, 0x01, 0x45, 0x64, 0x01, 0x2f, 0x64],
    neon_world: [
        0x01, 0x37, 0x0a, 0x5a, 0x5a, 0x60, 0x00, 0x00, 0x64, 0x00, 0x33, 0x58, 0x00, 0x18, 0x64, 0x01, 0x00, 0x45, 0x00, 0xe3, 0x5e, 0x00, 0xac,
        0x30,
    ],
} as const;

const MUSIC_DATA = {
    rock: [
        0x01, 0x01, 0x00, 0x03, 0x64, 0x32, 0x01, 0x00, 0x00, 0x64, 0x00, 0x00, 0x64, 0x00, 0x78, 0x64, 0x00, 0xf0, 0x64, 0x00, 0x3c, 0x64, 0x00,
        0xb4, 0x64, 0x01, 0x2c, 0x64, 0x00, 0x00, 0x00,
    ],
    jazz: [
        0x01, 0x01, 0x00, 0x02, 0x64, 0x32, 0x01, 0x00, 0x00, 0x64, 0x00, 0x00, 0x50, 0x00, 0x78, 0x50, 0x00, 0xf0, 0x50, 0x00, 0x3c, 0x50, 0x00,
        0xb4, 0x50, 0x01, 0x2c, 0x50, 0x00, 0x00, 0x00,
    ],
    classic: [
        0x01, 0x01, 0x00, 0x12, 0x64, 0x32, 0x01, 0x00, 0x00, 0x64, 0x00, 0x00, 0x64, 0x00, 0x78, 0x64, 0x00, 0xf0, 0x64, 0x00, 0x3c, 0x64, 0x00,
        0xb4, 0x64, 0x01, 0x2c, 0x64, 0x00, 0x00, 0x00,
    ],
    rolling: [
        0x01, 0x01, 0x01, 0x12, 0x64, 0x32, 0x01, 0x00, 0x00, 0x64, 0x00, 0x00, 0x64, 0x00, 0x78, 0x64, 0x00, 0xf0, 0x64, 0x00, 0x3c, 0x64, 0x00,
        0xb4, 0x64, 0x01, 0x2c, 0x64, 0x00, 0x00, 0x00,
    ],
    energy: [
        0x01, 0x01, 0x02, 0x12, 0x64, 0x32, 0x01, 0x00, 0x00, 0x64, 0x00, 0x00, 0x64, 0x00, 0x78, 0x64, 0x00, 0xf0, 0x64, 0x00, 0x3c, 0x64, 0x00,
        0xb4, 0x64, 0x01, 0x2c, 0x64, 0x00, 0x00, 0x00,
    ],
    spectrum: [
        0x01, 0x01, 0x03, 0x12, 0x64, 0x32, 0x01, 0x00, 0x00, 0x64, 0x00, 0x00, 0x64, 0x00, 0x78, 0x64, 0x00, 0xf0, 0x64, 0x00, 0x3c, 0x64, 0x00,
        0xb4, 0x64, 0x01, 0x2c, 0x64, 0x00, 0x00, 0x00,
    ],
} as const;

const localValueConverter = {
    scene_data_converter: {
        to: (v: string) => {
            const sceneData = SCENE_DATA[v as keyof typeof SCENE_DATA];
            if (!sceneData) {
                throw new Error(`Unknown scene: ${v}`);
            }
            return sceneData;
        },
        from: (v: Buffer | number[]) => {
            const data = Buffer.isBuffer(v) ? Array.from(v) : v;
            for (const [sceneName, sceneData] of Object.entries(SCENE_DATA)) {
                if (JSON.stringify(data) === JSON.stringify(sceneData)) {
                    return sceneName;
                }
            }
            return null;
        },
    },
    music_data_converter: {
        to: (v: string) => {
            const musicData = MUSIC_DATA[v as keyof typeof MUSIC_DATA];
            if (!musicData) {
                throw new Error(`Unknown music mode: ${v}`);
            }
            return musicData;
        },
        from: (v: Buffer | number[]) => {
            const data = Buffer.isBuffer(v) ? Array.from(v) : v;
            for (const [musicMode, musicData] of Object.entries(MUSIC_DATA)) {
                if (
                    data.length >= 4 &&
                    data[0] === musicData[0] &&
                    data[1] === musicData[1] &&
                    data[2] === musicData[2] &&
                    data[3] === musicData[3]
                ) {
                    return musicMode;
                }
            }
            return null;
        },
    },
};

const tzLocal1 = {
    gledopto_light_onoff_brightness: {
        key: ["state", "brightness", "brightness_percent"],
        options: [exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            if (utils.isNumber(meta.message?.transition)) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            if (!Array.isArray(meta.mapped) && (meta.mapped.model === "GL-S-007ZS" || meta.mapped.model === "GL-C-009")) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/2757
                // Device doesn't support ON with moveToLevelWithOnOff command
                if (typeof meta.message.state === "string" && meta.message.state.toLowerCase() === "on") {
                    await tz.on_off.convertSet(entity, key, "ON", meta);
                    await utils.sleep(1000);
                }
            }

            return await tz.light_onoff_brightness.convertSet(entity, key, value, meta);
        },
        convertGet: async (entity, key, meta) => {
            return await tz.light_onoff_brightness.convertGet(entity, key, meta);
        },
    } satisfies Tz.Converter,
    gledopto_light_colortemp: {
        key: ["color_temp", "color_temp_percent"],
        options: [exposes.options.color_sync(), exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            if (utils.isNumber(meta.message?.transition)) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            // Gledopto devices turn ON when they are OFF and color is set.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3509
            const state = {state: "ON"};

            const result = await tz.light_colortemp.convertSet(entity, key, value, meta);
            if (result) {
                result.state = {...result.state, ...state};
            }
            return result;
        },
        convertGet: async (entity, key, meta) => {
            return await tz.light_colortemp.convertGet(entity, key, meta);
        },
    } satisfies Tz.Converter,
    gledopto_light_color: {
        key: ["color"],
        options: [exposes.options.color_sync(), exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            if (utils.isNumber(meta.message?.transition)) {
                meta.message.transition = meta.message.transition * 3.3;
            }

            if (key === "color" && !meta.message.transition) {
                // Always provide a transition when setting color, otherwise CCT to RGB
                // doesn't work properly (CCT leds stay on).
                meta.message.transition = 0.4;
            }

            // Gledopto devices turn ON when they are OFF and color is set.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3509
            const state = {state: "ON"};
            const result = await tz.light_color.convertSet(entity, key, value, meta);
            if (result) {
                result.state = {...result.state, ...state};
            }
            return result;
        },
        convertGet: async (entity, key, meta) => {
            return await tz.light_color.convertGet(entity, key, meta);
        },
    } satisfies Tz.Converter,
};

const tzLocal = {
    ...tzLocal1,
    gledopto_light_color_colortemp: {
        key: ["color", "color_temp", "color_temp_percent"],
        options: [exposes.options.color_sync(), exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            if (key === "color") {
                const result = await tzLocal1.gledopto_light_color.convertSet(entity, key, value, meta);
                utils.assertObject(result);
                if (result.state && typeof result.state.color === "object") {
                    const color = result.state.color as {x: number | undefined; y: number | undefined};

                    if (color.x !== undefined && color.y !== undefined) {
                        result.state.color_temp = Math.round(libColor.ColorXY.fromObject(color).toMireds());
                    }
                }

                return result;
            }
            if (key === "color_temp" || key === "color_temp_percent") {
                const result = await tzLocal1.gledopto_light_colortemp.convertSet(entity, key, value, meta);
                utils.assertObject(result);
                result.state.color = libColor.ColorXY.fromMireds(result.state.color_temp as number)
                    .rounded(4)
                    .toObject();
                return result;
            }
        },
        convertGet: async (entity, key, meta) => {
            return await tz.light_color_colortemp.convertGet(entity, key, meta);
        },
    } satisfies Tz.Converter,
    glspi206p_scene: {
        key: ["scene"],
        convertSet: async (entity, key, value, meta) => {
            const ep = meta.device.endpoints[0];
            if (meta.state?.state !== "ON") {
                await tuya.sendDataPointBool(ep, 1, true);
            }
            if (meta.state?.work_mode !== "scene") {
                await tuya.sendDataPointEnum(ep, 2, 2);
            }
            const sceneName = value;
            const sceneData = SCENE_DATA[sceneName as keyof typeof SCENE_DATA];
            if (sceneData) {
                await tuya.sendDataPointRaw(ep, 51, Buffer.from(sceneData));
                return {state: {state: "ON", work_mode: "scene", scene: sceneName}};
            }
            throw new Error(`Unknown scene: ${sceneName}`);
        },
    } satisfies Tz.Converter,
    glspi206p_music: {
        key: ["music_mode", "music_sensitivity"],
        convertSet: async (entity, key, value, meta) => {
            const ep = meta.device.endpoints[0];
            if (meta.state?.state !== "ON") {
                await tuya.sendDataPointBool(ep, 1, true);
            }
            if (meta.state?.work_mode !== "music") {
                await tuya.sendDataPointEnum(ep, 2, 3);
            }
            const currentMusicMode = meta.state?.music_mode || "rock";
            const currentSensitivity = Number(meta.state?.music_sensitivity) || 50;
            let musicMode = currentMusicMode;
            let sensitivity: number = currentSensitivity;

            if (key === "music_mode") {
                musicMode = value as string;
            } else if (key === "music_sensitivity") {
                sensitivity = Number(value);
            }

            const baseMusicData = MUSIC_DATA[musicMode as keyof typeof MUSIC_DATA];
            if (!baseMusicData) {
                throw new Error(`Unknown music mode: ${musicMode}`);
            }
            const dp52Payload: number[] = [...baseMusicData];
            dp52Payload[5] = Math.max(1, Math.min(100, sensitivity));

            await tuya.sendDataPointRaw(ep, 52, Buffer.from(dp52Payload));
            return {state: {state: "ON", work_mode: "music", music_mode: musicMode, music_sensitivity: sensitivity}};
        },
    } satisfies Tz.Converter,
    glspi206p_brightness_color: {
        key: ["color", "brightness"],
        convertSet: async (entity, key, value, meta) => {
            const ep = meta.device.endpoints[0];
            const modeNow = meta.state?.work_mode;
            if (meta.state?.state !== "ON") {
                await tuya.sendDataPointBool(ep, 1, true);
            }
            if (modeNow !== "colour") {
                await tuya.sendDataPointEnum(ep, 2, 1);
            }
            if ("brightness" in meta.message) {
                const brightness = Number(meta.message.brightness);
                const mapped = Math.round(utils.mapNumberRange(utils.toNumber(brightness, "brightness"), 0, 254, 10, 1000));
                const dp3 = Math.max(10, Math.min(1000, mapped));
                if (dp3 !== meta.state?.brightness) {
                    await tuya.sendDataPointValue(ep, 3, dp3);
                }
            }
            if ("color" in meta.message || key === "color") {
                const colorData = meta.message.color ?? value;
                const c = libColor.Color.fromConverterArg(colorData);
                const hsv = c.isRGB() ? c.rgb.toHSV() : c.hsv;

                const h = Math.max(0, Math.min(360, Math.round(hsv.hue)));
                const sat1000 = Math.max(0, Math.min(1000, Math.round((hsv.saturation / 100) * 1000)));
                const val1000 = 1000;

                const dp61Payload = [
                    0x00,
                    0x01,
                    0x01,
                    0x14,
                    0x00,
                    (h >> 8) & 0xff,
                    h & 0xff,
                    (sat1000 >> 8) & 0xff,
                    sat1000 & 0xff,
                    (val1000 >> 8) & 0xff,
                    val1000 & 0xff,
                ];

                await tuya.sendDataPointRaw(ep, 61, Buffer.from(dp61Payload));
                return {state: {state: "ON", work_mode: "colour", color: colorData}};
            }
            return {state: {state: "ON", work_mode: "colour"}};
        },
    } satisfies Tz.Converter,
};

function gledoptoLight(args?: m.LightArgs) {
    // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
    args = {powerOnBehavior: false, ...args};
    if (args.color) args.color = {modes: ["xy", "hs"], ...(utils.isObject(args.color) ? args.color : {})};
    const result = m.light(args);
    result.toZigbee = utils.replaceToZigbeeConvertersInArray(
        result.toZigbee,
        [tz.light_onoff_brightness, tz.light_colortemp, tz.light_color, tz.light_color_colortemp],
        [
            tzLocal.gledopto_light_onoff_brightness,
            tzLocal.gledopto_light_colortemp,
            tzLocal.gledopto_light_color,
            tzLocal.gledopto_light_color_colortemp,
        ],
        false,
    );
    return result;
}

function gledoptoOnOff(args?: m.OnOffArgs) {
    const result = m.onOff({powerOnBehavior: false, ...args});
    result.onEvent = m.poll({
        key: "interval",
        defaultIntervalSeconds: 5,
        poll: async (device) => {
            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            try {
                await device.endpoints[0].read("genOnOff", ["onOff"]);
            } catch {
                // Do nothing
            }
        },
    }).onEvent;
    return result;
}

function gledoptoConfigureReadModelID(): ModernExtend {
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/3016#issuecomment-1027726604
            const endpoint = device.endpoints[0];
            const oldModel = device.modelID;
            const newModel = (await endpoint.read("genBasic", ["modelId"])).modelId;
            if (oldModel !== newModel) {
                logger.info(`Detected Gledopto device mode change, from '${oldModel}' to '${newModel}'`, NS);
            }
        },
    ];
    return {configure, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["GL-SD-003P"],
        model: "GL-SD-003P",
        vendor: "Gledopto",
        description: "Zigbee DIN Rail triac AC dimmer",
        extend: [m.light({configureReporting: true})],
        meta: {disableDefaultResponse: true},
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GL-H-001",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 528, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        model: "GL-H-001",
        vendor: "Gledopto",
        description: "Zigbee RF Hub",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["HOMA2023"],
        model: "GD-CZ-006",
        vendor: "Gledopto",
        description: "Zigbee LED Controller WW/CW",
        extend: [gledoptoLight({})],
    },
    {
        zigbeeModel: ["GL-SD-001"],
        model: "GL-SD-001",
        vendor: "Gledopto",
        description: "Zigbee triac AC dimmer",
        extend: [gledoptoLight({configureReporting: true})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["GL-C-006"],
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GLEDOPTO",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        model: "GL-C-006",
        vendor: "Gledopto",
        description: "Zigbee LED Controller WW/CW",
        extend: [gledoptoLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["GL-C-006S"],
        model: "GL-C-006S",
        vendor: "Gledopto",
        description: "Zigbee LED Controller WW/CW (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["GL-C-006P"],
        model: "GL-C-006P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee LED Controller WW/CW (pro)",
        whiteLabel: [
            {vendor: "Gledopto", model: "GL-C-006P_mini", description: "Zigbee LED Controller WW/CW (pro) (mini)"},
            {vendor: "Gledopto", model: "GL-C-003P_1", description: "Zigbee 2in1 LED Controller CCT/DIM (pro)"},
            {vendor: "Gledopto", model: "GL-C-203P", description: "Zigbee 2in1 LED Controller CCT/DIM (pro+)"},
        ],
        extend: [m.light({colorTemp: {range: [158, 500]}}), m.identify(), gledoptoConfigureReadModelID()],
    },
    {
        zigbeeModel: ["GL-G-003P"],
        model: "GL-G-003P",
        vendor: "Gledopto",
        ota: true,
        description: "7W garden light pro",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GL-C-007",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 528, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GL-C-007",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 12, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GL-C-007",
                endpoints: [
                    {ID: 11, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [25]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "GL-C-007-1ID", // 1 ID controls white and color together
        // Only enable disableDefaultResponse for the second fingerprint:
        // https://github.com/Koenkk/zigbee2mqtt/issues/3813#issuecomment-694922037
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        vendor: "Gledopto",
        description: "Zigbee LED Controller RGBW (1 ID)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GL-C-007",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                    {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                ],
            },
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GL-C-009",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                    {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                ],
            },
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GLEDOPTO",
                endpoints: [
                    {ID: 10, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GLEDOPTO",
                endpoints: [
                    {ID: 10, profileID: 260, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                    {ID: 11, profileID: 260, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        model: "GL-C-007-2ID", // 2 ID controls white and color separate
        vendor: "Gledopto",
        description: "Zigbee LED Controller RGBW (2 ID)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
        exposes: [e.light_brightness_colortemp_colorxy().withEndpoint("rgb"), e.light_brightness().withEndpoint("white")],
        endpoint: (device) => {
            if (device.getEndpoint(10) && device.getEndpoint(11) && device.getEndpoint(13)) {
                return {rgb: 11, white: 10};
            }
            if (device.getEndpoint(11) && device.getEndpoint(12) && device.getEndpoint(13)) {
                return {rgb: 11, white: 12};
            }
            return {rgb: 11, white: 15};
        },
    },
    {
        zigbeeModel: ["GL-C-007S"],
        model: "GL-C-007S",
        vendor: "Gledopto",
        description: "Zigbee LED Controller RGBW (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-C-007P"],
        model: "GL-C-007P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee LED Controller RGBW (pro)",
        whiteLabel: [{vendor: "Gledopto", model: "GL-C-007P_mini", description: "Zigbee LED Controller RGBW (pro) (mini)"}],
        extend: [
            m.light({colorTemp: {range: [158, 500]}, color: {modes: ["xy", "hs"], enhancedHue: true}}),
            m.identify(),
            gledoptoConfigureReadModelID(),
        ],
    },
    {
        fingerprint: [
            // Although the device announces modelID GL-C-007, this is clearly a GL-C-008
            // https://github.com/Koenkk/zigbee2mqtt/issues/3525
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GL-C-007",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                    {ID: 15, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                ],
            },
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GL-C-007",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 12, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                    {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                ],
            },
        ],
        model: "GL-C-008-2ID", // 2 ID controls color temperature and color separate
        vendor: "Gledopto",
        description: "Zigbee LED Controller RGB+CCT (2 ID)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
        exposes: [e.light_brightness_colorxy().withEndpoint("rgb"), e.light_brightness_colortemp([158, 495]).withEndpoint("cct")],
        // Only enable disableDefaultResponse for the second fingerprint:
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1315#issuecomment-645331185
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        endpoint: (device) => {
            return {rgb: 11, cct: 15};
        },
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GLEDOPTO",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        zigbeeModel: ["GL-C-008"],
        model: "GL-C-008-1ID", // 1 ID controls color temperature and color separate
        vendor: "Gledopto",
        description: "Zigbee LED Controller RGB+CCT (1 ID)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["GL-C-008S"],
        model: "GL-C-008S",
        vendor: "Gledopto",
        description: "Zigbee LED Controller RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["GL-C-003P"],
        model: "GL-C-003P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee LED Controller RGB (pro)",
        // Supports color: https://github.com/Koenkk/zigbee2mqtt/issues/24091
        extend: [m.light({color: {modes: ["xy", "hs"], enhancedHue: true}}), m.identify(), gledoptoConfigureReadModelID()],
    },
    {
        zigbeeModel: ["GL-C-008P", "C-ZB-LC20v2-RGBCCT"],
        model: "GL-C-008P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee LED Controller RGB+CCT (pro)",
        whiteLabel: [
            {vendor: "Gledopto", model: "GL-C-008P_mini", description: "Zigbee LED Controller RGB+CCT (pro) (mini)"},
            {vendor: "Gledopto", model: "GL-C-001P", description: "Zigbee 5in1 LED Controller (pro)"},
            {vendor: "Gledopto", model: "GL-C-002P", description: "Zigbee 5in1 LED Controller (pro) (mini)"},
            {vendor: "Gledopto", model: "GL-C-011P", description: "Zigbee 5in1 LED Controller (pro) (din)"},
            {vendor: "Gledopto", model: "GL-C-201P", description: "Zigbee 5in1 LED Controller (pro+)"},
            {vendor: "Gledopto", model: "GL-C-202P", description: "Zigbee 3in1 LED Controller (pro+)"},
            {vendor: "Gledopto", model: "GL-C-204P", description: "Zigbee 5in1 LED Controller (pro+) (pwm)"},
            {vendor: "Gledopto", model: "GL-C-301P", description: "Zigbee 5in1 LED Controller (pro+) (ultra-mini)"},
        ],
        extend: [
            m.light({colorTemp: {range: [158, 500]}, color: {modes: ["xy", "hs"], enhancedHue: true}}),
            m.identify(),
            gledoptoConfigureReadModelID(),
        ],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["GL-C-009"],
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "GLEDOPTO",
                modelID: "GLEDOPTO",
                endpoints: [
                    {ID: 11, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                    {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                ],
            },
        ],
        model: "GL-C-009",
        vendor: "Gledopto",
        description: "Zigbee LED Controller W",
        extend: [gledoptoLight({})],
    },
    {
        zigbeeModel: ["GL-C-009P"],
        model: "GL-C-009P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee LED Controller W (pro)",
        whiteLabel: [{vendor: "Gledopto", model: "GL-C-009P_mini", description: "Zigbee LED Controller W (pro) (mini)"}],
        extend: [m.light({configureReporting: true}), m.identify(), gledoptoConfigureReadModelID()],
    },
    {
        zigbeeModel: ["GL-C-009S"],
        model: "GL-C-009S",
        vendor: "Gledopto",
        description: "Zigbee LED Controller W (plus)",
        extend: [gledoptoLight({})],
    },
    {
        zigbeeModel: ["GL-MC-001"],
        model: "GL-MC-001",
        vendor: "Gledopto",
        description: "Zigbee USB Mini LED Controller RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-LB-001P"],
        model: "GL-LB-001P",
        vendor: "Gledopto",
        description: "Zigbee USB LED bar RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true, powerOnBehavior: true})],
    },
    {
        zigbeeModel: ["GL-B-002P"],
        model: "GL-B-002P",
        vendor: "Gledopto",
        description: "Zigbee smart filament LED bulb",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}})],
    },
    {
        zigbeeModel: ["GL-S-006P"],
        model: "GL-S-006P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee GU10 LED lamp",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true, turnsOffAtBrightness1: true, powerOnBehavior: true})],
    },
    {
        zigbeeModel: ["GL-S-014P"],
        model: "GL-S-014P",
        vendor: "Gledopto",
        description: "Zigbee 5W MR16 bulb RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 500]}, color: true})],
    },
    {
        zigbeeModel: ["GL-MC-001P"],
        model: "GL-MC-001P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee USB Mini LED Controller RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-MC-002P"],
        model: "GL-MC-002P",
        vendor: "Gledopto",
        description: "Zigbee USB Mini LED Controller RGB+CCT (Pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-S-003Z"],
        model: "GL-S-003Z",
        vendor: "Gledopto",
        description: "Zigbee 5W GU10 Bulb RGBW",
        extend: [gledoptoLight({color: true})],
        endpoint: (device) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/5169
            if (device.getEndpoint(12)) return {default: 12};
            // https://github.com/Koenkk/zigbee2mqtt/issues/5681
            return {default: 11};
        },
    },
    {
        zigbeeModel: ["GL-S-004Z"],
        model: "GL-S-004Z",
        vendor: "Gledopto",
        description: "Zigbee 4W MR16 Bulb 30deg RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: [155, 495], startup: true}, color: true})],
    },
    {
        zigbeeModel: ["GL-S-005Z"],
        model: "GL-S-005Z",
        vendor: "Gledopto",
        description: "Zigbee 4W MR16 Bulb 120deg RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-S-004ZS"],
        model: "GL-S-004ZS",
        vendor: "Gledopto",
        description: "Zigbee 4W MR16 Bulb RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-S-004P", "GL-S-005P"],
        model: "GL-S-004P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 4W MR16 Bulb RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ["GL-S-007Z", "GL-S-007Z(lk)"],
        model: "GL-S-007Z",
        vendor: "Gledopto",
        description: "Zigbee 5W GU10 Bulb RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-S-007ZS"],
        model: "GL-S-007ZS",
        vendor: "Gledopto",
        description: "Zigbee 4W GU10 Bulb RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-S-007P"],
        model: "GL-S-007P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 4W GU10 Bulb RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-S-008Z"],
        model: "GL-S-008Z",
        vendor: "Gledopto",
        description: "Zigbee 5W PAR16 Bulb RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-B-001Z"],
        model: "GL-B-001Z",
        vendor: "Gledopto",
        description: "Zigbee 4W E12/E14 Bulb RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-B-001ZS"],
        model: "GL-B-001ZS",
        vendor: "Gledopto",
        description: "Zigbee 4W E12/E14 Bulb RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-B-001P"],
        model: "GL-B-001P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 4W E12/E14 Bulb RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-B-007Z"],
        model: "GL-B-007Z",
        vendor: "Gledopto",
        description: "Zigbee 6W E26/E27 Bulb RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-C-103P"],
        model: "GL-C-103P",
        vendor: "Gledopto",
        description: "Zigbee LED controller (pro)",
        extend: [m.light({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-G-004P"],
        model: "GL-G-004P",
        vendor: "Gledopto",
        description: "Zigbee 7W garden light Pro RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-G-005P"],
        model: "GL-G-005P",
        vendor: "Gledopto",
        description: "Zigbee 7W garden light Pro RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
    {
        zigbeeModel: ["GL-B-007ZS"],
        model: "GL-B-007ZS",
        vendor: "Gledopto",
        description: "Zigbee 6W E26/E27 Bulb RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-B-007P"],
        model: "GL-B-007P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 6W E26/E27 Bulb RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true, powerOnBehavior: true})],
    },
    {
        zigbeeModel: ["GL-B-008Z"],
        model: "GL-B-008Z",
        vendor: "Gledopto",
        description: "Zigbee 12W E26/E27 Bulb RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-B-008ZS"],
        model: "GL-B-008ZS",
        vendor: "Gledopto",
        description: "Zigbee 12W E26/E27 Bulb RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-B-008P"],
        model: "GL-B-008P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 12W E26/E27 Bulb RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-002P"],
        model: "GL-D-002P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 6W Downlight RGB+CCT (pro CRI>90)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-003Z"],
        model: "GL-D-003Z",
        vendor: "Gledopto",
        description: "Zigbee 6W Downlight RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-003ZS"],
        model: "GL-D-003ZS",
        vendor: "Gledopto",
        description: "Zigbee 6W Downlight RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-003P"],
        model: "GL-D-003P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 6W Downlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-004Z"],
        model: "GL-D-004Z",
        vendor: "Gledopto",
        description: "Zigbee 9W Downlight RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-004ZS"],
        model: "GL-D-004ZS",
        vendor: "Gledopto",
        description: "Zigbee 9W Downlight RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-004P"],
        model: "GL-D-004P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 9W Downlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-005Z"],
        model: "GL-D-005Z",
        vendor: "Gledopto",
        description: "Zigbee 12W Downlight RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-005ZS"],
        model: "GL-D-005ZS",
        vendor: "Gledopto",
        description: "Zigbee 12W Downlight RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-005P"],
        model: "GL-D-005P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 12W Downlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-009P"],
        model: "GL-D-009P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 12W Downlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-015P"],
        model: "GL-D-015P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 12W Downlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true, powerOnBehavior: true})],
    },
    {
        zigbeeModel: ["GL-D-010P"],
        model: "GL-D-010P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 12W Downlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-013P"],
        model: "GL-D-013P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 6W Downlight RGB+CCT (pro)",
        extend: [m.light({colorTemp: {range: [158, 500]}, color: {modes: ["xy", "hs"], enhancedHue: true}}), m.identify()],
    },
    {
        zigbeeModel: ["GL-D-006P"],
        model: "GL-D-006P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 6W anti-glare downlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-007P"],
        model: "GL-D-007P",
        vendor: "Gledopto",
        description: "Zigbee 12W anti-glare downlight RGB+CCT (pro)",
        ota: true,
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-D-008P"],
        model: "GL-D-008P",
        vendor: "Gledopto",
        description: "Na Versiion smart led 9w downlight",
        ota: true,
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-FL-004TZ"],
        model: "GL-FL-004TZ",
        vendor: "Gledopto",
        description: "Zigbee 10W Floodlight RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-B-003P"],
        model: "GL-B-003P",
        vendor: "Gledopto",
        description: "Zigbee 7W E26/E27 Bulb RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [155, 495]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ["GL-FL-004TZS"],
        model: "GL-FL-004TZS",
        vendor: "Gledopto",
        description: "Zigbee 10W Floodlight RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: [155, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-FL-004P", "GL-FL-004TZP"],
        model: "GL-FL-004P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 10W Floodlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-C-004P"],
        model: "GL-C-004P",
        vendor: "Gledopto",
        description: "Zigbee LED Strip Light Kit",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, configureReporting: true})],
    },
    {
        zigbeeModel: ["GL-FL-001P"],
        model: "GL-FL-001P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 10W Floodlight RGB+CCT 12V Low Voltage (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-FL-005TZ"],
        model: "GL-FL-005TZ",
        vendor: "Gledopto",
        description: "Zigbee 30W Floodlight RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-SD-001P"],
        model: "GL-SD-001P",
        vendor: "Gledopto",
        description: "Triac-dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["GL-FL-005TZS"],
        model: "GL-FL-005TZS",
        vendor: "Gledopto",
        description: "Zigbee 30W Floodlight RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-FL-005P", "GL-FL-005TZP"],
        model: "GL-FL-005P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 30W Floodlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-FL-006TZ"],
        model: "GL-FL-006TZ",
        vendor: "Gledopto",
        description: "Zigbee 60W Floodlight RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-FL-006TZS"],
        model: "GL-FL-006TZS",
        vendor: "Gledopto",
        description: "Zigbee 60W Floodlight RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-FL-006P", "GL-FL-006TZP"],
        model: "GL-FL-006P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 60W Floodlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-FL-007P"],
        model: "GL-FL-007P",
        vendor: "Gledopto",
        description: "Zigbee 100W Floodlight RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}, color: true})],
    },
    {
        zigbeeModel: ["GL-G-001Z"],
        model: "GL-G-001Z",
        vendor: "Gledopto",
        description: "Zigbee 12W Garden Lamp RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-G-001ZS"],
        model: "GL-G-001ZS",
        vendor: "Gledopto",
        description: "Zigbee 12W Garden Lamp RGB+CCT (plus)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-G-001P"],
        model: "GL-G-001P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 12W Garden Lamp RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-G-101P"],
        model: "GL-G-101P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 12W garden lamp RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-G-002P"],
        model: "GL-G-002P",
        vendor: "Gledopto",
        ota: true,
        description: "Zigbee 7W garden lamp RGB+CCT (pro)",
        extend: [gledoptoLight({colorTemp: {range: [150, 500]}, color: true})],
    },
    {
        zigbeeModel: ["GL-G-007Z"],
        model: "GL-G-007Z",
        vendor: "Gledopto",
        description: "Zigbee 9W garden lamp RGB+CCT",
        extend: [gledoptoLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["GL-P-101P"],
        model: "GL-P-101P",
        vendor: "Gledopto",
        description: "Zigbee pro constant current CCT LED driver",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}})],
    },
    {
        zigbeeModel: ["GL-W-001Z"],
        model: "GL-W-001Z",
        vendor: "Gledopto",
        description: "Zigbee on/off wall switch",
        extend: [gledoptoOnOff()],
    },
    {
        zigbeeModel: ["GL-SD-002"],
        model: "GL-SD-002",
        vendor: "Gledopto",
        description: "Zigbee 3.0 smart home switch",
        extend: [gledoptoOnOff()],
    },
    {
        zigbeeModel: ["GL-B-004P"],
        model: "GL-B-004P",
        vendor: "Gledopto",
        description: "Filament LED light bulb E27 G95 7W pro",
        extend: [gledoptoLight({colorTemp: {range: [158, 495]}})],
    },
    {
        zigbeeModel: ["GL-SD-301P"],
        model: "GL-SD-301P",
        vendor: "Gledopto",
        description: "Zigbee triac AC dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["GL-C-310P"],
        model: "GL-C-310P",
        vendor: "Gledopto",
        description: "Zigbee relay switch",
        extend: [m.onOff()],
    },
    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE284_gt5al3bl"}],
        model: "GL-SPI-206P",
        vendor: "Gledopto",
        description: "SPI pixel controller RGBCCT/RGBW/RGB",
        toZigbee: [tzLocal.glspi206p_brightness_color, tzLocal.glspi206p_music, tzLocal.glspi206p_music],
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.light_colorhs(),
            e.numeric("brightness", exposes.access.STATE_SET).withValueMin(0).withValueMax(1000),
            e
                .numeric("color_temp", exposes.access.STATE_SET)
                .withValueMin(0)
                .withValueMax(1000)
                .withDescription("Color temperature (0=warm, 1000=cold)"),
            e
                .enum("scene", exposes.access.STATE_SET, [
                    "ice_land_blue",
                    "glacier_express",
                    "sea_of_clouds",
                    "fireworks_at_sea",
                    "firefly_night",
                    "grass_land",
                    "northern_lights",
                    "late_autumn",
                    "game",
                    "holiday",
                    "party",
                    "trend",
                    "meditation",
                    "dating",
                    "valentines_day",
                    "neon_world",
                ])
                .withDescription("Scenes selection"),
            e
                .enum("music_mode", exposes.access.STATE_SET, ["rock", "jazz", "classic", "rolling", "energy", "spectrum"])
                .withDescription("Local music"),
            e
                .numeric("music_sensitivity", exposes.access.STATE_SET)
                .withValueMin(1)
                .withValueMax(100)
                .withDescription("Music rhythm sensitivity (1-100)"),
            tuya.exposes.countdown(),
            e.binary("do_not_disturb", exposes.access.STATE_SET, "ON", "OFF"),
            e.enum("light_bead_sequence", exposes.access.STATE_SET, [
                "RGB",
                "RBG",
                "GRB",
                "GBR",
                "BRG",
                "BGR",
                "RGBW",
                "RBGW",
                "GRBW",
                "GBRW",
                "BRGW",
                "BGRW",
                "WRGB",
                "WRBG",
                "WGRB",
                "WGBR",
                "WBRG",
                "WBGR",
            ]),
            e.enum("chip_type", exposes.access.STATE_SET, [
                "WS2801",
                "LPD6803",
                "LPD8803",
                "WS2811",
                "TM1814B",
                "TM1934A",
                "SK6812",
                "SK9822",
                "UCS8904B",
                "WS2805",
            ]),
            e.numeric("lightpixel_number_set", exposes.access.STATE_SET).withValueMin(10).withValueMax(1000),
            e.enum("work_mode", exposes.access.STATE_SET, ["white", "colour", "scene", "music"]),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [
                    2,
                    "work_mode",
                    tuya.valueConverterBasic.lookup({
                        white: tuya.enum(0),
                        colour: tuya.enum(1),
                        scene: tuya.enum(2),
                        music: tuya.enum(3),
                    }),
                ],
                [3, "brightness", tuya.valueConverter.scale0_254to0_1000],
                [4, "color_temp", tuya.valueConverter.raw],
                [7, "countdown", tuya.valueConverter.countdown],
                [51, "scene", localValueConverter.scene_data_converter],
                [52, "music_mode", localValueConverter.music_data_converter],
                [53, "lightpixel_number_set", tuya.valueConverter.raw],
                [
                    101,
                    "light_bead_sequence",
                    tuya.valueConverterBasic.lookup({
                        RGB: tuya.enum(0),
                        RBG: tuya.enum(1),
                        GRB: tuya.enum(2),
                        GBR: tuya.enum(3),
                        BRG: tuya.enum(4),
                        BGR: tuya.enum(5),
                        RGBW: tuya.enum(6),
                        RBGW: tuya.enum(7),
                        GRBW: tuya.enum(8),
                        GBRW: tuya.enum(9),
                        BRGW: tuya.enum(10),
                        BGRW: tuya.enum(11),
                        WRGB: tuya.enum(12),
                        WRBG: tuya.enum(13),
                        WGRB: tuya.enum(14),
                        WGBR: tuya.enum(15),
                        WBRG: tuya.enum(16),
                        WBGR: tuya.enum(17),
                    }),
                ],
                [
                    102,
                    "chip_type",
                    tuya.valueConverterBasic.lookup({
                        WS2801: tuya.enum(0),
                        LPD6803: tuya.enum(1),
                        LPD8803: tuya.enum(2),
                        WS2811: tuya.enum(3),
                        TM1814B: tuya.enum(4),
                        TM1934A: tuya.enum(5),
                        SK6812: tuya.enum(6),
                        SK9822: tuya.enum(7),
                        UCS8904B: tuya.enum(8),
                        WS2805: tuya.enum(9),
                    }),
                ],
                [103, "do_not_disturb", tuya.valueConverter.onOff],
            ],
        },
    },
];
