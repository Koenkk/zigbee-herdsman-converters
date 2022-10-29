const {repInterval} = require('./constants');

function payload(attribute, min, max, change, overrides) {
    const payload = {
        attribute: attribute,
        minimumReportInterval: min,
        maximumReportInterval: max,
        reportableChange: change,
    };


    if (overrides) {
        if (overrides.hasOwnProperty('min')) payload.minimumReportInterval = overrides.min;
        if (overrides.hasOwnProperty('max')) payload.maximumReportInterval = overrides.max;
        if (overrides.hasOwnProperty('change')) payload.reportableChange = overrides.change;
    }

    return [payload];
}

// Fix the problem that commit #3839 introduced.
// You can set readFrequencyAttrs = true if the device support acFrequencyDivisor and acFrequencyMultiplier
// See Develco.js SPLZB-132 for example
async function readEletricalMeasurementMultiplierDivisors(endpoint, readFrequencyAttrs = false) {
    // Split into three chunks, some devices fail to respond when reading too much attributes at once.
    await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier']);
    await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor']);
    // Only read frequency multiplier/devisor when enabled as not all devices support this.
    if (readFrequencyAttrs) {
        await endpoint.read('haElectricalMeasurement', ['acFrequencyDivisor', 'acFrequencyMultiplier']);
    }
}

async function readMeteringMultiplierDivisor(endpoint) {
    await endpoint.read('seMetering', ['multiplier', 'divisor']);
}

async function bind(endpoint, target, clusters) {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
}

