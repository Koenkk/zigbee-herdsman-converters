import {Zcl, ZSpec} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {Configure, DefinitionWithExtend, Expose, Fz, KeyValue, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";
import {assertObject, determineEndpoint, sleep} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const SHELLY_ENDPOINT_ID = 239;
const SHELLY_OPTIONS = {profileId: ZSpec.CUSTOM_SHELLY_PROFILE_ID};

const NS = "zhc:shelly";

const HA_ELECTRICAL_MEASUREMENT_CLUSTER_ID = 0x0b04;
const HA_ELECTRICAL_MEASUREMENT_POWER_FACTOR_ATTR_ID = 0x0510;

interface ShellyRPC {
    attributes: {
        data: string;
        txCtl: number;
        rxCtl: number;
    };
    commands: never;
    commandResponses: never;
}

interface ShellyTRVManualMode {
    attributes: {
        manualMode: number;
        position: number;
    };
    commands: {
        calibrate: Record<string, never>;
    };
    commandResponses: never;
}

// =============================================================================
// WS90 Weather Station - Calculated Values (stored in device.meta for persistence)
// =============================================================================

interface WS90Meta {
    state?: {[key: string]: number | boolean};
    precipHistory?: {value: number; time: number};
    pressureHistory?: {value: number; time: number};
}

/**
 * Get or initialize WS90 meta storage on device
 */
function getWS90Meta(device: Zh.Device): WS90Meta {
    if (!device.meta.ws90) {
        device.meta.ws90 = {};
    }
    return device.meta.ws90 as WS90Meta;
}

/**
 * Calculate dew point using Magnus formula
 */
function calculateDewPoint(T: number | undefined, Rh: number | undefined): number | null {
    if (T === undefined || Rh === undefined || Rh <= 0) return null;
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * T) / (b + T) + Math.log(Rh / 100);
    return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
}

/**
 * Calculate humidex (Canadian heat index)
 */
function calculateHumidex(T: number | undefined, Rh: number | undefined): number | null {
    if (T === undefined || Rh === undefined) return null;
    const dewPoint = calculateDewPoint(T, Rh);
    if (dewPoint === null) return null;
    const ee = 6.11 * Math.exp(5417.753 * (1 / 273.15 - 1 / (273.15 + dewPoint)));
    return Math.round((T + 0.5555 * (ee - 10)) * 10) / 10;
}

/**
 * Calculate wind chill (formula valid for T <= 10°C and wind >= 4.8 km/h)
 */
function calculateWindChill(T: number | undefined, windMs: number | undefined): number | null {
    if (T === undefined || windMs === undefined) return null;
    const windKmh = windMs * 3.6;
    if (T > 10 || windKmh < 4.8) return Math.round(T * 10) / 10;
    const wc = 13.12 + 0.6215 * T - 11.37 * windKmh ** 0.16 + 0.3965 * T * windKmh ** 0.16;
    return Math.round(wc * 10) / 10;
}

/**
 * Calculate heat stress percentage using sigmoid curve
 */
function calculateHeatStress(
    T: number | undefined,
    Rh: number | undefined,
    lux: number | undefined,
    windMs: number | undefined,
    precipitation: number | undefined,
): number | null {
    if (T === undefined) return null;
    const solar = (lux || 0) / 100;
    const base = T + solar / 100 + (Rh || 0) / 10;
    const cooled = base - (windMs || 0) / 2;
    const adjusted = cooled - ((precipitation || 0) > 0 ? 3 : 0);
    const scaled = (adjusted - 18) / (42 - 18);
    const sigmoid = 1 / (1 + Math.E ** (-4 * (scaled - 0.5)));
    return Math.max(Math.round(sigmoid * 100), 0);
}

/**
 * Calculate apparent temperature (wind chill when cold, humidex when warm)
 */
function calculateApparentTemperature(T: number | undefined, Rh: number | undefined, windMs: number | undefined): number | null {
    if (T === undefined) return null;
    const windChill = calculateWindChill(T, windMs);
    const humidex = calculateHumidex(T, Rh);
    if (windChill !== null && windChill < T) return windChill;
    if (humidex !== null && humidex > T) return humidex;
    return Math.round(T * 10) / 10;
}

/**
 * Calculate rain rate from precipitation changes (mm/h)
 */
function calculateRainRate(meta: WS90Meta, precipitation: number | undefined): number | null {
    if (precipitation === undefined) return null;

    const now = Date.now();
    const history = meta.precipHistory;

    if (!history) {
        meta.precipHistory = {value: precipitation, time: now};
        return 0;
    }

    const timeDeltaMs = now - history.time;
    const precipDelta = precipitation - history.value;

    if (timeDeltaMs < 60000) return null;
    if (precipDelta < 0) return 0;

    meta.precipHistory = {value: precipitation, time: now};

    const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);
    const rate = precipDelta / timeDeltaHours;

    return Math.min(Math.round(rate * 10) / 10, 300);
}

/**
 * Calculate pressure trend (hPa/hour)
 */
function calculatePressureTrend(meta: WS90Meta, pressure: number | undefined): number | null {
    if (pressure === undefined) return null;

    const now = Date.now();
    const history = meta.pressureHistory;

    if (!history) {
        meta.pressureHistory = {value: pressure, time: now};
        return 0;
    }

    const timeDeltaMs = now - history.time;
    const pressureDelta = pressure - history.value;

    if (timeDeltaMs < 1800000) return null;

    meta.pressureHistory = {value: pressure, time: now};

    const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);
    const rate = pressureDelta / timeDeltaHours;

    return Math.round(rate * 10) / 10;
}

