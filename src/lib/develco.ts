import {Zcl} from "zigbee-herdsman";
import {presets as e, access as ea} from "./exposes";
import {deviceAddCustomCluster, deviceTemperature, type NumericArgs, numeric, temperature} from "./modernExtend";
import type {Configure, Fz, ModernExtend, Tz} from "./types";

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.DEVELCO};

export interface DevelcoGenBasic {
    attributes: {
        develcoPrimarySwVersion: Buffer;
        develcoPrimaryHwVersion: Buffer;
        develcoLedControl: number;
        develcoTxPower: number;
    };
    commands: never;
    commandResponses: never;
}

export interface DevelcoAirQuality {
    attributes: {
        measuredValue: number;
        minMeasuredValue: number;
        maxMeasuredValue: number;
        resolution: number;
    };
    commands: never;
    commandResponses: never;
}

export interface DevelcoIasZone {
    attributes: {
        develcoZoneStatusInterval: number;
    };
    commands: never;
    commandResponses: never;
}

export const develcoModernExtend = {
    addCustomClusterManuSpecificDevelcoGenBasic: () =>
        deviceAddCustomCluster("genBasic", {
            ID: 0x0000,
            attributes: {
                develcoPrimarySwVersion: {ID: 0x8000, type: Zcl.DataType.OCTET_STR, manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
                develcoPrimaryHwVersion: {ID: 0x8020, type: Zcl.DataType.OCTET_STR, manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
                develcoLedControl: {ID: 0x8100, type: Zcl.DataType.BITMAP8, manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
                develcoTxPower: {ID: 0x8101, type: Zcl.DataType.ENUM8, manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
            },
            commands: {},
            commandsResponse: {},
        }),
    addCustomClusterManuSpecificDevelcoIasZone: () =>
        deviceAddCustomCluster("ssIasZone", {
            ID: Zcl.Clusters.ssIasZone.ID,
            attributes: {
                develcoZoneStatusInterval: {ID: 0x8000, type: Zcl.DataType.UINT16, manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
            },
            commands: {},
            commandsResponse: {},
        }),
    addCustomClusterManuSpecificDevelcoAirQuality: () =>
        deviceAddCustomCluster("manuSpecificDevelcoAirQuality", {
            ID: 0xfc03,
            manufacturerCode: Zcl.ManufacturerCode.DEVELCO,
            attributes: {
                measuredValue: {ID: 0x0000, type: Zcl.DataType.UINT16},
                minMeasuredValue: {ID: 0x0001, type: Zcl.DataType.UINT16},
                maxMeasuredValue: {ID: 0x0002, type: Zcl.DataType.UINT16},
                resolution: {ID: 0x0003, type: Zcl.DataType.UINT16},
            },
            commands: {},
            commandsResponse: {},
        }),
    readGenBasicPrimaryVersions: (): ModernExtend => {
        /*
         * Develco (and there B2C brand Frient) do not use swBuildId
         *  The versions are stored in develcoPrimarySwVersion and develcoPrimaryHwVersion, we read them during configure.
         */
        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                for (const ep of device.endpoints) {
                    if (ep.supportsInputCluster("genBasic")) {
                        try {
                            const data = await ep.read<"genBasic", DevelcoGenBasic>(
                                "genBasic",
                                ["develcoPrimarySwVersion", "develcoPrimaryHwVersion"],
                                manufacturerOptions,
                            );

                            if (data.develcoPrimarySwVersion !== undefined) {
                                device.softwareBuildID = data.develcoPrimarySwVersion.join(".");
                            }

                            if (data.develcoPrimaryHwVersion !== undefined) {
                                device.hardwareVersion = Number.parseInt(data.develcoPrimaryHwVersion.join(""), 10);
                            }

                            device.save();
                        } catch {
                            /* catch timeouts of sleeping devices */
                        }
                        break;
                    }
                }
            },
        ];
        return {configure, isModernExtend: true};
    },
    voc: (args?: Partial<NumericArgs<"manuSpecificDevelcoAirQuality", DevelcoAirQuality>>) =>
        numeric<"manuSpecificDevelcoAirQuality", DevelcoAirQuality>({
            name: "voc",
            cluster: "manuSpecificDevelcoAirQuality",
            attribute: "measuredValue",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 10},
            description: "Measured VOC value",
            // from Sensirion_Gas_Sensors_SGP3x_TVOC_Concept.pdf
            // "The mean molar mass of this mixture is 110 g/mol and hence,
            // 1 ppb TVOC corresponds to 4.5 μg/m3."
            scale: (value: number, type: "from" | "to") => {
                if (type === "from") {
                    return value * 4.5;
                }
                return value;
            },
            unit: "µg/m³",
            access: "STATE_GET",
            ...args,
        }),
    airQuality: (): ModernExtend => {
        // NOTE: do not setup reporting, this is handled by the voc() modernExtend

        const clusterName = "manuSpecificDevelcoAirQuality";
        const attributeName = "measuredValue";
        const propertyName = "air_quality";
        const access = ea.STATE;

        const expose = e
            .enum("air_quality", access, ["excellent", "good", "moderate", "poor", "unhealthy", "out_of_range", "unknown"])
            .withDescription("Measured air quality");

        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data[attributeName] !== undefined) {
                        const vocPpb = Number.parseFloat(msg.data[attributeName]);

                        // from aqszb-110-technical-manual-air-quality-sensor-04-08-20.pdf page 6, section 2.2 voc
                        // this contains a ppb to level mapping table.
                        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                        let airQuality;
                        if (vocPpb <= 65) {
                            airQuality = "excellent";
                        } else if (vocPpb <= 220) {
                            airQuality = "good";
                        } else if (vocPpb <= 660) {
                            airQuality = "moderate";
                        } else if (vocPpb <= 2200) {
                            airQuality = "poor";
                        } else if (vocPpb <= 5500) {
                            airQuality = "unhealthy";
                        } else if (vocPpb > 5500) {
                            airQuality = "out_of_range";
                        } else {
                            airQuality = "unknown";
                        }

                        return {[propertyName]: airQuality};
                    }
                },
            } satisfies Fz.Converter<typeof clusterName, undefined, ["attributeReport", "readResponse"]>,
        ];

        return {exposes: [expose], fromZigbee, isModernExtend: true};
    },
    batteryLowAA: (): ModernExtend => {
        /*
         * Per the technical documentation for AQSZB-110:
         * To detect low battery the system can monitor the "BatteryVoltage" by setting up a reporting interval of every 12 hour.
         * When a voltage of 2.5V is measured the battery should be replaced.
         * Low batt LED indication–RED LED will blink twice every 60 second.
         *
         * Similar notes found in other 2x AA powered Develco devices like HMSZB-110 and MOSZB-140
         */
        const clusterName = "genPowerCfg";
        const attributeName = "batteryVoltage";
        const propertyName = "battery_low";

        const expose = e.battery_low();

        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data[attributeName] !== undefined && msg.data[attributeName] < 255) {
                        const voltage = msg.data[attributeName];
                        return {[propertyName]: voltage <= 25};
                    }
                },
            } satisfies Fz.Converter<typeof clusterName, undefined, ["attributeReport", "readResponse"]>,
        ];

        return {exposes: [expose], fromZigbee, isModernExtend: true};
    },
    temperature: (args?: Partial<NumericArgs<"msTemperatureMeasurement">>) =>
        temperature({
            ...args,
        }),
    deviceTemperature: (args?: Partial<NumericArgs<"genDeviceTempCfg">>) =>
        deviceTemperature({
            reporting: {min: "5_MINUTES", max: "1_HOUR", change: 2}, // Device temperature reports with 2 degree change
            ...args,
        }),
    currentSummation: (args?: Partial<NumericArgs<"seMetering">>) =>
        numeric({
            name: "current_summation",
            cluster: "seMetering",
            attribute: "develcoCurrentSummation",
            description: "Current summation value sent to the display. e.g. 570 = 0,570 kWh",
            access: "SET",
            valueMin: 0,
            valueMax: 268435455,
            ...args,
        }),
    pulseConfiguration: (args?: Partial<NumericArgs<"seMetering">>) =>
        numeric({
            name: "pulse_configuration",
            cluster: "seMetering",
            attribute: "develcoPulseConfiguration",
            description: "Pulses per kwh. Default 1000 imp/kWh. Range 0 to 65535",
            access: "ALL",
            valueMin: 0,
            valueMax: 65535,
            ...args,
        }),
    ledControl: (): ModernExtend => {
        const expose = e
            .composite("led_control", "led_control", ea.ALL)
            .withFeature(
                e
                    .binary("indicate_faults", ea.ALL, true, false)
                    .withDescription("Enable/disable LED indication for faults (e.g., lost connection to gateway)"),
            )
            .withFeature(
                e.binary("indicate_mains_power", ea.ALL, true, false).withDescription("Enable/disable green LED indication for mains power status"),
            );

        const fromZigbee: Fz.Converter<"genBasic", DevelcoGenBasic, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (_model, msg, _publish, _options, _meta) => {
                    if (Object.hasOwn(msg.data, "develcoLedControl")) {
                        const ledControl = msg.data.develcoLedControl as number;
                        return {
                            led_control: {
                                indicate_faults: (ledControl & 1) > 0,
                                indicate_mains_power: (ledControl & 2) > 0,
                            },
                        };
                    }
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["led_control"],
                convertSet: async (entity, _key, value, meta) => {
                    // biome-ignore lint/style/useNamingConvention: zigbee2mqtt uses snake_case for exposed attributes
                    const currentState = (meta.state.led_control as {indicate_faults: boolean; indicate_mains_power: boolean}) || {
                        indicate_faults: false,
                        indicate_mains_power: false,
                    };
                    // biome-ignore lint/style/useNamingConvention: zigbee2mqtt uses snake_case for exposed attributes
                    const newState = {...currentState, ...(value as {indicate_faults?: boolean; indicate_mains_power?: boolean})};
                    let bitmap = 0;
                    if (newState.indicate_faults) bitmap |= 1;
                    if (newState.indicate_mains_power) bitmap |= 2;
                    await entity.write<"genBasic", DevelcoGenBasic>("genBasic", {develcoLedControl: bitmap}, manufacturerOptions);
                    return {state: {led_control: newState}};
                },
                convertGet: async (entity, _key, _meta) => {
                    await entity.read<"genBasic", DevelcoGenBasic>("genBasic", ["develcoLedControl"], manufacturerOptions);
                },
            },
        ];

        const configure: Configure[] = [
            async (device, _coordinatorEndpoint, _definition) => {
                for (const ep of device.endpoints) {
                    if (ep.supportsInputCluster("genBasic")) {
                        try {
                            await ep.read<"genBasic", DevelcoGenBasic>("genBasic", ["develcoLedControl"], manufacturerOptions);
                        } catch {
                            /* catch timeouts of sleeping devices */
                        }
                        break;
                    }
                }
            },
        ];

        return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
    },
    txPower: (): ModernExtend => {
        const expose = e
            .enum("tx_power", ea.ALL, ["CE", "FCC"])
            .withDescription("TX power mode for regulatory compliance (CE or FCC). Requires device rejoin to apply.");

        const fromZigbee: Fz.Converter<"genBasic", DevelcoGenBasic, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (_model, msg, _publish, _options, _meta) => {
                    if (Object.hasOwn(msg.data, "develcoTxPower")) {
                        return {tx_power: (msg.data.develcoTxPower as number) === 0 ? "CE" : "FCC"};
                    }
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["tx_power"],
                convertSet: async (entity, _key, value, _meta) => {
                    const numericValue = value === "CE" ? 0 : 1;
                    await entity.write<"genBasic", DevelcoGenBasic>("genBasic", {develcoTxPower: numericValue}, manufacturerOptions);
                    return {state: {tx_power: value}};
                },
                convertGet: async (entity, _key, _meta) => {
                    await entity.read<"genBasic", DevelcoGenBasic>("genBasic", ["develcoTxPower"], manufacturerOptions);
                },
            },
        ];

        const configure: Configure[] = [
            async (device, _coordinatorEndpoint, _definition) => {
                for (const ep of device.endpoints) {
                    if (ep.supportsInputCluster("genBasic")) {
                        try {
                            await ep.read<"genBasic", DevelcoGenBasic>("genBasic", ["develcoTxPower"], manufacturerOptions);
                        } catch {
                            /* catch timeouts of sleeping devices */
                        }
                        break;
                    }
                }
            },
        ];

        return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
    },
    zoneStatusInterval: (): ModernExtend => {
        const expose = e
            .numeric("zone_status_interval", ea.ALL)
            .withUnit("s")
            .withValueMin(0)
            .withValueMax(65535)
            .withDescription("Heartbeat interval in seconds. Controls the periodic interval between ZoneStatusChange commands (default 300s)");

        const fromZigbee: Fz.Converter<"ssIasZone", DevelcoIasZone, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "ssIasZone",
                type: ["attributeReport", "readResponse"],
                convert: (_model, msg, _publish, _options, _meta) => {
                    if (Object.hasOwn(msg.data, "develcoZoneStatusInterval")) {
                        return {zone_status_interval: msg.data.develcoZoneStatusInterval as number};
                    }
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["zone_status_interval"],
                convertSet: async (entity, _key, value, _meta) => {
                    await entity.write<"ssIasZone", DevelcoIasZone>("ssIasZone", {develcoZoneStatusInterval: value as number}, manufacturerOptions);
                    return {state: {zone_status_interval: value}};
                },
                convertGet: async (entity, _key, _meta) => {
                    await entity.read<"ssIasZone", DevelcoIasZone>("ssIasZone", ["develcoZoneStatusInterval"], manufacturerOptions);
                },
            },
        ];

        const configure: Configure[] = [
            async (device, _coordinatorEndpoint, _definition) => {
                for (const ep of device.endpoints) {
                    if (ep.supportsInputCluster("ssIasZone")) {
                        try {
                            await ep.read<"ssIasZone", DevelcoIasZone>("ssIasZone", ["develcoZoneStatusInterval"], manufacturerOptions);
                        } catch {
                            /* catch timeouts of sleeping devices */
                        }
                        break;
                    }
                }
            },
        ];

        return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
    },
    acConnected: (): ModernExtend => {
        const expose = e
            .binary("ac_connected", ea.STATE, true, false)
            .withDescription("Indicates whether the device is connected to AC mains power")
            .withCategory("diagnostic");

        const fromZigbee: Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>[] = [
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (_model, msg, _publish, _options, _meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
                    if (zoneStatus !== undefined) {
                        // Bit 7 = 1 means "mains power lost", so ac_connected = false
                        // Bit 7 = 0 means "mains power ok", so ac_connected = true
                        return {ac_connected: (zoneStatus & (1 << 7)) === 0};
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, _coordinatorEndpoint, _definition) => {
                for (const ep of device.endpoints) {
                    if (ep.supportsInputCluster("ssIasZone")) {
                        try {
                            await ep.read("ssIasZone", ["zoneStatus"]);
                        } catch {
                            /* catch timeouts of sleeping devices */
                        }
                        break;
                    }
                }
            },
        ];

        return {exposes: [expose], fromZigbee, configure, isModernExtend: true};
    },
};
