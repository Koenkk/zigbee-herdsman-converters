import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {eLegrand, fzLegrand, legrandOptions, readInitialBatteryState, tzLegrand} from "../lib/legrand";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: [
            " Pocket remote\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            " Wireless Scenes Command\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
        ],
        model: "067755",
        vendor: "Legrand",
        description: "Wireless and batteryless 4 scenes control",
        ota: true,
        meta: {multiEndpoint: true, battery: {voltageToPercentage: {min: 2500, max: 3000}}, publishDuplicateTransaction: true},
        fromZigbee: [fz.identify, fz.battery, fz.command_recall],
        toZigbee: [],
        exposes: [e.battery(), e.action(["identify", "recall_1_1"])],
        onEvent: readInitialBatteryState,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff", "genLevelCtrl"]);
        },
    },
    {
        zigbeeModel: [
            " Dry contact\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
        ],
        model: "412173",
        vendor: "Legrand",
        description: "DIN dry contactor module",
        whiteLabel: [{vendor: "BTicino", model: "FC80AC"}],
        extend: [m.onOff()],
        ota: true,
        fromZigbee: [fz.identify, fz.electrical_measurement, fzLegrand.cluster_fc01],
        toZigbee: [tz.legrand_device_mode, tzLegrand.identify, tz.electrical_measurement_power],
        exposes: [
            e.power().withAccess(ea.STATE_GET),
            e
                .enum("device_mode", ea.ALL, ["switch", "auto"])
                .withDescription("switch: allow on/off, auto will use wired action via C1/C2 on contactor for example with HC/HP"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            // Read configuration values that are not sent periodically as well as current power (activePower).
            await endpoint.read("haElectricalMeasurement", ["activePower", 0xf000, 0xf001, 0xf002]);
        },
    },
    {
        zigbeeModel: [
            " Contactor\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000" +
                "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
        ],
        model: "412171",
        vendor: "Legrand",
        description: "DIN contactor module",
        whiteLabel: [{vendor: "BTicino", model: "FC80CC"}],
        extend: [m.onOff(), m.electricityMeter({cluster: "electrical", voltage: false, current: false})],
        ota: true,
        fromZigbee: [fz.identify, fzLegrand.cluster_fc01, fz.electrical_measurement],
        toZigbee: [tz.legrand_device_mode, tzLegrand.identify, tzLegrand.auto_mode, tz.electrical_measurement_power],
        exposes: [
            e
                .enum("device_mode", ea.ALL, ["switch", "auto"])
                .withDescription("Switch: allow manual on/off, auto uses contact's C1/C2 wired actions for Peak/Off-Peak electricity rates"),
            e
                .enum("auto_mode", ea.STATE_SET, ["off", "auto", "on_override"])
                .withDescription('Off/auto/on (override) (works only if device is set to "auto" mode)'),
        ],
    },
    {
        zigbeeModel: [
            " Teleruptor\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000" +
                "\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
        ],
        model: "412170",
        vendor: "Legrand",
        description: "DIN smart relay for light control",
        whiteLabel: [{vendor: "BTicino", model: "FC80RC"}],
        extend: [m.onOff()],
        ota: true,
        fromZigbee: [fz.identify, fz.electrical_measurement, fzLegrand.cluster_fc01],
        toZigbee: [tz.legrand_device_mode, tzLegrand.identify, tz.electrical_measurement_power],
        exposes: [
            e.power().withAccess(ea.STATE_GET),
            e
                .enum("device_mode", ea.ALL, ["switch", "auto"])
                .withDescription("switch: allow on/off, auto will use wired action via C1/C2 on teleruptor with buttons"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "haElectricalMeasurement"]);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [" Shutters central remote switch"],
        model: "067646",
        vendor: "Legrand",
        description: "Wireless shutter switch",
        ota: true,
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}, publishDuplicateTransaction: true},
        fromZigbee: [
            fz.identify,
            fz.command_cover_open,
            fz.command_cover_close,
            fz.command_cover_stop,
            fz.battery,
            fz.legrand_binary_input_moving,
            fzLegrand.stop_poll_on_checkin,
        ],
        toZigbee: [],
        exposes: [e.battery(), e.action(["identify", "open", "close", "stop", "moving", "stopped"])],
        onEvent: readInitialBatteryState,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genBinaryInput", "closuresWindowCovering", "genIdentify"]);
        },
    },
    {
        zigbeeModel: [" Shutter switch with neutral\u0000\u0000\u0000"],
        model: "067776",
        vendor: "Legrand",
        description: "Netatmo wired shutter switch",
        ota: true,
        fromZigbee: [fz.cover_position_tilt, fz.identify, fzLegrand.cluster_fc01, fzLegrand.calibration_mode(false), fzLegrand.command_cover],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tzLegrand.identify, tzLegrand.led_mode, tzLegrand.calibration_mode(false)],
        exposes: (device, options) => {
            return [
                eLegrand.getCover(device),
                e.action(["identify", "open", "close", "stop", "moving", "stopped"]),
                eLegrand.identify(),
                eLegrand.ledInDark(),
                eLegrand.ledIfOn(),
                eLegrand.getCalibrationModes(false),
            ];
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBinaryInput", "closuresWindowCovering", "genIdentify"]);
            let p = reporting.payload<"closuresWindowCovering">("currentPositionLiftPercentage", 1, 120, 1);
            await endpoint.configureReporting("closuresWindowCovering", p, legrandOptions);

            p = reporting.payload<"closuresWindowCovering">("currentPositionTiltPercentage", 1, 120, 1);
            await endpoint.configureReporting("closuresWindowCovering", p, legrandOptions);
        },
    },
    {
        // Some require coverInverted:
        // - https://github.com/Koenkk/zigbee2mqtt/issues/15101#issuecomment-1356787490
        // - https://github.com/Koenkk/zigbee2mqtt/issues/16090
        fingerprint: [
            {modelID: " Shutter switch with neutral\u0000\u0000\u0000", softwareBuildID: "001a"},
            {
                modelID: " Shutter switch with neutral\u0000\u0000\u0000",
                softwareBuildID:
                    "00d\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u00000\u0012\u0002\u0000" +
                    "\t\u0007\u0000\u0018\u0002\u0003\b\u0000 \u00132\u0000\u0000\u0000\u0000X\u0002\n\u0000\u0000\u0000\u0000d" +
                    "\u0017\u0000\u0018\u0000",
            },
        ],
        model: "067776_inverted",
        vendor: "Legrand",
        description: "Netatmo wired shutter switch",
        ota: true,
        meta: {coverInverted: true},
        fromZigbee: [fz.identify, fz.legrand_binary_input_moving, fz.cover_position_tilt, fzLegrand.cluster_fc01],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tzLegrand.identify, tzLegrand.led_mode],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBinaryInput", "closuresWindowCovering", "genIdentify"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: [" Shutter SW with level control\u0000"],
        model: "067776A",
        vendor: "Legrand",
        description: "Netatmo wired shutter switch with level control (NLLV)",
        whiteLabel: [
            {
                model: "K4027C/L4027C/N4027C/NT4027C",
                vendor: "BTicino",
                description: "Shutter SW with level control",
                fingerprint: [{hardwareVersion: 9}, {hardwareVersion: 13}],
            },
        ],
        ota: true,
        fromZigbee: [fz.cover_position_tilt, fz.identify, fzLegrand.cluster_fc01, fzLegrand.calibration_mode(true), fzLegrand.command_cover],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tzLegrand.identify, tzLegrand.led_mode, tzLegrand.calibration_mode(true)],
        exposes: (device, options) => {
            return [
                eLegrand.getCover(device),
                e.action(["identify", "open", "close", "stop", "moving", "stopped"]),
                eLegrand.identify(),
                eLegrand.ledInDark(),
                eLegrand.ledIfOn(),
                eLegrand.getCalibrationModes(true),
            ];
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBinaryInput", "closuresWindowCovering", "genIdentify"]);
            let p = reporting.payload<"closuresWindowCovering">("currentPositionLiftPercentage", 1, 120, 1);
            await endpoint.configureReporting("closuresWindowCovering", p, legrandOptions);

            p = reporting.payload<"closuresWindowCovering">("currentPositionTiltPercentage", 1, 120, 1);
            await endpoint.configureReporting("closuresWindowCovering", p, legrandOptions);
        },
    },
    {
        // LED blinks RED when battery is low
        zigbeeModel: [" Remote switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"],
        model: "067773",
        vendor: "Legrand",
        description: "Wireless remote switch",
        ota: true,
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}, publishDuplicateTransaction: true},
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_toggle, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["identify", "on", "off", "toggle", "brightness_move_up", "brightness_move_down", "brightness_stop"])],
        onEvent: readInitialBatteryState,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff", "genLevelCtrl"]);
        },
    },
    {
        zigbeeModel: [" Double gangs remote switch\u0000\u0000\u0000\u0000"],
        model: "067774",
        vendor: "Legrand",
        description: "Wireless double remote switch",
        ota: true,
        meta: {multiEndpoint: true, battery: {voltageToPercentage: {min: 2500, max: 3000}}, publishDuplicateTransaction: true},
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_toggle, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["identify", "on", "off", "toggle", "brightness_move_up", "brightness_move_down", "brightness_stop"])],
        onEvent: readInitialBatteryState,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff", "genLevelCtrl"]);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
        },
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
    },
    {
        zigbeeModel: [" Remote toggle switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"],
        model: "067694",
        vendor: "Legrand",
        description: "Remote toggle switch",
        whiteLabel: [{vendor: "BTicino", description: "Wireless control module for a traditional two-way switch or pushbutton", model: "3577C"}],
        ota: true,
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_toggle, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["identify", "on", "off", "toggle"])],
        onEvent: readInitialBatteryState,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff"]);
        },
    },
    {
        zigbeeModel: [" Dimmer switch w/o neutral\u0000\u0000\u0000\u0000\u0000"],
        model: "067771",
        vendor: "Legrand",
        description: "Wired switch without neutral",
        ota: true,
        fromZigbee: [fz.identify, fz.level_config, fz.lighting_ballast_configuration, fzLegrand.cluster_fc01],
        toZigbee: [tzLegrand.led_mode, tz.legrand_device_mode, tzLegrand.identify, tz.ballast_config, tz.level_config],
        exposes: [
            e.numeric("ballast_minimum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the minimum brightness value"),
            e.numeric("ballast_maximum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the maximum brightness value"),
            e.binary("device_mode", ea.ALL, "dimmer_on", "dimmer_off").withDescription("Allow the device to change brightness"),
            eLegrand.ledInDark(),
            eLegrand.ledIfOn(),
        ],
        extend: [m.light({configureReporting: true, levelConfig: {features: ["on_level"]}})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genBinaryInput", "lightingBallastCfg"]);
        },
    },
    {
        zigbeeModel: [" Dimmer switch w/o neutral evo\u0000"],
        model: "199182",
        vendor: "Legrand",
        description: "Wired switch without neutral",
        ota: true,
        fromZigbee: [fz.identify, fz.lighting_ballast_configuration, fzLegrand.cluster_fc01],
        toZigbee: [tzLegrand.led_mode, tz.legrand_device_mode, tzLegrand.identify, tz.ballast_config],
        exposes: [
            e.numeric("ballast_minimum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the minimum brightness value"),
            e.numeric("ballast_maximum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the maximum brightness value"),
            e.binary("device_mode", ea.ALL, "dimmer_on", "dimmer_off").withDescription("Allow the device to change brightness"),
            eLegrand.ledInDark(),
            eLegrand.ledIfOn(),
        ],
        extend: [m.light({configureReporting: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genBinaryInput", "lightingBallastCfg"]);
        },
    },
    {
        zigbeeModel: [" Connected outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"],
        model: "067775/741811",
        vendor: "Legrand",
        description: "Power socket with power consumption monitoring",
        ota: true,
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.power_on_behavior, fzLegrand.cluster_fc01],
        toZigbee: [tz.on_off, tzLegrand.led_mode, tzLegrand.identify, tz.power_on_behavior],
        exposes: [
            e.switch(),
            e.action(["identify"]),
            e.power(),
            e.power_apparent(),
            e.power_on_behavior(),
            eLegrand.identify(),
            eLegrand.ledInDark(),
            eLegrand.ledIfOn(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            try {
                await reporting.apparentPower(endpoint);
            } catch {
                // Some version/firmware don't seem to support this.
                // https://github.com/Koenkk/zigbee2mqtt/issues/16732
            }
        },
    },
    {
        zigbeeModel: [" Micromodule switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"],
        model: "064888",
        vendor: "Legrand",
        description: "Wired micromodule switch",
        whiteLabel: [
            {vendor: "Legrand", description: "Micromodule switch", model: "199142"},
            {vendor: "BTicino", description: "Connected lighting micromodule", model: "3584C"},
        ],
        extend: [m.onOff()],
        ota: true,
        fromZigbee: [fz.identify],
        toZigbee: [tzLegrand.identify],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBinaryInput"]);
        },
    },
    {
        // LED blinks RED when battery is low
        zigbeeModel: [" Master remote SW Home / Away\u0000\u0000"],
        model: "064873",
        vendor: "Legrand",
        description: "Home & away switch / master switch",
        whiteLabel: [{vendor: "BTicino", model: "LN4570CWI"}],
        ota: true,
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        fromZigbee: [fz.legrand_scenes, fz.legrand_master_switch_center, fz.battery, fzLegrand.stop_poll_on_checkin],
        toZigbee: [],
        exposes: [e.battery(), e.action(["enter", "leave", "sleep", "wakeup", "center"])],
        onEvent: readInitialBatteryState,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genPowerCfg"]);
        },
    },
    {
        zigbeeModel: [
            " 3 Phases power consumption module\u0000\u0000",
            " 3P power consumption module\u0000\u0000\u0000",
            " DIN 3Ph power consumption module",
            "3ph Smart shedder module",
        ],
        model: "412175",
        vendor: "Legrand",
        description: "DIN 3 Phases power consumption module",
        whiteLabel: [{vendor: "BTicino", description: "Connected DIN meter for three-phase", model: "F40T125A"}],
        ota: true,
        fromZigbee: [fz.identify, fz.metering, fz.electrical_measurement, fz.legrand_power_alarm, fzLegrand.cluster_fc01],
        toZigbee: [tzLegrand.led_mode, tz.electrical_measurement_power, tz.legrand_power_alarm, tzLegrand.identify],
        exposes: [
            e.power().withAccess(ea.STATE_GET),
            e.power_phase_b().withAccess(ea.STATE_GET),
            e.power_phase_c().withAccess(ea.STATE_GET),
            e.power_apparent(),
            e.power_apparent_phase_b().withAccess(ea.STATE_GET),
            e.power_apparent_phase_c().withAccess(ea.STATE_GET),
            e.binary("power_alarm_active", ea.STATE, true, false),
            e.binary("power_alarm", ea.ALL, true, false).withDescription("Enable/disable the power alarm"),
        ],
        onEvent: async (event) => {
            /**
             * The DIN power consumption module loses the configure reporting
             * after device restart/powerloss.
             *
             * We reconfigure the reporting at deviceAnnounce.
             */
            if (event.type === "deviceAnnounce") {
                for (const endpoint of event.data.device.endpoints) {
                    for (const c of endpoint.configuredReportings) {
                        await endpoint.configureReporting(c.cluster.name, [
                            {
                                // @ts-expect-error dynamic, expected correct since already applied
                                attribute: c.attribute.name,
                                minimumReportInterval: c.minimumReportInterval,
                                maximumReportInterval: c.maximumReportInterval,
                                reportableChange: c.reportableChange,
                            },
                        ]);
                    }
                }
            }
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "genIdentify"]);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            // Read configuration values that are not sent periodically as well as current power (activePower).
            await endpoint.read("haElectricalMeasurement", ["activePower"]);
            try {
                await reporting.apparentPower(endpoint);
                await endpoint.read("haElectricalMeasurement", ["apparentPowerPhB"]);
                await endpoint.read("haElectricalMeasurement", ["apparentPowerPhC"]);
                await endpoint.read("haElectricalMeasurement", ["activePowerPhB"]);
                await endpoint.read("haElectricalMeasurement", ["activePowerPhC"]);
            } catch {
                // Some version/firmware don't seem to support this.
            }
            // Read configuration values that are not sent periodically.
            await endpoint.read("haElectricalMeasurement", [0xf000, 0xf001, 0xf002]);
        },
    },
    {
        zigbeeModel: [" DIN power consumption module\u0000\u0000", " DIN power consumption module", "Smart shedder module"],
        model: "412015",
        vendor: "Legrand",
        description: "DIN power consumption module",
        whiteLabel: [
            {vendor: "Legrand", description: "DIN power consumption module", model: "412172", fingerprint: [{modelID: " Smart shedder module"}]},
            {vendor: "BTicino", description: "DIN power consumption module", model: "FC80GCS", fingerprint: [{modelID: " Smart shedder module"}]},
        ],
        ota: true,
        fromZigbee: [fz.identify, fz.metering, fz.electrical_measurement, fz.legrand_power_alarm, fzLegrand.cluster_fc01],
        toZigbee: [tzLegrand.led_mode, tzLegrand.identify, tz.electrical_measurement_power, tz.legrand_power_alarm],
        exposes: [
            e.power().withAccess(ea.STATE_GET),
            e.power_apparent(),
            e.binary("power_alarm_active", ea.STATE, true, false),
            e.binary("power_alarm", ea.ALL, true, false).withDescription("Enable/disable the power alarm"),
        ],
        onEvent: async (event) => {
            /**
             * The DIN power consumption module loses the configure reporting
             * after device restart/powerloss.
             *
             * We reconfigure the reporting at deviceAnnounce.
             */
            if (event.type === "deviceAnnounce") {
                for (const endpoint of event.data.device.endpoints) {
                    for (const c of endpoint.configuredReportings) {
                        await endpoint.configureReporting(c.cluster.name, [
                            {
                                // @ts-expect-error dynamic, expected correct since already applied
                                attribute: c.attribute.name,
                                minimumReportInterval: c.minimumReportInterval,
                                maximumReportInterval: c.maximumReportInterval,
                                reportableChange: c.reportableChange,
                            },
                        ]);
                    }
                }
            }
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "genIdentify"]);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await endpoint.read("haElectricalMeasurement", ["activePower"]);
            try {
                await reporting.apparentPower(endpoint);
                await endpoint.read("haElectricalMeasurement", ["apparentPower"]);
            } catch {
                // Some version/firmware don't seem to support this.
            }
            // Read configuration values that are not sent periodically.
            await endpoint.read("haElectricalMeasurement", [0xf000, 0xf001, 0xf002]);
        },
    },
    {
        zigbeeModel: ["Remote switch Wake up / Sleep"],
        model: "752189",
        vendor: "Legrand",
        description: "Night/day wireless switch",
        ota: true,
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        fromZigbee: [fz.legrand_scenes, fz.battery, fz.legrand_master_switch_center],
        toZigbee: [],
        exposes: [e.battery(), e.action(["enter", "leave", "sleep", "wakeup", "center"])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genPowerCfg"]);
        },
    },
    {
        fingerprint: [{modelID: "GreenPower_254", ieeeAddr: /^0x00000000005.....$/}],
        model: "ZLGP14/ZLGP15/ZLGP16",
        vendor: "Legrand",
        description: "Wireless and batteryless scenario switch (home arrival/departure, 1-4 switches, daytime day/night)",
        ota: true,
        fromZigbee: [fz.legrand_greenpower],
        toZigbee: [],
        exposes: [
            e.action([
                "home_arrival",
                "home_departure", // ZLGP14
                "press_1",
                "press_2",
                "press_3",
                "press_4", // ZLGP15
                "daytime_day",
                "daytime_night", // ZLGP16
            ]),
        ],
    },
    {
        fingerprint: [{modelID: "GreenPower_2", ieeeAddr: /^0x00000000005.....$/}],
        model: "ZLGP17/ZLGP18",
        vendor: "Legrand",
        description: "Wireless and batteryless (double) lighting control",
        ota: true,
        fromZigbee: [fz.legrand_greenpower],
        toZigbee: [],
        exposes: [e.action(["press_once", "press_twice"])],
    },
    {
        fingerprint: [{modelID: "GreenPower_3", ieeeAddr: /^0x00000000005.....$/}],
        model: "600087L",
        vendor: "Legrand",
        description: "Wireless and batteryless blind control switch",
        ota: true,
        fromZigbee: [fz.legrand_greenpower],
        toZigbee: [],
        exposes: [e.action(["stop", "up", "down"])],
    },
    {
        zigbeeModel: [" Cable outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"],
        model: "064882",
        vendor: "Legrand",
        description: "Cable outlet with pilot wire and consumption measurement",
        ota: true,
        fromZigbee: [fzLegrand.cluster_fc01, fz.legrand_pilot_wire_mode, fz.on_off, fz.electrical_measurement, fz.power_on_behavior],
        toZigbee: [tz.legrand_device_mode, tz.legrand_pilot_wire_mode, tz.on_off, tz.electrical_measurement_power, tz.power_on_behavior],
        exposes: [
            e.binary("device_mode", ea.ALL, "pilot_on", "pilot_off"),
            e.pilot_wire_mode(),
            e.switch().withState("state", true, "Works only when the pilot wire is deactivated"),
            e.power().withAccess(ea.STATE_GET),
            e.power_apparent(),
            e
                .power_on_behavior()
                .withDescription("Controls the behavior when the device is powered on. Works only when the pilot wire is deactivated"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "manuSpecificLegrandDevices2"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.apparentPower(endpoint);
        },
    },
    {
        zigbeeModel: [" NLIS - Double light switch\u0000\u0000\u0000\u0000"],
        model: "067772",
        vendor: "Legrand",
        description: "Double wired switch with neutral",
        ota: true,
        fromZigbee: [fz.identify, fz.legrand_binary_input_on_off, fzLegrand.cluster_fc01],
        toZigbee: [tzLegrand.identify, tzLegrand.led_mode],
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("right"), eLegrand.ledInDark(), eLegrand.ledIfOn()],
        extend: [m.deviceEndpoints({endpoints: {left: 2, right: 1}}), m.light({configureReporting: true, endpointNames: ["left", "right"]})],
    },
    {
        zigbeeModel: [" Mobile outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"],
        model: "WNRR15/WNRR20",
        vendor: "Legrand",
        description: "Outlet with power consumption monitoring",
        ota: true,
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fzLegrand.cluster_fc01],
        toZigbee: [tz.on_off, tzLegrand.led_mode, tzLegrand.identify],
        exposes: [e.switch(), e.action(["identify"]), e.power()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ["Hospitality on off switch"],
        model: "WNAL10/WNRL10",
        vendor: "Legrand",
        description: "Smart switch with Netatmo",
        ota: true,
        fromZigbee: [fz.on_off, fz.legrand_binary_input_on_off, fzLegrand.cluster_fc01],
        toZigbee: [tz.on_off, tzLegrand.led_mode],
        exposes: [e.switch(), eLegrand.ledInDark(), eLegrand.ledIfOn()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["Hospitality dimmer switch"],
        model: "WNAL50/WNRL50",
        vendor: "Legrand",
        description: "Smart dimmer switch with Netatmo",
        ota: true,
        fromZigbee: [fz.identify, fz.lighting_ballast_configuration, fzLegrand.cluster_fc01],
        toZigbee: [tzLegrand.led_mode, tz.legrand_device_mode, tzLegrand.identify, tz.ballast_config],
        exposes: [
            e.numeric("ballast_minimum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the minimum brightness value"),
            e.numeric("ballast_maximum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the maximum brightness value"),
            e.binary("device_mode", ea.ALL, "dimmer_on", "dimmer_off").withDescription("Allow the device to change brightness"),
            eLegrand.ledInDark(),
            eLegrand.ledIfOn(),
        ],
        extend: [m.light({configureReporting: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genBinaryInput", "lightingBallastCfg"]);
        },
    },
    {
        // LED blinks RED when battery is low
        zigbeeModel: ["Remote dimmer switch"],
        model: "WNAL63",
        vendor: "Legrand",
        description: "Remote dimmer switch",
        ota: true,
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}, publishDuplicateTransaction: true},
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_toggle, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["identify", "on", "off", "toggle", "brightness_move_up", "brightness_move_down", "brightness_stop"])],
        onEvent: readInitialBatteryState,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genOnOff", "genLevelCtrl"]);
        },
    },
    {
        zigbeeModel: [" Centralized ventilation SW", " Centralized ventilation SW\u0000\u0000\u0000\u0000"],
        model: "067766",
        vendor: "Legrand",
        description: "Centralized ventilation switch",
        ota: true,
        fromZigbee: [fz.identify, fz.on_off, fz.power_on_behavior, fzLegrand.cluster_fc01],
        toZigbee: [tz.on_off, tzLegrand.led_mode, tzLegrand.identify, tz.power_on_behavior],
        exposes: [e.switch(), e.action(["identify"]), eLegrand.ledInDark(), eLegrand.ledIfOn(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genIdentify", "genOnOff"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [
            {
                modelID: " Dimmer switch with neutral\u0000\u0000\u0000\u0000",
                manufacturerName:
                    " Legrand\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            },
        ],
        model: "067797",
        vendor: "Legrand",
        description: "Dimmer switch with neutral",
        ota: true,
        fromZigbee: [fz.identify, fz.lighting_ballast_configuration, fzLegrand.cluster_fc01],
        toZigbee: [tz.on_off, tzLegrand.led_mode, tz.legrand_device_mode, tzLegrand.identify, tz.ballast_config],
        exposes: [
            e.numeric("ballast_minimum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the minimum brightness value"),
            e.numeric("ballast_maximum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the maximum brightness value"),
            e.binary("device_mode", ea.ALL, "dimmer_on", "dimmer_off").withDescription("Allow the device to change brightness"),
            eLegrand.identify(),
            eLegrand.ledInDark(),
            eLegrand.ledIfOn(),
        ],
        extend: [m.light({configureReporting: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBinaryInput", "genOnOff", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["NLIS - Triple light switch"],
        model: "281506",
        vendor: "Legrand",
        description: "Triple light switch",
        extend: [m.deviceEndpoints({endpoints: {right: 1, center: 2, left: 3}}), m.onOff({endpointNames: ["right", "center", "left"]})],
    },
    {
        zigbeeModel: [" Wireless Color Dimmer\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000"],
        model: "067767",
        vendor: " Legrand",
        description: "Wireless Color Ambiance Switch 067767/68/69 - 077710L",
        ota: true,
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        fromZigbee: [fz.battery, fz.legrand_scenes],
        extend: [m.battery(), m.commandsOnOff(), m.commandsLevelCtrl()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff", "genLevelCtrl", "genScenes"]);
        },
    },
];
