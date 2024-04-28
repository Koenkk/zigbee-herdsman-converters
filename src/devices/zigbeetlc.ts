// requires zigbee2mqtt v1.34+
// external converter for ZigbeeTLc v0.1.2.1+ by pvvx
// https://github.com/pvvx/ZigbeeTLc
// based on external converter for devbis-Firmware
// https://raw.githubusercontent.com/devbis/z03mmc/master/converters/lywsd03mmc.js

import {Zcl} from 'zigbee-herdsman';

import * as types from '../lib/types';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';

import {
    battery,
    binary,
    enumLookup,
    humidity,
    numeric,
    ota,
    quirkAddEndpointCluster,
    temperature,
} from '../lib/modernExtend';

const NS = 'zhc:zigbeetlc';

async function configure(device: types.Zh.Device, coordinatorEndpoint: types.Zh.Endpoint, definition: types.Definition) {
    const endpoint = device.getEndpoint(1);
    const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg', 'genPollCtrl', 'genOta'];

    try {
        await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
        await reporting.temperature(endpoint, {min: 10, max: constants.repInterval.MINUTES_5, change: 10});
        await reporting.humidity(endpoint, {min: 10, max: constants.repInterval.MINUTES_5, change: 50});
        await reporting.batteryPercentageRemaining(endpoint);
    } catch (e) {
        device.meta.logger.warning(`Error while configuring ZigbeeTLc device: ${e}`, NS);
    }

    device.powerSource = 'Battery';
    device.save();
}

const extend = {
    comfortDisplay: binary({
        name: 'comfort_display',
        valueOn: ['show', 0],
        valueOff: ['hide', 1],
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0002, type: Zcl.DataType.enum8},
        description: 'Whether to show a comfort indicator on the device screen.',
    }),
    comfortHumidityMax: numeric({
        name: 'comfort_humidity_max',
        unit: '%',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0105, type: Zcl.DataType.uint16},
        valueMin: 0,
        valueMax: 9999,
        scale: 10,
        description: 'Comfort parameters/Humidity maximum, in 1% steps, default 60.00%.',
    }),
    comfortHumidityMin: numeric({
        name: 'comfort_humidity_min',
        unit: '%',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0104, type: Zcl.DataType.uint16},
        valueMin: 0,
        valueMax: 9999,
        scale: 10,
        description: 'Comfort parameters/Humidity minimum, in 1% steps, default 40.00%',
    }),
    comfortTemperatureMin: numeric({
        name: 'comfort_temperature_min',
        unit: '°C',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0102, type: Zcl.DataType.int16},
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 10,
        description: 'Comfort parameters/Temperature minimum, in 0.01°C steps, default 20.00°C.',
    }),
    comfortTemperatureMax: numeric({
        name: 'comfort_temperature_max',
        unit: '°C',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0103, type: Zcl.DataType.int16},
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 10,
        description: 'Comfort parameters/Temperature maximum, in 0.01°C steps, default 25.00°C.',
    }),
    display: binary({
        name: 'display',
        valueOn: ['on', 0],
        valueOff: ['off', 1],
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0106, type: Zcl.DataType.enum8},
        description: 'Whether to enable the device display.',
    }),
    endpointQuirk: quirkAddEndpointCluster({
        endpointID: 1,
        outputClusters: [
            'genOta',
        ],
        inputClusters: [
            'genBasic',
            'genPowerCfg',
            'genIdentify',
            'hvacUserInterfaceCfg',
            'msTemperatureMeasurement',
            'msRelativeHumidity',
        ],
    }),
    humidityCalibration: numeric({
        name: 'humidity_calibration',
        unit: '%',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0101, type: Zcl.DataType.int16},
        valueMin: -50.0,
        valueMax: 50.0,
        valueStep: 0.01,
        scale: 10,
        description: 'Humidity calibration, in 0.01% steps, default 0%.',
    }),
    measurementInterval: numeric({
        name: 'measurement_interval',
        unit: 's',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0107, type: Zcl.DataType.uint8},
        valueMin: 3,
        valueMax: 255,
        description: 'Measurement interval, default 10 seconds.',
    }),
    tempCalibration: numeric({
        name: 'temperature_calibration',
        unit: '°C',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0100, type: Zcl.DataType.int16},
        valueMin: -50.0,
        valueMax: 50.0,
        valueStep: 0.01,
        scale: 10,
        description: 'Temperature calibration, in 0.01° steps, default 0 °C.',
    }),
    tempDisplayMode: enumLookup({
        name: 'temperature_display_mode',
        lookup: {'celsius': 0, 'fahrenheit': 1},
        cluster: 'hvacUserInterfaceCfg',
        attribute: 'tempDisplayMode',
        description: 'The unit of the temperature displayed on the device screen.',
    }),
};