module.exports = {
    payload,
    bind,
    readEletricalMeasurementMultiplierDivisors,
    readMeteringMultiplierDivisor,
    currentPositionLiftPercentage: async (endpoint, overrides) => {
        const p = payload('currentPositionLiftPercentage', 1, repInterval.MAX, 1, overrides);
        await endpoint.configureReporting('closuresWindowCovering', p);
    },
    currentPositionTiltPercentage: async (endpoint, overrides) => {
        const p = payload('currentPositionTiltPercentage', 1, repInterval.MAX, 1, overrides);
        await endpoint.configureReporting('closuresWindowCovering', p);
    },
    batteryPercentageRemaining: async (endpoint, overrides) => {
        const p = payload(
            'batteryPercentageRemaining', repInterval.HOUR, repInterval.MAX, 0, overrides,
        );
        await endpoint.configureReporting('genPowerCfg', p);
        await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
    },
    batteryVoltage: async (endpoint, overrides) => {
        const p = payload('batteryVoltage', repInterval.HOUR, repInterval.MAX, 0, overrides);
        await endpoint.configureReporting('genPowerCfg', p);
        await endpoint.read('genPowerCfg', ['batteryVoltage']);
    },
    batteryAlarmState: async (endpoint, overrides) => {
        const p = payload('batteryAlarmState', repInterval.HOUR, repInterval.MAX, 0, overrides);
        await endpoint.configureReporting('genPowerCfg', p);
    },
    onOff: async (endpoint, overrides) => {
        const p = payload('onOff', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('genOnOff', p);
    },
    lockState: async (endpoint, overrides) => {
        const p = payload('lockState', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('closuresDoorLock', p);
    },
    doorState: async (endpoint, overrides) => {
        const p = payload('doorState', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('closuresDoorLock', p);
    },
    brightness: async (endpoint, overrides) => {
        const p = payload('currentLevel', 0, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('genLevelCtrl', p);
    },
    colorTemperature: async (endpoint, overrides) => {
        const p = payload('colorTemperature', 0, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('lightingColorCtrl', p);
    },
    occupancy: async (endpoint, overrides) => {
        const p = payload('occupancy', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('msOccupancySensing', p);
    },
    temperature: async (endpoint, overrides) => {
        const p = payload('measuredValue', 10, repInterval.HOUR, 100, overrides);
        await endpoint.configureReporting('msTemperatureMeasurement', p);
    },
    co2: async (endpoint, overrides) => {
        const p = payload('measuredValue', 10, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('msCO2', p);
    },
    deviceTemperature: async (endpoint, overrides) => {
        const p = payload('currentTemperature', 300, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('genDeviceTempCfg', p);
    },
    pressure: async (endpoint, overrides) => {
        const p = payload('measuredValue', 10, repInterval.HOUR, 5, overrides);
        await endpoint.configureReporting('msPressureMeasurement', p);
    },
    pressureExtended: async (endpoint, overrides) => {
        const p = payload('scaledValue', 10, repInterval.HOUR, 5, overrides);
        await endpoint.configureReporting('msPressureMeasurement', p);
    },
    illuminance: async (endpoint, overrides) => {
        const p = payload('measuredValue', 10, repInterval.HOUR, 5, overrides);
        await endpoint.configureReporting('msIlluminanceMeasurement', p);
    },
    instantaneousDemand: async (endpoint, overrides) => {
        const p = payload('instantaneousDemand', 5, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('seMetering', p);
    },
    currentSummDelivered: async (endpoint, overrides) => {
        const p = payload('currentSummDelivered', 5, repInterval.HOUR, [1, 1], overrides);
        await endpoint.configureReporting('seMetering', p);
    },
    currentSummReceived: async (endpoint, overrides) => {
        const p = payload('currentSummReceived', 5, repInterval.HOUR, [1, 1], overrides);
        await endpoint.configureReporting('seMetering', p);
    },
    thermostatSystemMode: async (endpoint, overrides) => {
        const p = payload('systemMode', 10, repInterval.HOUR, null, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    humidity: async (endpoint, overrides) => {
        const p = payload('measuredValue', 10, repInterval.HOUR, 100, overrides);
        await endpoint.configureReporting('msRelativeHumidity', p);
    },
    thermostatKeypadLockMode: async (endpoint, overrides) => {
        const p = payload('keypadLockout', 10, repInterval.HOUR, null, overrides);
        await endpoint.configureReporting('hvacUserInterfaceCfg', p);
    },
    thermostatTemperature: async (endpoint, overrides) => {
        const p = payload('localTemp', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatTemperatureCalibration: async (endpoint, overrides) => {
        const p = payload('localTemperatureCalibration', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatOccupiedHeatingSetpoint: async (endpoint, overrides) => {
        const p = payload('occupiedHeatingSetpoint', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatUnoccupiedHeatingSetpoint: async (endpoint, overrides) => {
        const p = payload('unoccupiedHeatingSetpoint', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatOccupiedCoolingSetpoint: async (endpoint, overrides) => {
        const p = payload('occupiedCoolingSetpoint', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatUnoccupiedCoolingSetpoint: async (endpoint, overrides) => {
        const p = payload('unoccupiedCoolingSetpoint', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatPIHeatingDemand: async (endpoint, overrides) => {
        const p = payload('pIHeatingDemand', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatRunningState: async (endpoint, overrides) => {
        const p = payload('runningState', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatRunningMode: async (endpoint, overrides) => {
        const p = payload('runningMode', 10, repInterval.HOUR, null, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatOcupancy: async (endpoint, overrides) => {
        const p = payload('ocupancy', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatTemperatureSetpointHold: async (endpoint, overrides) => {
        const p = payload('tempSetpointHold', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatTemperatureSetpointHoldDuration: async (endpoint, overrides) => {
        const p = payload('tempSetpointHoldDuration', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    thermostatAcLouverPosition: async (endpoint, overrides) => {
        const p = payload('acLouverPosition', 0, repInterval.HOUR, null, overrides);
        await endpoint.configureReporting('hvacThermostat', p);
    },
    presentValue: async (endpoint, overrides) => {
        const p = payload('presentValue', 10, repInterval.MINUTE, 1, overrides);
        await endpoint.configureReporting('genBinaryInput', p);
    },
    activePower: async (endpoint, overrides) => {
        const p = payload('activePower', 5, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', p);
    },
    rmsCurrent: async (endpoint, overrides) => {
        const p = payload('rmsCurrent', 5, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', p);
    },
    rmsVoltage: async (endpoint, overrides) => {
        const p = payload('rmsVoltage', 5, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', p);
    },
    powerFactor: async (endpoint, overrides) => {
        const p = payload('powerFactor', 0, repInterval.MAX, 1, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', p);
    },
    fanMode: async (endpoint, overrides) => {
        const p = payload('fanMode', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacFanCtrl', p);
    },
    soil_moisture: async (endpoint, overrides) => {
        const p = payload('measuredValue', 10, repInterval.HOUR, 100, overrides);
        await endpoint.configureReporting('msSoilMoisture', p);
    },
    acFrequency: async (endpoint, overrides) => {
        const p = payload('acFrequency', 5, repInterval.MINUTES_5, 10, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', p);
    },
};
