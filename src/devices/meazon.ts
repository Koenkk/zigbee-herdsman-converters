import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;

interface MeazonSeMetering {
    attributes: {
        atr1: number;
        lineFrequency: number;
        // power: number;
        // volatge: number;
    };
    commands: never;
    commandResponses: never;
}

const meazonExtend = {
    meazonSeMeteringCluster: () =>
        m.deviceAddCustomCluster("seMetering", {
            name: "seMetering",
            ID: Zcl.Clusters.seMetering.ID,
            attributes: {
                atr1: {name: "atr1", ID: 0x1005, type: Zcl.DataType.UINT48},
                lineFrequency: {name: "lineFrequency", ID: 0x2000, type: Zcl.DataType.INT16},
                // power:  {name: "power", ID: 0x2001, type: Zcl.DataType.INT16},  // 8193
                // voltage:  {name: "voltage", ID: 0x2004, type: Zcl.DataType.INT16},  // 8196
            },
            commands: {},
            commandsResponse: {},
        }),
};

const fzLocal = {
    meazon_meter: {
        cluster: "seMetering",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            // typo on property name to stick with zcl definition
            if (msg.data.inletTempreature !== undefined) {
                result.inlet_temperature = utils.precisionRound(msg.data.inletTempreature, 2);
                result.inletTemperature = result.inlet_temperature; // deprecated
            }

            if (msg.data.status !== undefined) {
                result.status = utils.precisionRound(msg.data.status, 2);
            }

            if (msg.data.lineFrequency !== undefined) {
                result.line_frequency = utils.precisionRound(msg.data.lineFrequency / 100.0, 2);
                result.linefrequency = result.line_frequency; // deprecated
            }

            if (msg.data["8193"] !== undefined) {
                result.power = utils.precisionRound(msg.data["8193"] as number, 2);
            }

            if (msg.data["8196"] !== undefined) {
                result.voltage = utils.precisionRound(msg.data["8196"] as number, 2);
            }

            if (msg.data["8213"] !== undefined) {
                result.voltage = utils.precisionRound(msg.data["8213"] as number, 2);
            }

            if (msg.data["8199"] !== undefined) {
                result.current = utils.precisionRound(msg.data["8199"] as number, 2);
            }

            if (msg.data["8216"] !== undefined) {
                result.current = utils.precisionRound(msg.data["8216"] as number, 2);
            }

            if (msg.data["8202"] !== undefined) {
                result.reactive_power = utils.precisionRound(msg.data["8202"] as number, 2);
                result.reactivepower = result.reactive_power; // deprecated
            }

            if (msg.data["12288"] !== undefined) {
                result.energy_consumed = utils.precisionRound(msg.data["12288"] as number, 2); // deprecated
                result.energyconsumed = result.energy_consumed; // deprecated
                result.energy = result.energy_consumed;
            }

            if (msg.data["12291"] !== undefined) {
                result.energy_produced = utils.precisionRound(msg.data["12291"] as number, 2);
                result.energyproduced = result.energy_produced; // deprecated
            }

            if (msg.data["12294"] !== undefined) {
                result.reactive_summation = utils.precisionRound(msg.data["12294"] as number, 2);
                result.reactivesummation = result.reactive_summation; // deprecated
            }

            if (msg.data["16408"] !== undefined) {
                result.measure_serial = utils.precisionRound(msg.data["16408"] as number, 2);
                result.measureserial = result.measure_serial; // deprecated
            }

            return result;
        },
    } satisfies Fz.Converter<"seMetering", MeazonSeMetering, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["101.301.001649", "101.301.001838", "101.301.001802", "101.301.001738", "101.301.001412", "101.301.001765", "101.301.001814"],
        model: "MEAZON_BIZY_PLUG",
        vendor: "Meazon",
        description: "Bizy plug meter",
        extend: [meazonExtend.meazonSeMeteringCluster()],
        fromZigbee: [fz.command_on, fz.command_off, fz.on_off, fzLocal.meazon_meter],
        exposes: [e.switch(), e.power(), e.voltage(), e.current(), e.energy()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint, {min: 1, max: 0xfffe});
            const options = {manufacturerCode: Zcl.ManufacturerCode.MEAZON_S_A, disableDefaultResponse: false};
            await endpoint.write<"seMetering", MeazonSeMetering>("seMetering", {atr1: 0x063e}, options);
            await endpoint.configureReporting<"seMetering", MeazonSeMetering>(
                "seMetering",
                reporting.payload<"seMetering", MeazonSeMetering>("lineFrequency", 1, constants.repInterval.MINUTES_5, 1),
                options,
            );
        },
    },
    {
        zigbeeModel: ["102.106.000235", "102.106.001111", "102.106.000348", "102.106.000256", "102.106.001242", "102.106.000540"],
        model: "MEAZON_DINRAIL",
        vendor: "Meazon",
        description: "DinRail 1-phase meter",
        extend: [meazonExtend.meazonSeMeteringCluster()],
        fromZigbee: [fz.command_on, fz.command_off, fz.on_off, fzLocal.meazon_meter],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            const options = {manufacturerCode: Zcl.ManufacturerCode.MEAZON_S_A, disableDefaultResponse: false};
            await endpoint.write<"seMetering", MeazonSeMetering>("seMetering", {atr1: 0x063e}, options);
            await reporting.onOff(endpoint);
            await endpoint.configureReporting(
                "seMetering",
                reporting.payload<"seMetering", MeazonSeMetering>("lineFrequency", 1, constants.repInterval.MINUTES_5, 1),
                options,
            );
        },
    },
];
