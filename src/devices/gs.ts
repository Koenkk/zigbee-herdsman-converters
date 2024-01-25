import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['SSHM-I1'],
        model: 'SSHM-I1',
        vendor: 'GS',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['BRHM8E27W70-I1'],
        model: 'BRHM8E27W70-I1',
        vendor: 'GS',
        description: 'Smart dimmable, RGB + white (E27 & B22)',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['SKHMP30-I1'],
        model: 'SKHMP30-I1',
        description: 'Smart metering plug',
        vendor: 'GS',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 100,
                acCurrentMultiplier: 1, acCurrentDivisor: 100,
                acPowerMultiplier: 1, acPowerDivisor: 10,
            });
        },
    },
];

export default definitions;
module.exports = definitions;
