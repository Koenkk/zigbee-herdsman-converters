import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import type {DummyDevice, Fz, KeyValueAny, KeyValueString, OnEvent, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";
import * as exposes from "./exposes";
import {logger} from "./logger";

const NS = "zhc:legrand";
const e = exposes.presets;
const ea = exposes.access;

const shutterCalibrationModes = {
    0: {description: "classic_nllv", onlyNLLV: true, supportsTilt: false},
    1: {description: "specific_nllv", onlyNLLV: true, supportsTilt: false},
    2: {description: "up_down_stop", onlyNLLV: false, supportsTilt: false},
    3: {description: "temporal", onlyNLLV: false, supportsTilt: false},
    4: {description: "venetian_bso", onlyNLLV: false, supportsTilt: true},
};

const ledModes = {
    1: "led_in_dark",
    2: "led_if_on",
};

const ledEffects = {
    0: "blink 3",
    1: "fixed",
    2: "blink green",
    3: "blink blue",
};

const ledColors = {
    0: "default",
    1: "red",
    2: "green",
    3: "blue",
    4: "lightblue",
    5: "yellow",
    6: "pink",
    7: "white",
};

const optsLegrand = {
    identityEffect: () => {
        return e
            .composite("Identity effect", "identity_effect", ea.SET)
            .withDescription("Defines the identification effect to simplify the device identification.")
            .withFeature(e.enum("effect", ea.SET, Object.values(ledEffects)).withLabel("Effect"))
            .withFeature(e.enum("color", ea.SET, Object.values(ledColors)).withLabel("Color"));
    },
};

const getApplicableCalibrationModes = (isNLLVSwitch: boolean): KeyValueString => {
    return Object.fromEntries(
        Object.entries(shutterCalibrationModes)
            .filter((e) => (isNLLVSwitch ? true : e[1].onlyNLLV === false))
            .map((e) => [e[0], e[1].description]),
    );
};

export const legrandOptions = {manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP, disableDefaultResponse: true};

interface LegrandDevicesCluster {
    attributes: {
        deviceMode: number;
        ledInDark: number;
        ledIfOn: number;
    };
    commands: never;
    commandResponses: never;
}

interface LegrandDevicesCluster2 {
    attributes: {
        pilotWireMode: number;
    };
    commands: {
        command0: {data: Buffer};
    };
    commandResponses: never;
}

export const legrandExtend = {
    addLegrandDevicesCluster: () =>
        m.deviceAddCustomCluster("manuSpecificLegrandDevices", {
            ID: 0xfc01,
            manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP,
            attributes: {
                deviceMode: {ID: 0x0000, type: Zcl.DataType.DATA16},
                ledInDark: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
                ledIfOn: {ID: 0x0002, type: Zcl.DataType.BOOLEAN},
            },
            commands: {},
            commandsResponse: {},
        }),
    addLegrandDevices2Cluster: () =>
        m.deviceAddCustomCluster("manuSpecificLegrandDevices2", {
            ID: 0xfc40,
            manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP,
            attributes: {
                pilotWireMode: {ID: 0x0000, type: Zcl.DataType.ENUM8},
            },
            commands: {
                command0: {ID: 0x00, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}]},
            },
            commandsResponse: {},
        }),
    addLegrandDevices3Cluster: () =>
        m.deviceAddCustomCluster("manuSpecificLegrandDevices3", {
            ID: 0xfc41,
            manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP,
            attributes: {},
            commands: {
                command0: {ID: 0x00, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}]},
            },
            commandsResponse: {},
        }),
};

export const eLegrand = {
    identify: () => {
        return e
            .enum("identify", ea.SET, ["identify"])
            .withDescription("Blinks the built-in LED to make it easier to identify the device")
            .withCategory("config");
    },
    ledInDark: () => {
        return e
            .binary("led_in_dark", ea.ALL, "ON", "OFF")
            .withDescription("Enables the built-in LED allowing to see the switch in the dark")
            .withCategory("config");
    },
    ledIfOn: () => {
        return e.binary("led_if_on", ea.ALL, "ON", "OFF").withDescription("Enables the LED on activity").withCategory("config");
    },
    getCover: (device: Zh.Device | DummyDevice) => {
        const c = e.cover_position();

        const calMode = !utils.isDummyDevice(device)
            ? Number(device.getEndpoint(1)?.clusters?.closuresWindowCovering?.attributes?.calibrationMode)
            : 0;
        const showTilt = calMode ? utils.getFromLookup(calMode, shutterCalibrationModes)?.supportsTilt === true : false;

        if (showTilt) {
            c.addFeature(
                new exposes.Numeric("tilt", ea.ALL)
                    .withValueMin(0)
                    .withValueMax(100)
                    .withValueStep(25)
                    .withPreset("Closed", 0, "Vertical")
                    .withPreset("25 %", 25, "25%")
                    .withPreset("50 %", 50, "50%")
                    .withPreset("75 %", 75, "75%")
                    .withPreset("Open", 100, "Horizontal")
                    .withUnit("%")
                    .withDescription("Tilt percentage of that cover"),
            );
        }
        return c;
    },
    getCalibrationModes: (isNLLVSwitch: boolean) => {
        const modes = getApplicableCalibrationModes(isNLLVSwitch);
        return e
            .enum("calibration_mode", ea.ALL, Object.values(modes))
            .withDescription("Defines the calibration mode of the switch. (Caution: Changing modes requires a recalibration of the shutter switch!)")
            .withCategory("config");
    },
};

