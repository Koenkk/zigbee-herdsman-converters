import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const endpoints = {
    silent_mode: 8,
    heating_cooling: 9,
    electric_valve: 10,
};

const states = {
    silent_mode: ["inactive", "active"],
    heating_cooling: ["heating", "cooling"],
    electric_valve: ["off", "on"],
};

const fzLocal = {
    binary_output: {
        cluster: "genBinaryOutput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            return {state: msg.data.presentValue === 1 ? msg.data.activeText : msg.data.inactiveText};
        },
    } satisfies Fz.Converter<"genBinaryOutput", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    fan_mode: {
        ...tz.fan_mode,
        convertSet: async (entity, key, value, meta) => {
            if (String(value).toLowerCase() === "on") value = "high";
            return await tz.fan_mode.convertSet(entity, key, value, meta);
        },
    } satisfies Tz.Converter,
    binary_output: {
        key: Object.keys(endpoints),
        convertSet: async (entity, key, value, meta) => {
            const ep = meta.device.getEndpoint(utils.getFromLookup(key, endpoints));
            const currentStates = utils.getFromLookup(key, states);
            const newState = currentStates.indexOf(String(value));
            const payload = {85: {value: newState, type: 0x10}};
            await ep.write("genBinaryOutput", payload);
            const state = {state: {}};
            const normalizedKey = key.replace("/", "_").replace(" ", "_").toLowerCase();
            state.state = {[normalizedKey]: value};
            return state;
        },
        convertGet: async (entity, key, meta) => {
            const ep = meta.device.getEndpoint(utils.getFromLookup(key, endpoints));
            await ep.read("genBinaryOutput", ["presentValue", "activeText", "inactiveText", "description"]);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZC0101"],
        model: "ZC0101",
        vendor: "MultiTerm",
        description: "ZeeFan fan coil unit controller",
        extend: [m.deviceEndpoints({endpoints: {"8": 8, "9": 9, "10": 10}})],
        meta: {multiEndpoint: true},
        fromZigbee: [fz.fan, fzLocal.binary_output],
        toZigbee: [tzLocal.fan_mode, tzLocal.binary_output],
        exposes: [
            e.fan().withState("fan_state").withModes(["off", "low", "medium", "high", "on"]).withLabel("Fan Control"),
            e.enum("silent_mode", ea.ALL, states.silent_mode).withLabel("Silent mode").withCategory("config"),
            e.enum("heating_cooling", ea.ALL, states.heating_cooling).withLabel("Heating/Cooling").withCategory("config"),
            e.enum("electric_valve", ea.ALL, states.electric_valve).withLabel("Electric Valve").withCategory("config"),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const fanEp = device.getEndpoint(endpoints.silent_mode);
            const hcEp = device.getEndpoint(endpoints.heating_cooling);
            const evEp = device.getEndpoint(endpoints.electric_valve);
            await reporting.bind(fanEp, coordinatorEndpoint, ["genBinaryOutput"]);
            await reporting.bind(fanEp, coordinatorEndpoint, ["hvacFanCtrl"]);
            await reporting.bind(hcEp, coordinatorEndpoint, ["genBinaryOutput"]);
            await reporting.bind(evEp, coordinatorEndpoint, ["genBinaryOutput"]);
        },
    },
];
