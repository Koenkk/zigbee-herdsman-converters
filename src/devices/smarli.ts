import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as sunricher from "../lib/sunricher";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["S-ZB-PDM1-R251"],
        model: "S-ZB-PDM1-R251",
        vendor: "smarli.",
        description: "Phase dimmer gen 1",
        extend: [m.light({configureReporting: true}), m.electricityMeter(), sunricher.extend.externalSwitchType(), sunricher.extend.minimumPWM()],
    },
    {
        zigbeeModel: ["S-ZB-1RE1-R251"],
        model: "S-ZB-1RE1-R251",
        vendor: "smarli.",
        description: "Zigbee 2ch smart relay",
        extend: [
            m.identify(),
            m.commandsScenes({endpointNames: ["1", "2"]}),
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2"], configureReporting: true}),
            m.electricityMeter({endpointNames: ["3"]}),
        ],
    },
    {
        zigbeeModel: ["S-ZB-COV1-R251"],
        model: "S-ZB-COV1-R251",
        vendor: "smarli.",
        description: "Zigbee curtain control module",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3}}),
            m.windowCovering({
                controls: ["lift", "tilt"],
                coverInverted: true,
                configureReporting: true,
                endpointNames: ["1"],
            }),
            m.electricityMeter({endpointNames: ["3"]}),
            m.enumLookup({
                name: "curtain_type",
                cluster: "closuresWindowCovering",
                attribute: {ID: 0x1000, type: Zcl.DataType.ENUM8},
                lookup: {
                    normal: 0,
                    venetian_blind: 1,
                },
                description: "Configure curtain type",
                access: "ALL",
                entityCategory: "config",
            }),
            sunricher.extend.motorControl(),
            m.identify(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
            await reporting.currentPositionTiltPercentage(endpoint);
        },
    },
];
