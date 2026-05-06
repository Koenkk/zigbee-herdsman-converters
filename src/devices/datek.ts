import {Zcl} from "zigbee-herdsman";
import type {ConfigureReportingItem} from "zigbee-herdsman/dist/controller/model/endpoint";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import {repInterval} from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface DatekGenBasic {
    attributes: {
        lockFw: string;
    };
    commands: never;
    commandResponses: never;
}
interface DatekClosuresDoorLock {
    attributes: {
        masterPinMode: boolean;
        rfidEnable: boolean;
        hingeMode: boolean;
        serviceMode: number;
        lockMode: number;
        relockEnabled: boolean;
    };
    commands: never;
    commandResponses: never;
}

const datekExtend = {
    datekGenBasicCluster: () =>
        m.deviceAddCustomCluster("genBasic", {
            name: "genBasic",
            ID: Zcl.Clusters.genBasic.ID,
            attributes: {
                lockFw: {name: "lockFw", ID: 0x5000, type: Zcl.DataType.CHAR_STR},
            },
            commands: {},
            commandsResponse: {},
        }),
    datekClosuresDoorLockCluster: () =>
        m.deviceAddCustomCluster("closuresDoorLock", {
            name: "closuresDoorLock",
            ID: Zcl.Clusters.closuresDoorLock.ID,
            attributes: {
                masterPinMode: {name: "masterPinMode", ID: 0x4000, type: Zcl.DataType.BOOLEAN, write: true},
                rfidEnable: {name: "rfidEnable", ID: 0x4001, type: Zcl.DataType.BOOLEAN, write: true},
                hingeMode: {name: "hingeMode", ID: 0x4002, type: Zcl.DataType.BOOLEAN, write: true}, //False: Right hinged door, True: Left hinged door
                serviceMode: {name: "serviceMode", ID: 0x4003, type: Zcl.DataType.UINT8, write: true},
                lockMode: {name: "lockMode", ID: 0x4004, type: Zcl.DataType.UINT8, write: true},
                relockEnabled: {name: "relockEnabled", ID: 0x4005, type: Zcl.DataType.BOOLEAN, write: true},
                audioVolume: {name: "audioVolume", ID: 0x4006, type: Zcl.DataType.UINT8, write: true, min: 0x00, max: 0x05},
            },
            commands: {},
            commandsResponse: {},
        }),
};

