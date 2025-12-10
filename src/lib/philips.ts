import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as reporting from "../lib/reporting";
import * as libColor from "./color";
import {ColorRGB, ColorXY} from "./color";
import * as exposes from "./exposes";
import {logger} from "./logger";
import * as modernExtend from "./modernExtend";
import * as globalStore from "./store";
import type {Configure, Expose, Fz, KeyValue, KeyValueAny, ModernExtend, Tz} from "./types";
import * as utils from "./utils";
import {determineEndpoint, exposeEndpoints, isObject} from "./utils";

const NS = "zhc:philips";
const ea = exposes.access;
const e = exposes.presets;
const eNumeric = exposes.Numeric;

const encodeRGBToScaledGradient = (hex: string) => {
    const xy = ColorRGB.fromHex(hex).toXY();
    const x = (xy.x * 4095) / 0.7347;
    const y = (xy.y * 4095) / 0.8413;
    const xx = Math.round(x).toString(16).padStart(3, "0");
    const yy = Math.round(y).toString(16).padStart(3, "0");

    return [xx[1], xx[2], yy[2], xx[0], yy[0], yy[1]].join("");
};

const decodeScaledGradientToRGB = (p: string) => {
    const x = p[3] + p[0] + p[1];
    const y = p[4] + p[5] + p[2];

    const xx = Number(((Number.parseInt(x, 16) * 0.7347) / 4095).toFixed(4));
    const yy = Number(((Number.parseInt(y, 16) * 0.8413) / 4095).toFixed(4));

    return new ColorXY(xx, yy).toRGB().toHEX();
};

const COLOR_MODE_GRADIENT = "4b01";
const COLOR_MODE_COLOR_XY = "0b00";
const COLOR_MODE_COLOR_TEMP = "0f00";
const COLOR_MODE_EFFECT = "ab00";
const COLOR_MODE_BRIGHTNESS = "0300";

export const knownEffects = {
    "0180": "candle",
    "0280": "fireplace",
    "0380": "colorloop",
    "0980": "sunrise",
    "0a80": "sparkle",
    "0b80": "opal",
    "0c80": "glisten",
    "0d80": "underwater",
    "0e80": "cosmos",
    "0f80": "sunbeam",
    "1080": "enchant",
};

interface PhilipsContact {
    attributes: {
        contact: number;
        contactLastChange: number;
        tamper: number;
        tamperLastChange: number;
    };
    commands: never;
    commandResponses: never;
}