/**
 * Determine weather condition based on sensor data
 */
function calculateWeatherCondition(state: {[key: string]: number | boolean | undefined}): string | null {
    const {temperature, illuminance, rain_status, wind_speed, rain_rate, pressure, pressure_trend} = state;

    if (illuminance === undefined) return null;

    const isRaining = rain_status === true && rain_rate !== undefined && (rain_rate as number) > 0;
    const isPouring = isRaining && (rain_rate as number) > 10;
    const isWindy = wind_speed !== undefined && (wind_speed as number) > 10;
    const isNight = (illuminance as number) < 10;

    const isLowPressure = pressure !== undefined && (pressure as number) < 1000;
    const isPressureFalling = pressure_trend !== undefined && (pressure_trend as number) < -2;

    const isHail =
        isRaining &&
        (rain_rate as number) > 5 &&
        (illuminance as number) < 5000 &&
        wind_speed !== undefined &&
        (wind_speed as number) > 5 &&
        (isLowPressure || isPressureFalling);

    const isSnowing = isRaining && temperature !== undefined && (temperature as number) < 1 && !isHail;

    if (isHail) return "hail";
    if (isSnowing) return "snowy";
    if (isPouring) return "pouring";
    if (isRaining) return "rainy";

    if (isNight) {
        return isWindy ? "windy" : "clear-night";
    }

    if ((illuminance as number) > 40000) {
        return isWindy ? "windy" : "sunny";
    }
    if ((illuminance as number) > 10000) {
        return isWindy ? "windy-variant" : "partlycloudy";
    }
    return "cloudy";
}

/**
 * Update calculated values whenever we get new sensor data (uses device.meta for persistence)
 */
function updateWS90CalculatedValues(device: Zh.Device, payload: {[key: string]: number | boolean}): {[key: string]: number | string | null} {
    const meta = getWS90Meta(device);
    if (!meta.state) meta.state = {};
    Object.assign(meta.state, payload);
    const state = meta.state;
    const result: {[key: string]: number | string | null} = {};

    const temp = state.temperature as number | undefined;
    const humidity = state.humidity as number | undefined;
    const windSpeed = state.wind_speed as number | undefined;
    const lux = state.illuminance as number | undefined;
    const precip = state.precipitation as number | undefined;
    const pressure = state.pressure as number | undefined;

    if (temp !== undefined && humidity !== undefined) {
        const dewPoint = calculateDewPoint(temp, humidity);
        if (dewPoint !== null) result.dew_point = dewPoint;

        const humidex = calculateHumidex(temp, humidity);
        if (humidex !== null) result.humidex = humidex;

        const heatStress = calculateHeatStress(temp, humidity, lux, windSpeed, precip);
        if (heatStress !== null) result.heat_stress = heatStress;
    }

    if (temp !== undefined && windSpeed !== undefined) {
        const windChill = calculateWindChill(temp, windSpeed);
        if (windChill !== null) result.wind_chill = windChill;
    }

    if (temp !== undefined) {
        const apparent = calculateApparentTemperature(temp, humidity, windSpeed);
        if (apparent !== null) result.apparent_temperature = apparent;
    }

    if (pressure !== undefined) {
        const trend = calculatePressureTrend(meta, pressure);
        if (trend !== null) {
            result.pressure_trend = trend;
            state.pressure_trend = trend;
        } else if (typeof state.pressure_trend === "number") {
            result.pressure_trend = state.pressure_trend;
        }
    }

    const condition = calculateWeatherCondition(state);
    if (condition !== null) result.weather_condition = condition;

    // Save device meta to persist across restarts
    device.save();

    return result;
}

// =============================================================================
// Shelly Modern Extend
// =============================================================================

