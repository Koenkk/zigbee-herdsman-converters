const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const exposes = require('../lib/exposes');
const e = exposes.presets;
const reporting = require('../lib/reporting');

const bind = async (endpoint, target, clusters) => {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
};

const fzclick = {
    diyruz_freepad_clicks: {
        cluster: 'genMultistateInput',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const lookup = {
                0: 'hold',
                1: 'single',
                2: 'double',
                3: 'triple',
                4: 'quadruple',
                255: 'release',
            };
            const clicks = msg.data['presentValue'];
            const action = lookup[clicks] ? lookup[clicks] : `many`;
            return {
                action: `${action}`,
            };
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['ITCMDR_Contact'],
        model: 'ITCMDR_Contact',
        vendor: 'IT Commander',
        description: '[Contact Sensor](https://sumju.net)',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.voltage()],
        configure: async (device, coordinatorEndpoint) => {
            for (const ep of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genPowerCfg', 'ssIasZone']);
            }
        },
    },
    {
        zigbeeModel: ['ITCMDR_Click'],
        model: 'ITCMDR_Click',
        vendor: 'IT Commander',
        description: '[Button](https://sumju.net)',
        supports: 'single, double, triple, quadruple, many, hold/release',
        fromZigbee: [fzclick.diyruz_freepad_clicks, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            device.endpoints.forEach(async (ep) => {
                await bind(ep, coordinatorEndpoint, ['genMultistateInput']);
            });
        },
        endpoint: (device) => {
            return {
                button_1: 1,
            };
        },
        exposes: [e.battery(), e.action(), e.voltage()],
    },
];
