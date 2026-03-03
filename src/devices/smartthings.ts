import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";
import {centraliteExtend, fzLocal as fzCentralite} from "./centralite";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PGC313"],
        model: "STSS-MULT-001",
        vendor: "SmartThings",
        description: "Multipurpose sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["PGC314"],
        model: "STSS-IRM-001",
        vendor: "SmartThings",
        description: "Motion sensor (2013 model)",
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["tagv4"],
        model: "STS-PRS-251",
        vendor: "SmartThings",
        description: "Arrival sensor",
        fromZigbee: [fz.STS_PRS_251_presence, fz.battery, fz.identify],
        exposes: [
            e.battery(),
            e.presence(),
            e.action(["identify"]),
            e.enum("beep", ea.SET, ["2", "5", "10", "15", "30"]).withDescription("Trigger beep for x seconds"),
        ],
        toZigbee: [tz.STS_PRS_251_beep],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genBinaryInput"]);
            await reporting.batteryVoltage(endpoint);
            await reporting.presentValue(endpoint);
        },
    },
    {
        zigbeeModel: ["PGC410EU", "PGC410"],
        model: "STSS-PRES-001",
        vendor: "SmartThings",
        description: "Presence sensor",
        fromZigbee: [fz.PGC410EU_presence, fz.battery],
        exposes: [e.battery(), e.presence()],
        toZigbee: [],
    },
    {
        zigbeeModel: ["3325-S"],
        model: "3325-S",
        vendor: "SmartThings",
        description: "Motion sensor (2015 model)",
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.tamper()],
    },
    {
        zigbeeModel: ["3321-S"],
        model: "3321-S",
        vendor: "SmartThings",
        description: "Multi Sensor (2015 model)",
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1_report, fz.ias_contact_alarm_1, fz.battery, fz.smartthings_acceleration],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.CENTRALITE_SYSTEMS_INC};
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg", "manuSpecificSamsungAccelerometer"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            const payloadA = reporting.payload<"manuSpecificSamsungAccelerometer">("acceleration", 10, constants.repInterval.MINUTE, 1);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadA, options);
            const payloadX = reporting.payload<"manuSpecificSamsungAccelerometer">("x_axis", 10, constants.repInterval.MINUTE, 1);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadX, options);
            const payloadY = reporting.payload<"manuSpecificSamsungAccelerometer">("y_axis", 10, constants.repInterval.MINUTE, 1);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadY, options);
            const payloadZ = reporting.payload<"manuSpecificSamsungAccelerometer">("z_axis", 10, constants.repInterval.MINUTE, 1);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadZ, options);
            // Has Unknown power source, force it.
            device.powerSource = "Battery";
            device.save();
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery(), e.moving(), e.x_axis(), e.y_axis(), e.z_axis()],
    },
    {
        zigbeeModel: ["3200-Sgb"],
        model: "F-APP-UK-V2",
        vendor: "SmartThings",
        description: "Zigbee Outlet UK with power meter",
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            // Does not support reading of acVoltageMultiplier/acVoltageDivisor
            await endpoint.read("haElectricalMeasurement", ["acCurrentMultiplier", "acCurrentDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            // Limit updates to 3V and max 600s (10m)
            await reporting.rmsVoltage(endpoint, {max: 600, change: 3});
            // Limit updates to 0.01A and max 600s (10m)
            await reporting.rmsCurrent(endpoint, {max: 600, change: 10});
            // Limit updates to 4.0W and max 600s (10m)
            await reporting.activePower(endpoint, {max: 600, change: 40});
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ["ZB-ONOFFPlug-D0005"],
        model: "GP-WOU019BBDWG",
        vendor: "SmartThings",
        description: "Outlet with power meter",
        // This plug only actively reports power. The voltage and current values are always 0, so we can ignore them.
        // https://github.com/Koenkk/zigbee2mqtt/issues/5198
        extend: [m.onOff(), m.electricityMeter({current: false, voltage: false})],
    },
    {
        zigbeeModel: ["outlet"],
        model: "IM6001-OTP05",
        vendor: "SmartThings",
        description: "Outlet",
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ["outletv4"],
        model: "STS-OUT-US-2",
        vendor: "SmartThings",
        description: "Zigbee smart plug with power meter",
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            try {
                // https://github.com/Koenkk/zigbee2mqtt/issues/11706
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            } catch {
                /* Fails for some*/
            }
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint, {change: 10});
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ["motion"],
        model: "IM6001-MTP01",
        vendor: "SmartThings",
        description: "Motion sensor (2018 model)",
        fromZigbee: [fz.temperature, fz.ignore_iaszone_report, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["motionv5"],
        model: "STS-IRM-251",
        vendor: "SmartThings",
        description: "Motion sensor (2017 model)",
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            device.powerSource = "Battery";
            device.save();
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["motionv4"],
        model: "STS-IRM-250",
        vendor: "SmartThings",
        description: "Motion sensor (2016 model)",
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_1500_2800"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            // Has Unknown power source, force it.
            device.powerSource = "Battery";
            device.save();
        },
        exposes: [e.temperature(), e.occupancy(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["3305-S", "3305"],
        model: "3305-S",
        vendor: "SmartThings",
        description: "Motion sensor (2014 model)",
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["3300-S"],
        model: "3300-S",
        vendor: "SmartThings",
        description: "Door sensor",
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1_report, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["multiv4"],
        model: "F-MLT-US-2",
        vendor: "SmartThings",
        description: "Multipurpose sensor (2016 model)",
        fromZigbee: [fz.temperature, fz.battery, fz.ias_contact_alarm_1, fz.smartthings_acceleration],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_1500_2800"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.SMARTTHINGS_INC};
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg", "manuSpecificSamsungAccelerometer"]);
            await endpoint.write("manuSpecificSamsungAccelerometer", {0: {value: 0x01, type: 0x20}}, options);
            await endpoint.write("manuSpecificSamsungAccelerometer", {2: {value: 0x0276, type: 0x21}}, options);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            const payloadA = reporting.payload<"manuSpecificSamsungAccelerometer">("acceleration", 10, constants.repInterval.MINUTE, 1);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadA, options);
            const payloadX = reporting.payload<"manuSpecificSamsungAccelerometer">("x_axis", 10, constants.repInterval.MINUTE, 1);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadX, options);
            const payloadY = reporting.payload<"manuSpecificSamsungAccelerometer">("y_axis", 10, constants.repInterval.MINUTE, 1);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadY, options);
            const payloadZ = reporting.payload<"manuSpecificSamsungAccelerometer">("z_axis", 10, constants.repInterval.MINUTE, 1);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadZ, options);
            // Has Unknown power source, force it.
            device.powerSource = "Battery";
            device.save();
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery(), e.moving(), e.x_axis(), e.y_axis(), e.z_axis()],
    },
    {
        zigbeeModel: ["multi"],
        model: "IM6001-MPP01",
        vendor: "SmartThings",
        description: "Multipurpose sensor (2018 model)",
        fromZigbee: [fz.temperature, fz.battery, fz.ias_contact_alarm_1, fz.smartthings_acceleration],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.SAMJIN_CO_LTD};
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg", "manuSpecificSamsungAccelerometer"]);
            await endpoint.write("manuSpecificSamsungAccelerometer", {0: {value: 0x14, type: 0x20}}, options);
            await endpoint.write("genPollCtrl", {checkinInterval: 14400});
            await reporting.temperature(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            const payloadA = reporting.payload<"manuSpecificSamsungAccelerometer">("acceleration", 10, constants.repInterval.HOUR, 5);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadA, options);
            const payloadX = reporting.payload<"manuSpecificSamsungAccelerometer">("x_axis", 10, constants.repInterval.HOUR, 5);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadX, options);
            const payloadY = reporting.payload<"manuSpecificSamsungAccelerometer">("y_axis", 10, constants.repInterval.HOUR, 5);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadY, options);
            const payloadZ = reporting.payload<"manuSpecificSamsungAccelerometer">("z_axis", 10, constants.repInterval.HOUR, 5);
            await endpoint.configureReporting("manuSpecificSamsungAccelerometer", payloadZ, options);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery(), e.moving(), e.x_axis(), e.y_axis(), e.z_axis()],
    },
    {
        zigbeeModel: ["3310-S"],
        model: "3310-S",
        vendor: "SmartThings",
        description: "Temperature and humidity sensor",
        extend: [centraliteExtend.addManuSpecificCentraliteHumidityCluster()],
        fromZigbee: [fz.temperature, fzCentralite.d3310_humidity, fz.battery],
        exposes: [e.temperature(), e.humidity(), e.battery()],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["msTemperatureMeasurement", "manuSpecificCentraliteHumidity", "genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);

            const payload = [
                {
                    attribute: "measuredValue" as const,
                    minimumReportInterval: 10,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 10,
                },
            ];
            await endpoint.configureReporting("manuSpecificCentraliteHumidity", payload, {
                manufacturerCode: Zcl.ManufacturerCode.CENTRALITE_SYSTEMS_INC,
            });

            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["3315-S"],
        model: "3315-S",
        vendor: "SmartThings",
        description: "Water sensor",
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["3315-Seu"],
        model: "WTR-UK-V2",
        vendor: "SmartThings",
        description: "Water leak sensor (2015 model)",
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["water"],
        model: "IM6001-WLP01",
        vendor: "SmartThings",
        description: "Water leak sensor (2018 model)",
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery, fz.ias_water_leak_alarm_1_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.tamper(), e.battery(), e.voltage()],
    },
    {
        zigbeeModel: ["moisturev4"],
        model: "STS-WTR-250",
        vendor: "SmartThings",
        description: "Water leak sensor (2016 model)",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery, fz.temperature],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "msTemperatureMeasurement"]);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint);
            device.powerSource = "Battery";
            device.save();
        },
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery(), e.temperature()],
    },
    {
        zigbeeModel: ["3315-G"],
        model: "3315-G",
        vendor: "SmartThings",
        description: "Water sensor",
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["F-ADT-WTR-1"],
        model: "F-ADT-WTR-1",
        vendor: "SmartThings",
        description: "ADT water leak detector",
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ["button"],
        model: "IM6001-BTP01",
        vendor: "SmartThings",
        description: "Button",
        fromZigbee: [fz.command_status_change_notification_action, fz.battery, fz.temperature, fz.ignore_iaszone_attreport],
        exposes: [e.action(["off", "single", "double", "hold"]), e.battery(), e.temperature()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["Z-SRN12N", "SZ-SRN12N"],
        model: "SZ-SRN12N",
        vendor: "SmartThings",
        description: "Smart siren",
        fromZigbee: [],
        toZigbee: [tz.warning],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
        },
        exposes: [e.warning()],
    },
    {
        zigbeeModel: ["zbt-dimlight-gls0006"],
        model: "GP-LBU019BBAWU",
        vendor: "SmartThings",
        description: "Smart bulb",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["ZBT-DIMLight-GLS0044"],
        model: "7ZA-A806ST-Q1R",
        vendor: "SmartThings",
        description: "Smart bulb",
        extend: [m.light()],
    },
];
