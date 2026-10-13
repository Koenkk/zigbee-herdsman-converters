import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";
import {batteryVoltageToPercentage} from "../lib/utils";

const e = exposes.presets;

const fzLocal = {
    plaid_battery: {
        cluster: "genPowerCfg",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};
            if (msg.data.mainsVoltage !== undefined) {
                payload.voltage = msg.data.mainsVoltage;

                if (model.meta?.battery?.voltageToPercentage) {
                    payload.battery = batteryVoltageToPercentage(payload.voltage, model.meta.battery.voltageToPercentage);
                }
            }
            return payload;
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["readResponse", "attributeReport"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "PS-SPRZMS-SLP3", manufacturerName: "PLAID SYSTEMS"}],
        zigbeeModel: ["PS-SPRZMS-SLP3"],
        model: "PS-SPRZMS-SLP3",
        vendor: "PLAID SYSTEMS",
        description: "Spruce temperature and moisture sensor",
        toZigbee: [],
        fromZigbee: [fz.temperature, fz.humidity, fzLocal.plaid_battery],
        exposes: [e.humidity(), e.temperature(), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "msRelativeHumidity", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            device.powerSource = "Battery";
        },
    },
];
