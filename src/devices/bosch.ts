import {Zcl, ZSpec} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import {
    type BoschBmctCluster,
    boschBmctExtend,
    boschBsenExtend,
    boschBsirExtend,
    boschDoorWindowContactExtend,
    boschGeneralEnergyDeviceExtend,
    boschGeneralExtend,
    boschSmartPlugExtend,
    boschSmokeAlarmExtend,
    boschThermostatExtend,
    boschWaterAlarmExtend,
    manufacturerOptions,
} from "../lib/bosch";
import {repInterval} from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import {payload} from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Expose, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:bosch";

// Universal Switch II
const buttonMap: {[key: string]: number} = {
    config_led_top_left_press: 0x10,
    config_led_top_right_press: 0x11,
    config_led_bottom_left_press: 0x12,
    config_led_bottom_right_press: 0x13,
    config_led_top_left_longpress: 0x20,
    config_led_top_right_longpress: 0x21,
    config_led_bottom_left_longpress: 0x22,
    config_led_bottom_right_longpress: 0x23,
};

// Universal Switch II
const labelShortPress = `Specifies LED color (rgb) and pattern on short press as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: ff1493000104010001`;

// Universal Switch II
const labelLongPress = `Specifies LED color (rgb) and pattern on long press as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: ff4200000502050001`;

// Universal Switch II
const labelConfirmation = `Specifies LED color (rgb) and pattern of the confirmation response as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: 30ff00000102010001`;

interface TwinguardSmokeDetector {
    attributes: {
        sensitivity: number;
    };
    commands: {
        initiateTestMode: Record<string, never>;
    };
    commandResponses: never;
}
interface TwinguardMeasurements {
    attributes: {
        humidity: number;
        unknown1: number;
        unknown2: number;
        airpurity: number;
        temperature: number;
        illuminance: number;
        battery: number;
        unknown3: number;
        unknown4: number;
        pressure: number;
        unknown6: number;
        unknown7: number;
        unknown8: number;
    };
    commands: never;
    commandResponses: never;
}
interface TwinguardOptions {
    attributes: {
        unknown1: number;
        // biome-ignore lint/style/useNamingConvention: TODO
        pre_alarm: number;
    };
    commands: {
        burglarAlarm: {data: number};
    };
    commandResponses: never;
}
interface TwinguardSetup {
    attributes: {
        unknown1: number;
        unknown2: number;
        heartbeat: number;
    };
    commands: {pairingCompleted: Record<string, never>};
    commandResponses: never;
}
interface TwinguardAlarm {
    attributes: {
        // biome-ignore lint/style/useNamingConvention: TODO
        alarm_status: number;
    };
    commands: {burglarAlarm: {data: number}};
    commandResponses: never;
}

interface BoschSpecificBhius {
    attributes: never;
    commands: {
        confirmButtonPressed: {data: Buffer};
        pairingCompleted: {data: Buffer};
    };
    commandResponses: never;
}

interface BoschSmokeAlarmSiren {
    attributes: never;
    commands: {boschSmokeAlarmSiren: {data: number}};
    commandResponses: never;
}

const boschBmctRzSettings = {
    deviceModes: {
        switch: 0x00,
        pulsed: 0x01,
    },
    switchTypes: {
        button: 0x05,
        rocker_switch: 0x07,
        none: 0x00,
    },
    switchModes: {
        coupled: 0x00,
        decoupled: 0x01,
    },
    hasDualSwitchInputs: false,
};

const boschBmctDzSettings = {
    switchTypes: {
        button: 0x05,
        none: 0x00,
    },
    switchModes: {
        coupled: 0x00,
        decoupled: 0x01,
    },
    hasDualSwitchInputs: false,
};