const shellyModernExtend = {
    shellyPowerFactorInt16Fix(): ModernExtend {
        // Shelly Gen4 devices report haElectricalMeasurement.powerFactor (0x0510) as INT16 (0x29)
        // while zigbee-herdsman defines it as INT8 (0x28). This breaks configureReporting (INVALID_DATA_TYPE).
        return m.deviceAddCustomCluster("haElectricalMeasurement", {
            ID: HA_ELECTRICAL_MEASUREMENT_CLUSTER_ID,
            attributes: {
                powerFactor: {ID: HA_ELECTRICAL_MEASUREMENT_POWER_FACTOR_ATTR_ID, type: Zcl.DataType.INT16},
            },
            commands: {},
            commandsResponse: {},
        });
    },
    shellyCustomClusters(): ModernExtend[] {
        return [
            m.deviceAddCustomCluster("shellyRPCCluster", {
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    data: {ID: 0x0000, type: Zcl.DataType.CHAR_STR, write: true},
                    txCtl: {ID: 0x0001, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                    rxCtl: {ID: 0x0002, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("shellyWiFiSetupCluster", {
                ID: 0xfc02,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    status: {ID: 0x0000, type: Zcl.DataType.CHAR_STR, write: true},
                    ip: {ID: 0x0001, type: Zcl.DataType.CHAR_STR, write: true},
                    actionCode: {ID: 0x0002, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    dhcp: {ID: 0x0003, type: Zcl.DataType.BOOLEAN, write: true},
                    enabled: {ID: 0x0004, type: Zcl.DataType.BOOLEAN, write: true},
                    ssid: {ID: 0x0005, type: Zcl.DataType.CHAR_STR, write: true},
                    password: {ID: 0x0006, type: Zcl.DataType.CHAR_STR, write: true},
                    staticIp: {ID: 0x0007, type: Zcl.DataType.CHAR_STR, write: true},
                    netMask: {ID: 0x0008, type: Zcl.DataType.CHAR_STR, write: true},
                    gateway: {ID: 0x0009, type: Zcl.DataType.CHAR_STR, write: true},
                    nameServer: {ID: 0x000a, type: Zcl.DataType.CHAR_STR, write: true},
                },
                commands: {},
                commandsResponse: {},
            }),
        ];
    },
    shellyRPCSetup(features: string[] = []): ModernExtend {
        // Set helper variables
        const shellyRPCBugFixed = false; // For firmware 20250819-150402/ga0def2d

        const featureDev = features.includes("Dev");
        const featurePowerstripUI = features.includes("PowerstripUI");

        // Generic helper functions
        const validateTime = (value: string) => {
            const hhmmRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
            if (value === undefined || !value.match(hhmmRegex)) {
                throw new Error(`Invalid time "${value}"`);
            }
        };

        // RPC helper functions
        let rpcSending = false;

        const rpcSendRaw = async (endpoint: Zh.Endpoint | Zh.Group, message: string) => {
            // Since RPC messages require multiple writes to complete, we have to make sure
            // we're not interleaving them accidentally. This is good enough for now, at least
            // until the RPC receive firmware bug is fixed by Shelly.
            while (rpcSending) {
                await sleep(200);
            }
            try {
                rpcSending = true;
                const splitBytes = 40;

                logger.debug(">>> shellyRPC write TxCtl", NS);
                const txCtl = message.length;
                await endpoint.write<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", {txCtl: txCtl}, SHELLY_OPTIONS);
                logger.debug(`>>> TxCtl: ${txCtl}`, NS);

                logger.debug(">>> shellyRPC write Data", NS);
                let dataToSend = message;
                while (dataToSend.length > 0) {
                    const data = dataToSend.substring(0, splitBytes);
                    dataToSend = dataToSend.substring(splitBytes);
                    await endpoint.write<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", {data: data}, SHELLY_OPTIONS);
                    logger.debug(`>>> Data: ${data}`, NS);
                }
            } finally {
                rpcSending = false;
            }
        };

        const rpcSend = async (endpoint: Zh.Endpoint | Zh.Group, method: string, params: object = undefined) => {
            const command = {
                id: 1, // We can't read replies anyway so don't care for now
                method: method,
                params: params,
            };
            return await rpcSendRaw(endpoint, JSON.stringify(command));
        };

        const rpcReceive = async (endpoint: Zh.Endpoint | Zh.Group, key: string) => {
            logger.debug(`||| shellyRPC rpcReceive(${key})`, NS);
            if (key === "rpc_rxctl") {
                logger.debug(">>> shellyRPC read RxCtl", NS);
                const result = await endpoint.read<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", ["rxCtl"], SHELLY_OPTIONS);
                logger.debug(`<<< RxCtl: ${JSON.stringify(result)}`, NS);
            } else if (key === "rpc_data") {
                logger.debug(">>> shellyRPC read Data", NS);
                const result = await endpoint.read<"shellyRPCCluster", ShellyRPC>("shellyRPCCluster", ["data"], {...SHELLY_OPTIONS, timeout: 1000});
                logger.debug(`<<< Data: ${JSON.stringify(result)}`, NS);
            }
        };

        // Features for exposes
        const featurePercentage = (name: string, label: string) => {
            return e.numeric(name, ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(1).withLabel(label).withUnit("%");
        };

        const featureButtonEnabled = (id: number) => {
            return e.binary(`switch_${id}`, ea.STATE_SET, "momentary", "detached").withLabel(`Endpoint: ${id + 1}`);
        };

        const exposes: Expose[] = [];
        const exposesDev: Expose[] = [
            e
                .text("rpc_tx", ea.STATE_SET)
                .withLabel("TX Data")
                .withDescription("See https://shelly-api-docs.shelly.cloud/gen2/Devices/Gen4/ShellyPowerStripG4"),
            e.text("rpc_rxctl", ea.STATE_GET).withLabel("RxCtl").withDescription("RX bytes available").withCategory("diagnostic"),
            e.text("rpc_data", ea.STATE_GET).withLabel("Data").withDescription("RX Data").withCategory("diagnostic"),
        ];
        const exposesPowerstripUI: Expose[] = [
            e
                .enum("led_mode", ea.STATE_SET, ["off", "switch", "power"])
                .withLabel("LED Mode")
                .withDescription("Controls the behaviour of the LED rings around the sockets")
                .withCategory("config"),
            e
                .composite("led_colors", "led_colors", ea.ALL)
                .withFeature(featurePercentage("on_r", "Red (on)"))
                .withFeature(featurePercentage("on_g", "Green (on)"))
                .withFeature(featurePercentage("on_b", "Blue (on)"))
                .withFeature(featurePercentage("on_brightness", "Brightness (on)"))
                .withFeature(featurePercentage("off_r", "Red (off)"))
                .withFeature(featurePercentage("off_g", "Green (off)"))
                .withFeature(featurePercentage("off_b", "Blue (off)"))
                .withFeature(featurePercentage("off_brightness", "Brightness (off)"))
                .withLabel("LED colors in 'switch' mode")
                .withCategory("config"),
            featurePercentage("led_power_brightness", "LED brightness in 'power' mode").withCategory("config"),
            e
                .composite("led_night_mode", "led_night_mode", ea.ALL)
                .withFeature(e.binary("enable", ea.STATE_SET, true, false))
                .withFeature(featurePercentage("brightness", "Brightness"))
                .withFeature(e.text("from", ea.STATE_SET).withLabel("Active from").withDescription("hh:mm"))
                .withFeature(e.text("until", ea.STATE_SET).withLabel("Active until").withDescription("hh:mm"))
                .withLabel("LED night mode")
                .withDescription("Adjust LED brightness during night time")
                .withCategory("config"),
            e
                .composite("buttons_enabled", "buttons_enabled", ea.ALL)
                .withFeature(featureButtonEnabled(0))
                .withFeature(featureButtonEnabled(1))
                .withFeature(featureButtonEnabled(2))
                .withFeature(featureButtonEnabled(3))
                .withLabel("Buttons enabled")
                .withCategory("config"),
        ];

        const fromZigbee: Fz.Converter<"shellyRPCCluster", ShellyRPC, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "shellyRPCCluster",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const state: KeyValue = {};

                    // Diagnostic data
                    if (msg.data.rxCtl !== undefined) {
                        state.rpc_rxctl = msg.data.rxCtl;
                        state.rpc_data = "";
                    }
                    if (msg.data.data !== undefined) state.rpc_data = meta.state.rpc_data + msg.data.data;

                    return state;
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [];
        const toZigbeeDev: Tz.Converter[] = [
            {
                key: ["rpc_rxctl", "rpc_data"],
                convertGet: async (entity, key, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcReceive(ep, key);
                },
            },
            {
                key: ["rpc_tx"],
                convertSet: async (entity, key, value, meta) => {
                    logger.debug(`>>> toZigbee.convertSet(${key}): ${value}`, NS);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSendRaw(ep, value as string);
                    await rpcReceive(ep, "rpc_rxctl");
                    if (shellyRPCBugFixed) {
                        await rpcReceive(ep, "rpc_data");
                    } else {
                        return {state: {rpc_data: "[Refresh for response]"}};
                    }
                },
            },
        ];
        const toZigbeePowerstripUI: Tz.Converter[] = [
            {
                key: ["led_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                mode: value,
                            },
                        },
                    });
                },
            },
            {
                key: ["led_colors"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                colors: {
                                    "switch:0": {
                                        on: {
                                            rgb: [value.on_r ?? 0, value.on_g ?? 0, value.on_b ?? 0],
                                            brightness: value.on_brightness ?? 0,
                                        },
                                        off: {
                                            rgb: [value.off_r ?? 0, value.off_g ?? 0, value.off_b ?? 0],
                                            brightness: value.off_brightness ?? 0,
                                        },
                                    },
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["led_power_brightness"],
                convertSet: async (entity, key, value, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                colors: {
                                    power: {
                                        brightness: (value as number) ?? 0,
                                    },
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["led_night_mode"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    validateTime(value.from as string);
                    validateTime(value.until as string);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            leds: {
                                night_mode: {
                                    enable: value.enable,
                                    brightness: value.brightness,
                                    active_between: [value.from, value.until],
                                },
                            },
                        },
                    });
                },
            },
            {
                key: ["buttons_enabled"],
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyRPCCluster");
                    await rpcSend(ep, "POWERSTRIP_UI.SetConfig", {
                        config: {
                            controls: {
                                "switch:0": {
                                    in_mode: value.switch_0,
                                },
                                "switch:1": {
                                    in_mode: value.switch_1,
                                },
                                "switch:2": {
                                    in_mode: value.switch_2,
                                },
                                "switch:3": {
                                    in_mode: value.switch_3,
                                },
                            },
                        },
                    });
                },
            },
        ];

        if (featureDev) {
            exposes.push(...exposesDev);
            toZigbee.push(...toZigbeeDev);
        }
        if (featurePowerstripUI) {
            exposes.push(...exposesPowerstripUI);
            toZigbee.push(...toZigbeePowerstripUI);
        }
        return {exposes, fromZigbee, toZigbee, isModernExtend: true};
    },
    shellyWiFiSetup(): ModernExtend {
        // biome-ignore lint/suspicious/noExplicitAny: generic
        const refresh = async (endpoint: any) => {
            await endpoint.write("shellyWiFiSetupCluster", {actionCode: 0}, SHELLY_OPTIONS);
            await endpoint.read("shellyWiFiSetupCluster", ["status", "ip", "enabled", "dhcp", "ssid"], SHELLY_OPTIONS);
            await endpoint.read("shellyWiFiSetupCluster", ["staticIp", "netMask"], SHELLY_OPTIONS);
            await endpoint.read("shellyWiFiSetupCluster", ["gateway", "nameServer"], SHELLY_OPTIONS);
        };

        const exposes: Expose[] = [
            e.text("wifi_status", ea.STATE_GET).withLabel("Wi-Fi status").withDescription("Current connection status").withCategory("diagnostic"),
            e
                .text("ip_address", ea.STATE_GET)
                .withLabel("IP address")
                .withDescription("IP address currently assigned to the device")
                .withCategory("diagnostic"),
            e
                .binary("dhcp_enabled", ea.STATE_GET, true, false)
                .withLabel("DHCP enabled")
                .withDescription("Indicates whether DHCP is used to automatically assign network settings")
                .withCategory("diagnostic"),
            e
                .composite("wifi_config", "wifi_config", ea.ALL)
                .withFeature(
                    e.binary("enabled", ea.STATE_SET, true, false).withLabel("Wi-Fi enabled").withDescription("Enable/disable Wi-Fi connectivity"),
                )
                .withFeature(e.text("ssid", ea.STATE_SET).withLabel("Network").withDescription("Name (SSID) of the Wi-Fi network to connect to"))
                .withFeature(e.text("password", ea.SET).withLabel("Password").withDescription("Password for the selected Wi-Fi network"))
                .withFeature(
                    e
                        .text("static_ip", ea.STATE_SET)
                        .withLabel("IPv4 address")
                        .withDescription("Manually assigned IP address (used when DHCP is disabled)"),
                )
                .withFeature(
                    e.text("net_mask", ea.STATE_SET).withLabel("Network mask").withDescription("Subnet mask for the static IP configuration"),
                )
                .withFeature(
                    e.text("gateway", ea.STATE_SET).withLabel("Gateway").withDescription("Default gateway address for static IP configuration"),
                )
                .withFeature(e.text("name_server", ea.STATE_SET).withLabel("DNS").withDescription("Name server address for static IP configuration"))
                .withLabel("Wi-Fi Configuration")
                .withCategory("config"),
        ];

        // biome-ignore lint/suspicious/noExplicitAny: generic
        const fromZigbee: Fz.Converter<any, any, any>[] = [
            {
                cluster: "shellyWiFiSetupCluster",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const wifi_config: KeyValue = {};
                    const state: KeyValue = {wifi_config};

                    // Diagnostic data
                    if (msg.data.status !== undefined) state.wifi_status = msg.data.status;
                    if (msg.data.ip !== undefined) state.ip_address = msg.data.ip;
                    if (msg.data.dhcp !== undefined) state.dhcp_enabled = msg.data.dhcp === 1;

                    // Wi-Fi config
                    if (msg.data.enabled !== undefined) wifi_config.enabled = msg.data.enabled === 1;
                    if (msg.data.ssid !== undefined) wifi_config.ssid = msg.data.ssid;
                    if (msg.data.staticIp !== undefined) wifi_config.static_ip = msg.data.staticIp;
                    if (msg.data.netMask !== undefined) wifi_config.net_mask = msg.data.netMask;
                    if (msg.data.gateway !== undefined) wifi_config.gateway = msg.data.gateway;
                    if (msg.data.nameServer !== undefined) wifi_config.name_server = msg.data.nameServer;

                    // Cleanup empty keys
                    for (const key in wifi_config) {
                        if (wifi_config[key] === "") {
                            wifi_config[key] = undefined;
                        }
                    }

                    return state;
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["wifi_status", "ip_address", "dhcp_enabled"],
                convertGet: async (entity, key, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyWiFiSetupCluster");
                    await refresh(ep);
                },
            },
            {
                key: ["wifi_config"],
                convertGet: async (entity, key, meta) => {
                    const ep = determineEndpoint(entity, meta, "shellyWiFiSetupCluster");
                    await refresh(ep);
                },
                convertSet: async (entity, key, value, meta) => {
                    assertObject<KeyValue>(value);
                    const ep = determineEndpoint(entity, meta, "shellyWiFiSetupCluster");

                    const attr1 = {
                        enabled: value.enabled === true,
                        ssid: value.ssid || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr1, SHELLY_OPTIONS);

                    const attr2 = {
                        password: value.password || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr2, SHELLY_OPTIONS);

                    const attr3 = {
                        staticIp: value.static_ip || "",
                        netMask: value.net_mask || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr3, SHELLY_OPTIONS);

                    const attr4 = {
                        gateway: value.gateway || "",
                        nameServer: value.name_server || "",
                    };
                    await ep.write("shellyWiFiSetupCluster", attr4, SHELLY_OPTIONS);

                    const attr5 = {
                        actionCode: 1,
                    };
                    await ep.write("shellyWiFiSetupCluster", attr5, SHELLY_OPTIONS);

                    return {
                        state: {
                            wifi_config: {
                                enabled: attr1.enabled,
                                ssid: attr1.ssid === "" ? undefined : attr1.ssid,
                                static_ip: attr3.staticIp === "" ? undefined : attr3.staticIp,
                                net_mask: attr3.netMask === "" ? undefined : attr3.netMask,
                                gateway: attr4.gateway === "" ? undefined : attr4.gateway,
                                name_server: attr4.nameServer === "" ? undefined : attr4.nameServer,
                            },
                        },
                    };
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const ep = device.getEndpoint(SHELLY_ENDPOINT_ID);
                await refresh(ep);
            },
        ];

        return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
    },
    ws90CalculatedValues(): ModernExtend {
        const exposes: Expose[] = [
            // Calculated values only
            e.numeric("dew_point", ea.STATE).withUnit("°C").withDescription("Calculated dew point temperature"),
            e.numeric("wind_chill", ea.STATE).withUnit("°C").withDescription("Calculated wind chill temperature"),
            e.numeric("humidex", ea.STATE).withUnit("°C").withDescription("Calculated humidex (feels-like for warm conditions)"),
            e.numeric("apparent_temperature", ea.STATE).withUnit("°C").withDescription("Calculated apparent temperature"),
            e.numeric("heat_stress", ea.STATE).withUnit("%").withDescription("Calculated heat stress percentage (0-100%)"),
            e.numeric("rain_rate", ea.STATE).withUnit("mm/h").withDescription("Calculated rainfall rate"),
            e.numeric("pressure_trend", ea.STATE).withUnit("hPa/h").withDescription("Pressure change rate (negative = falling)"),
            e.text("weather_condition", ea.STATE).withDescription("Weather condition (sunny, rainy, snowy, cloudy, etc.)"),
        ];

        // biome-ignore lint/suspicious/noExplicitAny: custom clusters not in type registry
        const fromZigbee: Fz.Converter<any, any, any>[] = [
            {
                cluster: "msTemperatureMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        const temperature = msg.data.measuredValue / 100;
                        const calculated = updateWS90CalculatedValues(msg.device, {temperature});
                        return calculated; // Only calculated values; m.temperature() handles base temperature
                    }
                },
            },
            {
                cluster: "msRelativeHumidity",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        const humidity = msg.data.measuredValue / 100;
                        const calculated = updateWS90CalculatedValues(msg.device, {humidity});
                        return calculated; // Only calculated values; m.humidity() handles base humidity
                    }
                },
            },
            {
                cluster: "msPressureMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        const pressure = msg.data.measuredValue / 10;
                        const calculated = updateWS90CalculatedValues(msg.device, {pressure});
                        return calculated; // Only calculated values; m.pressure() handles base pressure
                    }
                },
            },
            {
                cluster: "msIlluminanceMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        const measuredValue = msg.data.measuredValue;
                        const illuminance = measuredValue > 0 ? Math.round(10 ** ((measuredValue - 1) / 10000)) : 0;
                        const calculated = updateWS90CalculatedValues(msg.device, {illuminance});
                        return calculated; // Only calculated values; m.illuminance() handles base illuminance
                    }
                },
            },
            {
                cluster: "shellyWS90UV",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const data = msg.data as KeyValue;
                    if (data.uv_index !== undefined) {
                        const uv_index = (data.uv_index as number) / 10;
                        const calculated = updateWS90CalculatedValues(msg.device, {uv_index});
                        return calculated; // Only return calculated values, m.numeric() handles uv_index
                    }
                },
            },
            {
                cluster: "shellyWS90Wind",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const data = msg.data as KeyValue;
                    const payload: {[key: string]: number} = {};
                    if (data.wind_speed !== undefined) payload.wind_speed = (data.wind_speed as number) / 10;
                    if (data.wind_direction !== undefined) payload.wind_direction = (data.wind_direction as number) / 10;
                    if (data.gust_speed !== undefined) payload.gust_speed = (data.gust_speed as number) / 10;
                    const calculated = updateWS90CalculatedValues(msg.device, payload);
                    return calculated; // Only calculated values; m.numeric() handles base wind values
                },
            },
            {
                cluster: "shellyWS90Rain",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const data = msg.data as KeyValue;
                    const payload: {[key: string]: number | boolean} = {};
                    if (data.rain_status !== undefined) payload.rain_status = Boolean(data.rain_status);
                    if (data.precipitation !== undefined) {
                        payload.precipitation = (data.precipitation as number) / 10;
                    }

                    // Calculate rain_rate (it's a calculated value, not a base sensor value)
                    const ws90Meta = getWS90Meta(msg.device);
                    const rainRate = calculateRainRate(ws90Meta, payload.precipitation as number | undefined);
                    const rain_rate = rainRate !== null ? rainRate : 0;

                    // Update state with precipitation and rain_rate
                    const stateUpdate = {...payload, rain_rate};
                    const calculated = updateWS90CalculatedValues(msg.device, stateUpdate);

                    // Include rain_rate in calculated values
                    calculated.rain_rate = rain_rate;

                    msg.device.save();
                    return calculated; // Only calculated values; m.binary()/m.numeric() handle base rain values
                },
            },
        ];

        return {exposes, fromZigbee, isModernExtend: true};
    },
};

