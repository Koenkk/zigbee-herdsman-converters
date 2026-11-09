import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, ModernExtend} from "../lib/types";

const aristonExtend = {
    // ThermostatRunningMode does not follow the ZCL enum on this device (1 outside winter mode,
    // 4 in winter mode, whether heating or not), which makes fz.thermostat throw and drop the
    // other attributes of the message. Drop it since it does not reflect the running state.
    ignoreRunningMode: (): ModernExtend => {
        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    delete msg.data.runningMode;
                },
            } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
        ];
        return {fromZigbee, isModernExtend: true};
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Rem4 Heater"],
        model: "Rem4 Heater",
        vendor: "Ariston",
        description: "Boiler gateway (room thermostat interface)",
        // Only tested with a single zone thermostat (endpoint 2). The boiler supports up to 6 zones,
        // which probably appear as additional endpoints once their thermostats are connected.
        extend: [
            m.onOff({powerOnBehavior: false}),
            // Must come before m.thermostat() so the attribute is removed before fz.thermostat runs
            aristonExtend.ignoreRunningMode(),
            m.thermostat({
                localTemperature: {values: {description: "Room temperature measured by the boiler room unit"}},
                setpoints: {values: {occupiedHeatingSetpoint: {min: 8.5, max: 30, step: 0.5}}},
                systemMode: {values: ["off", "heat"]},
                ctrlSeqeOfOper: {values: ["heating_only"], toZigbee: {skip: true}},
            }),
            m.numeric({
                name: "outdoor_temperature",
                cluster: "hvacThermostat",
                attribute: "outdoorTemp",
                description: "Outdoor temperature known by the boiler",
                unit: "°C",
                scale: 100,
                precision: 1,
                access: "STATE_GET",
                reporting: false,
            }),
        ],
    },
];