const philipsModernExtend = {
    addCustomClusterManuSpecificPhilipsContact: () =>
        modernExtend.deviceAddCustomCluster("manuSpecificPhilipsContact", {
            ID: 0xfc06,
            manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
            attributes: {
                contact: {ID: 0x0100, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                contactLastChange: {ID: 0x0101, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                tamper: {ID: 0x0102, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                tamperLastChange: {ID: 0x0103, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
            },
            commands: {},
            commandsResponse: {},
        }),
    light: (args?: modernExtend.LightArgs & {hueEffect?: boolean; gradient?: true | {extraEffects: string[]}}) => {
        args = {hueEffect: true, turnsOffAtBrightness1: true, ota: true, ...args};
        if (args.hueEffect || args.gradient) args.effect = false;
        if (args.color) args.color = {modes: ["xy", "hs"], ...(isObject(args.color) ? args.color : {})};
        const result = modernExtend.light(args);
        result.toZigbee.push(philipsTz.hue_power_on_behavior, philipsTz.hue_power_on_error);
        if (args.hueEffect || args.gradient) {
            result.toZigbee.push(philipsTz.effect);
            const effects = ["blink", "breathe", "okay", "channel_change", "candle"];
            if (args.color) effects.push("fireplace", "colorloop");
            if (args.gradient) {
                result.toZigbee.push(philipsTz.gradient_scene, philipsTz.gradient({reverse: true}));
                result.fromZigbee.push(philipsFz.gradient);
                effects.push("sunrise");
                if (args.gradient !== true) {
                    effects.push(...args.gradient.extraEffects);
                }
                result.exposes.push(
                    // gradient_scene is deprecated, use gradient instead
                    ...exposeEndpoints(e.enum("gradient_scene", ea.SET, Object.keys(gradientScenes)), args.endpointNames),
                    ...exposeEndpoints(
                        e
                            .list("gradient", ea.ALL, e.text("hex", ea.ALL).withDescription("Color in RGB HEX format (eg #663399)"))
                            .withLengthMin(1)
                            .withLengthMax(9)
                            .withDescription("List of RGB HEX colors"),
                        args.endpointNames,
                    ),
                );
                result.configure.push(async (device, coordinatorEndpoint, definition) => {
                    for (const ep of device.endpoints.filter((ep) => ep.supportsInputCluster("manuSpecificPhilips2"))) {
                        await ep.bind("manuSpecificPhilips2", coordinatorEndpoint);
                    }
                });
            }
            effects.push("finish_effect", "stop_effect", "stop_hue_effect");
            result.exposes.push(...exposeEndpoints(e.enum("effect", ea.SET, effects), args.endpointNames));
        }

        const customCluster = modernExtend.deviceAddCustomCluster("manuSpecificPhilips3", {
            ID: 0xfc01,
            manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
            attributes: {},
            commands: {
                command1: {
                    ID: 1,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                },
                command2: {
                    ID: 2,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                },
                command3: {
                    ID: 3,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                },
                command4: {
                    ID: 4,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                },
                command7: {
                    ID: 7,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                },
            },
            commandsResponse: {},
        });
        result.onEvent = [...(result.onEvent ?? []), ...customCluster.onEvent];
        result.configure = [...(result.configure ?? []), ...customCluster.configure];

        return result;
    },
    onOff: (args?: modernExtend.OnOffArgs) => {
        args = {powerOnBehavior: false, ota: true, ...args};
        const result = modernExtend.onOff(args);
        result.toZigbee.push(philipsTz.hue_power_on_behavior, philipsTz.hue_power_on_error);
        return result;
    },
    twilightOnOff: () => {
        const fromZigbee = [fz.ignore_command_on, fz.ignore_command_off, fz.hue_twilight];
        const exposes = [
            e.action([
                "dot_press",
                "dot_hold",
                "dot_press_release",
                "dot_hold_release",
                "hue_press",
                "hue_hold",
                "hue_press_release",
                "hue_hold_release",
            ]),
        ];
        const toZigbee: Tz.Converter[] = [];
        const configure: Configure[] = [
            async (device, coordinatorEndpoint) => {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "manuSpecificPhilips"]);
            },
        ];
        const result: ModernExtend = {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
        return result;
    },
    contact: () => {
        const exposes: Expose[] = [
            e.contact().withAccess(ea.STATE_GET),
            e.tamper().withAccess(ea.STATE_GET),
            new eNumeric("contact_last_changed", ea.STATE_GET)
                .withUnit("s")
                .withDescription("Time (in seconds) since when contact was last changed."),
            new eNumeric("tamper_last_changed", ea.STATE_GET).withUnit("s").withDescription("Time (in seconds) since when tamper was last changed."),
        ];
        const fromZigbee = [
            {
                cluster: "manuSpecificPhilipsContact",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const payload: KeyValueAny = {};
                    if (msg.data.contact !== undefined) {
                        // NOTE: 0 = closed, 1 = open
                        payload.contact = msg.data.contact === 0;
                    }

                    if (msg.data.tamper !== undefined) {
                        // NOTE: 0 = OK, 1 = tampered
                        payload.tamper = msg.data.tamper > 0;
                    }

                    if (msg.data.contactLastChange !== undefined) {
                        // NOTE: seems to be 1/10 of a second
                        payload.contact_last_changed = Math.round(msg.data.contactLastChange / 10);
                    }

                    if (msg.data.tamperLastChange !== undefined) {
                        // NOTE: seems to be 1/10 of a second
                        payload.tamper_last_changed = Math.round(msg.data.tamperLastChange / 10);
                    }

                    return payload;
                },
            } satisfies Fz.Converter<"manuSpecificPhilipsContact", PhilipsContact, ["attributeReport", "readResponse"]>,
            // NOTE: kept for compatibility as there is no auto-reconfigure for modernExtend
            //       this should not fire once reconfigured.
            {
                cluster: "genOnOff",
                type: ["commandOff", "commandOn"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.type === "commandOff" || msg.type === "commandOn") {
                        return {contact: msg.type === "commandOff"};
                    }
                },
            } satisfies Fz.Converter<"genOnOff", undefined, ["commandOff", "commandOn"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["contact", "tamper", "contact_last_changed", "tamper_last_changed"],
                convertGet: async (entity, key, meta) => {
                    let attrib = key as "contact" | "tamper" | "contactLastChange" | "tamperLastChange";

                    switch (key) {
                        case "contact_last_changed":
                            attrib = "contactLastChange";
                            break;
                        case "tamper_last_changed":
                            attrib = "tamperLastChange";
                            break;
                    }

                    const ep = determineEndpoint(entity, meta, "manuSpecificPhilipsContact");
                    try {
                        await ep.read<"manuSpecificPhilipsContact", PhilipsContact>("manuSpecificPhilipsContact", [attrib]);
                    } catch (e) {
                        logger.debug(`Reading ${attrib} failed: ${e}, device probably doesn't support it`, "zhc:setupattribute");
                    }
                },
            },
        ];
        const configure: Configure[] = [
            // NOTE: trigger report after 4 hours incase the network was offline when a contact was triggered
            //       contactLastChange and tamperLastChange seem come with every report of contact, so we do
            //       not configure reporting
            modernExtend.setupConfigureForReporting<"manuSpecificPhilipsContact", PhilipsContact>("manuSpecificPhilipsContact", "contact", {
                config: {min: 0, max: "4_HOURS", change: 1},
                access: ea.STATE_GET,
                singleEndpoint: true,
            }),
            modernExtend.setupConfigureForReporting<"manuSpecificPhilipsContact", PhilipsContact>("manuSpecificPhilipsContact", "tamper", {
                config: {min: 0, max: "4_HOURS", change: 1},
                access: ea.STATE_GET,
                singleEndpoint: true,
            }),
            async (device, coordinatorEndpoint) => {
                // NOTE: new fromZigbee does not use genOnoff's commandOn/commandOff
                //       so we can unbind genOnOff so the legacy fromZigbee does not
                //       cause double triggers.
                const endpoint = device.getEndpoint(2);
                await endpoint.unbind("genOnOff", coordinatorEndpoint);
            },
        ];
        const result: ModernExtend = {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
        return result;
    },
};
export {philipsModernExtend as m};

const philipsTz = {
    gradient_scene: {
        key: ["gradient_scene"],
        convertSet: async (entity, key, value, meta) => {
            const scene = utils.getFromLookup(value, gradientScenes);
            if (!scene) throw new Error(`Gradient scene '${value}' is unknown`);
            const payload = {data: Buffer.from(scene, "hex")};
            await entity.command("manuSpecificPhilips2", "multiColor", payload);
        },
    } satisfies Tz.Converter,
    gradient: (opts = {reverse: false}) => {
        return {
            key: ["gradient"],
            convertSet: async (entity, key, value, meta) => {
                // @ts-expect-error ignore
                const scene = encodeGradientColors(value, opts);
                const payload = {data: Buffer.from(scene, "hex")};
                await entity.command("manuSpecificPhilips2", "multiColor", payload);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read("manuSpecificPhilips2", ["state"]);
            },
        } satisfies Tz.Converter;
    },
    effect: {
        key: ["effect"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, "effect");
            if (Object.keys(hueEffects).includes(value.toLowerCase())) {
                await entity.command("manuSpecificPhilips2", "multiColor", {data: Buffer.from(utils.getFromLookup(value, hueEffects), "hex")});
            } else {
                return await tz.effect.convertSet(entity, key, value, meta);
            }
        },
    } satisfies Tz.Converter,
    hue_power_on_behavior: {
        key: ["hue_power_on_behavior"],
        convertSet: async (entity, key, value, meta) => {
            if (value === "default") {
                value = "on";
            }

            let supports = {colorTemperature: false, colorXY: false};
            if (utils.isEndpoint(entity) && entity.supportsInputCluster("lightingColorCtrl")) {
                const readResult = await entity.read("lightingColorCtrl", ["colorCapabilities"]);
                supports = {
                    colorTemperature: (readResult.colorCapabilities & (1 << 4)) > 0,
                    colorXY: (readResult.colorCapabilities & (1 << 3)) > 0,
                };
            } else if (entity.constructor.name === "Group") {
                supports = {colorTemperature: true, colorXY: true};
            }

            if (value === "off") {
                await entity.write("genOnOff", {16387: {value: 0x00, type: 0x30}});
            } else if (value === "recover") {
                await entity.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
                await entity.write("genLevelCtrl", {16384: {value: 0xff, type: 0x20}});

                if (supports.colorTemperature) {
                    await entity.write("lightingColorCtrl", {16400: {value: 0xffff, type: 0x21}});
                }

                if (supports.colorXY) {
                    await entity.write("lightingColorCtrl", {3: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                    await entity.write("lightingColorCtrl", {4: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                }
            } else if (value === "on") {
                await entity.write("genOnOff", {16387: {value: 0x01, type: 0x30}});

                let brightness = meta.message.hue_power_on_brightness != null ? meta.message.hue_power_on_brightness : 0xfe;
                if (brightness === 255) {
                    // 255 (0xFF) is the value for recover, therefore set it to 254 (0xFE)
                    brightness = 254;
                }
                await entity.write("genLevelCtrl", {16384: {value: brightness, type: 0x20}});

                utils.assertEndpoint(entity);
                if (entity.supportsInputCluster("lightingColorCtrl")) {
                    if (meta.message.hue_power_on_color_temperature != null && meta.message.hue_power_on_color != null) {
                        logger.error("Provide either color temperature or color, not both", NS);
                    } else if (meta.message.hue_power_on_color_temperature != null) {
                        const colortemp = meta.message.hue_power_on_color_temperature;
                        await entity.write("lightingColorCtrl", {16400: {value: colortemp, type: 0x21}});
                        // Set color to default
                        if (supports.colorXY) {
                            await entity.write("lightingColorCtrl", {3: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                            await entity.write("lightingColorCtrl", {4: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                        }
                    } else if (meta.message.hue_power_on_color != null) {
                        // @ts-expect-error ignore
                        const colorXY = libColor.ColorRGB.fromHex(meta.message.hue_power_on_color).toXY();
                        const xy = {x: utils.mapNumberRange(colorXY.x, 0, 1, 0, 65535), y: utils.mapNumberRange(colorXY.y, 0, 1, 0, 65535)};
                        value = xy;

                        // Set colortemp to default
                        if (supports.colorTemperature) {
                            await entity.write("lightingColorCtrl", {16400: {value: 366, type: 0x21}});
                        }
                        await entity.write("lightingColorCtrl", {3: {value: xy.x, type: 0x21}}, manufacturerOptions);
                        await entity.write("lightingColorCtrl", {4: {value: xy.y, type: 0x21}}, manufacturerOptions);
                    } else {
                        // Set defaults for colortemp and color
                        if (supports.colorTemperature) {
                            await entity.write("lightingColorCtrl", {16400: {value: 366, type: 0x21}});
                        }

                        if (supports.colorXY) {
                            await entity.write("lightingColorCtrl", {3: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                            await entity.write("lightingColorCtrl", {4: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                        }
                    }
                }
            }

            return {state: {hue_power_on_behavior: value}};
        },
    } satisfies Tz.Converter,
    hue_power_on_error: {
        key: ["hue_power_on_brightness", "hue_power_on_color_temperature", "hue_power_on_color"],
        convertSet: (entity, key, value, meta) => {
            if (meta.message.hue_power_on_behavior === undefined) {
                throw new Error(`Provide a value for 'hue_power_on_behavior'`);
            }
        },
    } satisfies Tz.Converter,
    hue_motion_sensitivity: {
        // motion detect sensitivity, philips specific
        key: ["motion_sensitivity"],
        convertSet: async (entity, key, value, meta) => {
            // make sure you write to second endpoint!
            const lookup = {low: 0, medium: 1, high: 2, very_high: 3, max: 4};
            const payload = {48: {value: utils.getFromLookup(value, lookup), type: 32}};
            await entity.write("msOccupancySensing", payload, manufacturerOptions);
            return {state: {motion_sensitivity: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("msOccupancySensing", [48], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    hue_motion_led_indication: {
        key: ["led_indication"],
        convertSet: async (entity, key, value, meta) => {
            const payload = {51: {value, type: 0x10}};
            await entity.write("genBasic", payload, manufacturerOptions);
            return {state: {led_indication: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genBasic", [0x0033], manufacturerOptions);
        },
    } satisfies Tz.Converter,
};
export {philipsTz as tz};

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V};

export const gradientScenes = {
    blossom: "50010400135000000039d553d2955ba5287a9f697e25fb802800",
    crocus: "50010400135000000050389322f97f2b597343764cc664282800",
    precious: "5001040013500000007fa8838bb9789a786d7577499a773f2800",
    narcissa: "500104001350000000b0498a5c0a888fea89eb0b7ee15c742800",
    beginnings: "500104001350000000b3474def153e2ad42e98232c7483292800",
    first_light: "500104001350000000b28b7900e959d3f648a614389723362800",
    horizon: "500104001350000000488b7d6cbb750c6642f1133cc4033c2800",
    valley_dawn: "500104001350000000c1aa7de03a7a8ce861c7c4410d94412800",
    sunflare: "500104001350000000d0aa7d787a7daf197590154d6c14472800",
    emerald_flutter: "5001040013500000006a933977e34bb0d35e916468f246792800",
    memento: "500104001350000000f87318a3e31962331ec3532cceea892800",
    resplendent: "500104001350000000278b6d257a58efe84204273a35f5252800",
    scarlet_dream: "500104001350000000b02c654e4c5b45ab51fb0950d6c84d2800",
    lovebirds: "50010400135000000053ab84ea1a7e35fb7c098c73994c772800",
    smitten: "500104001350000000fe7b70a74b6aa42b65811b60550a592800",
    glitz_and_glam: "500104001350000000cc193cb9b845bad9521d1c77bf6c712800",
    promise: "500104001350000000258b606eca6b28d6382db445df26812800",
    ruby_romance: "5001040013500000000edb63cbcb6bac0c670b2d58204e572800",
    city_of_love: "50010400135000000055830e5cf31b6aa339d2ec70908b802800",
    honolulu: "500104001350000000dbfd59866c6378ec6c45cc765c0a822800",
    savanna_sunset: "50010400135000000005ae65c38c6c6b4b7573ca820fc9832800",
    golden_pond: "5001040013500000007e4a88cc4a8605db8728ec7b666c792800",
    runy_glow: "50010400135000000095bb53ac2a56eb99591e095c54985e2800",
    tropical_twilight: "500104001350000000408523a0b636e777524c0a71a76c6e2800",
    miami: "50010400135000000022ec61e6d94902d83766c3305a43182800",
    cancun: "500104001350000000a7eb54673d55944e6265fd6e26bb842800",
    rio: "500104001350000000a26526088c51a74b58ea6b7137ba892800",
    chinatown: "500104001350000000b33e5b408e59d90d5b4c6c6360ac792800",
    ibiza: "500104001350000000014d6d708c73827b7b6c7a8887f98a2800",
    osaka: "500104001350000000d649510b5c4deb7c5d8b6d6d2b9b802800",
    tokyo: "500104001350000000d1c311665331d3451fd59c4e394c7b2800",
    motown: "50010400135000000055730e5db3156623306c533d7a235c2800",
    fairfax: "50010400135000000072d34a3664477d7a61581d5fc08e5b2800",
    galaxy: "500104001350000000a6cb638b2a4f8cfa549bb9549ff73a2800",
    starlight: "5001040013500000008d897134a9653ec854d2963ed1d4282800",
    "blood moon": "500104001350000000202a6987c8599ee647ec632779c3142800",
    artic_aurora: "50010400135000000082548922057511046571c32d5b93192800",
    moonlight: "50010400135000000055730e5e9320c1832e96243ebec7652800",
    nebula: "50010400135000000026c852e106460d653ee745342964142800",
    sundown: "500104001350000000f37c68157c6d8efa755ac5512e24332800",
    blue_lagoon: "50010400135000000088c3623975699ea672a0c8831ada6d2800",
    palm_beach: "5001040013500000005ec4679ba56077f85a80ea64639c6a2800",
    lake_placid: "5001040013500000002eab69239a692d996552c54c39743a2800",
    mountain_breeze: "500104001350000000df843d2355419195465a98674ca97b2800",
    lake_mist: "500104001350000000e3286f39b96859f86266e54ded943f2800",
    ocean_dawn: "5001040013500000005cf9779da97105b96b07485e32564a2800",
    frosty_dawn: "5001040013500000006d6883bca87e3029758ec9722d6a722800",
    sunday_morning: "5001040013500000002c586dc6f87345997c63f983f777892800",
    emerald_isle: "500104001350000000e535628dc57ed2667d8b687d1e2a812800",
    spring_blossom: "500104001350000000a8b75fd0c75826b851a7094d305b652800",
    midsummer_sun: "500104001350000000002984799984dd29848eba836c0b7f2800",
    autumn_gold: "500104001350000000435a7817aa7ba3f979a8a981f3c9852800",
    spring_lake: "5001040013500000004a976d3347736e677561b77a4b07812800",
    winter_mountain: "5001040013500000002c555c68c55d7c555ef165606136622800",
    midwinter: "500104001350000000bda5532c554dbd254cd5a4428d94392800",
    amber_bloom: "500104001350000000739d67f2bc7372ec78a0ab78be8a6f2800",
    lily: "5001040013500000009cfc76c5ab793d4a6a1a9b586b9c522800",
    painted_sky: "500104001350000000d1c424c3d63783384c3f7a6a83bd6d2800",
    winter_beauty: "500104001350000000e2335ea7b4942467952db986a7ab7b2800",
    orange_fields: "500104001350000000409c69694c79eafa88498a8fb867aa2800",
    forest_adventure: "50010400135000000023999bbd76b363d4b674d3415fb3222800",
    blue_planet: "50010400135000000037a7a3a403b489737b2b746e6873362800",
    soho: "500104001350000000c52c4e220b6eed8a53d404192b04782800",
    vapor_wave: "500104001350000000e1c32401251acb183ac31b8051ea842800",
    magneto: "50010400135000000077b3286d9340b9e3662d99943c9b852800",
    tyrell: "500104001350000000ef4419a898370ea84698353574434e2800",
    disturbia: "50010400135000000084f371a4845e6998388c3b4f57ce582800",
    hal: "50010400135000000075f351a6244cf6dc5d480c658cda862800",
    golden_star: "5001040013500000007a4a8702eb8372ac7892cd61d51e5c2800",
    under_the_tree: "5001040013500000001de498b9a3cc0c9b8563bb6cc1ae5d2800",
    silent_night: "5001040013500000009e296a245a6f660a75086b70953b6e2800",
    rosy_sparkle: "500104001350000000810967c63a6cb2aa5ea7094eddd73c2800",
    festive_fun: "5001040013500000005a9318de53123e9414fdcc67839d612800",
    colour_burst: "500104001350000000f2731ff0c6266a6c64246e57d4f98f2800",
    crystalline: "5001040013500000006ea96a92a85e58074e18543d9cf3332800",
};

export const hueEffects = {
    candle: "21000101",
    fireplace: "21000102",
    colorloop: "21000103",
    sunrise: "21000109",
    sparkle: "2100010a",
    opal: "2100010b",
    glisten: "2100010c",
    underwater: "2100010e",
    cosmos: "2100010f",
    sunbeam: "21000110",
    enchant: "21000111",
    stop_hue_effect: "200000",
};

const philipsFz = {
    hue_tap_dial: {
        cluster: "manuSpecificPhilips",
        type: "commandHueNotification",
        options: [exposes.options.simulated_brightness()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const buttonLookup: KeyValue = {1: "button_1", 2: "button_2", 3: "button_3", 4: "button_4", 20: "dial"};
            const button = buttonLookup[msg.data.button];
            const direction = msg.data.unknown3 < 127 ? "right" : "left";
            const time = msg.data.time;
            const payload: KeyValue = {};

            if (button === "dial") {
                const adjustedTime = direction === "right" ? time : 256 - time;
                const dialType = "rotate";
                const speed = adjustedTime <= 25 ? "step" : adjustedTime <= 75 ? "slow" : "fast";
                payload.action = `${button}_${dialType}_${direction}_${speed}`;

                // extra raw info about dial turning
                const typeLookup: KeyValue = {1: "step", 2: "rotate"};
                const type = typeLookup[msg.data.type];
                payload.action_time = adjustedTime;
                payload.action_direction = direction;
                payload.action_type = type;

                // simulated brightness
                if (options.simulated_brightness) {
                    const opts = options.simulated_brightness;
                    // @ts-expect-error ignore
                    const deltaOpts = typeof opts === "object" && opts.delta != null ? opts.delta : 35;
                    const delta = direction === "right" ? deltaOpts : deltaOpts * -1;
                    const brightness = globalStore.getValue(msg.endpoint, "brightness", 255) + delta;
                    payload.brightness = utils.numberWithinRange(brightness, 0, 255);
                    globalStore.putValue(msg.endpoint, "brightness", payload.brightness);
                }
            } else {
                const typeLookup: KeyValue = {0: "press", 1: "hold", 2: "press_release", 3: "hold_release"};
                const type = typeLookup[msg.data.type];
                payload.action = `${button}_${type}`;
                // duration
                if (type === "press") globalStore.putValue(msg.endpoint, "press_start", Date.now());
                else if (type === "hold" || type === "hold_release") {
                    payload.action_duration = (Date.now() - globalStore.getValue(msg.endpoint, "press_start")) / 1000;
                }
            }
            return payload;
        },
    } satisfies Fz.Converter<"manuSpecificPhilips", undefined, "commandHueNotification">,
    gradient: {
        cluster: "manuSpecificPhilips2",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.state !== undefined) {
                const input = msg.data.state.toString("hex");
                const decoded = decodeGradientColors(input, {reverse: true});
                if (decoded.color_mode === "gradient") {
                    return {gradient: decoded.colors};
                }
            }
            return {};
        },
    } satisfies Fz.Converter<"manuSpecificPhilips2", undefined, ["attributeReport", "readResponse"]>,
};
export {philipsFz as fz};

// decoder for manuSpecificPhilips2.state
export function decodeGradientColors(input: string, opts: KeyValue) {
    // Gradient mode (4b01)
    // Example: 4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800
    // 4b01 - mode? (4) (0b00 single color?, 4b01 gradient?)
    //     01 - on/off (2)
    //       64 - brightness (2)
    //         fb74346b - unknown (8) - Might be XY Color?
    //                 13 - length (2)
    //                   50 - ncolors (2)
    //                     000000 - unknown (6)
    //                           f3297fda7d55da7d55f3297fda7d55 - colors (6 * ncolors)
    //                                                         28 - segments (2)
    //                                                           00 - offset (2)
    //
    // Temperature mode (0f00)
    // Example: 0f0000044d01ab6f7067
    // 0f00 - mode (4)
    //     01 - on/off (2)
    //       1a - brightness (2)
    //          4d01 - color temperature (4)
    //              ab6f7067 - unknown (8)
    //
    // XY Color mode (0b00)
    // Example: 0b00010460b09c4e
    // 0b00 - mode (4) == 0b00 single color mode
    //     01 - on/off (2)
    //       04 - brightness (2)
    //         60b09c4e - color (8) (xLow, xHigh, yLow, yHigh)
    //
    // Effect mode (ab00)
    // Example: ab000153df7e446a0180
    // ab00 - mode (4)
    //     01 - on/off (2)
    //       53 - brightness (2)
    //         df7e446a - XY Color (8)
    //                 0180 - effect (4)
    //
    // On/off/brightness mode (0003) – For devices that only support on/off and brightness
    // Example: 030001b2
    // 0300 - mode (4)
    //     01 - on/off (2)
    //       b2 - brightness (2)

    // Device color mode
    const mode = input.slice(0, 4);
    input = input.slice(4);

    // On/off (2 bytes)
    const on = Number.parseInt(input.slice(0, 2), 16) === 1;
    input = input.slice(2);

    // Brightness (2 bytes)
    const brightness = Number.parseInt(input.slice(0, 2), 16);
    input = input.slice(2);

    // Gradient mode
    if (mode === COLOR_MODE_GRADIENT) {
        // Unknown (8 bytes)
        input = input.slice(8);

        // Length (2 bytes)
        input = input.slice(2);

        // Number of colors (2 bytes)
        const nColors = Number.parseInt(input.slice(0, 2), 16) >> 4;
        input = input.slice(2);

        // Unknown (6 bytes)
        input = input.slice(6);

        // Colors (6 * nColors bytes)
        const colorsPayload = input.slice(0, 6 * nColors);
        input = input.slice(6 * nColors);
        const colors = colorsPayload.match(/.{6}/g).map(decodeScaledGradientToRGB);

        // Segments (2 bytes)
        const segments = Number.parseInt(input.slice(0, 2), 16) >> 3;
        input = input.slice(2);

        // Offset (2 bytes)
        const offset = Number.parseInt(input.slice(0, 2), 16) >> 3;

        if (opts?.reverse) {
            colors.reverse();
        }

        return {
            color_mode: "gradient",
            colors,
            segments,
            offset,
            brightness,
            on,
        };
    }
    if (mode === COLOR_MODE_COLOR_XY || mode === COLOR_MODE_EFFECT) {
        // XY Color mode
        const xLow = Number.parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const xHigh = Number.parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);
        const yHigh = Number.parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const yLow = Number.parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);

        const x = Math.round(((xHigh | xLow) / 65535) * 10000) / 10000;
        const y = Math.round(((yHigh | yLow) / 65535) * 10000) / 10000;

        if (mode === COLOR_MODE_COLOR_XY) {
            return {
                color_mode: "xy",
                x,
                y,
                brightness,
                on,
            };
        }

        // Effect mode
        const effect = input.slice(0, 4);
        // @ts-expect-error ignore
        const name = knownEffects[effect] || `unknown_${effect}`;
        return {
            color_mode: "xy",
            x,
            y,
            brightness,
            on,
            name,
        };
    }
    if (mode === COLOR_MODE_COLOR_TEMP) {
        // Color temperature mode
        const low = Number.parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const high = Number.parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);

        const temp = high | low;

        return {
            color_mode: "color_temp",
            color_temp: temp,
            brightness,
            on,
        };
    }
    if (mode === COLOR_MODE_BRIGHTNESS) {
        return {
            brightness,
            on,
        };
    }

    // Unknown mode
    return {};
}

// Value is a list of RGB HEX colors
export function encodeGradientColors(value: string[], opts: KeyValueAny) {
    if (value.length > 9) {
        throw new Error(`Expected up to 9 colors, got ${value.length}`);
    }
    if (value.length < 1) {
        throw new Error("Expected at least 1 color, got 0");
    }

    // For devices where it makes more sense to specify the colors in reverse
    // For example Hue Signe, where the last color is the top color.
    if (opts.reverse) {
        value.reverse();
    }

    // The number of colors and segments can technically differ. Here they are always the same, but we could
    // support it by extending the API.
    // If number of colors is less than the number of segments, the colors will repeat.
    // It seems like the maximum number of colors is 9, and the maximum number of segments is 31.
    const nColors = (value.length << 4).toString(16).padStart(2, "0");

    let segments = value.length;
    if (opts.segments) {
        segments = opts.segments;
    }

    if (segments < 1 || segments > 31) {
        throw new Error(`Expected segments to be between 1 and 31 (inclusive), got ${segments}`);
    }
    const segmentsPayload = (segments << 3).toString(16).padStart(2, "0");

    // Encode the colors
    const colorsPayload = value.map(encodeRGBToScaledGradient).join("");

    // Offset of the first color. 0 means the first segment uses the first color. (min 0, max 31)
    let offset = 0;
    if (opts.offset) {
        offset = opts.offset;
    }
    const offsetPayload = (offset << 3).toString(16).padStart(2, "0");

    // Payload length
    const length = (1 + 3 * (value.length + 1)).toString(16).padStart(2, "0");

    // 5001 - mode? set gradient?
    // 0400 - unknown
    const scene = `50010400${length}${nColors}000000${colorsPayload}${segmentsPayload}${offsetPayload}`;

    return scene;
}