// =============================================================================
// Local From Zigbee Converters
// =============================================================================

const fzLocal = {
    one_button_events: {
        cluster: "genOnOff",
        type: ["commandToggle"],
        convert: (model, msg, publish, options, meta) => {
            const event = utils.getFromLookup(msg.endpoint.ID, {1: "single", 2: "double", 3: "triple"});
            return {action: event};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandToggle"]>,

    four_buttons_single_events: {
        cluster: "genOnOff",
        type: ["commandOn", "commandOff"],
        convert: (model, msg, publish, options, meta) => {
            const event = utils.getFromLookup(`${msg.endpoint.ID}_${msg.type}`, {
                "1_commandOn": "1_single",
                "1_commandOff": "2_single",
                "2_commandOn": "3_single",
                "2_commandOff": "4_single",
            });
            return {action: event};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff"]>,

    four_buttons_hold_events: {
        cluster: "genLevelCtrl",
        type: ["commandStep"],
        convert: (model, msg, publish, options, meta) => {
            const event = utils.getFromLookup(`${msg.endpoint.ID}_${msg.data.stepmode}`, {
                "1_0": "1_hold",
                "1_1": "2_hold",
                "2_0": "3_hold",
                "2_1": "4_hold",
            });
            return {action: event};
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandStep"]>,
};

// =============================================================================
// Device Definitions
// =============================================================================

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1", "1 Mini"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...shellyModernExtend.shellyCustomClusters(), shellyModernExtend.shellyWiFiSetup()],
    },
    {
        fingerprint: [{modelID: "1", manufacturerName: "Shelly"}],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), ...shellyModernExtend.shellyCustomClusters(), shellyModernExtend.shellyWiFiSetup()],
    },
    {
        zigbeeModel: ["Mini1PM", "1PM Mini"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        zigbeeModel: ["1PM"],
        model: "S4SW-001P16EU",
        vendor: "Shelly",
        description: "1PM Gen 4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        zigbeeModel: ["EM Mini"],
        model: "S4EM-001PXCEU16",
        vendor: "Shelly",
        description: "EM Mini Gen4",
        extend: [
            m.electricityMeter({producedEnergy: true, acFrequency: true}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 514, inputClusters: [0, 3, 4, 5, 258], outputClusters: []},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "S4SW-002P16EU-COVER",
        vendor: "Shelly",
        description: "2PM Gen4 (Cover mode)",
        extend: [m.windowCovering({controls: ["lift", "tilt"]}), ...shellyModernExtend.shellyCustomClusters(), shellyModernExtend.shellyWiFiSetup()],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 266, inputClusters: [0, 3, 4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 2, profileID: 260, deviceID: 266, inputClusters: [4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "S4SW-002P16EU-SWITCH",
        vendor: "Shelly",
        description: "2PM Gen4 (Switch mode)",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["l1", "l2"]}),
            m.electricityMeter({producedEnergy: true, acFrequency: true, endpointNames: ["l1", "l2"]}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Plug US", manufacturerName: "Shelly"}],
        model: "S4PL-00116US",
        vendor: "Shelly",
        description: "Plug US Gen4",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter(),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Power Strip", manufacturerName: "Shelly"}],
        model: "S4PL-00416EU",
        vendor: "Shelly",
        description: "Power strip 4 Gen4",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3", "4"]}),
            m.electricityMeter({endpointNames: ["1", "2", "3", "4"]}),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyRPCSetup(["PowerstripUI"]),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Flood", manufacturerName: "Shelly"}],
        model: "S4SN-0071A",
        vendor: "Shelly",
        description: "Flood Gen 4",
        extend: [
            m.battery(),
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "Ecowitt WS90", manufacturerName: "Shelly"}],
        model: "WS90",
        vendor: "Shelly",
        description: "Weather station",
        extend: [
            m.battery(),
            m.illuminance(),
            m.temperature(),
            m.pressure(),
            m.humidity(),
            m.deviceAddCustomCluster("shellyWS90Wind", {
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    wind_speed: {ID: 0x0000, type: Zcl.DataType.UINT16},
                    wind_direction: {ID: 0x0004, type: Zcl.DataType.UINT16},
                    gust_speed: {ID: 0x0007, type: Zcl.DataType.UINT16},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.numeric({
                name: "wind_speed",
                cluster: "shellyWS90Wind",
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT16},
                valueMin: 0,
                valueMax: 140,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Wind speed in m/s",
                scale: 10,
                unit: "m/s",
                access: "STATE_GET",
            }),
            m.numeric({
                name: "wind_direction",
                cluster: "shellyWS90Wind",
                attribute: {ID: 0x0004, type: Zcl.DataType.UINT16},
                valueMin: 0,
                valueMax: 360,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Wind direction in degrees",
                scale: 10,
                unit: "°",
                access: "STATE_GET",
            }),
            m.numeric({
                name: "gust_speed",
                cluster: "shellyWS90Wind",
                attribute: {ID: 0x0007, type: Zcl.DataType.UINT16},
                valueMin: 0,
                valueMax: 140,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Gust speed in m/s",
                scale: 10,
                unit: "m/s",
                access: "STATE_GET",
            }),
            m.deviceAddCustomCluster("shellyWS90UV", {
                ID: 0xfc02,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    uv_index: {ID: 0x0000, type: Zcl.DataType.UINT8},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.numeric({
                name: "uv_index",
                cluster: "shellyWS90UV",
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT8},
                valueMin: 0,
                valueMax: 11,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "UV index",
                scale: 10,
                access: "STATE_GET",
            }),
            m.deviceAddCustomCluster("shellyWS90Rain", {
                ID: 0xfc03,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    rain_status: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
                    precipitation: {ID: 0x0001, type: Zcl.DataType.UINT24},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.binary({
                name: "rain_status",
                cluster: "shellyWS90Rain",
                attribute: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
                valueOn: [true, 1],
                valueOff: [false, 0],
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Rain status",
                access: "STATE_GET",
            }),
            m.numeric({
                name: "precipitation",
                cluster: "shellyWS90Rain",
                attribute: {ID: 0x0001, type: Zcl.DataType.UINT24},
                valueMin: 0,
                valueMax: 100000,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Precipitation",
                unit: "mm",
                scale: 10,
                access: "STATE_GET",
            }),
            // Calculated values (added by PR #11437)
            shellyModernExtend.ws90CalculatedValues(),
        ],
    },
    {
        fingerprint: [{modelID: "Dimmer", manufacturerName: "Shelly"}],
        model: "S4DM-0A101WWL",
        vendor: "Shelly",
        description: "Dimmer Gen4",
        extend: [
            m.light({configureReporting: true}),
            m.electricityMeter(),
            shellyModernExtend.shellyPowerFactorInt16Fix(),
            ...shellyModernExtend.shellyCustomClusters(),
            shellyModernExtend.shellyWiFiSetup(),
        ],
    },
    {
        fingerprint: [{modelID: "BLU H&T ZB", manufacturerName: "Shelly"}],
        model: "SBHT-203C",
        vendor: "Shelly",
        description: "Humidity & temperature sensor",
        extend: [m.battery(), m.temperature(), m.humidity()],
    },
    {
        fingerprint: [{modelID: "BLU H&T Display ZB", manufacturerName: "Shelly"}],
        model: "SBHT-103C",
        vendor: "Shelly",
        description: "BLU H&T display Zigbee",
        extend: [m.battery(), m.temperature(), m.humidity()],
    },
    {
        fingerprint: [{modelID: "BLU Remote Control ZB", manufacturerName: "Shelly"}],
        model: "SBRC-005B-B",
        vendor: "Shelly",
        description: "BLU Remote Control ZB",
        exposes: [
            e.action(["on", "off", "brightness_step_up", "brightness_step_down"]),
            e.numeric("action_group", ea.STATE).withDescription("Group ID associated with the action command."),
            e.numeric("action_step_size", ea.STATE).withDescription("Step size value used for brightness step actions."),
            e.numeric("action_transition_time", ea.STATE).withDescription("Transition time in seconds for the action."),
        ],
        extend: [
            m.battery(),
            m.commandsOnOff({commands: ["on", "off"]}),
            m.commandsLevelCtrl({commands: ["brightness_step_up", "brightness_step_down"]}),
            m.identify(),
        ],
    },
    {
        fingerprint: [{modelID: "BLU Button Tough 1 ZB", manufacturerName: "Shelly"}],
        model: "SBBT-102C",
        vendor: "Shelly",
        description: "BLU Button Tough 1 ZB",
        fromZigbee: [fzLocal.one_button_events],
        exposes: [e.action(["single", "double", "triple"])],
        extend: [m.battery(), m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3}}), m.identify()],
    },
    {
        fingerprint: [{modelID: "BLU RC Button 4 ZB", manufacturerName: "Shelly"}],
        model: "SBBT-104CUS",
        vendor: "Shelly",
        description: "BLU RC Button 4 ZB",
        fromZigbee: [fzLocal.four_buttons_single_events, fzLocal.four_buttons_hold_events],
        exposes: [e.action(["1_single", "2_single", "3_single", "4_single", "1_hold", "2_hold", "3_hold", "4_hold"])],
        extend: [m.battery(), m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}), m.identify()],
    },
    {
        zigbeeModel: ["BLU Wall Switch 4 ZB"],
        model: "SBBT-004CEU",
        vendor: "Shelly",
        description: "BLU Wall Switch 4 ZB",
        whiteLabel: [{vendor: "Shelly", model: "SBBT-104CEU", description: "BLU Wall Switch 4 ZB DK"}],
        fromZigbee: [fzLocal.four_buttons_single_events, fzLocal.four_buttons_hold_events],
        exposes: [e.action(["1_single", "2_single", "3_single", "4_single", "1_hold", "2_hold", "3_hold", "4_hold"])],
        extend: [m.battery(), m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}), m.identify()],
    },
    {
        zigbeeModel: ["BLU TRV"],
        model: "SBTR-001AEU",
        vendor: "Shelly",
        description: "Thermostatic radiator valve",
        fromZigbee: [
            fz.thermostat,
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.alarmMask !== undefined) {
                        const alarmMask = msg.data.alarmMask;
                        result.calibration_ok = !((alarmMask & (1 << 2)) > 0);
                    }
                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
        ],
        toZigbee: [
            {
                key: ["calibrate"],
                convertSet: async (entity, key, value, meta) => {
                    await entity.command<"shellyTRVManualMode", "calibrate", ShellyTRVManualMode>(
                        "shellyTRVManualMode",
                        "calibrate",
                        {},
                        {manufacturerCode: Zcl.ManufacturerCode.SHELLY},
                    );
                },
            },
        ],
        exposes: [
            e.binary("calibration_ok", ea.STATE, true, false).withDescription("Calibration OK").withCategory("diagnostic"),
            e.enum("calibrate", ea.SET, ["trigger"]).withDescription("Trigger valve calibration").withCategory("config"),
        ],
        extend: [
            m.battery(),
            m.thermostat({
                localTemperatureCalibration: {values: {min: -10, max: 10, step: 0.1}},
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 4, max: 30, step: 0.1},
                        unoccupiedHeatingSetpoint: {min: 4, max: 30, step: 0.1},
                    },
                },
                setpointsLimit: {
                    minHeatSetpointLimit: {min: 4, max: 30, step: 0.1},
                    maxHeatSetpointLimit: {min: 4, max: 30, step: 0.1},
                },
                systemMode: {values: ["off", "auto", "heat"]},
                piHeatingDemand: {values: true},
            }),
            m.deviceAddCustomCluster("shellyTRVManualMode", {
                ID: 0xfc24,
                manufacturerCode: Zcl.ManufacturerCode.SHELLY,
                attributes: {
                    manualMode: {ID: 0x0000, type: Zcl.DataType.UINT8},
                    position: {ID: 0x0001, type: Zcl.DataType.UINT8},
                },
                commands: {
                    calibrate: {ID: 0x0000, parameters: []},
                },
                commandsResponse: {},
            }),
            m.binary({
                name: "manual_mode",
                cluster: "shellyTRVManualMode",
                attribute: {ID: 0x0000, type: Zcl.DataType.UINT8},
                valueOn: [true, 1],
                valueOff: [false, 0],
                description: "Manual mode (0 = auto, 1 = manual)",
                access: "ALL",
            }),
            m.numeric({
                name: "valve_position",
                cluster: "shellyTRVManualMode",
                attribute: {ID: 0x0001, type: Zcl.DataType.UINT8},
                valueMin: 0,
                valueMax: 100,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                description: "Valve position (0-100%)",
                unit: "%",
                access: "ALL",
            }),
            m.identify(),
        ],
    },
];
