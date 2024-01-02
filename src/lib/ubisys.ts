import { numeric, NumericArgs } from './modernExtend';

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
        name: 'occupied_heating_setpoint_default',
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
};
