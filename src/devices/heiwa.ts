import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;

interface HeiwaHvacThermostat {
    attributes: {
        heiwaSetpoint: number;
    };
    commands: never;
    commandResponses: never;
}

const heiwaHvacThermostatCluster = m.deviceAddCustomCluster("hvacThermostat", {
    name: "hvacThermostat",
    ID: Zcl.Clusters.hvacThermostat.ID,
    attributes: {
        heiwaSetpoint: {
            name: "heiwaSetpoint",
            ID: 0x046a,
            type: Zcl.DataType.UINT16,
            write: true,
            min: 180,
            max: 270,
        },
    },
    commands: {},
    commandsResponse: {},
});

const fzLocal = {
    thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const thermostat = fz.thermostat.convert(model, msg, publish, options, meta) as KeyValueAny;
            const result: KeyValueAny = {};

            if (thermostat?.local_temperature !== undefined) result.local_temperature = thermostat.local_temperature;
            if (msg.data.heiwaSetpoint !== undefined) result.current_heating_setpoint = msg.data.heiwaSetpoint / 10;

            return Object.keys(result).length === 0 ? undefined : result;
        },
    } satisfies Fz.Converter<"hvacThermostat", HeiwaHvacThermostat, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    current_heating_setpoint: {
        key: ["current_heating_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            if (!Number.isFinite(value) || value < 18 || value > 27 || Math.round(value * 2) !== value * 2) {
                throw new Error(`${key} must be between 18 and 27 °C in 0.5 °C increments, got ${value}`);
            }

            await entity.write<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", {heiwaSetpoint: value * 10});
            await entity.write("hvacThermostat", {
                occupiedCoolingSetpoint: (value - 1.5) * 100,
                occupiedHeatingSetpoint: (value + 1.5) * 100,
            });
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaSetpoint"]);
            await entity.read("hvacThermostat", ["occupiedCoolingSetpoint", "occupiedHeatingSetpoint"]);

            return {state: {current_heating_setpoint: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaSetpoint"]);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "Thermostat_RF_Model_00000000000", manufacturerName: "Eurevia"}],
        model: "HPZERAD-V1",
        vendor: "Heiwa",
        description: "Ernest thermostat (OEM Eurevia)",
        extend: [heiwaHvacThermostatCluster],
        fromZigbee: [fzLocal.thermostat],
        toZigbee: [tzLocal.current_heating_setpoint],
        exposes: [e.climate().withSetpoint("current_heating_setpoint", 18, 27, 0.5).withLocalTemperature()],
        endpoint: () => ({default: 25}),
    },
];
