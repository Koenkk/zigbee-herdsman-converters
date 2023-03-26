const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

/**
 * Definition for ["KnockautX Rauchwarnmelder"] (https://www.brelag.com/shop/smoal024-knockautx-rauchwarnmelder-4714#attr=)
 * (smoke sensor/alarm) by [Brelag AG, Switzerland](https://www.brelag.com).
 *
 * Based on [tuya](https://developer.tuya.com/en) platform.
 *
 * @author Patrik Gfeller <patrik.gfeller@gmail.com>
 */
const definition = {
    fingerprint: [
        {
            modelID: 'TS0601',
            manufacturerName: '_TZE200_ux5v4dbd',
        },
    ],
    model: 'SMOAL024',
    vendor: 'KnockautX',
    description: 'Smoke sensor',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.fz.datapoints],
    configure: tuya.configureMagicPacket,
    exposes: [
        e.smoke(),
        tuya.exposes.batteryState(),
        tuya.exposes.silence(),
    ],
    meta: {
        tuyaDatapoints: [
            [tuya.dataPoints.state, 'smoke', tuya.valueConverter.trueFalse0],
            [tuya.dataPoints.runningState, 'battery_state', tuya.valueConverter.batteryState]
        ],
    },
};

module.exports = definition;
