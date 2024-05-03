import {Zcl} from 'zigbee-herdsman';
import {Definition, Fz, KeyValue, Publish} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import * as globalStore from '../lib/store';
import * as utils from '../lib/utils';
const e = exposes.presets;
const ea = exposes.access;

const kmpcilOptions={
    presence_timeout_dc: () => {
        return e.numeric('presence_timeout_dc', ea.STATE).withValueMin(60).withDescription(
            'Time in seconds after which presence is cleared after detecting it (default 60 seconds) while in DC.');
    },
    presence_timeout_battery: () => {
        return e.numeric('presence_timeout_battery', ea.STATE).withValueMin(120).withDescription(
            'Time in seconds after which presence is cleared after detecting it (default 420 seconds) while in Battery.');
    },
};

function handleKmpcilPresence(model: Definition, msg: Fz.Message, publish: Publish, options: KeyValue, meta: Fz.Meta): KeyValue {
    const useOptionsTimeoutBattery = options && options.hasOwnProperty('presence_timeout_battery');
    const timeoutBattery = useOptionsTimeoutBattery ? options.presence_timeout_battery : 420; // 100 seconds by default

    const useOptionsTimeoutDc = options && options.hasOwnProperty('presence_timeout_dc');
    const timeoutDc = useOptionsTimeoutDc ? options.presence_timeout_dc : 60;

    const mode = meta.state? meta.state['power_state'] : false;

    const timeout = Number(mode ? timeoutDc : timeoutBattery);
    // Stop existing timer because motion is detected and set a new one.
    clearTimeout(globalStore.getValue(msg.endpoint, 'timer'));
    const timer = setTimeout(() => publish({presence: false}), timeout * 1000);
    globalStore.putValue(msg.endpoint, 'timer', timer);

    return {presence: true};
}

const kmpcilConverters = {
    presence_binary_input: {
        cluster: 'genBinaryInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = handleKmpcilPresence(model, msg, publish, options, meta);
            if (msg.data.hasOwnProperty('presentValue')) {
                const presentValue = msg.data['presentValue'];
                payload.power_state = (presentValue & 0x01)> 0;
                payload.occupancy = (presentValue & 0x04) > 0;
                payload.vibration = (presentValue & 0x02) > 0;
            }
            return payload;
        },
    } satisfies Fz.Converter,
    presence_power: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        options: [kmpcilOptions.presence_timeout_dc(), kmpcilOptions.presence_timeout_battery()],
        convert: (model, msg, publish, options, meta) => {
            const payload = handleKmpcilPresence(model, msg, publish, options, meta);
            if (msg.data.hasOwnProperty('batteryVoltage')) {
                payload.voltage = msg.data['batteryVoltage'] * 100;
                if (model.meta && model.meta.battery && model.meta.battery.voltageToPercentage) {
                    // @ts-expect-error
                    payload.battery = utils.batteryVoltageToPercentage(payload.voltage, model.meta.battery.voltageToPercentage);
                }
            }
            return payload;
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['RES005'],
        model: 'KMPCIL_RES005',
        vendor: 'KMPCIL',
        description: 'Environment sensor',
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure(), e.illuminance().withAccess(ea.STATE_GET),
            e.illuminance_lux().withAccess(ea.STATE_GET), e.occupancy(), e.switch()],
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.pressure, fz.illuminance, fz.kmpcil_res005_occupancy,
            fz.kmpcil_res005_on_off],
        toZigbee: [tz.kmpcil_res005_on_off, tz.illuminance],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(8);
            const binds = ['genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement',
                'msIlluminanceMeasurement', 'genBinaryInput', 'genBinaryOutput'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            const payloadBattery = [{
                attribute: 'batteryPercentageRemaining', minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1}];
            await endpoint.configureReporting('genPowerCfg', payloadBattery);
            const payload = [{attribute: 'measuredValue', minimumReportInterval: 5, maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 200}];
            await endpoint.configureReporting('msIlluminanceMeasurement', payload);
            const payloadPressure = [{
                // 0 = measuredValue, override dataType from int16 to uint16
                // https://github.com/Koenkk/zigbee-herdsman/pull/191/files?file-filters%5B%5D=.ts#r456569398
                attribute: {ID: 0, type: Zcl.DataType.UINT16}, minimumReportInterval: 2, maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 3}];
            await endpoint.configureReporting('msPressureMeasurement', payloadPressure);
            const options = {disableDefaultResponse: true};
            await endpoint.write('genBinaryInput', {0x0051: {value: 0x01, type: 0x10}}, options);
            await endpoint.write('genBinaryInput', {0x0101: {value: 25, type: 0x23}}, options);
            const payloadBinaryInput = [{
                attribute: 'presentValue', minimumReportInterval: 0, maximumReportInterval: 30, reportableChange: 1}];
            await endpoint.configureReporting('genBinaryInput', payloadBinaryInput);
            await endpoint.write('genBinaryOutput', {0x0051: {value: 0x01, type: 0x10}}, options);
            const payloadBinaryOutput = [{
                attribute: 'presentValue', minimumReportInterval: 0, maximumReportInterval: 30, reportableChange: 1}];
            await endpoint.configureReporting('genBinaryOutput', payloadBinaryOutput);
        },
    },
    {
        zigbeeModel: ['tagv1'],
        model: 'KMPCIL-tag-001',
        vendor: 'KMPCIL',
        description: 'Arrival sensor',
        fromZigbee: [kmpcilConverters.presence_binary_input, kmpcilConverters.presence_power, fz.temperature],
        exposes: [e.battery(), e.presence(), e.binary('power_state', exposes.access.STATE, true, false),
            e.occupancy(), e.vibration(), e.temperature()],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_1500_2800'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            for (const cluster of ['msTemperatureMeasurement', 'genPowerCfg', 'genBinaryInput']) {
                // This sleep here(and the sleep) after is to allow the command to be
                // fully sent to coordinator.  In case repeater involved and the repeater
                // is litted in resources,  we may want to give some time so that the sequence of
                // commands does not overwhelm the repeater.
                await utils.sleep(2000);
                await endpoint.bind(cluster, coordinatorEndpoint);
            }

            await utils.sleep(1000);
            const p = reporting.payload('batteryVoltage', 0, 10, 1);
            await endpoint.configureReporting('genPowerCfg', p);

            await utils.sleep(1000);
            const p2 = reporting.payload('presentValue', 0, 300, 1);
            await endpoint.configureReporting('genBinaryInput', p2);

            await utils.sleep(1000);
            await reporting.temperature(endpoint);
            await endpoint.read('genBinaryInput', ['presentValue']);
        },
    },
];

export default definitions;
module.exports = definitions;
