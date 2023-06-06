/* eslint camelcase: 0 */
import {repInterval} from './constants';

interface Override {
    min?: number,
    max?: number,
    change?: number,
}

export function payload(attribute: string | number, min: number, max: number, change: number, overrides?: Override) {
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
export async function readEletricalMeasurementMultiplierDivisors(endpoint: zh.Endpoint, readFrequencyAttrs = false) {
    // Split into three chunks, some devices fail to respond when reading too much attributes at once.
    await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier']);
    await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor']);
    // Only read frequency multiplier/divisor when enabled as not all devices support this.
    if (readFrequencyAttrs) {
        await endpoint.read('haElectricalMeasurement', ['acFrequencyDivisor', 'acFrequencyMultiplier']);
    }
}

export async function readMeteringMultiplierDivisor(endpoint: zh.Endpoint) {
    await endpoint.read('seMetering', ['multiplier', 'divisor']);
}

export async function bind(endpoint: zh.Endpoint, target: zh.Endpoint, clusters: (number | string)[]) {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
}

export const currentPositionLiftPercentage = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('currentPositionLiftPercentage', 1, repInterval.MAX, 1, overrides);
    await endpoint.configureReporting('closuresWindowCovering', p);
};
export const currentPositionTiltPercentage = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('currentPositionTiltPercentage', 1, repInterval.MAX, 1, overrides);
    await endpoint.configureReporting('closuresWindowCovering', p);
};
export const batteryPercentageRemaining = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload(
        'batteryPercentageRemaining', repInterval.HOUR, repInterval.MAX, 0, overrides,
    );
    await endpoint.configureReporting('genPowerCfg', p);
    await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
};
export const batteryVoltage = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('batteryVoltage', repInterval.HOUR, repInterval.MAX, 0, overrides);
    await endpoint.configureReporting('genPowerCfg', p);
    await endpoint.read('genPowerCfg', ['batteryVoltage']);
};
export const batteryAlarmState = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('batteryAlarmState', repInterval.HOUR, repInterval.MAX, 0, overrides);
    await endpoint.configureReporting('genPowerCfg', p);
    await endpoint.read('genPowerCfg', ['batteryAlarmState']);
};
export const onOff = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('onOff', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('genOnOff', p);
};
export const lockState = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('lockState', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('closuresDoorLock', p);
};
export const doorState = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('doorState', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('closuresDoorLock', p);
};
export const brightness = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('currentLevel', 0, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('genLevelCtrl', p);
};
export const colorTemperature = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('colorTemperature', 0, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('lightingColorCtrl', p);
};
export const occupancy = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('occupancy', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('msOccupancySensing', p);
};
export const temperature = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('measuredValue', 10, repInterval.HOUR, 100, overrides);
    await endpoint.configureReporting('msTemperatureMeasurement', p);
};
export const co2 = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('measuredValue', 10, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('msCO2', p);
};
export const deviceTemperature = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('currentTemperature', 300, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('genDeviceTempCfg', p);
};
export const pressure = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('measuredValue', 10, repInterval.HOUR, 5, overrides);
    await endpoint.configureReporting('msPressureMeasurement', p);
};
export const pressureExtended = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('scaledValue', 10, repInterval.HOUR, 5, overrides);
    await endpoint.configureReporting('msPressureMeasurement', p);
};
export const illuminance = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('measuredValue', 10, repInterval.HOUR, 5, overrides);
    await endpoint.configureReporting('msIlluminanceMeasurement', p);
};
export const instantaneousDemand = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('instantaneousDemand', 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('seMetering', p);
};
export const currentSummDelivered = async (endpoint: zh.Endpoint, overrides?: Override) => {
    // @ts-expect-error
    const p = payload('currentSummDelivered', 5, repInterval.HOUR, [1, 1], overrides);
    await endpoint.configureReporting('seMetering', p);
};
export const currentSummReceived = async (endpoint: zh.Endpoint, overrides?: Override) => {
    // @ts-expect-error
    const p = payload('currentSummReceived', 5, repInterval.HOUR, [1, 1], overrides);
    await endpoint.configureReporting('seMetering', p);
};
export const thermostatSystemMode = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('systemMode', 10, repInterval.HOUR, null, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const humidity = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('measuredValue', 10, repInterval.HOUR, 100, overrides);
    await endpoint.configureReporting('msRelativeHumidity', p);
};
export const thermostatKeypadLockMode = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('keypadLockout', 10, repInterval.HOUR, null, overrides);
    await endpoint.configureReporting('hvacUserInterfaceCfg', p);
};
export const thermostatTemperature = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('localTemp', 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatTemperatureCalibration = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('localTemperatureCalibration', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatOccupiedHeatingSetpoint = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('occupiedHeatingSetpoint', 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatUnoccupiedHeatingSetpoint = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('unoccupiedHeatingSetpoint', 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatOccupiedCoolingSetpoint = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('occupiedCoolingSetpoint', 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatUnoccupiedCoolingSetpoint = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('unoccupiedCoolingSetpoint', 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatPIHeatingDemand = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('pIHeatingDemand', 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatRunningState = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('runningState', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatRunningMode = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('runningMode', 10, repInterval.HOUR, null, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatOccupancy = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('occupancy', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatTemperatureSetpointHold = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('tempSetpointHold', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatTemperatureSetpointHoldDuration = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('tempSetpointHoldDuration', 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const thermostatAcLouverPosition = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('acLouverPosition', 0, repInterval.HOUR, null, overrides);
    await endpoint.configureReporting('hvacThermostat', p);
};
export const presentValue = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('presentValue', 10, repInterval.MINUTE, 1, overrides);
    await endpoint.configureReporting('genBinaryInput', p);
};
export const activePower = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('activePower', 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('haElectricalMeasurement', p);
};
export const reactivePower = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('reactivePower', 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('haElectricalMeasurement', p);
};
export const apparentPower = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('apparentPower', 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('haElectricalMeasurement', p);
};
export const rmsCurrent = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('rmsCurrent', 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('haElectricalMeasurement', p);
};
export const rmsVoltage = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('rmsVoltage', 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting('haElectricalMeasurement', p);
};
export const powerFactor = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('powerFactor', 0, repInterval.MAX, 1, overrides);
    await endpoint.configureReporting('haElectricalMeasurement', p);
};
export const fanMode = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('fanMode', 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting('hvacFanCtrl', p);
};
export const soil_moisture = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('measuredValue', 10, repInterval.HOUR, 100, overrides);
    await endpoint.configureReporting('msSoilMoisture', p);
};
export const acFrequency = async (endpoint: zh.Endpoint, overrides?: Override) => {
    const p = payload('acFrequency', 5, repInterval.MINUTES_5, 10, overrides);
    await endpoint.configureReporting('haElectricalMeasurement', p);
};

module.exports = {
    payload,
    bind,
    readEletricalMeasurementMultiplierDivisors,
    readMeteringMultiplierDivisor,
    currentPositionLiftPercentage,
    currentPositionTiltPercentage,
    batteryPercentageRemaining,
    batteryVoltage,
    batteryAlarmState,
    onOff,
    lockState,
    doorState,
    brightness,
    colorTemperature,
    occupancy,
    temperature,
    co2,
    deviceTemperature,
    pressure,
    pressureExtended,
    illuminance,
    instantaneousDemand,
    currentSummDelivered,
    currentSummReceived,
    thermostatSystemMode,
    humidity,
    thermostatKeypadLockMode,
    thermostatTemperature,
    thermostatTemperatureCalibration,
    thermostatOccupiedHeatingSetpoint,
    thermostatUnoccupiedHeatingSetpoint,
    thermostatOccupiedCoolingSetpoint,
    thermostatUnoccupiedCoolingSetpoint,
    thermostatPIHeatingDemand,
    thermostatRunningState,
    thermostatRunningMode,
    thermostatOccupancy,
    thermostatTemperatureSetpointHold,
    thermostatTemperatureSetpointHoldDuration,
    thermostatAcLouverPosition,
    presentValue,
    activePower,
    reactivePower,
    apparentPower,
    rmsCurrent,
    rmsVoltage,
    powerFactor,
    fanMode,
    soil_moisture,
    acFrequency,
};
