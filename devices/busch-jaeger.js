const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['PU01'],
        model: '6717-84',
        vendor: 'Busch-Jaeger',
        description: 'Adaptor plug',
        extend: extend.switch(),
    },
    {
        // Busch-Jaeger 6735, 6736, and 6737 have been tested with the 6710 U (Power Adapter) and
        // 6711 U (Relay) back-ends. The dimmer has not been verified to work yet, though it's
        // safe to assume that it can at least been turned on or off with this integration.
        //
        // In order to manually capture scenes as described in the devices manual, the endpoint
        // corresponding to the row needs to be unbound (https://www.zigbee2mqtt.io/information/binding.html)
        // If that operation was successful, the switch will respond to button presses on that
        // by blinking multiple times (vs. just blinking once if it's bound).
        zigbeeModel: ['RM01', 'RB01'],
        model: '6735/6736/6737',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link power supply/relay/dimmer',
        endpoint: (device) => {
            return {'row_1': 0x0a, 'row_2': 0x0b, 'row_3': 0x0c, 'row_4': 0x0d, 'relay': 0x12};
        },
        exposes: [e.switch(), e.action(['row_1_on', 'row_1_off', 'row_1_up', 'row_1_down', 'row_1_stop',
            'row_2_on', 'row_2_off', 'row_2_up', 'row_2_down', 'row_2_stop',
            'row_3_on', 'row_3_off', 'row_3_up', 'row_3_down', 'row_3_stop',
            'row_4_on', 'row_4_off', 'row_4_up', 'row_4_down', 'row_4_stop'])],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            let firstEndpoint = 0x0a;

            const switchEndpoint10 = device.getEndpoint(10);
            if (switchEndpoint10 != null && switchEndpoint10.supportsOutputCluster('genOnOff')) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/3027#issuecomment-606169628
                await reporting.bind(switchEndpoint10, coordinatorEndpoint, ['genOnOff']);
            }

            const switchEndpoint12 = device.getEndpoint(0x12);
            if (switchEndpoint12 != null) {
                firstEndpoint++;
                await reporting.bind(switchEndpoint12, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            }

            // Depending on the actual devices - 6735, 6736, or 6737 - there are 1, 2, or 4 endpoints.
            for (let i = firstEndpoint; i <= 0x0d; i++) {
                const endpoint = device.getEndpoint(i);
                if (endpoint != null) {
                    // The total number of bindings seems to be severely limited with these devices.
                    // In order to be able to toggle groups, we need to remove the scenes cluster
                    const index = endpoint.outputClusters.indexOf(5);
                    if (index > -1) {
                        endpoint.outputClusters.splice(index, 1);
                    }
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
                }
            }
        },
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.brightness, fz.legacy.RM01_on_click, fz.legacy.RM01_off_click,
            fz.legacy.RM01_up_hold, fz.legacy.RM01_down_hold, fz.legacy.RM01_stop],
        toZigbee: [tz.RM01_light_onoff_brightness, tz.RM01_light_brightness_step, tz.RM01_light_brightness_move],
        onEvent: async (type, data, device) => {
            const switchEndpoint = device.getEndpoint(0x12);
            if (switchEndpoint == null) {
                return;
            }

            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await switchEndpoint.read('genOnOff', ['onOff']);
                        await switchEndpoint.read('genLevelCtrl', ['currentLevel']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },
];
