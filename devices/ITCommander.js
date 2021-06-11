const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const exposes = require('../lib/exposes');
const e = exposes.presets;

const bind = async (endpoint, target, clusters) => {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
};

const withEpPreffix = (converter) => ({
    ...converter,
    convert: (model, msg, publish, options, meta) => {
        const epID = msg.endpoint.ID;
        const converterResults = converter.convert(model, msg, publish, options, meta);
        return Object.keys(converterResults)
            .reduce((result, key) => {
                result[`${key}_${epID}`] = converterResults[key];
                return result;
            }, {});
    },
});

const contactDiscovery = {
    type: 'binary_sensor',
    object_id: 'contact',
    discovery_payload: {
        payload_on: true,
        payload_off: false,
        value_template: '{{ value_json.contact }}',
    },
};


module.exports = [
    {
        zigbeeModel: ['ITCMDR_Contact'],
        model: 'ITCMDR_Contact',
        vendor: 'IT Commander',
        description: '[Contact Sensor](https://sumju.net)',
        supports: '',
        fromZigbee: [
            fz.ias_contact_alarm_1,
            fz.battery,
        ],
        toZigbee: [],
        meta: {
            configureKey: 1,
            disableDefaultResponse: true,
        },
        configure: async (device, coordinatorEndpoint) => {
            for (ep of [1, 2, 3]) {
                await bind(device.getEndpoint(ep), coordinatorEndpoint, [
                    'genPowerCfg',
                    'ssIasZone'
                ]);
            };
        },
    
        exposes: [
            e.contact(),
            e.battery(),
            e.voltage()
        ]
    },
    {
        zigbeeModel: ['ITCMDR_Click'],
        model: 'ITCMDR_Click',
        vendor: 'IT Commander',
        description: '[Button](https://sumju.net)',
        fromZigbee: [fz.ignore_basic_report, fz.ptvo_multistate_action],
        toZigbee: [],
        exposes: [e.action(['single', 'double', 'triple', 'hold', 'release']), e.battery()],
    },
];
