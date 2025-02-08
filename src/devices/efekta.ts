import { Zcl } from "zigbee-herdsman";

import * as m from "../lib/modernExtend";
import { DefinitionWithExtend } from "../lib/types";

const defaultReporting = { min: 0, max: 300, change: 0 };
const normalReporting = { min: 0, max: 3600, change: 0 };
const rareReporting = { min: 0, max: 21600, change: 0 };
const rarestReporting = { min: 0, max: 64800, change: 0 };

const definitions: DefinitionWithExtend[] = [
  {
    zigbeeModel: ["EFEKTA_iAQ3"],
    model: "EFEKTA_iAQ3",
    vendor: "EFEKTA",
    description:
      "CO2 Monitor with IPS TFT Display, outdoor temperature and humidity, date and time",
    extend: [
      m.deviceEndpoints({ endpoints: { "1": 1, "2": 2 } }),
      m.co2({ reporting: defaultReporting }),
      m.temperature({
        endpointNames: ["1"],
        description: "Measured value of the built-in temperature sensor",
        reporting: defaultReporting,
      }),
      m.temperature({
        endpointNames: ["2"],
        description: "Measured value of the external temperature sensor",
        reporting: defaultReporting,
      }),
      m.humidity({
        endpointNames: ["1"],
        description: "Measured value of the built-in humidity sensor",
        reporting: defaultReporting,
      }),
      m.humidity({
        endpointNames: ["2"],
        description: "Measured value of the external humidity sensor",
        reporting: defaultReporting,
      }),
      m.numeric({
        name: "voc_index",
        unit: "VOC Index points",
        cluster: "genAnalogInput",
        attribute: "presentValue",
        description: "VOC index",
        access: "STATE",
        reporting: defaultReporting,
      }),
      m.numeric({
        name: "voc_raw_data",
        unit: "ticks",
        cluster: "genAnalogInput",
        attribute: { ID: 0x0065, type: Zcl.DataType.SINGLE_PREC },
        description: "SRAW_VOC, digital raw value",
        access: "STATE",
      }),
      m.illuminance({
        access: "STATE",
        reporting: defaultReporting,
      }),
      m.binary({
        name: "auto_brightness",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0203, type: Zcl.DataType.BOOLEAN },
        description: "Enable or Disable Auto Brightness of the Display",
      }),
      m.binary({
        name: "night_onoff_backlight",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0401, type: Zcl.DataType.BOOLEAN },
        description: "Complete shutdown of the backlight at night mode",
      }),
      m.numeric({
        name: "night_on_backlight",
        unit: "Hr",
        valueMin: 0,
        valueMax: 23,
        cluster: "msCO2",
        attribute: { ID: 0x0405, type: Zcl.DataType.UINT8 },
        description: "Night mode activation time",
      }),
      m.numeric({
        name: "night_off_backlight",
        unit: "Hr",
        valueMin: 0,
        valueMax: 23,
        cluster: "msCO2",
        attribute: { ID: 0x0406, type: Zcl.DataType.UINT8 },
        description: "Night mode deactivation time",
      }),
      m.enumLookup({
        name: "rotate",
        lookup: { "0": 0, "90": 90, "180": 180, "270": 270 },
        cluster: "msCO2",
        attribute: { ID: 0x0285, type: Zcl.DataType.UINT16 },
        description: "Display rotation angle",
      }),
      m.binary({
        name: "long_chart_period",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0204, type: Zcl.DataType.BOOLEAN },
        description:
          "The period of plotting the CO2 level(OFF - 1H | ON - 24H)",
      }),
      m.binary({
        name: "long_chart_period2",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0404, type: Zcl.DataType.BOOLEAN },
        description:
          "The period of plotting the VOC Index points(OFF - 1H | ON - 24H)",
      }),
      m.numeric({
        name: "set_altitude",
        unit: "meters",
        valueMin: 0,
        valueMax: 3000,
        cluster: "msCO2",
        attribute: { ID: 0x0205, type: Zcl.DataType.UINT16 },
        description:
          "Setting the altitude above sea level (for high accuracy of the CO2 sensor)",
      }),
      m.numeric({
        name: "temperature_offset",
        unit: "°C",
        valueMin: -50,
        valueMax: 50,
        valueStep: 0.1,
        scale: 10,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust temperature",
      }),
      m.numeric({
        name: "humidity_offset",
        unit: "%",
        valueMin: -50,
        valueMax: 50,
        valueStep: 1,
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust humidity",
      }),
      m.binary({
        name: "internal_or_external",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0288, type: Zcl.DataType.BOOLEAN },
        description: "Display data from internal or external TH sensor",
      }),
      m.binary({
        name: "automatic_scal",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0402, type: Zcl.DataType.BOOLEAN },
        description: "Automatic self calibration",
      }),
      m.binary({
        name: "forced_recalibration",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0202, type: Zcl.DataType.BOOLEAN },
        description:
          "Start FRC (Perform Forced Recalibration of the CO2 Sensor)",
      }),
      m.binary({
        name: "factory_reset_co2",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0206, type: Zcl.DataType.BOOLEAN },
        description: "Factory Reset CO2 sensor",
      }),
      m.numeric({
        name: "manual_forced_recalibration",
        unit: "ppm",
        valueMin: 0,
        valueMax: 5000,
        cluster: "msCO2",
        attribute: { ID: 0x0207, type: Zcl.DataType.UINT16 },
        description:
          "Start Manual FRC (Perform Forced Recalibration of the CO2 Sensor)",
      }),
      m.binary({
        name: "enable_gas",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0220, type: Zcl.DataType.BOOLEAN },
        description: "Enable CO2 Gas Control",
      }),
      m.binary({
        name: "invert_logic_gas",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0225, type: Zcl.DataType.BOOLEAN },
        description: "Enable invert logic CO2 Gas Control",
      }),
      m.numeric({
        name: "high_gas",
        unit: "ppm",
        valueMin: 400,
        valueMax: 5000,
        cluster: "msCO2",
        attribute: { ID: 0x0221, type: Zcl.DataType.UINT16 },
        description: "Setting High CO2 Gas Border",
      }),
      m.numeric({
        name: "low_gas",
        unit: "ppm",
        valueMin: 400,
        valueMax: 5000,
        cluster: "msCO2",
        attribute: { ID: 0x0222, type: Zcl.DataType.UINT16 },
        description: "Setting Low CO2 Gas Border",
      }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_PWS"],
    model: "EFEKTA_PWS",
    vendor: "EFEKTA",
    description:
      "[Plant Wattering Sensor, CR2450, CR2477 batteries, temperature ]",
    extend: [
      m.soilMoisture({ reporting: rareReporting }),
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.temperature({ reporting: rareReporting }),
      m.numeric({
        name: "report_delay",
        unit: "min",
        valueMin: 1,
        valueMax: 240,
        cluster: "genPowerCfg",
        attribute: { ID: 0x0201, type: Zcl.DataType.UINT16 },
        description:
          "Adjust Report Delay. Setting the time in minutes, by default 15 minutes",
      }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_THP_LR"],
    model: "EFEKTA_THP_LR",
    vendor: "EFEKTA",
    description:
      "DIY outdoor long-range sensor for temperature, humidity and atmospheric pressure",
    extend: [
      m.battery({
        voltage: true,
        voltageReportingConfig: rarestReporting,
        percentageReportingConfig: rarestReporting,
      }),
      m.temperature({ reporting: rarestReporting }),
      m.humidity({ reporting: rarestReporting }),
      m.pressure({ reporting: rarestReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_ePWS"],
    model: "EFEKTA_ePWS",
    vendor: "EFEKTA",
    description: "Plant wattering sensor with e-ink display",
    extend: [
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.soilMoisture({ reporting: rareReporting }),
      m.temperature({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_eON213z"],
    model: "EFEKTA_eON213z",
    vendor: "EFEKTA",
    description: "Temperature and humidity sensor with e-ink2.13",
    extend: [
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_miniPWS"],
    model: "EFEKTA_miniPWS",
    vendor: "EFEKTA",
    description: "Mini plant wattering sensor",
    extend: [
      m.soilMoisture({ reporting: rareReporting }),
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.numeric({
        name: "report_delay",
        unit: "min",
        valueMin: 1,
        valueMax: 180,
        cluster: "genPowerCfg",
        attribute: { ID: 0x0201, type: Zcl.DataType.UINT16 },
        description: "Adjust Report Delay, by default 60 minutes",
      }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_eON213wz"],
    model: "EFEKTA_eON213wz",
    vendor: "EFEKTA",
    description:
      "Mini weather station, digital barometer, forecast, charts, temperature, humidity",
    extend: [
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
      m.pressure({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_THP"],
    model: "EFEKTA_THP",
    vendor: "EFEKTA",
    description:
      "DIY temperature, humidity and atmospheric pressure sensor, long battery life",
    extend: [
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
      m.pressure({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_PWS_Max"],
    model: "EFEKTA_PWS_Max",
    vendor: "EFEKTA",
    description: "Plant watering sensor EFEKTA PWS max",
    extend: [
      m.soilMoisture({ reporting: rareReporting }),
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.illuminance({ reporting: rareReporting }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_PWS_MaxPro"],
    model: "EFEKTA_PWS_MaxPro",
    vendor: "EFEKTA",
    description: "Plant watering sensor EFEKTA PWS Max Pro,  long battery life",
    extend: [
      m.soilMoisture({ reporting: rareReporting }),
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.illuminance({ reporting: rareReporting }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_eON29wz"],
    model: "EFEKTA_eON29wz",
    vendor: "EFEKTA",
    description:
      "Mini weather station, barometer, forecast, charts, temperature, humidity, light",
    extend: [
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.illuminance({ reporting: rareReporting }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
      m.pressure({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_eFlower_Pro"],
    model: "EFEKTA_eFlower_Pro",
    vendor: "EFEKTA",
    description: "Plant Wattering Sensor with e-ink display 2.13",
    extend: [
      m.soilMoisture({ reporting: rareReporting }),
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.illuminance({ reporting: rareReporting }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_eTH102"],
    model: "EFEKTA_eTH102",
    vendor: "EFEKTA",
    description: "Mini digital thermometer & hygrometer with e-ink1.02",
    extend: [
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_iAQ"],
    model: "EFEKTA_iAQ",
    vendor: "EFEKTA",
    description:
      "CO2 Monitor with IPS TFT Display, outdoor temperature and humidity, date and time",
    extend: [
      m.co2({ reporting: normalReporting }),
      m.temperature({ reporting: normalReporting }),
      m.humidity({ reporting: normalReporting }),
      m.illuminance({ reporting: normalReporting }),
      m.binary({
        name: "auto_brightness",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0203, type: Zcl.DataType.BOOLEAN },
        description: "Enable or Disable Auto Brightness of the Display",
      }),
      m.binary({
        name: "long_chart_period",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0204, type: Zcl.DataType.BOOLEAN },
        description:
          "The period of plotting the CO2 level(OFF - 1H | ON - 24H)",
      }),
      m.numeric({
        name: "set_altitude",
        unit: "meters",
        valueMin: 0,
        valueMax: 3000,
        cluster: "msCO2",
        attribute: { ID: 0x0205, type: Zcl.DataType.UINT16 },
        description:
          "Setting the altitude above sea level (for high accuracy of the CO2 sensor)",
      }),
      m.numeric({
        name: "temperature_offset",
        unit: "°C",
        valueMin: -50,
        valueMax: 50,
        valueStep: 0.1,
        scale: 10,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust temperature",
      }),
      m.numeric({
        name: "humidity_offset",
        unit: "%",
        valueMin: -50,
        valueMax: 50,
        valueStep: 1,
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust humidity",
      }),
      m.binary({
        name: "forced_recalibration",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0202, type: Zcl.DataType.BOOLEAN },
        description:
          "Start FRC (Perform Forced Recalibration of the CO2 Sensor)",
      }),
      m.binary({
        name: "factory_reset_co2",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0206, type: Zcl.DataType.BOOLEAN },
        description: "Factory Reset CO2 sensor",
      }),
      m.numeric({
        name: "manual_forced_recalibration",
        unit: "ppm",
        valueMin: 0,
        valueMax: 5000,
        cluster: "msCO2",
        attribute: { ID: 0x0207, type: Zcl.DataType.UINT16 },
        description:
          "Start Manual FRC (Perform Forced Recalibration of the CO2 Sensor)",
      }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_CO2_Smart_Monitor"],
    model: "EFEKTA_CO2_Smart_Monitor",
    vendor: "EFEKTA",
    description:
      "EFEKTA CO2 Smart Monitor, ws2812b indicator, can control the relay, binding",
    extend: [
      m.co2({ reporting: normalReporting }),
      m.temperature({ reporting: normalReporting }),
      m.humidity({ reporting: normalReporting }),
      m.binary({
        name: "light_indicator",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0211, type: Zcl.DataType.BOOLEAN },
        description: "Enable or Disable light indicator",
      }),
      m.numeric({
        name: "light_indicator_level",
        unit: "%",
        valueMin: 0,
        valueMax: 100,
        cluster: "msCO2",
        attribute: { ID: 0x0209, type: Zcl.DataType.UINT8 },
        description: "Light indicator level",
      }),
      m.numeric({
        name: "set_altitude",
        unit: "meters",
        valueMin: 0,
        valueMax: 3000,
        cluster: "msCO2",
        attribute: { ID: 0x0205, type: Zcl.DataType.UINT16 },
        description:
          "Setting the altitude above sea level (for high accuracy of the CO2 sensor)",
      }),
      m.numeric({
        name: "temperature_offset",
        unit: "°C",
        valueMin: -50,
        valueMax: 50,
        valueStep: 0.1,
        scale: 10,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust temperature",
      }),
      m.numeric({
        name: "humidity_offset",
        unit: "%",
        valueMin: -50,
        valueMax: 50,
        valueStep: 1,
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust humidity",
      }),
      m.binary({
        name: "forced_recalibration",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0202, type: Zcl.DataType.BOOLEAN },
        description:
          "Start FRC (Perform Forced Recalibration of the CO2 Sensor)",
      }),
      m.binary({
        name: "factory_reset_co2",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0206, type: Zcl.DataType.BOOLEAN },
        description: "Factory Reset CO2 sensor",
      }),
      m.numeric({
        name: "manual_forced_recalibration",
        unit: "ppm",
        valueMin: 0,
        valueMax: 5000,
        cluster: "msCO2",
        attribute: { ID: 0x0207, type: Zcl.DataType.UINT16 },
        description:
          "Start Manual FRC (Perform Forced Recalibration of the CO2 Sensor)",
      }),
      m.binary({
        name: "enable_gas",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0220, type: Zcl.DataType.BOOLEAN },
        description: "Enable CO2 Gas Control",
      }),
      m.numeric({
        name: "high_gas",
        unit: "ppm",
        valueMin: 400,
        valueMax: 2000,
        cluster: "msCO2",
        attribute: { ID: 0x0221, type: Zcl.DataType.UINT16 },
        description: "Setting High CO2 Gas Border",
      }),
      m.numeric({
        name: "low_gas",
        unit: "ppm",
        valueMin: 400,
        valueMax: 2000,
        cluster: "msCO2",
        attribute: { ID: 0x0222, type: Zcl.DataType.UINT16 },
        description: "Setting Low CO2 Gas Border",
      }),
      m.binary({
        name: "enable_temperature",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0220, type: Zcl.DataType.BOOLEAN },
        description: "Enable Temperature Control",
      }),
      m.numeric({
        name: "high_temperature",
        unit: "°C",
        valueMin: -5,
        valueMax: 50,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0221, type: Zcl.DataType.INT16 },
        description: "Setting High Temperature Border",
      }),
      m.numeric({
        name: "low_temperature",
        unit: "°C",
        valueMin: -5,
        valueMax: 50,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0222, type: Zcl.DataType.INT16 },
        description: "Setting Low Temperature Border",
      }),
      m.binary({
        name: "enable_humidity",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0220, type: Zcl.DataType.BOOLEAN },
        description: "Enable Humidity Control",
      }),
      m.numeric({
        name: "high_humidity",
        unit: "%",
        valueMin: 0,
        valueMax: 99,
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0221, type: Zcl.DataType.UINT16 },
        description: "Setting High Humidity Border",
      }),
      m.numeric({
        name: "low_humidity",
        unit: "%",
        valueMin: 0,
        valueMax: 99,
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0222, type: Zcl.DataType.UINT16 },
        description: "Setting Low Humidity Border",
      }),
    ],
  },
  {
    zigbeeModel: ["SNZB-02_EFEKTA"],
    model: "SNZB-02_EFEKTA",
    vendor: "EFEKTA",
    description:
      "Alternative firmware for the SONOFF SNZB-02 sensor from EfektaLab, DIY",
    extend: [
      m.battery({
        voltage: true,
        voltageReportingConfig: rareReporting,
        percentageReportingConfig: rareReporting,
      }),
      m.temperature({ reporting: rareReporting }),
      m.humidity({ reporting: rareReporting }),
      m.numeric({
        name: "report_delay",
        unit: "min",
        valueMin: 1,
        valueMax: 60,
        cluster: "genPowerCfg",
        attribute: { ID: 0x0201, type: Zcl.DataType.UINT16 },
        description:
          "Adjust Report Delay. Setting the time in minutes, by default 5 minutes",
      }),
      m.binary({
        name: "enable_temperature",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0220, type: Zcl.DataType.BOOLEAN },
        description: "Enable Temperature Control",
      }),
      m.numeric({
        name: "high_temperature",
        unit: "°C",
        valueMin: -5,
        valueMax: 50,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0221, type: Zcl.DataType.INT16 },
        description: "Setting High Temperature Border",
      }),
      m.numeric({
        name: "low_temperature",
        unit: "°C",
        valueMin: -5,
        valueMax: 50,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0222, type: Zcl.DataType.INT16 },
        description: "Setting Low Temperature Border",
      }),
      m.binary({
        name: "enable_humidity",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0220, type: Zcl.DataType.BOOLEAN },
        description: "Enable Humidity Control",
      }),
      m.numeric({
        name: "high_humidity",
        unit: "%",
        valueMin: 0,
        valueMax: 99,
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0221, type: Zcl.DataType.UINT16 },
        description: "Setting High Humidity Border",
      }),
      m.numeric({
        name: "low_humidity",
        unit: "%",
        valueMin: 0,
        valueMax: 99,
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0222, type: Zcl.DataType.UINT16 },
        description: "Setting Low Humidity Border",
      }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_Air_Quality_Station"],
    model: "EFEKTA_Air_Quality_Station",
    vendor: "EFEKTA",
    description: "Air quality station",
    extend: [
      m.co2({
        reporting: false,
        access: "STATE",
      }),
      m.numeric({
        name: "pm1",
        unit: "µg/m³",
        cluster: "pm25Measurement",
        attribute: { ID: 0x0601, type: Zcl.DataType.SINGLE_PREC },
        description: "Measured PM1.0 (particulate matter) concentration",
        access: "STATE",
        reporting: false,
        precision: 1,
      }),
      m.pm25({
        reporting: false,
        access: "STATE",
        description: "Measured PM2.5 (particulate matter) concentration",
        precision: 1,
      }),
      m.numeric({
        name: "pm4",
        unit: "µg/m³",
        cluster: "pm25Measurement",
        attribute: { ID: 0x0605, type: Zcl.DataType.SINGLE_PREC },
        description: "Measured PM4.0 (particulate matter) concentration",
        access: "STATE",
        reporting: false,
        precision: 1,
      }),
      m.numeric({
        name: "pm10",
        unit: "µg/m³",
        cluster: "pm25Measurement",
        attribute: { ID: 0x0602, type: Zcl.DataType.SINGLE_PREC },
        description: "Measured PM10.0 (particulate matter) concentration",
        access: "STATE",
        reporting: false,
        precision: 1,
      }),
      m.numeric({
        name: "pm_size",
        unit: "µm",
        cluster: "pm25Measurement",
        attribute: { ID: 0x0603, type: Zcl.DataType.SINGLE_PREC },
        description: "Typical Particle Size",
        access: "STATE",
        reporting: false,
        precision: 2,
      }),
      m.numeric({
        name: "aqi_25_index",
        unit: "PM2.5 Index",
        cluster: "pm25Measurement",
        attribute: { ID: 0x0604, type: Zcl.DataType.SINGLE_PREC },
        description: "PM 2.5 INDEX",
        access: "STATE",
        reporting: false,
      }),
      m.numeric({
        name: "voc_index",
        unit: "VOC Index points",
        cluster: "genAnalogInput",
        attribute: "presentValue",
        description: "VOC index",
        access: "STATE",
        reporting: false,
      }),
      m.temperature({
        description: "Measured value of the built-in temperature sensor",
        reporting: false,
        access: "STATE",
      }),
      m.humidity({
        description: "Measured value of the built-in humidity sensor",
        reporting: false,
        access: "STATE",
      }),
      m.illuminance({
        access: "STATE",
        reporting: false,
      }),
      m.numeric({
        name: "report_delay",
        unit: "sec",
        valueMin: 6,
        valueMax: 600,
        cluster: "pm25Measurement",
        attribute: { ID: 0x0201, type: Zcl.DataType.UINT16 },
        description:
          "Setting the sensor report delay. Setting the time in seconds (6-600), by default 15 seconds",
        access: "STATE_SET",
      }),
      m.binary({
        name: "auto_brightness",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msIlluminanceMeasurement",
        attribute: { ID: 0x0203, type: Zcl.DataType.BOOLEAN },
        description: "Enable or Disable Auto Brightness of the Display",
        access: "STATE_SET",
      }),
      m.binary({
        name: "night_onoff_backlight",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msIlluminanceMeasurement",
        attribute: { ID: 0x0401, type: Zcl.DataType.BOOLEAN },
        description: "Complete shutdown of the backlight at night mode",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "night_on_backlight",
        unit: "Hr",
        valueMin: 0,
        valueMax: 23,
        cluster: "msIlluminanceMeasurement",
        attribute: { ID: 0x0405, type: Zcl.DataType.UINT8 },
        description: "Night mode activation time",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "night_off_backlight",
        unit: "Hr",
        valueMin: 0,
        valueMax: 23,
        cluster: "msIlluminanceMeasurement",
        attribute: { ID: 0x0406, type: Zcl.DataType.UINT8 },
        description: "Night mode activation time",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "temperature_offset",
        unit: "°C",
        valueMin: -50,
        valueMax: 50,
        valueStep: 0.1,
        scale: 10,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust temperature",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "humidity_offset",
        unit: "%",
        valueMin: -50,
        valueMax: 50,
        valueStep: 1,
        cluster: "msRelativeHumidity",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust humidity",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "auto_clean_interval",
        unit: "day",
        valueMin: 0,
        valueMax: 10,
        valueStep: 1,
        cluster: "pm25Measurement",
        attribute: { ID: 0x0330, type: Zcl.DataType.UINT8 },
        description: "Auto clean interval PM2.5 sensor",
        access: "STATE_SET",
      }),
      m.binary({
        name: "manual_clean",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "pm25Measurement",
        attribute: { ID: 0x0331, type: Zcl.DataType.BOOLEAN },
        description: "Manual clean PM2.5 sensor",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "set_altitude",
        unit: "meters",
        valueMin: 0,
        valueMax: 3000,
        cluster: "msCO2",
        attribute: { ID: 0x0205, type: Zcl.DataType.UINT16 },
        description:
          "Setting the altitude above sea level (for high accuracy of the CO2 sensor)",
        access: "STATE_SET",
      }),
      m.binary({
        name: "forced_recalibration",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0202, type: Zcl.DataType.BOOLEAN },
        description:
          "Start FRC (Perform Forced Recalibration of the CO2 Sensor)",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "manual_forced_recalibration",
        unit: "ppm",
        valueMin: 0,
        valueMax: 5000,
        cluster: "msCO2",
        attribute: { ID: 0x0207, type: Zcl.DataType.UINT16 },
        description:
          "Start Manual FRC (Perform Forced Recalibration of the CO2 Sensor)",
        access: "STATE_SET",
      }),
      m.binary({
        name: "automatic_self_calibration",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0402, type: Zcl.DataType.BOOLEAN },
        description: "Automatic self calibration",
        access: "STATE_SET",
      }),
      m.binary({
        name: "factory_reset_co2",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "msCO2",
        attribute: { ID: 0x0206, type: Zcl.DataType.BOOLEAN },
        description: "Factory Reset CO2 sensor",
        access: "STATE_SET",
      }),
    ],
  },
  {
    zigbeeModel: ["EFEKTA_ePST_POW_E_LR"],
    model: "EFEKTA_ePST_POW_E_LR",
    vendor: "EFEKTA",
    description: "Water, gas smart pressure monitor with e-ink display.",
    extend: [
      m.pressure({
        unit: "kPa",
        description: "Pressure in kPa",
        scale: 10,
        reporting: false,
        access: "STATE",
      }),
      m.numeric({
        name: "bar",
        unit: "bar",
        cluster: "msPressureMeasurement",
        attribute: "measuredValue",
        description: "Pressure in bar",
        scale: 1000,
        precision: 2,
        access: "STATE",
      }),
      m.numeric({
        name: "psi",
        unit: "psi",
        cluster: "msPressureMeasurement",
        attribute: "measuredValue",
        description: "Pressure in psi",
        scale: 68.94757,
        precision: 2,
        access: "STATE",
      }),
      m.temperature({
        reporting: false,
        access: "STATE",
      }),
      m.numeric({
        name: "pressure_offset",
        unit: "kPa",
        valueMin: -100.0,
        valueMax: 100.0,
        cluster: "msPressureMeasurement",
        attribute: { ID: 0x0210, type: Zcl.DataType.INT16 },
        description: "Adjust pressure sensor",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "raw_temperature_calibration",
        unit: "raw unit",
        valueMin: -8192,
        valueMax: 8192,
        cluster: "msTemperatureMeasurement",
        attribute: { ID: 0x0008, type: Zcl.DataType.INT16 },
        description: "Adjust temperature sensor",
        access: "STATE_SET",
      }),
      m.numeric({
        name: "mains_voltage",
        unit: "V",
        cluster: "genPowerCfg",
        attribute: "mainsVoltage",
        description: "Mains voltage",
        scale: 10,
        precision: 1,
        access: "STATE",
      }),
      m.battery({
        percentage: true,
        lowStatus: true,
        voltage: false,
        percentageReporting: false,
        voltageReporting: false,
      }),
      m.numeric({
        name: "reading_interval",
        unit: "sec",
        valueMin: 10,
        valueMax: 300,
        cluster: "genPowerCfg",
        attribute: { ID: 0x0201, type: Zcl.DataType.UINT16 },
        description:
          "Setting the sensor reading interval in seconds, by default 20 seconds",
        access: "STATE_SET",
      }),
      m.enumLookup({
        name: "tx_radio_power",
        lookup: { "4": 4, "19": 19 },
        cluster: "genPowerCfg",
        attribute: { ID: 0x0236, type: Zcl.DataType.INT8 },
        description: "Set TX Radio Power, dbm",
        access: "STATE_SET",
      }),
      m.binary({
        name: "comparison_previous_data",
        valueOn: ["ON", 1],
        valueOff: ["OFF", 0],
        cluster: "genPowerCfg",
        attribute: { ID: 0x0205, type: Zcl.DataType.BOOLEAN },
        description: "Enable сontrol of comparison with previous data",
        access: "STATE_SET",
      }),
      m.enumLookup({
        name: "invert",
        lookup: { BW: 0, WB: 1 },
        cluster: "genPowerCfg",
        attribute: { ID: 0xf004, type: Zcl.DataType.UINT8 },
        description: "Invert display color",
        access: "STATE_SET",
      }),
      m.enumLookup({
        name: "fastmode",
        lookup: { F: 0, UF: 1 },
        cluster: "genPowerCfg",
        attribute: { ID: 0xf005, type: Zcl.DataType.UINT8 },
        description: "Display refresh mode",
        access: "STATE_SET",
      }),
    ],
  },
];

export default definitions;
module.exports = definitions;