const tzLocal = {
    idlock_master_pin_mode: {
        key: ["master_pin_mode"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write<"closuresDoorLock", DatekClosuresDoorLock>(
                "closuresDoorLock",
                {16384: {value: value === true ? 1 : 0, type: 0x10}},
                {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
            );
            return {state: {master_pin_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"closuresDoorLock", DatekClosuresDoorLock>("closuresDoorLock", ["masterPinMode"], {
                manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS,
            });
        },
    } satisfies Tz.Converter,
    idlock_rfid_enable: {
        key: ["rfid_enable"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write<"closuresDoorLock", DatekClosuresDoorLock>(
                "closuresDoorLock",
                {16385: {value: value === true ? 1 : 0, type: 0x10}},
                {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
            );
            return {state: {rfid_enable: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"closuresDoorLock", DatekClosuresDoorLock>("closuresDoorLock", ["rfidEnable"], {
                manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS,
            });
        },
    } satisfies Tz.Converter,
    idlock_service_mode: {
        key: ["service_mode"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {deactivated: 0, random_pin_1x_use: 5, random_pin_24_hours: 6};
            await entity.write<"closuresDoorLock", DatekClosuresDoorLock>(
                "closuresDoorLock",
                {16387: {value: utils.getFromLookup(value, lookup), type: 0x20}},
                {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
            );
            return {state: {service_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"closuresDoorLock", DatekClosuresDoorLock>("closuresDoorLock", ["serviceMode"], {
                manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS,
            });
        },
    } satisfies Tz.Converter,
    idlock_lock_mode: {
        key: ["lock_mode"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {auto_off_away_off: 0, auto_on_away_off: 1, auto_off_away_on: 2, auto_on_away_on: 3};
            await entity.write<"closuresDoorLock", DatekClosuresDoorLock>(
                "closuresDoorLock",
                {16388: {value: utils.getFromLookup(value, lookup), type: 0x20}},
                {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
            );
            return {state: {lock_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"closuresDoorLock", DatekClosuresDoorLock>("closuresDoorLock", ["lockMode"], {
                manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS,
            });
        },
    } satisfies Tz.Converter,
    idlock_relock_enabled: {
        key: ["relock_enabled"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write<"closuresDoorLock", DatekClosuresDoorLock>(
                "closuresDoorLock",
                {16389: {value: value === true ? 1 : 0, type: 0x10}},
                {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
            );
            return {state: {relock_enabled: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"closuresDoorLock", DatekClosuresDoorLock>("closuresDoorLock", ["relockEnabled"], {
                manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS,
            });
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    idlock: {
        cluster: "closuresDoorLock",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if ("masterPinMode" in msg.data) {
                result.master_pin_mode = msg.data.masterPinMode === true;
            }
            if ("rfidEnable" in msg.data) {
                result.rfid_enable = msg.data.rfidEnable === true;
            }
            if ("serviceMode" in msg.data) {
                const lookup: Record<number, string> = {
                    0: "deactivated",
                    1: "random_pin_1x_use",
                    5: "random_pin_1x_use",
                    6: "random_pin_24_hours",
                    9: "random_pin_24_hours",
                };
                // From Datek manual:  0: Deactivated, 1: 1x use, 2: 2x uses,  3: 5x uses,  4: 10x uses, 5: Random PIN 1x use, 6: Random PIN 24 hours,  7: Always valid, 8: 12 hours,  9: 24 hours
                result.service_mode = lookup[msg.data.serviceMode];
            }
            if ("lockMode" in msg.data) {
                const lookup: Record<number, string> = {0: "auto_off_away_off", 1: "auto_on_away_off", 2: "auto_off_away_on", 3: "auto_on_away_on"};
                result.lock_mode = lookup[msg.data.lockMode];
            }
            if ("relockEnabled" in msg.data) {
                result.relock_enabled = msg.data.relockEnabled === true;
            }
            return result;
        },
    } satisfies Fz.Converter<"closuresDoorLock", DatekClosuresDoorLock, ["attributeReport", "readResponse"]>,
    idlock_fw: {
        cluster: "genBasic",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if ("lockFw" in msg.data) {
                result.idlock_lock_fw = msg.data.lockFw;
            }
            return result;
        },
    } satisfies Fz.Converter<"genBasic", DatekGenBasic, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PoP"],
        model: "HLU2909K",
        vendor: "Datek",
        description: "APEX smart plug 16A",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.temperature],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "msTemperatureMeasurement"]);
            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acCurrentMultiplier", "acCurrentDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.power(), e.current(), e.voltage(), e.switch(), e.temperature(), e.power_on_behavior()],
    },
    {
        zigbeeModel: ["Meter Reader"],
        model: "HSE2905E",
        vendor: "Datek",
        description: "Datek Eva AMS HAN power-meter sensor",
        fromZigbee: [fz.hw_version],
        extend: [
            m.electricityMeter({
                cluster: "metering",
                fzMetering: fz.metering_datek,
                producedEnergy: true,
            }),
            m.electricityMeter({
                cluster: "electrical",
                threePhase: true,
                power: false,
            }),
            m.temperature(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            try {
                // hwVersion < 2 do not support hwVersion attribute, so we are testing if this is hwVersion 1 or 2
                await endpoint.read("genBasic", ["hwVersion"]);
            } catch {
                /* empty */
            }
        },
    },
    {
        zigbeeModel: ["Motion Sensor"],
        model: "HSE2927E",
        vendor: "Datek",
        description: "Eva motion sensor",
        fromZigbee: [
            fz.battery,
            fz.occupancy,
            fz.occupancy_timeout,
            fz.temperature,
            fz.ias_enroll,
            fz.ias_occupancy_alarm_1,
            fz.ias_occupancy_alarm_1_report,
            fz.led_on_motion,
        ],
        toZigbee: [tz.occupancy_timeout, tz.led_on_motion],
        configure: async (device, coordinatorEndpoint) => {
            const options = {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS};
            const endpoint = device.getEndpoint(1);
            const binds = ["msTemperatureMeasurement", "msOccupancySensing", "ssIasZone"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.occupancy(endpoint);
            await reporting.temperature(endpoint);
            const payload = [
                {
                    attribute: {ID: 0x4000, type: 0x10},
                },
            ];
            // @ts-expect-error ignore
            await endpoint.configureReporting("ssIasZone", payload, options);
            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);
            await endpoint.read("msOccupancySensing", ["pirOToUDelay"]);
            await endpoint.read("ssIasZone", [0x4000], options);
        },
        exposes: [
            e.temperature(),
            e.occupancy(),
            e.battery_low(),
            e.binary("led_on_motion", ea.ALL, true, false).withDescription("Enable/disable LED on motion"),
            e.numeric("occupancy_timeout", ea.ALL).withUnit("s").withValueMin(0).withValueMax(65535),
        ],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["ID Lock 150", "ID Lock 202"],
        model: "0402946",
        vendor: "Datek",
        description: "Zigbee module for ID lock",
        extend: [datekExtend.datekClosuresDoorLockCluster(), datekExtend.datekGenBasicCluster()],
        fromZigbee: [
            fz.lock,
            fz.battery,
            fz.lock_operation_event,
            fz.lock_programming_event,
            fzLocal.idlock,
            fzLocal.idlock_fw,
            fz.lock_pin_code_response,
            fz.lock_programming_event_read_pincode,
        ],
        toZigbee: [
            tz.lock,
            tz.lock_sound_volume,
            tzLocal.idlock_master_pin_mode,
            tzLocal.idlock_rfid_enable,
            tzLocal.idlock_service_mode,
            tzLocal.idlock_lock_mode,
            tzLocal.idlock_relock_enabled,
            tz.pincode_lock,
        ],
        meta: {pinCodeCount: 109},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS};
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresDoorLock", "genPowerCfg"]);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            const payload: ConfigureReportingItem<"closuresDoorLock", DatekClosuresDoorLock>[] = [
                {
                    attribute: "masterPinMode",
                    minimumReportInterval: 0,
                    maximumReportInterval: repInterval.HOUR,
                    reportableChange: 1,
                },
                {
                    attribute: "rfidEnable",
                    minimumReportInterval: 0,
                    maximumReportInterval: repInterval.HOUR,
                    reportableChange: 1,
                },
                {
                    attribute: "serviceMode",
                    minimumReportInterval: 0,
                    maximumReportInterval: repInterval.HOUR,
                    reportableChange: 1,
                },
                {
                    attribute: "lockMode",
                    minimumReportInterval: 0,
                    maximumReportInterval: repInterval.HOUR,
                    reportableChange: 1,
                },
                {
                    attribute: "relockEnabled",
                    minimumReportInterval: 0,
                    maximumReportInterval: repInterval.HOUR,
                    reportableChange: 1,
                },
            ];
            await endpoint.configureReporting<"closuresDoorLock", DatekClosuresDoorLock>("closuresDoorLock", payload, options);
            await endpoint.read("closuresDoorLock", ["lockState", "soundVolume", "doorState"]);
            await endpoint.read<"closuresDoorLock", DatekClosuresDoorLock>(
                "closuresDoorLock",
                ["masterPinMode", "rfidEnable", "serviceMode", "lockMode", "relockEnabled"],
                options,
            );
            await endpoint.read<"genBasic", DatekGenBasic>("genBasic", ["lockFw"], options);
        },
        exposes: [
            e.lock(),
            e.battery(),
            e.pincode(),
            e.door_state(),
            e.lock_action(),
            e.lock_action_source_name(),
            e.lock_action_user(),
            e.enum("sound_volume", ea.ALL, constants.lockSoundVolume).withDescription("Sound volume of the lock"),
            e.binary("master_pin_mode", ea.ALL, true, false).withDescription("Allow Master PIN Unlock"),
            e.binary("rfid_enable", ea.ALL, true, false).withDescription("Allow RFID to Unlock"),
            e.binary("relock_enabled", ea.ALL, true, false).withDescription("Allow Auto Re-Lock"),
            e
                .enum("lock_mode", ea.ALL, ["auto_off_away_off", "auto_on_away_off", "auto_off_away_on", "auto_on_away_on"])
                .withDescription("Lock-Mode of the Lock"),
            e.enum("service_mode", ea.ALL, ["deactivated", "random_pin_1x_use", "random_pin_24_hours"]).withDescription("Service Mode of the Lock"),
        ],
    },
    {
        zigbeeModel: ["Water Sensor"],
        model: "HSE2919E",
        vendor: "Datek",
        description: "Eva water leak sensor",
        fromZigbee: [fz.temperature, fz.battery, fz.ias_enroll, fz.ias_water_leak_alarm_1, fz.ias_water_leak_alarm_1_report],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genBasic", "ssIasZone"]);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);

            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msTemperatureMeasurement"]);
        },
        endpoint: (device) => {
            return {default: 1};
        },
        exposes: [e.battery(), e.battery_low(), e.temperature(), e.water_leak(), e.tamper()],
    },
    {
        zigbeeModel: ["Scene Selector", "SSDS"],
        model: "HBR2917E",
        vendor: "Datek",
        description: "Eva scene selector",
        fromZigbee: [fz.temperature, fz.battery, fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [tz.on_off],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genBasic", "genOnOff", "genLevelCtrl", "msTemperatureMeasurement"]);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTES_10, max: constants.repInterval.HOUR, change: 100});
        },
        exposes: [
            e.battery(),
            e.temperature(),
            e.action(["recall_1", "recall_2", "recall_3", "recall_4", "on", "off", "brightness_move_down", "brightness_move_up", "brightness_stop"]),
        ],
    },
    {
        zigbeeModel: ["Door/Window Sensor"],
        model: "HSE2920E",
        vendor: "Datek",
        description: "Door/window sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report, fz.temperature, fz.ias_enroll],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["ssIasZone", "msTemperatureMeasurement"]);
            await reporting.temperature(endpoint);
            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
    },
    {
        zigbeeModel: ["Contact Switch"],
        model: "HSE2936T",
        vendor: "Datek",
        description: "Door/window sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report, fz.temperature, fz.ias_enroll],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["ssIasZone", "msTemperatureMeasurement"]);
            await reporting.temperature(endpoint);
            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
    },
];
