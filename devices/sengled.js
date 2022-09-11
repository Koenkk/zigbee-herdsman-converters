const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const reporting = require('../lib/reporting');
const e = exposes.presets;

// Make sure extend.ldight_* is not used (sengledExtend should be used instead)
const extendDontUse = require('../lib/extend');
const extend = {switch: extendDontUse.switch};
const sengledExtend = {
    light_onoff_brightness: (options={}) => extendDontUse.light_onoff_brightness({disableEffect: true, ...options}),
    light_onoff_brightness_colortemp: (options={}) => extendDontUse.light_onoff_brightness_colortemp({disableEffect: true, ...options}),
    light_onoff_brightness_colortemp_color: (options={}) =>
        extendDontUse.light_onoff_brightness_colortemp_color({disableEffect: true, ...options}),
};

module.exports = [
    {
        zigbeeModel: ['E13-N11'],
        model: 'E13-N11',
        vendor: 'Sengled',
        description: 'Flood light with motion sensor light outdoor',
        fromZigbee: sengledExtend.light_onoff_brightness().fromZigbee.concat([fz.ias_occupancy_alarm_1]),
        toZigbee: sengledExtend.light_onoff_brightness().toZigbee,
        exposes: sengledExtend.light_onoff_brightness().exposes.concat([e.occupancy()]),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E21-N13A'],
        model: 'E21-N13A',
        vendor: 'Sengled',
        description: 'Smart LED (A19)',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E21-N1EA'],
        model: 'E21-N1EA',
        vendor: 'Sengled',
        description: 'Smart LED multicolor A19 bulb',
        fromZigbee: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).fromZigbee.concat([fz.metering]),
        toZigbee: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).toZigbee,
        exposes: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).exposes.concat([e.power(), e.energy()]),
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            await sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]})
                .configure(device, coordinatorEndpoint, logger);
            device.powerSource = 'Mains (single phase)';
            device.save();

            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['E12-N1E'],
        model: 'E12-N1E',
        vendor: 'Sengled',
        description: 'Smart LED multicolor (BR30)',
        fromZigbee: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).fromZigbee.concat([fz.metering]),
        toZigbee: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).toZigbee,
        exposes: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).exposes.concat([e.power(), e.energy()]),
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            await sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]})
                .configure(device, coordinatorEndpoint, logger);
            device.powerSource = 'Mains (single phase)';
            device.save();

            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['E1G-G8E'],
        model: 'E1G-G8E',
        vendor: 'Sengled',
        description: 'Multicolor light strip (2M)',
        extend: sengledExtend.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-U21U31'],
        model: 'E11-U21U31',
        vendor: 'Sengled',
        description: 'Element touch (A19)',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-G13'],
        model: 'E11-G13',
        vendor: 'Sengled',
        description: 'Element classic (A19)',
        fromZigbee: sengledExtend.light_onoff_brightness().fromZigbee.concat([fz.metering]),
        toZigbee: sengledExtend.light_onoff_brightness().toZigbee,
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            await sengledExtend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            device.powerSource = 'Mains (single phase)';
            device.save();

            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: sengledExtend.light_onoff_brightness().exposes.concat([e.power(), e.energy()]),
    },
    {
        zigbeeModel: ['E11-G23', 'E11-G33'],
        model: 'E11-G23/E11-G33',
        vendor: 'Sengled',
        description: 'Element classic (A60)',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-N13', 'E11-N13A', 'E11-N14', 'E11-N14A'],
        model: 'E11-N13/E11-N13A/E11-N14/E11-N14A',
        vendor: 'Sengled',
        description: 'Element extra bright (A19)',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-CIA19NAE26'],
        model: 'Z01-CIA19NAE26',
        vendor: 'Sengled',
        description: 'Element touch (A19)',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-A19NAE26'],
        model: 'Z01-A19NAE26',
        vendor: 'Sengled',
        description: 'Element plus (A19)',
        extend: sengledExtend.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-A60EAE27'],
        model: 'Z01-A60EAE27',
        vendor: 'Sengled',
        description: 'Element Plus (A60)',
        extend: sengledExtend.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-N1EA'],
        model: 'E11-N1EA',
        vendor: 'Sengled',
        description: 'Element plus color (A19)',
        fromZigbee: sengledExtend.light_onoff_brightness_colortemp_color().fromZigbee.concat([fz.metering]),
        toZigbee: sengledExtend.light_onoff_brightness_colortemp_color().toZigbee,
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            await sengledExtend.light_onoff_brightness_colortemp_color().configure(device, coordinatorEndpoint, logger);
            device.powerSource = 'Mains (single phase)';
            device.save();

            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: sengledExtend.light_onoff_brightness_colortemp_color().exposes.concat([e.power(), e.energy()]),
    },
    {
        zigbeeModel: ['E11-U2E'],
        model: 'E11-U2E',
        vendor: 'Sengled',
        description: 'Element color plus E27',
        extend: sengledExtend.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-U3E'],
        model: 'E11-U3E',
        vendor: 'Sengled',
        description: 'Element color plus B22',
        extend: sengledExtend.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1F-N5E'],
        model: 'E1F-N5E',
        vendor: 'Sengled',
        description: 'Element color plus E12',
        fromZigbee: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).fromZigbee.concat([fz.metering]),
        toZigbee: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).toZigbee,
        exposes: sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]}).exposes.concat([e.power(), e.energy()]),
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            await sengledExtend.light_onoff_brightness_colortemp_color({colorTempRange: [154, 500]})
                .configure(device, coordinatorEndpoint, logger);
            device.powerSource = 'Mains (single phase)';
            device.save();

            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['E12-N14'],
        model: 'E12-N14',
        vendor: 'Sengled',
        description: 'Element Classic (BR30)',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1A-AC2'],
        model: 'E1ACA4ABE38A',
        vendor: 'Sengled',
        description: 'Element downlight smart LED bulb',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1D-G73'],
        model: 'E1D-G73WNA',
        vendor: 'Sengled',
        description: 'Smart window and door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage(), e.tamper()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['E1C-NB6'],
        model: 'E1C-NB6',
        vendor: 'Sengled',
        description: 'Smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1C-NB7'],
        model: 'E1C-NB7',
        vendor: 'Sengled',
        description: 'Smart plug with energy tracker',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['E1E-G7F'],
        model: 'E1E-G7F',
        vendor: 'Sengled',
        description: 'Smart switch',
        fromZigbee: [fz.E1E_G7F_action],
        exposes: [e.action(['on', 'up', 'down', 'off', 'on_double', 'on_long', 'off_double', 'off_long'])],
        toZigbee: [],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-N1G'],
        model: 'E11-N1G',
        vendor: 'Sengled',
        description: 'Vintage LED edison bulb (ST19)',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1F-N9G'],
        model: 'E1F-N9G',
        vendor: 'Sengled',
        description: 'Smart LED filament candle (E12)',
        extend: sengledExtend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
];
