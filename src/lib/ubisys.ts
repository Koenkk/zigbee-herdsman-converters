import {Fz, Tz, ModernExtend} from './types';
import {presets as e, access as ea} from './exposes';
import {numeric, NumericArgs, setupConfigureForReporting, ReportingConfigWithoutAttribute} from './modernExtend';
import {Zcl} from 'zigbee-herdsman';

export const ubisysModernExtend = {
    localTemperatureOffset: (args?: Partial<NumericArgs>) => numeric({
        name: 'local_temperature_offset',
        cluster: 'hvacThermostat',
        attribute: 'ubisysTemperatureOffset',
        description: 'Specifies the temperature offset for the locally measured temperature value.',
        scale: 100,
        valueStep: 0.5, // H1 interface uses 0.5 step
        valueMin: -10,
        valueMax: 10,
        unit: 'ºC',
        ...args,
    }),
    occupiedHeatingSetpointDefault: (args?: Partial<NumericArgs>) => numeric({
        name: 'occupied_heating_default_setpoint',
        cluster: 'hvacThermostat',
        attribute: 'ubisysDefaultOccupiedHeatingSetpoint',
        description: 'Specifies the default heating setpoint during occupancy, ' +
            'representing the targeted temperature when a recurring weekly schedule ends without a follow-up schedule.',
        scale: 100,
        valueStep: 0.5, // H1 interface uses 0.5 step
        valueMin: 7,
        valueMax: 30,
        unit: 'ºC',
        ...args,
    }),
    remoteTemperature: (args?: Partial<NumericArgs>) => numeric({
        name: 'remote_temperature',
        cluster: 'hvacThermostat',
        attribute: 'ubisysRemoteTemperature',
        description: 'Indicates the remotely measured temperature value, accessible through attribute reports. ' +
            'For heating regulation, a received remote temperature value, as long as valid, takes precedence over the locally measured one.',
        scale: 100,
        unit: 'ºC',
        readOnly: true,
        ...args,
    }),
    remoteTemperatureDuration: (args?: Partial<NumericArgs>) => numeric({
        name: 'remote_temperature_duration',
        cluster: 'hvacThermostat',
        attribute: 'ubisysRemoteTemperatureValidDuration',
        description: 'Specifies the duration period in seconds, during which a remotely measured temperature value ' +
            'remains valid since its reception as attribute report.',
        valueMin: 0,
        valueMax: 86400,
        unit: 's',
        ...args,
    }),
    vacationMode: (): ModernExtend => {
        const clusterName = 'hvacThermostat';
        const writeableAttributeName = 'ubisysVacationMode';
        const readableAttributeName = 'occupancy';
        const propertyName = 'vacation_mode';

        const expose = e.binary(propertyName, ea.ALL, true, false)
            .withDescription('When Vacation Mode is active the schedule is disabled and unoccupied_heating_setpoint is used.');

        const fromZigbee: Fz.Converter[] = [{
            cluster: clusterName,
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty(readableAttributeName)) {
                    return {[propertyName]: (msg.data.occupancy === 0)};
                }
            },
        }];

        const toZigbee: Tz.Converter[] = [{
            key: [propertyName],
            convertSet: async (entity, key, value, meta) => {
                if (typeof value === 'boolean') {
                    // NOTE: DataType is boolean in zcl definition as per the device technical reference
                    //       passing a boolean type 'value' throws INVALID_DATA_TYPE, we need to pass 1 (true) or 0 (false)
                    //       ZCL DataType used does still need to be 0x0010 (Boolean)
                    await entity.write(clusterName, {[writeableAttributeName]: value ? 1 : 0}, {manufacturerCode: Zcl.ManufacturerCode.UBISYS});
                } else {
                    meta.logger.error(`${propertyName} must be a boolean!`);
                }
            },
            convertGet: async (entity, key, meta) => {
                await entity.read(clusterName, [readableAttributeName]);
            },
        }];

        const configure = setupConfigureForReporting(
            clusterName,
            readableAttributeName,
            undefined,
            {min: 0, max: '1_HOUR', change: 0} as ReportingConfigWithoutAttribute,
        );

        return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
    },
};
