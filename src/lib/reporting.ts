import type {ConfigureReportingItem} from "zigbee-herdsman/dist/controller/model/endpoint";
import type {TCustomCluster} from "zigbee-herdsman/dist/controller/tstype";
import {repInterval} from "./constants";
import type {Reporting, Zh} from "./types";

export function payload<Cl extends number | string, Custom extends TCustomCluster | undefined = undefined>(
    attribute: ConfigureReportingItem<Cl, Custom>["attribute"],
    min: number,
    max: number,
    change: number,
    overrides?: Reporting.Override,
): ConfigureReportingItem<Cl, Custom>[] {
    const payload = {
        attribute: attribute,
        minimumReportInterval: min,
        maximumReportInterval: max,
        reportableChange: change,
    };

    if (overrides) {
        if (overrides.min !== undefined) payload.minimumReportInterval = overrides.min;
        if (overrides.max !== undefined) payload.maximumReportInterval = overrides.max;
        if (overrides.change !== undefined) payload.reportableChange = overrides.change;
    }

    return [payload];
}

// Fix the problem that commit #3839 introduced.
// You can set readFrequencyAttrs = true if the device support acFrequencyDivisor and acFrequencyMultiplier
// See Develco.js SPLZB-132 for example
export async function readEletricalMeasurementMultiplierDivisors(endpoint: Zh.Endpoint, readFrequencyAttrs = false) {
    // Split into three chunks, some devices fail to respond when reading too much attributes at once.
    await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor", "acCurrentMultiplier"]);
    await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor", "acPowerMultiplier", "acPowerDivisor"]);
    // Only read frequency multiplier/divisor when enabled as not all devices support this.
    if (readFrequencyAttrs) {
        await endpoint.read("haElectricalMeasurement", ["acFrequencyDivisor", "acFrequencyMultiplier"]);
    }
}

export async function readMeteringMultiplierDivisor(endpoint: Zh.Endpoint) {
    await endpoint.read("seMetering", ["multiplier", "divisor"]);
}

export async function bind(endpoint: Zh.Endpoint, target: Zh.Endpoint, clusters: (number | string)[] | readonly (number | string)[]) {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
}