/*
    ZigbeeTLc devices with the full supported option set:
    - Temperature (+calibration)
    - Humidity (+calibration)
    - Display
    - Comfort (Temperature / Humidity)
*/
const definitions = [
    {
        fingerprint: [
            {modelID: 'LYWSD03MMC-z', manufacturerName: 'Xiaomi'},
            {modelID: 'LYWSD03MMC-bz', manufacturerName: 'Xiaomi'},
            {modelID: 'MHO-C122-z', manufacturerName: 'MiaoMiaoCe'},
            {modelID: 'MHO-C122-bz', manufacturerName: 'MiaoMiaoCe'},
            {modelID: 'MHO-C401N-z', manufacturerName: 'MiaoMiaoCe'},
            {modelID: 'MHO-C401N-bz', manufacturerName: 'MiaoMiaoCe'},
        ],
        model: 'LYWSD03MMC',
        vendor: 'Xiaomi',
        description: 'Temp & RH Monitor Lite (pvxx/ZigbeeTLc)',
        extend: [
            temperature({reporting: {min: 10, max: 300, change: 10}}),
            humidity({reporting: {min: 10, max: 300, change: 50}}),
            extend.display,
            extend.tempDisplayMode,
            extend.comfortDisplay,
            extend.comfortTemperatureMin,
            extend.comfortTemperatureMax,
            extend.comfortHumidityMin,
            extend.comfortHumidityMax,
            extend.tempCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            battery(),
            extend.endpointQuirk,
            ota(),
        ],
        configure: configure,
    },
    /*
        ZigbeeTLc devices supporting:
        - Temperature (+calibration)
        - Humidity (+calibration)
        - Display
    */
    {
        fingerprint: [
            {modelID: 'CGDK2-z', manufacturerName: 'Qingping'},
            {modelID: 'CGDK2-bz', manufacturerName: 'Qingping'},
        ],
        model: 'CGDK2',
        vendor: 'Qingping',
        description: 'Temp & RH Monitor Lite (pvxx/ZigbeeTLc)',
        extend: [
            temperature({reporting: {min: 10, max: 300, change: 10}}),
            humidity({reporting: {min: 10, max: 300, change: 50}}),
            extend.display,
            extend.tempDisplayMode,
            extend.tempCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            battery(),
            extend.endpointQuirk,
            ota(),
        ],
        configure: configure,
    },
    /*
        ZigbeeTLc devices supporting:
        - Temperature (+calibration)
        - Humidity (+calibration)
    */
    {
        fingerprint: [
            {modelID: 'TS0201-z', manufacturerName: 'Tuya'},
            {modelID: 'TS0201-bz', manufacturerName: 'Tuya'},
            {modelID: 'TH03Z-z', manufacturerName: 'Tuya'},
            {modelID: 'TH03Z-bz', manufacturerName: 'Tuya'},
        ],
        model: 'WSD500A',
        vendor: 'Tuya',
        description: 'Temperature & Humidity Sensor (pvxx/ZigbeeTLc)',
        extend: [
            temperature({reporting: {min: 10, max: 300, change: 10}}),
            humidity({reporting: {min: 10, max: 300, change: 50}}),
            extend.tempCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            battery(),
            extend.endpointQuirk,
            ota(),
        ],
        configure: configure,
    },
];

export default definitions;
module.exports = definitions;
