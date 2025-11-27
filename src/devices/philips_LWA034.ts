import * as exposes from 'zigbee-herdsman-converters/lib/exposes';
import * as fromZigbee from 'zigbee-herdsman-converters/lib/fromZigbee';
import * as toZigbee from 'zigbee-herdsman-converters/lib/toZigbee';
import * as ota from 'zigbee-herdsman-converters/lib/ota';
import * as philips from 'zigbee-herdsman-converters/lib/philips';

const definitions = [
    {
        zigbeeModel: ['LWA034'],
        model: 'LWA034',
        vendor: 'Signify Netherlands B.V.',
        description: 'Philips Hue White Ambiance — dimmable white light',
        extend: philips.light_onoff_brightness_colortemp(),
        exposes: [
            exposes.light().withBrightness().withColorTemp(),
        ],
        fromZigbee: [...philips.light_onoff_brightness_colortemp().fromZigbee],
        toZigbee: [...philips.light_onoff_brightness_colortemp().toZigbee],
        meta: { turnsOffAtBrightness1: true },
        ota: ota.zigbeeOTA,
    },
];

export default definitions;