export const currentPositionLiftPercentage = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"closuresWindowCovering">("currentPositionLiftPercentage", 1, repInterval.MAX, 1, overrides);
    await endpoint.configureReporting("closuresWindowCovering", p);
};
export const currentPositionTiltPercentage = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"closuresWindowCovering">("currentPositionTiltPercentage", 1, repInterval.MAX, 1, overrides);
    await endpoint.configureReporting("closuresWindowCovering", p);
};
export const batteryPercentageRemaining = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"genPowerCfg">("batteryPercentageRemaining", repInterval.HOUR, repInterval.MAX, 0, overrides);
    await endpoint.configureReporting("genPowerCfg", p);
    await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
};
export const batteryVoltage = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"genPowerCfg">("batteryVoltage", repInterval.HOUR, repInterval.MAX, 0, overrides);
    await endpoint.configureReporting("genPowerCfg", p);
    await endpoint.read("genPowerCfg", ["batteryVoltage"]);
};
export const batteryAlarmState = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"genPowerCfg">("batteryAlarmState", repInterval.HOUR, repInterval.MAX, 0, overrides);
    await endpoint.configureReporting("genPowerCfg", p);
    await endpoint.read("genPowerCfg", ["batteryAlarmState"]);
};
export const onOff = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"genOnOff">("onOff", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("genOnOff", p);
};
export const onTime = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"genOnOff">("onTime", 0, repInterval.HOUR, 40, overrides);
    await endpoint.configureReporting("genOnOff", p);
};
export const lockState = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"closuresDoorLock">("lockState", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("closuresDoorLock", p);
};
export const doorState = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"closuresDoorLock">("doorState", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("closuresDoorLock", p);
};
export const brightness = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"genLevelCtrl">("currentLevel", 1, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("genLevelCtrl", p);
};
export const colorTemperature = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"lightingColorCtrl">("colorTemperature", 0, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("lightingColorCtrl", p);
};
export const occupancy = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"msOccupancySensing">("occupancy", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("msOccupancySensing", p);
};
export const temperature = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"msTemperatureMeasurement">("measuredValue", 10, repInterval.HOUR, 100, overrides);
    await endpoint.configureReporting("msTemperatureMeasurement", p);
};
export const co2 = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"msCO2">("measuredValue", 10, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("msCO2", p);
};
export const deviceTemperature = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"genDeviceTempCfg">("currentTemperature", 300, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("genDeviceTempCfg", p);
};
export const pressure = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"msPressureMeasurement">("measuredValue", 10, repInterval.HOUR, 5, overrides);
    await endpoint.configureReporting("msPressureMeasurement", p);
};
export const pressureExtended = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"msPressureMeasurement">("scaledValue", 10, repInterval.HOUR, 5, overrides);
    await endpoint.configureReporting("msPressureMeasurement", p);
};
export const illuminance = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"msIlluminanceMeasurement">("measuredValue", 10, repInterval.HOUR, 5, overrides);
    await endpoint.configureReporting("msIlluminanceMeasurement", p);
};
export const instantaneousDemand = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"seMetering">("instantaneousDemand", 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("seMetering", p);
};
export const currentSummDelivered = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"seMetering">("currentSummDelivered", 5, repInterval.HOUR, 257, overrides);
    await endpoint.configureReporting("seMetering", p);
};
export const currentSummReceived = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"seMetering">("currentSummReceived", 5, repInterval.HOUR, 257, overrides);
    await endpoint.configureReporting("seMetering", p);
};
export const thermostatSystemMode = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("systemMode", 10, repInterval.HOUR, null, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const humidity = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"msRelativeHumidity">("measuredValue", 10, repInterval.HOUR, 100, overrides);
    await endpoint.configureReporting("msRelativeHumidity", p);
};
export const thermostatKeypadLockMode = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacUserInterfaceCfg">("keypadLockout", 10, repInterval.HOUR, null, overrides);
    await endpoint.configureReporting("hvacUserInterfaceCfg", p);
};
export const thermostatTemperature = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("localTemp", 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatTemperatureCalibration = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("localTemperatureCalibration", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatOccupiedHeatingSetpoint = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("occupiedHeatingSetpoint", 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatUnoccupiedHeatingSetpoint = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("unoccupiedHeatingSetpoint", 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatOccupiedCoolingSetpoint = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("occupiedCoolingSetpoint", 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatUnoccupiedCoolingSetpoint = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("unoccupiedCoolingSetpoint", 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatPIHeatingDemand = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("pIHeatingDemand", 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatPICoolingDemand = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("pICoolingDemand", 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatRunningState = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("runningState", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatRunningMode = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("runningMode", 10, repInterval.HOUR, null, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatOccupancy = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("occupancy", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatTemperatureSetpointHold = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("tempSetpointHold", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatTemperatureSetpointHoldDuration = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("tempSetpointHoldDuration", 0, repInterval.HOUR, 10, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const thermostatAcLouverPosition = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacThermostat">("acLouverPosition", 0, repInterval.HOUR, null, overrides);
    await endpoint.configureReporting("hvacThermostat", p);
};
export const presentValue = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"genBinaryInput">("presentValue", 10, repInterval.MINUTE, 1, overrides);
    await endpoint.configureReporting("genBinaryInput", p);
};
export const activePower = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"haElectricalMeasurement">("activePower", 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("haElectricalMeasurement", p);
};
export const reactivePower = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"haElectricalMeasurement">("reactivePower", 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("haElectricalMeasurement", p);
};
export const apparentPower = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"haElectricalMeasurement">("apparentPower", 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("haElectricalMeasurement", p);
};
export const rmsCurrent = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"haElectricalMeasurement">("rmsCurrent", 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("haElectricalMeasurement", p);
};
export const rmsVoltage = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"haElectricalMeasurement">("rmsVoltage", 5, repInterval.HOUR, 1, overrides);
    await endpoint.configureReporting("haElectricalMeasurement", p);
};
export const powerFactor = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"haElectricalMeasurement">("powerFactor", 0, repInterval.MAX, 1, overrides);
    await endpoint.configureReporting("haElectricalMeasurement", p);
};
export const fanMode = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"hvacFanCtrl">("fanMode", 0, repInterval.HOUR, 0, overrides);
    await endpoint.configureReporting("hvacFanCtrl", p);
};
export const soil_moisture = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"msSoilMoisture">("measuredValue", 10, repInterval.HOUR, 100, overrides);
    await endpoint.configureReporting("msSoilMoisture", p);
};
export const acFrequency = async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
    const p = payload<"haElectricalMeasurement">("acFrequency", 5, repInterval.MINUTES_5, 10, overrides);
    await endpoint.configureReporting("haElectricalMeasurement", p);
};
