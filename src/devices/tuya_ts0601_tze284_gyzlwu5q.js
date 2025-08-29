{
    zigbeeModel: ['TS0601'],
    fingerprint: tuya.fingerprint('TS0601', ['_TZE284_gyzlwu5q']),
    model: 'TS0601_TZE284_gyzlwu5q',
    vendor: 'Tuya',
    description: 'Smoke detector with temperature, humidity sensor and test button',

    extend: [tuya.modernExtend.tuyaBase({ dp: true })],

    exposes: [
        exposes.binary('smoke', exposes.access.STATE, true, false).withDescription('Smoke detected'),
        exposes.numeric('temperature', exposes.access.STATE)
            .withUnit('°C')
            .withDescription('Measured temperature')
            .withValueMin(-40).withValueMax(80).withValueStep(0.1),
        exposes.numeric('humidity', exposes.access.STATE)
            .withUnit('%')
            .withDescription('Measured humidity')
            .withValueMin(0).withValueMax(100),
        exposes.enum('test_button', exposes.access.STATE, ['idle', 'pressed']).withDescription('Test button state'),
        exposes.enum('battery_state', exposes.access.STATE, ['full', 'low', 'Nok']).withDescription('Battery state'),
    ],

    meta: {
        tuyaDatapoints: [
            [1, 'smoke', tuya.valueConverter.trueFalse0],
            [23, 'temperature', tuya.valueConverter.divideBy10],
            [24, 'humidity', tuya.valueConverter.raw],
            [14, 'battery_state', (dpValue) => {
                switch (dpValue) {
                    case 1:
                        return 'low';
                    case 2:
                        return 'full';
                    default:
                        return 'Nok';
                }
            }],
        ],
    },

    // NOTE: DP9 (Test button) requires a custom fromZigbee converter because its state is transient.
    // This is different from other DPs (like temperature or humidity) which simply report their current value.
    // To accurately represent the physical behavior of a button press, its state must change to 'idle'
    // after a short timeout. This stateful logic is not possible with the declarative
    // tuyaDatapoints approach, which only maps a single incoming value.
    fromZigbee: [
        fz.ignore_basic_report,
        {
            cluster: 'manuSpecificTuya',
            type: ['commandDataReport'],
            convert: (model, msg, publish, options, meta) => {
                const dpValues = msg.data.dpValues;
                meta.testButtonTimeouts = meta.testButtonTimeouts || {};

                dpValues.forEach((dp) => {
                    switch (dp.dp) {
                        case 9:
                            if (dp.datatype === 4) {
                                publish({ test_button: 'pressed' });
                                if (meta.testButtonTimeouts[dp.dp]) clearTimeout(meta.testButtonTimeouts[dp.dp]);
                                meta.testButtonTimeouts[dp.dp] = setTimeout(() => {
                                    publish({ test_button: 'idle' });
                                    delete meta.testButtonTimeouts[dp.dp];
                                }, 500);
                            }
                            break;
                        default:
                            break;
                    }
                });
                
                return null;
            },
        },
    ],

    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        try {
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        } catch {
            logger?.info('Battery percentage not available');
        }
    },
}