export const readInitialBatteryState: OnEvent.Handler = async (event) => {
    if (event.type === "deviceAnnounce") {
        const endpoint = event.data.device.getEndpoint(1);
        await endpoint.read("genPowerCfg", ["batteryVoltage"], legrandOptions);
    }
};

export const tzLegrand = {
    auto_mode: {
        key: ["auto_mode"],
        convertSet: async (entity, key, value, meta) => {
            const mode = utils.getFromLookup(value, {off: 0x00, auto: 0x02, on_override: 0x03});
            const payload = {data: Buffer.from([mode])};
            await entity.command("manuSpecificLegrandDevices3", "command0", payload);
            return {state: {auto_mode: value}};
        },
    } satisfies Tz.Converter,
    calibration_mode: (isNLLVSwitch: boolean) => {
        return {
            key: ["calibration_mode"],
            convertSet: async (entity, key, value, meta) => {
                const applicableModes = getApplicableCalibrationModes(isNLLVSwitch);
                utils.validateValue(value, Object.values(applicableModes));
                const idx = Number(utils.getKey(applicableModes, value));
                await entity.write("closuresWindowCovering", {calibrationMode: idx}, legrandOptions);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read("closuresWindowCovering", ["calibrationMode"], legrandOptions);
            },
        } satisfies Tz.Converter;
    },
    led_mode: {
        key: ["led_in_dark", "led_if_on"],
        convertSet: async (entity, key, value, meta) => {
            utils.validateValue(key, Object.values(ledModes));
            const idx = utils.getKey(ledModes, key);
            const state = value === "ON" || (value === "OFF" ? false : !!value);
            const payload = {[idx]: {value: state, type: 16}};
            await entity.write("manuSpecificLegrandDevices", payload, legrandOptions);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            utils.validateValue(key, Object.values(ledModes));
            const idx = utils.getKey(ledModes, key);
            await entity.read("manuSpecificLegrandDevices", [Number(idx)], legrandOptions);
        },
    } satisfies Tz.Converter,
    identify: {
        key: ["identify"],
        options: [optsLegrand.identityEffect()],
        convertSet: async (entity, key, value, meta) => {
            const identityEffect = meta.options.identity_effect as KeyValueAny;
            const selEffect = identityEffect?.effect ?? ledEffects[0];
            const selColor = identityEffect?.color ?? ledColors[0];

            const effectID = Number.parseInt(utils.getFromLookupByValue(selEffect, ledEffects, "0"), 10);
            const effectVariant = Number.parseInt(utils.getFromLookupByValue(selColor, ledColors, "0"), 10);

            // Trigger an effect
            await entity.command("genIdentify", "triggerEffect", {effectid: effectID, effectvariant: effectVariant}, {});
            // Trigger the identification
            await entity.command("genIdentify", "identify", {identifytime: 10}, {});
        },
    } satisfies Tz.Converter,
    legrand_device_mode: {
        key: ["device_mode"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, key);
            // enable the dimmer, requires a recent firmware on the device
            const lookup: Record<string, number> = {
                dimmer_on: 0x0101,
                dimmer_off: 0x0100,
                switch: 0x0003,
                auto: 0x0004,
                pilot_on: 0x0002,
                pilot_off: 0x0001,
            };
            const val = value.toLowerCase();
            utils.validateValue(val, Object.keys(lookup));
            const payload: KeyValueAny = {deviceMode: utils.getFromLookup(val, lookup)};
            await entity.write("manuSpecificLegrandDevices", payload, legrandOptions);
            return {state: {device_mode: val}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificLegrandDevices", [0x0000, 0x0001, 0x0002], legrandOptions);
        },
    } satisfies Tz.Converter,
    legrand_pilot_wire_mode: {
        key: ["pilot_wire_mode"],
        convertSet: async (entity, key, value, meta) => {
            const modeLookup = {
                comfort: 0x00,
                "comfort_-1": 0x01,
                "comfort_-2": 0x02,
                eco: 0x03,
                frost_protection: 0x04,
                off: 0x05,
            };
            utils.validateValue(value, Object.keys(modeLookup));
            const payload = {data: Buffer.from([utils.getFromLookup(value, modeLookup)])};
            await entity.command("manuSpecificLegrandDevices2", "command0", payload);
            return {state: {pilot_wire_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificLegrandDevices2", [0x0000], legrandOptions);
        },
    } satisfies Tz.Converter,
};

export const fzLegrand = {
    calibration_mode: (isNLLVSwitch: boolean) => {
        return {
            cluster: "closuresWindowCovering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const attr = "calibrationMode";
                if (msg.data[attr] !== undefined) {
                    const applicableModes = getApplicableCalibrationModes(isNLLVSwitch);
                    const idx = msg.data[attr];
                    utils.validateValue(String(idx), Object.keys(applicableModes));
                    const calMode = applicableModes[idx];
                    return {calibration_mode: calMode};
                }
            },
        } satisfies Fz.Converter<"closuresWindowCovering", undefined, ["attributeReport", "readResponse"]>;
    },
    cluster_fc01: {
        cluster: "manuSpecificLegrandDevices",
        type: ["readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};
            if (msg.data.deviceMode !== undefined) {
                const modeLookup: Record<number, string> = {
                    1: "pilot_off",
                    2: "pilot_on",
                    3: "switch",
                    4: "auto",
                    256: "dimmer_off",
                    257: "dimmer_on",
                };
                const mode = msg.data.deviceMode;
                if (modeLookup[mode] !== undefined) {
                    payload.device_mode = modeLookup[mode];
                } else {
                    logger.warning(`Device_mode ${mode} not recognized, please fix me!`, NS);
                    payload.device_mode = "unknown";
                }
            }
            if (msg.data.ledInDark !== undefined) {
                payload.led_in_dark = msg.data.ledInDark ? "ON" : "OFF";
            }
            if (msg.data.ledIfOn !== undefined) {
                payload.led_if_on = msg.data.ledIfOn ? "ON" : "OFF";
            }
            return payload;
        },
    } satisfies Fz.Converter<"manuSpecificLegrandDevices", LegrandDevicesCluster, ["readResponse"]>,
    stop_poll_on_checkin: {
        cluster: "genPollCtrl",
        type: ["commandCheckin"],
        convert: (model, msg, publish, options, meta) => {
            // TODO current solution is a work around, it would be cleaner to answer to the request
            const endpoint = msg.device.getEndpoint(1);
            endpoint
                .command("genPollCtrl", "fastPollStop", {}, legrandOptions)
                .catch((error) => logger.debug(`Failed to stop poll on '${msg.device.ieeeAddr}' (${error})`, NS));
        },
    } satisfies Fz.Converter<"genPollCtrl", undefined, ["commandCheckin"]>,
    command_cover: {
        cluster: "closuresWindowCovering",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};
            if (msg.data.tuyaMovingState !== undefined) {
                if (utils.hasAlreadyProcessedMessage(msg, model)) return;
                if (msg.data.tuyaMovingState === 0) {
                    // return {
                    // action: 'open',
                    // };
                    payload.action = utils.postfixWithEndpointName("OPEN", msg, model, meta);
                    utils.addActionGroup(payload, msg, model);
                }
                if (msg.data.tuyaMovingState === 100) {
                    // return {
                    // action: 'closed',
                    // };
                    payload.action = utils.postfixWithEndpointName("CLOSE", msg, model, meta);
                    utils.addActionGroup(payload, msg, model);
                }
                if (msg.data.tuyaMovingState >= 1 && msg.data.tuyaMovingState < 100) {
                    // return {
                    // action: 'stop',
                    // };
                    payload.action = utils.postfixWithEndpointName("STOP", msg, model, meta);
                    utils.addActionGroup(payload, msg, model);
                }
            }
            return payload;
        },
    } satisfies Fz.Converter<"closuresWindowCovering", undefined, ["attributeReport", "readResponse"]>,
    identify: {
        cluster: "genIdentify",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            return {};
        },
    } satisfies Fz.Converter<"genIdentify", undefined, ["attributeReport", "readResponse"]>,
    legrand_master_switch_center: {
        cluster: "manuSpecificLegrandDevices",
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            const centerSignature = [0x15, 0x21, 0x10, 0x00, 0x03, 0xff];
            if (msg.data?.length === 6 && centerSignature.every((b, i) => msg.data[i] === b)) {
                return {action: utils.postfixWithEndpointName("center", msg, model, meta)};
            }
        },
    } satisfies Fz.Converter<"manuSpecificLegrandDevices", LegrandDevicesCluster, "raw">,
    legrand_pilot_wire_mode: {
        cluster: "manuSpecificLegrandDevices2",
        type: ["readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.pilotWireMode !== undefined) {
                const lookup: Record<number, string> = {
                    0: "comfort",
                    1: "comfort_-1",
                    2: "comfort_-2",
                    3: "eco",
                    4: "frost_protection",
                    5: "off",
                };
                const mode = msg.data.pilotWireMode;
                if (lookup[mode] !== undefined) {
                    return {pilot_wire_mode: lookup[mode]};
                }
                logger.warning(`Pilot_wire_mode ${mode} not recognized, please fix me!`, NS);
                return {pilot_wire_mode: "unknown"};
            }
        },
    } satisfies Fz.Converter<"manuSpecificLegrandDevices2", LegrandDevicesCluster2, ["readResponse"]>,
};
