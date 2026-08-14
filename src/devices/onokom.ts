import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const manufacturerCode = 0x4703;

interface OnokomHvacThermostat {
    attributes: {
        horizontalVanes: number;
        verticalVanes: number;
        vanesSwing: number;
        mode: number;
        statusLed: number;
        ionization: boolean;
        selfCleaning: boolean;
        moldProtection: boolean;
        heating8Deg: boolean;
        gentleWind: boolean;
        ecoMode: boolean;
        sleepMode: boolean;
        beeper: boolean;
        screenLight: boolean;
        disableScreenWhenPowerOff: boolean;
        screenLowBright: boolean;
        acConnected: number;
        smartEye: number;
        smartSleepMode: number;
        indoorHeatExchangerTemperature: number;
        outdoorHeatExchangerTemperature: number;
    };
    commands: never;
    commandResponses: never;
}

interface OnokomHvacFanCtrl {
    attributes: {
        fanSpeed: number;
        smartFanSpeed: number;
        quietMode: boolean;
        turboMode: boolean;
        compressorPowerLimit: number;
        currentCompressorPower: number;
        targetCompressorPower: number;
        targetFanRpm: number;
        currentFanRpm: number;
    };
    commands: never;
    commandResponses: never;
}

const onokomExtend = {
    onokomHvacThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            name: "hvacThermostat",
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                horizontalVanes: {name: "horizontalVanes", ID: 0x4700, type: Zcl.DataType.ENUM8, write: true},
                verticalVanes: {name: "verticalVanes", ID: 0x4701, type: Zcl.DataType.ENUM8, write: true},
                vanesSwing: {name: "vanesSwing", ID: 0x4702, type: Zcl.DataType.ENUM8, write: true},
                mode: {name: "mode", ID: 0x4703, type: Zcl.DataType.ENUM8, write: true},
                statusLed: {name: "statusLed", ID: 0x4704, type: Zcl.DataType.ENUM8, write: true},
                ionization: {name: "ionization", ID: 0x4720, type: Zcl.DataType.BOOLEAN, write: true},
                selfCleaning: {name: "selfCleaning", ID: 0x4721, type: Zcl.DataType.BOOLEAN, write: true},
                moldProtection: {name: "moldProtection", ID: 0x4722, type: Zcl.DataType.BOOLEAN, write: true},
                heating8Deg: {name: "heating8Deg", ID: 0x4724, type: Zcl.DataType.BOOLEAN, write: true},
                gentleWind: {name: "gentleWind", ID: 0x4725, type: Zcl.DataType.BOOLEAN, write: true},
                ecoMode: {name: "ecoMode", ID: 0x4727, type: Zcl.DataType.BOOLEAN, write: true},
                sleepMode: {name: "sleepMode", ID: 0x4728, type: Zcl.DataType.BOOLEAN, write: true},
                beeper: {name: "beeper", ID: 0x4730, type: Zcl.DataType.BOOLEAN, write: true},
                screenLight: {name: "screenLight", ID: 0x4731, type: Zcl.DataType.BOOLEAN, write: true},
                disableScreenWhenPowerOff: {name: "disableScreenWhenPowerOff", ID: 0x4732, type: Zcl.DataType.BOOLEAN, write: true},
                screenLowBright: {name: "screenLowBright", ID: 0x4733, type: Zcl.DataType.BOOLEAN, write: true},
                acConnected: {name: "acConnected", ID: 0x4734, type: Zcl.DataType.ENUM8},
                smartEye: {name: "smartEye", ID: 0x4735, type: Zcl.DataType.ENUM8, write: true},
                smartSleepMode: {name: "smartSleepMode", ID: 0x4736, type: Zcl.DataType.ENUM8, write: true},
                indoorHeatExchangerTemperature: {name: "indoorHeatExchangerTemperature", ID: 0x4740, type: Zcl.DataType.UINT16},
                outdoorHeatExchangerTemperature: {name: "outdoorHeatExchangerTemperature", ID: 0x4741, type: Zcl.DataType.UINT16},
            },
            commands: {},
            commandsResponse: {},
        }),
    onokomHvacFanCtrlCluster: () =>
        m.deviceAddCustomCluster("hvacFanCtrl", {
            name: "hvacFanCtrl",
            ID: Zcl.Clusters.hvacFanCtrl.ID,
            attributes: {
                fanSpeed: {name: "fanSpeed", ID: 0x4700, type: Zcl.DataType.ENUM8, write: true},
                smartFanSpeed: {name: "smartFanSpeed", ID: 0x4701, type: Zcl.DataType.ENUM8, write: true},
                quietMode: {name: "quietMode", ID: 0x4710, type: Zcl.DataType.BOOLEAN, write: true},
                turboMode: {name: "turboMode", ID: 0x4711, type: Zcl.DataType.BOOLEAN, write: true},
                compressorPowerLimit: {name: "compressorPowerLimit", ID: 0x4720, type: Zcl.DataType.UINT8, write: true},
                currentCompressorPower: {name: "currentCompressorPower", ID: 0x4721, type: Zcl.DataType.UINT8},
                targetCompressorPower: {name: "targetCompressorPower", ID: 0x4722, type: Zcl.DataType.UINT8},
                targetFanRpm: {name: "targetFanRpm", ID: 0x4723, type: Zcl.DataType.UINT8, write: true},
                currentFanRpm: {name: "currentFanRpm", ID: 0x4724, type: Zcl.DataType.UINT8},
            },
            commands: {},
            commandsResponse: {},
        }),
    acConnected: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", OnokomHvacThermostat>({
            name: "ac_connected",
            cluster: "hvacThermostat",
            attribute: "acConnected",
            lookup: {
                disconnected: 0,
                invalid_data_recieved: 1,
                connected_with_issues: 2,
                connected: 3,
            },
            description: "AC connected",
            access: "STATE",
            ...args,
        }),
    currentTemperature: (args?: Partial<m.NumericArgs<"hvacThermostat", undefined>>) =>
        m.numeric({
            name: "current_temperature",
            cluster: "hvacThermostat",
            attribute: "localTemp",
            scale: 100,
            unit: "°C",
            description: "Indoor air temperature",
            access: "STATE",
            ...args,
        }),
    targetTemperature: (args?: Partial<m.NumericArgs<"hvacThermostat", undefined>>) =>
        m.numeric({
            name: "target_temperature",
            cluster: "hvacThermostat",
            attribute: "occupiedCoolingSetpoint",
            valueMin: 16,
            valueMax: 32,
            valueStep: 0.5,
            scale: 100,
            unit: "°C",
            description: "Target temperature",
            ...args,
        }),
    systemMode: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", undefined>>) =>
        m.enumLookup({
            name: "system_mode",
            cluster: "hvacThermostat",
            attribute: "systemMode",
            lookup: {
                off: 0,
                auto: 1,
                cool: 3,
                heat: 4,
                fan_only: 7,
                dry: 8,
            },
            description: "Active mode",
            ...args,
        }),
    mode: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", OnokomHvacThermostat>({
            name: "mode",
            cluster: "hvacThermostat",
            attribute: "mode",
            lookup: {
                heat: 1,
                cool: 2,
                auto: 3,
                dry: 4,
                fan_only: 5,
            },
            description: "Mode",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    outdoorAirTemperature: (args?: Partial<m.NumericArgs<"hvacThermostat", undefined>>) =>
        m.numeric({
            name: "outdoor_air_temperature",
            cluster: "hvacThermostat",
            attribute: "outdoorTemp",
            scale: 100,
            unit: "°C",
            description: "Outdoor air temperature",
            access: "STATE",
            ...args,
        }),
    zbFanSpeed: (args?: Partial<m.NumericArgs<"hvacFanCtrl", undefined>>) =>
        m.numeric({
            name: "zb_fan_speed",
            cluster: "hvacFanCtrl",
            attribute: "fanMode",
            valueMin: 1,
            valueMax: 5,
            valueStep: 1,
            description: "Fan speed modes: Auto(5), Low(1), Medium(2), Maximum(3)",
            ...args,
        }),
    verticalVanes: (args?: Partial<m.NumericArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.numeric<"hvacThermostat", OnokomHvacThermostat>({
            name: "vertical_vanes",
            cluster: "hvacThermostat",
            attribute: "verticalVanes",
            valueMin: 0,
            valueMax: 1,
            valueStep: 1,
            description: "Vertical vanes: Stopped(0), Swing(1)",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    horizontalVanes: (args?: Partial<m.NumericArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.numeric<"hvacThermostat", OnokomHvacThermostat>({
            name: "horizontal_vanes",
            cluster: "hvacThermostat",
            attribute: "horizontalVanes",
            valueMin: 0,
            valueMax: 6,
            valueStep: 1,
            description: "Horizontal vanes: Stopped(0), Swing(1), Lowest postion(2), Highest position(6)",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    fanSpeed: (args?: Partial<m.NumericArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.numeric<"hvacFanCtrl", OnokomHvacFanCtrl>({
            name: "fan_speed",
            cluster: "hvacFanCtrl",
            attribute: "fanSpeed",
            valueMin: 0,
            valueMax: 3,
            valueStep: 1,
            description: "Fan speed: Auto(0), First(1) - Maximum(3)",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    smartFanSpeed: (args?: Partial<m.NumericArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.numeric({
            name: "smart_fan_speed",
            cluster: "hvacFanCtrl",
            attribute: {ID: 0x4701, type: Zcl.DataType.ENUM8},
            valueMin: 0,
            valueMax: 5,
            valueStep: 1,
            description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (4), Turbo(5)",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    vanesSwing: (args?: Partial<m.NumericArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.numeric<"hvacThermostat", OnokomHvacThermostat>({
            name: "vanes_swing",
            cluster: "hvacThermostat",
            attribute: "vanesSwing",
            valueMin: 0,
            valueMax: 3,
            valueStep: 1,
            description: "Vanes swing: Stopped(0), Horizontal and vertical swing(1), Horizontal swing(2), Vertical swing(3)",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    statusLed: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", OnokomHvacThermostat>({
            name: "status_led",
            cluster: "hvacThermostat",
            attribute: "statusLed",
            lookup: {
                normal_mode: 0,
                disabled_if_no_errors: 1,
                disabled_untill_reboot: 2,
                always_disabled: 3,
                green_untill_reboot: 8,
                red_untill_reboot: 9,
            },
            description: "Status LED",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    quietMode: (args?: Partial<m.BinaryArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.binary<"hvacFanCtrl", OnokomHvacFanCtrl>({
            name: "quiet_mode",
            cluster: "hvacFanCtrl",
            attribute: "quietMode",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Quiet mode",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    ecoMode: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "eco_mode",
            cluster: "hvacThermostat",
            attribute: "ecoMode",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Eco mode",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    turboMode: (args?: Partial<m.BinaryArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.binary<"hvacFanCtrl", OnokomHvacFanCtrl>({
            name: "turbo_mode",
            cluster: "hvacFanCtrl",
            attribute: "turboMode",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Turbo mode",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    sleepMode: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "sleep_mode",
            cluster: "hvacThermostat",
            attribute: "sleepMode",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Sleep mode",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    ionization: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "ionization",
            cluster: "hvacThermostat",
            attribute: "ionization",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Ionization",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    selfCleaning: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "self_cleaning",
            cluster: "hvacThermostat",
            attribute: "selfCleaning",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Self cleaning",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    moldProtection: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "mold_protection",
            cluster: "hvacThermostat",
            attribute: "moldProtection",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Mold protection",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    screenLight: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "screen_light",
            cluster: "hvacThermostat",
            attribute: "screenLight",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Screen light",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    currentFanRpm: (args?: Partial<m.NumericArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.numeric<"hvacFanCtrl", OnokomHvacFanCtrl>({
            name: "current_fan_rpm",
            cluster: "hvacFanCtrl",
            attribute: "currentFanRpm",
            access: "STATE",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            description: "Current fan speed",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    currentCompressorPower: (args?: Partial<m.NumericArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.numeric<"hvacFanCtrl", OnokomHvacFanCtrl>({
            name: "current_compressor_power",
            cluster: "hvacFanCtrl",
            attribute: "currentCompressorPower",
            access: "STATE",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            description: "Current compressor power",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    compressorPowerLimit: (args?: Partial<m.NumericArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.numeric<"hvacFanCtrl", OnokomHvacFanCtrl>({
            name: "compressor_power_limit",
            cluster: "hvacFanCtrl",
            attribute: "compressorPowerLimit",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            description: "Compressor power limit",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    screenLowBright: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "screen_low_bright",
            cluster: "hvacThermostat",
            attribute: "screenLowBright",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Screen low bright",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    targetFanRpm: (args?: Partial<m.NumericArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.numeric<"hvacFanCtrl", OnokomHvacFanCtrl>({
            name: "target_fan_rpm",
            cluster: "hvacFanCtrl",
            attribute: "targetFanRpm",
            valueMin: 0,
            valueMax: 200,
            valueStep: 1,
            description: "Target fan speed",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    indoorHeatExchangerTemperature: (args?: Partial<m.NumericArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.numeric<"hvacThermostat", OnokomHvacThermostat>({
            name: "indoor_heat_exchanger_temperature",
            cluster: "hvacThermostat",
            attribute: "indoorHeatExchangerTemperature",
            access: "STATE",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            unit: "°C",
            description: "Indoor heat exchanger temperature",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    beeper: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "beeper",
            cluster: "hvacThermostat",
            attribute: {ID: 0x4730, type: Zcl.DataType.BOOLEAN},
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Beeper",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    targetCompressorPower: (args?: Partial<m.NumericArgs<"hvacFanCtrl", OnokomHvacFanCtrl>>) =>
        m.numeric<"hvacFanCtrl", OnokomHvacFanCtrl>({
            name: "target_compressor_power",
            cluster: "hvacFanCtrl",
            attribute: "targetCompressorPower",
            access: "STATE",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            description: "Target compressor power",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    outdoorHeatExchangerTemperature: (args?: Partial<m.NumericArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.numeric<"hvacThermostat", OnokomHvacThermostat>({
            name: "outdoor_heat_exchanger_temperature",
            cluster: "hvacThermostat",
            attribute: "outdoorHeatExchangerTemperature",
            access: "STATE",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            unit: "°C",
            description: "Outdoor heat exchanger temperature",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    smartSleepMode: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", OnokomHvacThermostat>({
            name: "smart_sleep_mode",
            cluster: "hvacThermostat",
            attribute: "smartSleepMode",
            lookup: {
                disabled: 0,
                ordinary: 1,
                for_old: 2,
                for_young: 3,
                for_kids: 4,
            },
            description: "Smart sleep mode",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    smartEye: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", OnokomHvacThermostat>({
            name: "smart_eye",
            cluster: "hvacThermostat",
            attribute: {ID: 0x4735, type: Zcl.DataType.ENUM8},
            lookup: {
                disabled: 0,
                to_person: 1,
                from_person: 2,
            },
            description: "Smart eye",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    heating8Deg: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "heating_8_deg",
            cluster: "hvacThermostat",
            attribute: "heating8Deg",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Heating 8 deg",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
    gentleWind: (args?: Partial<m.BinaryArgs<"hvacThermostat", OnokomHvacThermostat>>) =>
        m.binary<"hvacThermostat", OnokomHvacThermostat>({
            name: "gentle_wind",
            cluster: "hvacThermostat",
            attribute: {ID: 0x4725, type: Zcl.DataType.BOOLEAN},
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            description: "Gentle wind",
            zigbeeCommandOptions: {manufacturerCode},
            ...args,
        }),
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["AUX-1-ZB-S"],
        model: "AUX-1-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for household and semi-industrial AUX systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature(),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes(),
            onokomExtend.horizontalVanes(),
            onokomExtend.fanSpeed(),
            onokomExtend.smartFanSpeed({
                valueMax: 5,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (4), Turbo(5)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.ionization(),
            onokomExtend.selfCleaning(),
            onokomExtend.moldProtection(),
            onokomExtend.screenLight(),
            onokomExtend.currentFanRpm(),
            onokomExtend.currentCompressorPower(),
            onokomExtend.compressorPowerLimit(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-AUX-1-ZB-S-A"],
        model: "OK-AC-H-AUX-1-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household and semi-industrial AUX systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature(),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes(),
            onokomExtend.horizontalVanes(),
            onokomExtend.fanSpeed(),
            onokomExtend.smartFanSpeed({
                valueMax: 5,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (4), Turbo(5)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.ionization(),
            onokomExtend.selfCleaning(),
            onokomExtend.moldProtection(),
            onokomExtend.screenLight(),
            onokomExtend.currentFanRpm(),
            onokomExtend.currentCompressorPower(),
            onokomExtend.compressorPowerLimit(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["DK-1-ZB-S"],
        model: "DK-1-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for household Daikin systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature(),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes(),
            onokomExtend.horizontalVanes({
                valueMax: 1,
                description: "Horizontal vanes: Stopped(0), Swing(1)",
            }),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.ionization(),
            onokomExtend.screenLight(),
            onokomExtend.screenLowBright(),
            onokomExtend.targetFanRpm({valueMax: 200}),
            onokomExtend.currentFanRpm({valueMax: 200}),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-DK-1-ZB-S-A"],
        model: "OK-AC-H-DK-1-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household Daikin systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature(),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes(),
            onokomExtend.horizontalVanes({
                valueMax: 1,
                description: "Horizontal vanes: Stopped(0), Swing(1)",
            }),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.ionization(),
            onokomExtend.screenLight(),
            onokomExtend.screenLowBright(),
            onokomExtend.targetFanRpm({valueMax: 200}),
            onokomExtend.currentFanRpm({valueMax: 200}),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-GR-1-ZB-S-A"],
        model: "OK-AC-H-GR-1-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household GREE systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 30, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 6,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(6)",
            }),
            onokomExtend.horizontalVanes(),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.ionization(),
            onokomExtend.screenLight(),
            m.binary<"hvacThermostat", OnokomHvacThermostat>({
                name: "disable_screen_when_power_off",
                cluster: "hvacThermostat",
                attribute: "disableScreenWhenPowerOff",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "Disable screen when power off",
                zigbeeCommandOptions: {manufacturerCode},
            }),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["GR-3-ZB-S"],
        model: "GR-3-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for control of semi-industrial and multi-split systems GREE",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 30, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 6,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(6)",
            }),
            onokomExtend.horizontalVanes(),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.ionization(),
            onokomExtend.selfCleaning(),
            onokomExtend.indoorHeatExchangerTemperature(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["HR-1-ZB-S"],
        model: "HR-1-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for household and semi-industrial Haier systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 30, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 6,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(6)",
            }),
            onokomExtend.horizontalVanes({
                valueMax: 8,
                description: "Horizontal vanes: Stopped(0), Swing(1), Lowest postion(2), Highest position(8)",
            }),
            onokomExtend.fanSpeed(),
            onokomExtend.smartFanSpeed({
                valueMax: 5,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (4), Turbo(5)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.ionization(),
            onokomExtend.selfCleaning(),
            onokomExtend.screenLight(),
            onokomExtend.beeper(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-HR-1-ZB-S-A"],
        model: "OK-AC-H-HR-1-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household and semi-industrial Haier systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 30, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 6,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(6)",
            }),
            onokomExtend.horizontalVanes({
                valueMax: 8,
                description: "Horizontal vanes: Stopped(0), Swing(1), Lowest postion(2), Highest position(8)",
            }),
            onokomExtend.fanSpeed(),
            onokomExtend.smartFanSpeed({
                valueMax: 5,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (4), Turbo(5)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.ionization(),
            onokomExtend.selfCleaning(),
            onokomExtend.screenLight(),
            onokomExtend.beeper(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["HS-3-ZB-S"],
        model: "HS-3-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for household Hisesnse systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 32, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 4,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(4)",
            }),
            onokomExtend.horizontalVanes({
                valueMax: 7,
                description: "Horizontal vanes: Stopped(0), Swing(1), Lowest postion(2), Highest position(7)",
            }),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.smartSleepMode(),
            onokomExtend.ionization(),
            onokomExtend.smartEye(),
            onokomExtend.screenLight(),
            onokomExtend.beeper(),
            onokomExtend.currentCompressorPower(),
            onokomExtend.targetCompressorPower(),
            onokomExtend.indoorHeatExchangerTemperature(),
            onokomExtend.outdoorHeatExchangerTemperature(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-HS-3-ZB-S-A"],
        model: "OK-AC-H-HS-3-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household Hisesnse systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 32, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 4,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(4)",
            }),
            onokomExtend.horizontalVanes({
                valueMax: 7,
                description: "Horizontal vanes: Stopped(0), Swing(1), Lowest postion(2), Highest position(7)",
            }),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.smartSleepMode(),
            onokomExtend.ionization(),
            onokomExtend.smartEye(),
            onokomExtend.screenLight(),
            onokomExtend.beeper(),
            onokomExtend.currentCompressorPower(),
            onokomExtend.targetCompressorPower(),
            onokomExtend.indoorHeatExchangerTemperature(),
            onokomExtend.outdoorHeatExchangerTemperature(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["HT-1-ZB-S"],
        model: "HT-1-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for household Hitachi systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 32, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.fanSpeed(),
            onokomExtend.smartFanSpeed({
                valueMax: 4,
                description: "Smart fan speed: Auto (0), Low (1) ... Maximum (3)",
            }),
            onokomExtend.statusLed(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-HT-1-ZB-S-A"],
        model: "OK-AC-H-HT-1-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household Hitachi systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 32, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.fanSpeed(),
            onokomExtend.smartFanSpeed({
                valueMax: 4,
                description: "Smart fan speed: Auto (0), Low (1) ... Maximum (3)",
            }),
            onokomExtend.statusLed(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["MD-1-ZB-S"],
        model: "MD-1-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for household MDV systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 30, valueStep: 0.5}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 7,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(7)",
            }),
            onokomExtend.horizontalVanes({
                valueMax: 7,
                description: "Horizontal vanes: Stopped(0), Swing(1), Lowest postion(2), Highest position(7)",
            }),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.selfCleaning(),
            onokomExtend.heating8Deg(),
            onokomExtend.gentleWind(),
            onokomExtend.targetFanRpm({valueMax: 100}),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-MD-1-ZB-S-A"],
        model: "OK-AC-H-MD-1-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household MDV systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 30, valueStep: 0.5}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 7,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(7)",
            }),
            onokomExtend.horizontalVanes({
                valueMax: 7,
                description: "Horizontal vanes: Stopped(0), Swing(1), Lowest postion(2), Highest position(7)",
            }),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.selfCleaning(),
            onokomExtend.heating8Deg(),
            onokomExtend.gentleWind(),
            onokomExtend.targetFanRpm({valueMax: 100}),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["MD-3-ZB-S"],
        model: "MD-3-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for semi-industrial MDV systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 30, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.horizontalVanes({
                valueMax: 1,
                description: "Horizontal vanes: Stopped(0), Swing(1)",
            }),
            onokomExtend.fanSpeed(),
            onokomExtend.smartFanSpeed({
                valueMax: 4,
                description: "Smart fan speed: Auto (0), Low (1) ... Maximum (3)",
            }),
            onokomExtend.vanesSwing({
                valueMax: 2,
                valueStep: 2,
                description: "Vanes swing: Stopped(0), Horizontal and vertical swing(1), Horizontal swing(2), Vertical swing(3)",
            }),
            onokomExtend.statusLed(),
            onokomExtend.ecoMode(),
            onokomExtend.indoorHeatExchangerTemperature(),
            onokomExtend.outdoorHeatExchangerTemperature(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-MD-3-ZB-S-A"],
        model: "OK-AC-H-MD-3-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for semi-industrial MDV systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 30, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.horizontalVanes({
                valueMax: 1,
                description: "Horizontal vanes: Stopped(0), Swing(1)",
            }),
            onokomExtend.fanSpeed(),
            onokomExtend.smartFanSpeed({
                valueMax: 4,
                description: "Smart fan speed: Auto (0), Low (1) ... Maximum (3)",
            }),
            onokomExtend.vanesSwing({
                valueMax: 2,
                valueStep: 2,
                description: "Vanes swing: Stopped(0), Horizontal and vertical swing(1), Horizontal swing(2), Vertical swing(3)",
            }),
            onokomExtend.statusLed(),
            onokomExtend.ecoMode(),
            onokomExtend.indoorHeatExchangerTemperature(),
            onokomExtend.outdoorHeatExchangerTemperature(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["ME-1-ZB-S"],
        model: "ME-1-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for household and semi-industrial Mitsubishi Electric systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 31, valueStep: 0.5}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 6,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(6)",
            }),
            onokomExtend.horizontalVanes(),
            onokomExtend.fanSpeed({
                valueMax: 4,
                description: "Fan speed: Auto(0), First(1) - Maximum(4)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 5,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (4)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-ME-1-ZB-S-A"],
        model: "OK-AC-H-ME-1-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household and semi-industrial Mitsubishi Electric systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 31, valueStep: 0.5}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 6,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(6)",
            }),
            onokomExtend.horizontalVanes(),
            onokomExtend.fanSpeed({
                valueMax: 4,
                description: "Fan speed: Auto(0), First(1) - Maximum(4)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 5,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (4)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["TCL-1-ZB-S"],
        model: "TCL-1-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for household TCL systems ",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 31, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 7,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(6)",
            }),
            onokomExtend.horizontalVanes(),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.ionization(),
            onokomExtend.selfCleaning(),
            onokomExtend.moldProtection(),
            onokomExtend.heating8Deg(),
            onokomExtend.gentleWind(),
            onokomExtend.screenLight(),
            onokomExtend.beeper(),
            onokomExtend.currentFanRpm({valueMax: 200}),
            onokomExtend.compressorPowerLimit(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-TCL-1-ZB-S-A"],
        model: "OK-AC-H-TCL-1-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for household TCL systems ",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 31, valueStep: 1}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.outdoorAirTemperature(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes({
                valueMax: 7,
                description: "Vertical vanes: Stopped(0), Swing(1), Leftmost position(2), Rightmost position(6)",
            }),
            onokomExtend.horizontalVanes(),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.ionization(),
            onokomExtend.selfCleaning(),
            onokomExtend.moldProtection(),
            onokomExtend.heating8Deg(),
            onokomExtend.gentleWind(),
            onokomExtend.screenLight(),
            onokomExtend.beeper(),
            onokomExtend.currentFanRpm({valueMax: 200}),
            onokomExtend.compressorPowerLimit(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["TCL-3-ZB-S"],
        model: "TCL-3-ZB-S",
        vendor: "ONOKOM",
        description: "Adapter for semi industrial TCL systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 31, valueStep: 0.5}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes(),
            onokomExtend.horizontalVanes({
                valueMax: 1,
                description: "Horizontal vanes: Stopped(0), Swing(1)",
            }),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.screenLight(),
            onokomExtend.indoorHeatExchangerTemperature(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["OK-AC-H-TCL-3-ZB-S-A"],
        model: "OK-AC-H-TCL-3-ZB-S-A",
        vendor: "ONOKOM",
        description: "Adapter for semi industrial TCL systems",
        ota: true,
        extend: [
            onokomExtend.onokomHvacThermostatCluster(),
            onokomExtend.onokomHvacFanCtrlCluster(),
            onokomExtend.acConnected(),
            m.onOff({
                powerOnBehavior: false,
                description: "On/off state",
            }),
            onokomExtend.currentTemperature(),
            onokomExtend.targetTemperature({valueMin: 16, valueMax: 31, valueStep: 0.5}),
            onokomExtend.systemMode(),
            onokomExtend.mode(),
            onokomExtend.zbFanSpeed(),
            onokomExtend.verticalVanes(),
            onokomExtend.horizontalVanes({
                valueMax: 1,
                description: "Horizontal vanes: Stopped(0), Swing(1)",
            }),
            onokomExtend.fanSpeed({
                valueMax: 5,
                description: "Fan speed: Auto(0), First(1) - Maximum(5)",
            }),
            onokomExtend.smartFanSpeed({
                valueMax: 7,
                description: "Smart fan speed: Auto (0), Quiet mode (1), First (2) ... Maximum (6), Turbo(7)",
            }),
            onokomExtend.vanesSwing(),
            onokomExtend.statusLed(),
            onokomExtend.quietMode(),
            onokomExtend.ecoMode(),
            onokomExtend.turboMode(),
            onokomExtend.sleepMode(),
            onokomExtend.screenLight(),
            onokomExtend.indoorHeatExchangerTemperature(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl", "genOnOff"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.onOff(endpoint);
        },
    },
];