const boschExtend = {
    broadcastAlarm: (): ModernExtend => {
        const sirenState = {
            smoke_off: 0x0000,
            smoke_on: 0x3c00,
            burglar_off: 0x0001,
            burglar_on: 0xb401,
        };
        const exposes: Expose[] = [
            e
                .enum("broadcast_alarm", ea.SET, Object.keys(sirenState))
                .withDescription("Set siren state of all BSD-2 via broadcast")
                .withCategory("config"),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["broadcast_alarm"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "broadcast_alarm") {
                        const index = utils.getFromLookup(value, sirenState);
                        utils.assertEndpoint(entity);
                        await entity.zclCommandBroadcast<"ssIasZone", "boschSmokeAlarmSiren", BoschSmokeAlarmSiren>(
                            255,
                            ZSpec.BroadcastAddress.SLEEPY,
                            "ssIasZone",
                            "boschSmokeAlarmSiren",
                            {data: index},
                            manufacturerOptions,
                        );
                        return;
                    }
                },
            },
        ];
        return {
            exposes,
            toZigbee,
            isModernExtend: true,
        };
    },
    twinguard: (): ModernExtend => {
        const smokeSensitivity = {
            low: 0x03,
            medium: 0x02,
            high: 0x01,
        };
        const sirenState = {
            stop: 0x00,
            pre_alarm: 0x01,
            fire: 0x02,
            burglar: 0x03,
        };
        const stateOffOn = {
            OFF: 0x00,
            ON: 0x01,
        };
        const exposes: Expose[] = [
            e.binary("smoke", ea.STATE, true, false).withDescription("Indicates whether the device detected smoke"),
            e
                .numeric("temperature", ea.STATE)
                .withValueMin(0)
                .withValueMax(65)
                .withValueStep(0.1)
                .withUnit("°C")
                .withDescription("Measured temperature value"),
            e
                .numeric("humidity", ea.STATE)
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(0.1)
                .withUnit("%")
                .withDescription("Measured relative humidity"),
            e
                .numeric("voc", ea.STATE)
                .withValueMin(0)
                .withValueMax(50000)
                .withValueStep(1)
                .withLabel("VOC")
                .withUnit("µg/m³")
                .withDescription("Measured VOC value"),
            e
                .numeric("co2", ea.STATE)
                .withValueMin(400)
                .withValueMax(2400)
                .withValueStep(1)
                .withLabel("CO2")
                .withUnit("ppm")
                .withDescription("The measured CO2 (carbon dioxide) value"),
            e.numeric("aqi", ea.STATE).withValueMin(0).withValueMax(500).withValueStep(1).withLabel("AQI").withDescription("Air Quality Index"),
            e.illuminance(),
            e
                .numeric("battery", ea.STATE)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Remaining battery in %")
                .withCategory("diagnostic"),
            e.text("siren_state", ea.STATE).withDescription("Siren state").withCategory("diagnostic"),
            e.enum("alarm", ea.ALL, Object.keys(sirenState)).withDescription("Alarm mode for siren"),
            e.binary("self_test", ea.ALL, true, false).withDescription("Initiate self-test").withCategory("config"),
            e.enum("sensitivity", ea.ALL, Object.keys(smokeSensitivity)).withDescription("Sensitivity of the smoke detector").withCategory("config"),
            e.binary("pre_alarm", ea.ALL, "ON", "OFF").withDescription("Enable/disable pre-alarm").withCategory("config"),
            e.binary("heartbeat", ea.ALL, "ON", "OFF").withDescription("Enable/disable heartbeat (blue LED)").withCategory("config"),
        ];
        const fromZigbee = [
            {
                cluster: "twinguardSmokeDetector",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.sensitivity !== undefined) {
                        result.sensitivity = Object.keys(smokeSensitivity)[msg.data.sensitivity];
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardSmokeDetector", TwinguardSmokeDetector, ["attributeReport", "readResponse"]>,
            {
                cluster: "twinguardMeasurements",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.humidity !== undefined) {
                        const humidity = utils.toNumber(msg.data.humidity) / 100.0;
                        if (utils.isInRange(0, 100, humidity)) {
                            result.humidity = humidity;
                        }
                    }
                    if (msg.data.airpurity !== undefined) {
                        const iaq = utils.toNumber(msg.data.airpurity);
                        result.aqi = iaq;
                        let factorVoc = 6;
                        let factorCo2 = 2;
                        if (iaq >= 51 && iaq <= 100) {
                            factorVoc = 10;
                            factorCo2 = 4;
                        } else if (iaq >= 101 && iaq <= 150) {
                            factorVoc = 20;
                            factorCo2 = 4;
                        } else if (iaq >= 151 && iaq <= 200) {
                            factorVoc = 50;
                            factorCo2 = 4;
                        } else if (iaq >= 201 && iaq <= 250) {
                            factorVoc = 100;
                            factorCo2 = 4;
                        } else if (iaq >= 251) {
                            factorVoc = 100;
                            factorCo2 = 4;
                        }
                        result.voc = iaq * factorVoc;
                        result.co2 = iaq * factorCo2 + 400;
                    }
                    if (msg.data.temperature !== undefined) {
                        result.temperature = utils.toNumber(msg.data.temperature) / 100.0;
                    }
                    if (msg.data.illuminance !== undefined) {
                        result.illuminance = utils.precisionRound(msg.data.illuminance / 2, 2);
                    }
                    if (msg.data.battery !== undefined) {
                        result.battery = utils.precisionRound(msg.data.battery / 2, 2);
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardMeasurements", TwinguardMeasurements, ["attributeReport", "readResponse"]>,
            {
                cluster: "twinguardOptions",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.pre_alarm !== undefined) {
                        result.pre_alarm = Object.keys(stateOffOn)[msg.data.pre_alarm];
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardOptions", TwinguardOptions, ["attributeReport", "readResponse"]>,
            {
                cluster: "twinguardSetup",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.heartbeat !== undefined) {
                        result.heartbeat = Object.keys(stateOffOn)[msg.data.heartbeat];
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardSetup", TwinguardSetup, ["attributeReport", "readResponse"]>,
            {
                cluster: "twinguardAlarm",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const lookup: KeyValue = {
                        2097184: "clear",
                        18874400: "self_test",
                        35651616: "burglar",
                        2097282: "pre_alarm",
                        2097281: "fire",
                        2097216: "silenced",
                    };
                    if (msg.data.alarm_status !== undefined) {
                        result.self_test = (msg.data.alarm_status & (1 << 24)) > 0;
                        result.smoke = (msg.data.alarm_status & (1 << 7)) > 0;
                        result.siren_state = lookup[msg.data.alarm_status];
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardAlarm", TwinguardAlarm, ["attributeReport", "readResponse"]>,
            {
                cluster: "genAlarms",
                type: ["commandAlarm", "readResponse"],
                convert: async (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const lookup: KeyValue = {
                        16: "fire",
                        17: "pre_alarm",
                        20: "clear",
                        22: "silenced",
                    };
                    if ("alarmcode" in msg.data) {
                        result.siren_state = lookup[msg.data.alarmcode];
                        if (msg.data.alarmcode === 0x10 || msg.data.alarmcode === 0x11) {
                            await msg.endpoint.commandResponse(
                                "genAlarms",
                                "alarm",
                                {alarmcode: msg.data.alarmcode, clusterid: 0xe000},
                                {direction: 1},
                            );
                        }
                        return result;
                    }
                },
            } satisfies Fz.Converter<"genAlarms", undefined, ["commandAlarm", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["sensitivity", "pre_alarm", "self_test", "alarm", "heartbeat"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "sensitivity") {
                        const index = utils.getFromLookup(value, smokeSensitivity);
                        await entity.write<"twinguardSmokeDetector", TwinguardSmokeDetector>(
                            "twinguardSmokeDetector",
                            {sensitivity: index},
                            manufacturerOptions,
                        );
                        return {state: {sensitivity: value}};
                    }
                    if (key === "pre_alarm") {
                        const index = utils.getFromLookup(value, stateOffOn);
                        await entity.write<"twinguardOptions", TwinguardOptions>("twinguardOptions", {pre_alarm: index}, manufacturerOptions);
                        return {state: {pre_alarm: value}};
                    }
                    if (key === "heartbeat") {
                        const endpoint = meta.device.getEndpoint(12);
                        const index = utils.getFromLookup(value, stateOffOn);
                        await endpoint.write<"twinguardSetup", TwinguardSetup>("twinguardSetup", {heartbeat: index}, manufacturerOptions);
                        return {state: {heartbeat: value}};
                    }
                    if (key === "self_test") {
                        if (value) {
                            await entity.command<"twinguardSmokeDetector", "initiateTestMode", TwinguardSmokeDetector>(
                                "twinguardSmokeDetector",
                                "initiateTestMode",
                                {},
                                manufacturerOptions,
                            );
                        }
                    }
                    if (key === "alarm") {
                        const endpoint = meta.device.getEndpoint(12);
                        const index = utils.getFromLookup(value, sirenState);
                        utils.assertEndpoint(entity);
                        if (index === 0x00) {
                            await entity.commandResponse("genAlarms", "alarm", {alarmcode: 0x16, clusterid: 0xe000}, {direction: 1});
                            await entity.commandResponse("genAlarms", "alarm", {alarmcode: 0x14, clusterid: 0xe000}, {direction: 1});
                            await endpoint.command<"twinguardAlarm", "burglarAlarm", TwinguardAlarm>(
                                "twinguardAlarm",
                                "burglarAlarm",
                                {data: 0x00},
                                manufacturerOptions,
                            );
                        } else if (index === 0x01) {
                            await entity.commandResponse("genAlarms", "alarm", {alarmcode: 0x11, clusterid: 0xe000}, {direction: 1});
                            return {state: {siren_state: "pre_alarm"}};
                        } else if (index === 0x02) {
                            await entity.commandResponse("genAlarms", "alarm", {alarmcode: 0x10, clusterid: 0xe000}, {direction: 1});
                            return {state: {siren_state: "fire"}};
                        } else if (index === 0x03) {
                            await endpoint.command<"twinguardAlarm", "burglarAlarm", TwinguardAlarm>(
                                "twinguardAlarm",
                                "burglarAlarm",
                                {data: 0x01},
                                manufacturerOptions,
                            );
                        }
                    }
                },
                convertGet: async (entity, key, meta) => {
                    switch (key) {
                        case "sensitivity":
                            await entity.read<"twinguardSmokeDetector", TwinguardSmokeDetector>(
                                "twinguardSmokeDetector",
                                ["sensitivity"],
                                manufacturerOptions,
                            );
                            break;
                        case "pre_alarm":
                            await entity.read<"twinguardOptions", TwinguardOptions>("twinguardOptions", ["pre_alarm"], manufacturerOptions);
                            break;
                        case "heartbeat":
                            await meta.device
                                .getEndpoint(12)
                                .read<"twinguardSetup", TwinguardSetup>("twinguardSetup", ["heartbeat"], manufacturerOptions);
                            break;
                        case "alarm":
                        case "self_test":
                            await meta.device
                                .getEndpoint(12)
                                .read<"twinguardAlarm", TwinguardAlarm>("twinguardAlarm", ["alarm_status"], manufacturerOptions);
                            break;
                        default:
                            throw new Error(`Unhandled key boschExtend.twinguard.toZigbee.convertGet ${key}`);
                    }
                },
            },
        ];
        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
};
const tzLocal = {
    bhius_config: {
        key: Object.keys(buttonMap),
        convertGet: async (entity, key, meta) => {
            if (buttonMap[key] === undefined) {
                throw new Error(`Unknown key ${key}`);
            }
            await entity.read("boschSpecific", [buttonMap[key as keyof typeof buttonMap]], manufacturerOptions);
        },
        convertSet: async (entity, key, value, meta) => {
            if (buttonMap[key] === undefined) {
                return;
            }

            const buffer = Buffer.from(value as string, "hex");
            if (buffer.length !== 9) throw new Error(`Invalid configuration length: ${buffer.length} (should be 9)`);

            const payload = {
                [buttonMap[key as keyof typeof buttonMap]]: {value: buffer, type: 65},
            };
            await entity.write("boschSpecific", payload, manufacturerOptions);

            const result: {[key: number | string]: string} = {};
            result[key] = value as string;
            return {state: result};
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    bhius_button_press: {
        cluster: "boschSpecific",
        type: "raw",
        options: [e.text("led_response", ea.ALL).withLabel("LED config (confirmation response)").withDescription(labelConfirmation)],
        convert: (model, msg, publish, options, meta) => {
            const sequenceNumber = msg.data.readUInt8(3);
            const buttonId = msg.data.readUInt8(4);
            const longPress = msg.data.readUInt8(5);
            const duration = msg.data.readUInt16LE(6);
            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
            let buffer;
            if (options.led_response != null) {
                buffer = Buffer.from(options.led_response as string, "hex");
                if (buffer.length !== 9) {
                    logger.error(`Invalid length of led_response: ${buffer.length} (should be 9)`, NS);
                    buffer = Buffer.from("30ff00000102010001", "hex");
                }
            } else {
                buffer = Buffer.from("30ff00000102010001", "hex");
            }

            if (utils.hasAlreadyProcessedMessage(msg, model, sequenceNumber)) return;
            const buttons: {[key: number]: string} = {0: "top_left", 1: "top_right", 2: "bottom_left", 3: "bottom_right"};

            let command = "";
            if (buttonId in buttons) {
                if (longPress && duration > 0) {
                    if (globalStore.hasValue(msg.endpoint, buttons[buttonId])) return;
                    globalStore.putValue(msg.endpoint, buttons[buttonId], duration);
                    command = "longpress";
                } else {
                    globalStore.clearValue(msg.endpoint, buttons[buttonId]);
                    command = longPress ? "longpress_release" : "release";
                    msg.endpoint
                        .command<"boschSpecific", "confirmButtonPressed", BoschSpecificBhius>(
                            "boschSpecific",
                            "confirmButtonPressed",
                            {data: buffer},
                            {sendPolicy: "immediate"},
                        )
                        .catch((error) => {});
                }
                return {action: `button_${buttons[buttonId]}_${command}`};
            }
            logger.error(`Received message with unknown command ID ${buttonId}. Data: 0x${msg.data.toString("hex")}`, NS);
        },
    } satisfies Fz.Converter<"boschSpecific", undefined, "raw">,
    bhius_config: {
        cluster: "boschSpecific",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: {[key: number | string]: string} = {};
            for (const id of Object.values(buttonMap)) {
                if (msg.data[id] !== undefined) {
                    // TODO: type is assumed "Buffer" since using `toString("hex")`
                    result[Object.keys(buttonMap).find((key) => buttonMap[key] === id)] = (msg.data[id] as Buffer).toString("hex");
                }
            }
            return result;
        },
    } satisfies Fz.Converter<"boschSpecific", BoschSpecificBhius, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RBSH-OS-ZB-EU"],
        model: "BSIR-EZ",
        vendor: "Bosch",
        description: "Outdoor siren",
        extend: [
            boschBsirExtend.customPowerCfgCluster(),
            boschBsirExtend.customIasZoneCluster(),
            boschBsirExtend.customIasWdCluster(),
            boschBsirExtend.deviceState(),
            boschBsirExtend.alarmControl(),
            boschBsirExtend.iasZoneStatus(),
            boschBsirExtend.alarmMode(),
            boschBsirExtend.sirenVolume(),
            boschBsirExtend.sirenDuration(),
            boschBsirExtend.lightDuration(),
            boschBsirExtend.sirenDelay(),
            boschBsirExtend.lightDelay(),
            boschBsirExtend.primaryPowerSource(),
            boschBsirExtend.currentPowerSource(),
            boschBsirExtend.solarPanelVoltage(),
            boschGeneralExtend.batteryWithPercentageAndLowStatus({
                percentageReportingConfig: {min: "MIN", max: "MAX", change: 1},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-WS-ZB-EU"],
        model: "BSEN-W",
        vendor: "Bosch",
        description: "Water alarm (formerly known as BWA-1)",
        extend: [
            boschWaterAlarmExtend.changedSensitivityLevel(),
            boschWaterAlarmExtend.waterAlarmCluster(),
            boschGeneralExtend.handleRenamedCustomCluster("boschSpecific", "boschWaterAlarm"),
            boschWaterAlarmExtend.waterAndTamperAlarm(),
            boschWaterAlarmExtend.muteAlarmControl(),
            boschWaterAlarmExtend.alarmOnMotion(),
            boschWaterAlarmExtend.testMode(),
            boschGeneralExtend.batteryWithPercentageAndLowStatus(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-SD-ZB-EU"],
        model: "BSD-2",
        vendor: "Bosch",
        description: "Smoke alarm II",
        extend: [
            boschSmokeAlarmExtend.enforceDefaultSensitivityLevel(),
            boschSmokeAlarmExtend.customIasZoneCluster(),
            boschSmokeAlarmExtend.smokeAlarmAndButtonPushes(),
            boschSmokeAlarmExtend.alarmControl(),
            boschSmokeAlarmExtend.testMode(),
            boschSmokeAlarmExtend.battery(),
        ],
    },
    {
        zigbeeModel: [
            "RFDL-ZB",
            "RFDL-ZB-EU",
            "RFDL-ZB-H",
            "RFDL-ZB-K",
            "RFDL-ZB-CHI",
            "RFDL-ZB-MS",
            "RFDL-ZB-ES",
            "RFPR-ZB",
            "RFPR-ZB-EU",
            "RFPR-ZB-CHI",
            "RFPR-ZB-ES",
            "RFPR-ZB-MS",
        ],
        model: "RADION TriTech ZB",
        vendor: "Bosch",
        description: "Wireless motion detector",
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["ISW-ZPR1-WP13"],
        model: "ISW-ZPR1-WP13",
        vendor: "Bosch",
        description: "Motion sensor",
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.ignore_iaszone_report],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["RBSH-TRV0-ZB-EU", "RBSH-TRV1-ZB-EU"],
        model: "BTH-RA",
        vendor: "Bosch",
        description: "Radiator thermostat II",
        extend: [
            boschThermostatExtend.customThermostatCluster(),
            boschThermostatExtend.customUserInterfaceCfgCluster(),
            boschThermostatExtend.raThermostat(),
            boschThermostatExtend.setpointChangeSource({enableReporting: true}),
            boschThermostatExtend.operatingMode({enableReporting: true}),
            boschThermostatExtend.windowOpenMode({enableReporting: true}),
            boschThermostatExtend.boostHeating({enableReporting: true}),
            boschThermostatExtend.remoteTemperature(),
            boschThermostatExtend.childLock(),
            boschThermostatExtend.displayBrightness(),
            boschThermostatExtend.displaySwitchOnDuration(),
            boschThermostatExtend.displayOrientation(),
            boschThermostatExtend.displayedTemperature(),
            boschThermostatExtend.valveAdaptation(),
            boschThermostatExtend.errorState({enableReporting: true}),
            boschGeneralExtend.batteryWithPercentageAndLowStatus(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-RTH0-BAT-ZB-EU"],
        model: "BTH-RM",
        vendor: "Bosch",
        description: "Room thermostat II",
        extend: [
            boschGeneralExtend.handleZclVersionReadRequest(),
            boschThermostatExtend.customThermostatCluster(),
            boschThermostatExtend.customUserInterfaceCfgCluster(),
            boschThermostatExtend.customSystemMode(),
            boschThermostatExtend.operatingMode({enableReporting: true}),
            boschThermostatExtend.rmThermostat(),
            boschThermostatExtend.setpointChangeSource({enableReporting: true}),
            boschThermostatExtend.humidity(),
            boschThermostatExtend.cableSensorMode(),
            boschThermostatExtend.cableSensorTemperature(),
            boschThermostatExtend.windowOpenMode(),
            boschThermostatExtend.boostHeating(),
            boschThermostatExtend.childLock(),
            boschThermostatExtend.displayBrightness(),
            boschThermostatExtend.displaySwitchOnDuration(),
            boschThermostatExtend.activityLedState(),
            boschThermostatExtend.errorState({enableReporting: true}),
            boschThermostatExtend.rmBattery(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-RTH0-ZB-EU"],
        model: "BTH-RM230Z",
        vendor: "Bosch",
        description: "Room thermostat II 230V",
        extend: [
            boschGeneralExtend.handleZclVersionReadRequest(),
            boschThermostatExtend.customThermostatCluster(),
            boschThermostatExtend.customUserInterfaceCfgCluster(),
            boschThermostatExtend.relayState(),
            boschThermostatExtend.customSystemMode(),
            boschThermostatExtend.operatingMode({enableReporting: true}),
            boschThermostatExtend.rmThermostat(),
            boschThermostatExtend.setpointChangeSource({enableReporting: true}),
            boschThermostatExtend.humidity(),
            boschThermostatExtend.heaterType(),
            boschThermostatExtend.valveType(),
            boschThermostatExtend.cableSensorMode(),
            boschThermostatExtend.cableSensorTemperature(),
            boschThermostatExtend.windowOpenMode(),
            boschThermostatExtend.boostHeating(),
            boschThermostatExtend.childLock(),
            boschThermostatExtend.displayBrightness(),
            boschThermostatExtend.displaySwitchOnDuration(),
            boschThermostatExtend.activityLedState(),
            boschThermostatExtend.errorState({enableReporting: true}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["Champion"],
        model: "8750001213",
        vendor: "Bosch",
        description: "Twinguard",
        extend: [
            m.deviceAddCustomCluster("twinguardSmokeDetector", {
                ID: 0xe000,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    sensitivity: {ID: 0x4003, type: Zcl.DataType.UINT16},
                },
                commands: {
                    initiateTestMode: {
                        ID: 0x00,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("twinguardMeasurements", {
                ID: 0xe002,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    humidity: {ID: 0x4000, type: Zcl.DataType.UINT16},
                    unknown1: {ID: 0x4001, type: Zcl.DataType.UINT16},
                    unknown2: {ID: 0x4002, type: Zcl.DataType.UINT16},
                    airpurity: {ID: 0x4003, type: Zcl.DataType.UINT16},
                    temperature: {ID: 0x4004, type: Zcl.DataType.INT16},
                    illuminance: {ID: 0x4005, type: Zcl.DataType.UINT16},
                    battery: {ID: 0x4006, type: Zcl.DataType.UINT16},
                    unknown3: {ID: 0x4007, type: Zcl.DataType.UINT16},
                    unknown4: {ID: 0x4008, type: Zcl.DataType.UINT16},
                    pressure: {ID: 0x4009, type: Zcl.DataType.UINT16}, // Not yet confirmed
                    unknown6: {ID: 0x400a, type: Zcl.DataType.UINT16},
                    unknown7: {ID: 0x400b, type: Zcl.DataType.UINT16},
                    unknown8: {ID: 0x400c, type: Zcl.DataType.UINT16},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("twinguardOptions", {
                ID: 0xe004,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    unknown1: {ID: 0x4000, type: Zcl.DataType.BITMAP8}, // 0,1 ??? read during pairing
                    pre_alarm: {ID: 0x4001, type: Zcl.DataType.BITMAP8}, // 0,1 on/off
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("twinguardSetup", {
                ID: 0xe006,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    unknown1: {ID: 0x5003, type: Zcl.DataType.INT8}, // perhaps signal strength? -7?
                    unknown2: {ID: 0x5004, type: Zcl.DataType.UINT8}, // ????
                    heartbeat: {ID: 0x5005, type: Zcl.DataType.BITMAP8}, // 0
                },
                commands: {
                    pairingCompleted: {
                        ID: 0x01,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("twinguardAlarm", {
                ID: 0xe007,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    alarm_status: {ID: 0x5000, type: Zcl.DataType.BITMAP32},
                },
                commands: {
                    burglarAlarm: {
                        ID: 0x01,
                        parameters: [
                            {name: "data", type: Zcl.DataType.UINT8}, // data:1 trips the siren data:0 should stop the siren
                        ],
                    },
                },
                commandsResponse: {},
            }),
            boschExtend.twinguard(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ["genPollCtrl"]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genAlarms", "twinguardSmokeDetector", "twinguardOptions"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["twinguardMeasurements"]);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpoint, ["twinguardSetup", "twinguardAlarm"]);
            await device.getEndpoint(1).read<"twinguardOptions", TwinguardOptions>("twinguardOptions", ["unknown1"], manufacturerOptions); // Needed for pairing
            await device
                .getEndpoint(12)
                .command<"twinguardSetup", "pairingCompleted", TwinguardSetup>("twinguardSetup", "pairingCompleted", {}, manufacturerOptions); // Needed for pairing
            await device
                .getEndpoint(1)
                .write<"twinguardSmokeDetector", TwinguardSmokeDetector>("twinguardSmokeDetector", {sensitivity: 0x0002}, manufacturerOptions); // Setting defaults
            await device.getEndpoint(1).write<"twinguardOptions", TwinguardOptions>("twinguardOptions", {pre_alarm: 0x01}, manufacturerOptions); // Setting defaults
            await device.getEndpoint(12).write<"twinguardSetup", TwinguardSetup>("twinguardSetup", {heartbeat: 0x01}, manufacturerOptions); // Setting defaults
            await device
                .getEndpoint(1)
                .read<"twinguardSmokeDetector", TwinguardSmokeDetector>("twinguardSmokeDetector", ["sensitivity"], manufacturerOptions);
            await device.getEndpoint(1).read<"twinguardOptions", TwinguardOptions>("twinguardOptions", ["pre_alarm"], manufacturerOptions);
            await device.getEndpoint(12).read<"twinguardSetup", TwinguardSetup>("twinguardSetup", ["heartbeat"], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ["RFPR-ZB-SH-EU"],
        model: "BSEN-M",
        vendor: "Bosch",
        description: "Motion detector",
        extend: [
            boschBsenExtend.changedCheckinInterval(),
            boschBsenExtend.tamperAndOccupancyAlarm(),
            boschBsenExtend.battery(),
            boschBsenExtend.sensitivityLevel(),
            boschBsenExtend.testMode(),
            boschBsenExtend.illuminance(),
            boschBsenExtend.temperature(),
        ],
    },
    {
        zigbeeModel: ["RBSH-SP-ZB-EU", "RBSH-SP-ZB-FR", "RBSH-SP-ZB-GB"],
        model: "BSP-FZ2",
        vendor: "Bosch",
        description: "Smart plug compact (type F plug)",
        extend: [
            boschGeneralEnergyDeviceExtend.customMeteringCluster(),
            boschSmartPlugExtend.smartPlugCluster(),
            boschGeneralExtend.handleRenamedCustomCluster("boschSpecific", "boschEnergyDevice"),
            boschSmartPlugExtend.onOff(),
            boschGeneralEnergyDeviceExtend.autoOff(),
            boschSmartPlugExtend.electricityMeter(),
            boschGeneralEnergyDeviceExtend.resetEnergyMeters(),
        ],
        ota: true,
        whiteLabel: [
            {vendor: "Bosch", model: "BSP-EZ2", description: "Smart plug compact (type E plug)", fingerprint: [{modelID: "RBSH-SP-ZB-FR"}]},
            {vendor: "Bosch", model: "BSP-GZ2", description: "Smart plug compact (type G plug)", fingerprint: [{modelID: "RBSH-SP-ZB-GB"}]},
        ],
    },
    {
        zigbeeModel: ["RBSH-SP2-ZB-EU"],
        model: "BSP-FD",
        vendor: "Bosch",
        description: "Smart plug compact [+M]",
        extend: [
            boschGeneralExtend.handleZclVersionReadRequest(),
            boschGeneralEnergyDeviceExtend.customMeteringCluster(),
            boschSmartPlugExtend.smartPlugCluster(),
            boschSmartPlugExtend.onOff(),
            boschGeneralEnergyDeviceExtend.autoOff(),
            boschSmartPlugExtend.ledBrightness(),
            boschSmartPlugExtend.energySavingMode(),
            boschSmartPlugExtend.electricityMeter({producedEnergy: true}),
            boschGeneralEnergyDeviceExtend.resetEnergyMeters(),
        ],
    },
    {
        zigbeeModel: ["RBSH-SWD-ZB"],
        model: "BSEN-C2",
        vendor: "Bosch",
        description: "Door/window contact II",
        extend: [
            boschDoorWindowContactExtend.doorWindowContactCluster(),
            boschGeneralExtend.handleRenamedCustomCluster("boschSpecific", "boschDoorWindowContactCluster"),
            boschDoorWindowContactExtend.reportContactState(),
            boschDoorWindowContactExtend.reportButtonActions(),
            boschDoorWindowContactExtend.breakFunctionality(),
            boschGeneralExtend.batteryWithPercentageAndLowStatus(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-SWDV-ZB"],
        model: "BSEN-CV",
        vendor: "Bosch",
        description: "Door/window contact II plus",
        extend: [
            boschDoorWindowContactExtend.doorWindowContactCluster(),
            boschGeneralExtend.handleRenamedCustomCluster("boschSpecific", "boschDoorWindowContactCluster"),
            boschDoorWindowContactExtend.reportContactState(),
            boschDoorWindowContactExtend.reportButtonActions(),
            boschDoorWindowContactExtend.vibrationDetection(),
            boschDoorWindowContactExtend.breakFunctionality(),
            boschGeneralExtend.batteryWithPercentageAndLowStatus(),
        ],
    },
    {
        zigbeeModel: ["RBSH-SWD2-ZB"],
        model: "BSEN-C2D",
        vendor: "Bosch",
        description: "Door/window contact II [+M]",
        extend: [
            boschDoorWindowContactExtend.doorWindowContactCluster(),
            boschGeneralExtend.handleRenamedCustomCluster("boschSpecific", "boschDoorWindowContactCluster"),
            boschDoorWindowContactExtend.reportContactState(),
            boschDoorWindowContactExtend.reportButtonActions({doublePressSupported: true}),
            boschDoorWindowContactExtend.breakFunctionality(),
            boschGeneralExtend.batteryWithPercentageAndLowStatus(),
        ],
    },
    {
        zigbeeModel: ["RBSH-MMD-ZB-EU"],
        model: "BMCT-DZ",
        vendor: "Bosch",
        description: "Phase-cut dimmer",
        extend: [
            boschGeneralExtend.handleZclVersionReadRequest(),
            m.deviceAddCustomCluster("boschEnergyDevice", {
                ID: 0xfca0,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    switchType: {ID: 0x0001, type: Zcl.DataType.ENUM8},
                    childLock: {ID: 0x0008, type: Zcl.DataType.BOOLEAN},
                    dimmerType: {ID: 0x0022, type: Zcl.DataType.ENUM8},
                    minimumBrightness: {ID: 0x0025, type: Zcl.DataType.UINT8},
                    maximumBrightness: {ID: 0x0026, type: Zcl.DataType.UINT8},
                    switchMode: {ID: 0x0031, type: Zcl.DataType.BOOLEAN},
                },
                commands: {},
                commandsResponse: {},
            }),
            boschGeneralExtend.handleRenamedCustomCluster("boschSpecific", "boschEnergyDevice"),
            m.light({
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
                powerOnBehavior: true,
                effect: false,
            }),
            boschBmctExtend.switchType({
                switchTypeLookup: boschBmctDzSettings.switchTypes,
            }),
            boschBmctExtend.reportSwitchAction({
                switchTypeLookup: boschBmctDzSettings.switchTypes,
                hasDualSwitchInputs: boschBmctDzSettings.hasDualSwitchInputs,
            }),
            boschBmctExtend.switchMode({
                switchModeLookup: boschBmctDzSettings.switchModes,
                switchTypeLookup: boschBmctDzSettings.switchTypes,
            }),
            boschBmctExtend.childLock(),
            boschBmctExtend.brightnessRange(),
            boschBmctExtend.dimmerType(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-MMR-ZB-EU"],
        model: "BMCT-RZ",
        vendor: "Bosch",
        description: "Relay (potential free)",
        extend: [
            boschGeneralExtend.handleZclVersionReadRequest(),
            m.deviceAddCustomCluster("boschEnergyDevice", {
                ID: 0xfca0,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    switchType: {ID: 0x0001, type: Zcl.DataType.ENUM8},
                    childLock: {ID: 0x0008, type: Zcl.DataType.BOOLEAN},
                    pulseLength: {ID: 0x0024, type: Zcl.DataType.UINT16},
                    switchMode: {ID: 0x0031, type: Zcl.DataType.BOOLEAN},
                    actuatorType: {ID: 0x0034, type: Zcl.DataType.ENUM8},
                },
                commands: {},
                commandsResponse: {},
            }),
            boschGeneralExtend.handleRenamedCustomCluster("boschSpecific", "boschEnergyDevice"),
            boschBmctExtend.rzDeviceModes({
                deviceModesLookup: boschBmctRzSettings.deviceModes,
            }),
            m.onOff({powerOnBehavior: false}),
            boschBmctExtend.switchType({
                switchTypeLookup: boschBmctRzSettings.switchTypes,
            }),
            boschBmctExtend.reportSwitchAction({
                switchTypeLookup: boschBmctRzSettings.switchTypes,
                hasDualSwitchInputs: boschBmctRzSettings.hasDualSwitchInputs,
            }),
            boschBmctExtend.switchMode({
                switchModeLookup: boschBmctRzSettings.switchModes,
                switchTypeLookup: boschBmctRzSettings.switchTypes,
            }),
            boschBmctExtend.childLock(),
            boschGeneralEnergyDeviceExtend.autoOff(),
            boschBmctExtend.pulseLength({
                updateDeviceMode: true,
                deviceModesLookup: boschBmctRzSettings.deviceModes,
            }),
            boschBmctExtend.actuatorType(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-MMS-ZB-EU"],
        model: "BMCT-SLZ",
        vendor: "Bosch",
        description: "Light/shutter control unit II",
        extend: [
            m.deviceEndpoints({endpoints: {left: 2, right: 3}}),
            m.electricityMeter({
                voltage: false,
                current: false,
                power: {change: 1},
                energy: {change: 1},
            }),
            m.deviceAddCustomCluster("boschEnergyDevice", {
                ID: 0xfca0,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    deviceMode: {ID: 0x0000, type: Zcl.DataType.ENUM8},
                    switchType: {ID: 0x0001, type: Zcl.DataType.ENUM8},
                    switchMode: {ID: 0x0031, type: Zcl.DataType.UINT8},
                    calibrationOpeningTime: {ID: 0x0002, type: Zcl.DataType.UINT32},
                    calibrationClosingTime: {ID: 0x0003, type: Zcl.DataType.UINT32},
                    // 0x0005 isn't used at all when using the Bosch SHC as of 30-06-2025.
                    // As I don't have any shutters, I can't run all calibration steps
                    // successfully. So, keep any comments regarding these
                    // attributes with caution.
                    calibrationButtonHoldTime: {ID: 0x0005, type: Zcl.DataType.UINT8},
                    autoOffEnabled: {ID: 0x0006, type: Zcl.DataType.BOOLEAN},
                    autoOffTime: {ID: 0x0007, type: Zcl.DataType.UINT16},
                    childLock: {ID: 0x0008, type: Zcl.DataType.BOOLEAN},
                    // 0x000f is only being set when using the automatic calibration.
                    // It's being set to 0 then before sending the calibration
                    // command. Additionally, when changing
                    // the calibrationOpeningTime or calibrationClosingTime in the
                    // Bosch app, it's also being set to 0.
                    // I couldn't find any way to set 0x000f manually in the Bosch app.
                    calibrationMotorStartDelay: {ID: 0x000f, type: Zcl.DataType.UINT8},
                    calibrationMotorReverseDirection: {ID: 0x0032, type: Zcl.DataType.BOOLEAN},
                    motorState: {ID: 0x0013, type: Zcl.DataType.ENUM8},
                    // unknownAttributeOne is always being configured as reporting
                    // attribute on endpoint 1 when using the Bosch SHC.
                    // Can't tell what this attribute does (always received
                    // 0x00 as answer on manual lookup).
                    unknownAttributeOne: {ID: 0x0004, type: Zcl.DataType.BITMAP8},
                    // Attribute is being set to 255 when deactivating the automatic
                    // detection of the motor end position by the Bosch SHC. After
                    // activating the automatic end position detection it's being set
                    // to 0 by the Bosch SHC. Apart from that, there's no way to manually
                    // change the value.
                    calibrationMotorEndPosition: {ID: 0x0021, type: Zcl.DataType.UINT8},
                    // 0x0033 is used when setting the motor start delay manually
                    // using the Bosch SHC as of 30-06-2025.
                    // If the user wants to automatically detect the delay during
                    // calibration, it's being set to 0 over the Bosch app.
                    calibrationNewMotorStartDelay: {ID: 0x0033, type: Zcl.DataType.UINT16},
                    // 0x0010 and 0x0011 is being set simultaneously with the same value
                    // when changing the delay for the rotation of the slats on venetian
                    // blinds. Maybe one attribute for each direction?
                    // It's also being configured as reporting attribute when using
                    // venetian blinds.
                    slatRotationDurationOne: {ID: 0x0010, type: Zcl.DataType.UINT32},
                    slatRotationDurationTwo: {ID: 0x0011, type: Zcl.DataType.UINT32},
                    // 0x002a is only being used when doing an automatic calibration
                    // with the Bosch specific startAutomaticMotorCalibration command.
                    // It's being set to true before starting the calibration process.
                    // This happens regardless of the shutter type. I didn't capture
                    // any packages where this attribute is being actively set to false.
                    // Maybe this activates some "full calibration" flag which is being
                    // set to false by the device itself afterward?
                    unknownAttributeTwo: {ID: 0x002a, type: Zcl.DataType.BOOLEAN},
                },
                commands: {
                    // Command being sent by the Bosch SHC when starting an
                    // automatic shutter calibration.
                    startAutomaticMotorCalibration: {ID: 0x00, parameters: []},
                },
                commandsResponse: {},
            }),
            boschGeneralExtend.handleRenamedCustomCluster("boschSpecific", "boschEnergyDevice"),
            boschGeneralExtend.handleZclVersionReadRequest(),
            boschBmctExtend.slzExtends(),
            boschGeneralEnergyDeviceExtend.customMeteringCluster(),
            boschGeneralEnergyDeviceExtend.resetEnergyMeters(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const lightConfiguration = async () => {
                const endpoint1 = device.getEndpoint(1);
                await reporting.bind(endpoint1, coordinatorEndpoint, ["genIdentify"]);
                await endpoint1.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchType"]);

                const endpoint2 = device.getEndpoint(2);
                await reporting.bind(endpoint2, coordinatorEndpoint, ["genIdentify", "genOnOff", "boschEnergyDevice"]);
                await reporting.onOff(endpoint2);
                await endpoint2.read<"genOnOff">("genOnOff", ["onOff", "startUpOnOff"]);
                await endpoint2.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", [
                    "switchMode",
                    "childLock",
                    "autoOffEnabled",
                    "autoOffTime",
                ]);

                const endpoint3 = device.getEndpoint(3);
                await reporting.bind(endpoint3, coordinatorEndpoint, ["genIdentify", "genOnOff", "boschEnergyDevice"]);
                await reporting.onOff(endpoint3);
                await endpoint3.read<"genOnOff">("genOnOff", ["onOff", "startUpOnOff"]);
                await endpoint3.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", [
                    "switchMode",
                    "childLock",
                    "autoOffEnabled",
                    "autoOffTime",
                ]);
            };

            const shutterConfiguration = async () => {
                const endpoint1 = device.getEndpoint(1);
                await reporting.bind(endpoint1, coordinatorEndpoint, ["genIdentify", "closuresWindowCovering", "boschEnergyDevice"]);
                await reporting.currentPositionLiftPercentage(endpoint1);
                await endpoint1.read<"closuresWindowCovering">("closuresWindowCovering", ["currentPositionLiftPercentage"]);

                const payloadMotorState = payload<"boschEnergyDevice", BoschBmctCluster>("motorState", 0, repInterval.MAX, 0);
                await endpoint1.configureReporting("boschEnergyDevice", payloadMotorState);

                await endpoint1.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", [
                    "switchType",
                    "switchMode",
                    "motorState",
                    "calibrationOpeningTime",
                    "calibrationClosingTime",
                    "calibrationButtonHoldTime",
                    "calibrationMotorStartDelay",
                    "childLock",
                ]);
            };

            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["deviceMode"]);

            await lightConfiguration();
            await shutterConfiguration();
        },
        exposes: (device, options) => {
            const stateDeviceMode: KeyValue = {
                light: 0x04,
                shutter: 0x01,
                disabled: 0x00,
            };
            const stateMotor: KeyValue = {
                stopped: 0x00,
                opening: 0x01,
                closing: 0x02,
            };
            const stateSwitchType: KeyValue = {
                button: 0x01,
                button_key_change: 0x02,
                rocker_switch: 0x03,
                rocker_switch_key_change: 0x04,
                none: 0x00,
            };
            const stateSwitchMode: KeyValue = {
                coupled: 0x00,
                decoupled: 0x01,
                only_short_press_decoupled: 0x02,
                only_long_press_decoupled: 0x03,
            };
            const commonExposes = (switchType: string) => {
                const exposeList = [];

                exposeList.push(
                    e.enum("switch_type", ea.ALL, Object.keys(stateSwitchType)).withDescription("Module controlled by a rocker switch or a button"),
                );

                if (switchType !== "none") {
                    let supportedActionTypes: string[];

                    switch (switchType) {
                        case "button":
                        case "button_key_change":
                            supportedActionTypes = [
                                "press_released_left",
                                "press_released_right",
                                "hold_left",
                                "hold_right",
                                "hold_released_left",
                                "hold_released_right",
                            ];
                            break;
                        case "rocker_switch":
                        case "rocker_switch_key_change":
                            supportedActionTypes = ["opened_left", "opened_right", "closed_left", "closed_right"];
                            break;
                    }

                    exposeList.push(e.action(supportedActionTypes), e.action_duration());
                }

                return exposeList;
            };
            const lightExposes = (endpoint: string, switchType: string) => {
                const exposeList = [];

                exposeList.push(
                    e.switch().withEndpoint(endpoint),
                    e.power_on_behavior().withEndpoint(endpoint),
                    e
                        .binary("auto_off_enabled", ea.ALL, "ON", "OFF")
                        .withEndpoint(endpoint)
                        .withDescription("Enable/Disable the automatic turn-off feature"),
                    e
                        .numeric("auto_off_time", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(720)
                        .withValueStep(1)
                        .withUnit("min")
                        .withDescription(
                            "Turn off the output after the specified amount of time. Only in action when the automatic turn-off is enabled.",
                        )
                        .withEndpoint(endpoint),
                );

                if (switchType !== "none") {
                    let supportedSwitchModes: string[];

                    switch (switchType) {
                        case "button":
                        case "button_key_change":
                            supportedSwitchModes = Object.keys(stateSwitchMode);
                            break;
                        case "rocker_switch":
                        case "rocker_switch_key_change":
                            supportedSwitchModes = Object.keys(stateSwitchMode).filter(
                                (switchMode) => switchMode === "coupled" || switchMode === "decoupled",
                            );
                            break;
                    }

                    exposeList.push(
                        e
                            .enum("switch_mode", ea.ALL, supportedSwitchModes)
                            .withEndpoint(endpoint)
                            .withDescription(
                                "Decouple the switch from the corresponding output to use it for other purposes. Please keep in mind that the available options depend on the used switch type.",
                            ),
                        e.binary("child_lock", ea.ALL, "ON", "OFF").withEndpoint(endpoint).withDescription("Enable/Disable child lock"),
                    );
                }

                return exposeList;
            };
            const coverExposes = (switchType: string) => {
                const exposeList = [];

                exposeList.push(
                    e.cover_position(),
                    e.enum("motor_state", ea.STATE, Object.keys(stateMotor)).withDescription("Current shutter motor state"),
                    e
                        .numeric("calibration_closing_time", ea.ALL)
                        .withUnit("s")
                        .withDescription("Calibrate shutter closing time")
                        .withValueMin(1)
                        .withValueMax(90)
                        .withValueStep(0.1),
                    e
                        .numeric("calibration_opening_time", ea.ALL)
                        .withUnit("s")
                        .withDescription("Calibrate shutter opening time")
                        .withValueMin(1)
                        .withValueMax(90)
                        .withValueStep(0.1),
                    e
                        .numeric("calibration_button_hold_time", ea.ALL)
                        .withUnit("s")
                        .withDescription("Time to hold for long press")
                        .withValueMin(0.1)
                        .withValueMax(2)
                        .withValueStep(0.1),
                    e
                        .numeric("calibration_motor_start_delay", ea.ALL)
                        .withUnit("s")
                        .withDescription("Delay between command and motor start")
                        .withValueMin(0)
                        .withValueMax(20)
                        .withValueStep(0.1),
                );

                if (switchType !== "none") {
                    let supportedSwitchModes: string[];

                    switch (switchType) {
                        case "button":
                        case "button_key_change":
                            supportedSwitchModes = Object.keys(stateSwitchMode).filter(
                                (switchMode) => switchMode === "coupled" || switchMode === "only_long_press_decoupled",
                            );
                            break;
                        case "rocker_switch":
                        case "rocker_switch_key_change":
                            supportedSwitchModes = Object.keys(stateSwitchMode).filter((switchMode) => switchMode === "coupled");
                            break;
                    }

                    exposeList.push(
                        e
                            .enum("switch_mode", ea.ALL, supportedSwitchModes)
                            .withDescription(
                                "Decouple the switch from the corresponding output to use it for other purposes. Please keep in mind that the available options depend on the used switch type.",
                            ),
                        e.binary("child_lock", ea.ALL, "ON", "OFF").withDescription("Enable/Disable child lock"),
                    );
                }

                return exposeList;
            };

            if (!utils.isDummyDevice(device)) {
                const deviceModeKey = device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "deviceMode");
                const deviceMode = Object.keys(stateDeviceMode).find((key) => stateDeviceMode[key] === deviceModeKey);

                const switchTypeKey = device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "switchType");
                const switchType = Object.keys(stateSwitchType).find((key) => stateSwitchType[key] === switchTypeKey);

                if (deviceMode === "light") {
                    return [...commonExposes(switchType), ...lightExposes("left", switchType), ...lightExposes("right", switchType)];
                }
                if (deviceMode === "shutter") {
                    return [...commonExposes(switchType), ...coverExposes(switchType)];
                }
            }
            return [e.enum("device_mode", ea.ALL, Object.keys(stateDeviceMode)).withDescription("Device mode")];
        },
    },
    {
        zigbeeModel: ["RBSH-US4BTN-ZB-EU"],
        model: "BHI-US",
        vendor: "Bosch",
        description: "Universal Switch II",
        fromZigbee: [fzLocal.bhius_button_press, fzLocal.bhius_config, fz.battery],
        toZigbee: [tzLocal.bhius_config],
        exposes: [
            e.battery_low(),
            e.battery_voltage(),
            e
                .text("config_led_top_left_press", ea.ALL)
                .withLabel("LED config (top left short press)")
                .withDescription(labelShortPress)
                .withCategory("config"),
            e
                .text("config_led_top_right_press", ea.ALL)
                .withLabel("LED config (top right short press)")
                .withDescription(labelShortPress)
                .withCategory("config"),
            e
                .text("config_led_bottom_left_press", ea.ALL)
                .withLabel("LED config (bottom left short press)")
                .withDescription(labelShortPress)
                .withCategory("config"),
            e
                .text("config_led_bottom_right_press", ea.ALL)
                .withLabel("LED config (bottom right short press)")
                .withDescription(labelShortPress)
                .withCategory("config"),
            e
                .text("config_led_top_left_longpress", ea.ALL)
                .withLabel("LED config (top left long press)")
                .withDescription(labelLongPress)
                .withCategory("config"),
            e
                .text("config_led_top_right_longpress", ea.ALL)
                .withLabel("LED config (top right long press)")
                .withDescription(labelLongPress)
                .withCategory("config"),
            e
                .text("config_led_bottom_left_longpress", ea.ALL)
                .withLabel("LED config (bottom left long press)")
                .withDescription(labelLongPress)
                .withCategory("config"),
            e
                .text("config_led_bottom_right_longpress", ea.ALL)
                .withLabel("LED config (bottom right long press)")
                .withDescription(labelLongPress)
                .withCategory("config"),
            e.action([
                "button_top_left_release",
                "button_top_right_release",
                "button_bottom_left_release",
                "button_bottom_right_release",
                "button_top_left_longpress",
                "button_top_right_longpress",
                "button_bottom_left_longpress",
                "button_bottom_right_longpress",
                "button_top_left_longpress_release",
                "button_top_right_longpress_release",
                "button_bottom_left_longpress_release",
                "button_bottom_right_longpress_release",
            ]),
        ],
        extend: [
            m.deviceAddCustomCluster("boschSpecific", {
                ID: 0xfca1,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {},
                commands: {
                    confirmButtonPressed: {
                        ID: 0x0010,
                        parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                    },
                    pairingCompleted: {
                        ID: 0x0012,
                        parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                    },
                },
                commandsResponse: {},
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            // Read default LED configuration
            await endpoint
                .read("boschSpecific", [0x0010, 0x0011, 0x0012, 0x0013], {...manufacturerOptions, sendPolicy: "immediate"})
                .catch((error) => {});
            await endpoint
                .read("boschSpecific", [0x0020, 0x0021, 0x0022, 0x0023], {...manufacturerOptions, sendPolicy: "immediate"})
                .catch((error) => {});

            // We also have to read this one. Value reads 0x0f, looks like a bitmap
            await endpoint.read("boschSpecific", [0x0024], {...manufacturerOptions, sendPolicy: "immediate"});

            await endpoint.command<"boschSpecific", "pairingCompleted", BoschSpecificBhius>(
                "boschSpecific",
                "pairingCompleted",
                {data: Buffer.from([0x00])},
                {sendPolicy: "immediate"},
            );

            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genBasic", "boschSpecific"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
];
