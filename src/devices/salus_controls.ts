import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface Salus {
    attributes: {
        frostSetpoint: number;
        minFrostSetpoint: number;
        maxFrostSetpoint: number;
        timeDisplayFormat: number;
        attr4: number;
        attr5: number;
        attr6: number;
        attr7: number;
        autoCoolingSetpoint: number;
        autoHeatingSetpoint: number;
        holdType: number;
        shortCycleProtection: number;
        coolingFanDelay: number;
        ruleCoolingSetpoint: number;
        ruleHeatingSetpoint: number;
        attr15: number;
    };
    commands: {
        resetDevice: Record<string, never>;
    };
    commandResponses: never;
}

interface SalusIt600 {
    attributes: never;
    commands: {syncRequest: {payload: Buffer}};
    commandResponses: {syncRequest: {payload: Buffer}; record: {payload: Buffer}; write: {payload: Buffer}; syncResponse: {payload: Buffer}};
}

const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    SP600_power: {
        cluster: "seMetering",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (meta.device.dateCode === "20160120") {
                // Cannot use metering, divisor/multiplier is not according to ZCL.
                // https://github.com/Koenkk/zigbee2mqtt/issues/2233
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/915

                const result: KeyValueAny = {};
                if (msg.data.instantaneousDemand !== undefined) {
                    result.power = msg.data.instantaneousDemand;
                }
                // Summation is reported in Watthours
                if (msg.data.currentSummDelivered !== undefined) {
                    const value = msg.data.currentSummDelivered;
                    result.energy = value / 1000.0;
                }
                return result;
            }
            return fz.metering.convert(model, msg, publish, options, meta);
        },
    } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
    it600_status: {
        cluster: "manuSpecificSalusIt600",
        type: "commandRecord",
        convert: (model, msg, publish, options, meta) => {
            const record = msg.data.payload;
            if (record[0] !== 0x71) return;
            const bcd = (offset: number, length = 2) => Number(record.subarray(offset, offset + length).toString("hex"));
            const result: KeyValueAny = {
                current_heating_setpoint: bcd(9) / 100,
                system_mode: record[3] === 7 ? "off" : record[15] === 3 ? "cool" : "heat",
                running_state: record[17] === 1 ? "heat" : "idle",
                child_lock: record[23] === 1 ? "LOCK" : "UNLOCK",
                humidity: bcd(24, 1),
            };
            const battery = [0, 10, 25, 50, 75, 100][record[49]];
            if (battery !== undefined) result.battery = battery;
            // 12.34 is a placeholder the thermostat regularly sends instead of a reading
            if (record.readUInt16BE(4) !== 0x1234) result.local_temperature = bcd(4) / 100;
            return result;
        },
    } satisfies Fz.Converter<"manuSpecificSalusIt600", SalusIt600, "commandRecord">,
};

// iT600 protocol: https://github.com/mikkelke/salus-zigbee/blob/main/PROTOCOL.md
const it600Payload = [{name: "payload", type: Zcl.BuffaloZclDataType.BUFFER}];
let it600Handle = 0;

const salusExtend = {
    addGatewayBasic: () =>
        m.deviceAddCustomCluster("genBasic", {
            name: "genBasic",
            ID: 0x0000,
            attributes: {
                manufacturerName: {name: "manufacturerName", ID: 0x0004, type: Zcl.DataType.CHAR_STR, default: "Computime", maxLen: 32},
                modelId: {name: "modelId", ID: 0x0005, type: Zcl.DataType.CHAR_STR, default: "SAU2AG1", maxLen: 32},
            },
            commands: {},
            commandsResponse: {},
        }),
    addIt600Cluster: () =>
        m.deviceAddCustomCluster("manuSpecificSalusIt600", {
            name: "manuSpecificSalusIt600",
            ID: 0xfc00,
            manufacturerCode: Zcl.ManufacturerCode.COMPUTIME,
            attributes: {},
            // The wiring centre sends client to server, the thermostat server to client.
            commands: {syncRequest: {name: "syncRequest", ID: 0x10, parameters: it600Payload}},
            commandsResponse: {
                syncRequest: {name: "syncRequest", ID: 0x10, parameters: it600Payload},
                record: {name: "record", ID: 0x31, parameters: it600Payload},
                write: {name: "write", ID: 0x32, parameters: it600Payload},
                syncResponse: {name: "syncResponse", ID: 0x81, parameters: it600Payload},
            },
        }),
    // The device leaves the network when its sync request is not answered.
    it600Sync: (deviceNumber: number, endpointId: number): ModernExtend => {
        const sendSyncResponse = async (endpoint: Zh.Endpoint) => {
            const payload = Buffer.alloc(15);
            payload[0] = deviceNumber;
            payload.writeUInt32LE(Math.round((Date.now() - constants.OneJanuary2000) / 1000 - new Date().getTimezoneOffset() * 60), 2);
            payload[6] = 0x02; // 24-hour clock, no DST
            payload[7] = 13; // UTC time zone, the time is local already
            payload.fill(0xff, 9, 13);
            payload[13] = 0x31;
            await endpoint.commandResponse<"manuSpecificSalusIt600", "syncResponse", SalusIt600>("manuSpecificSalusIt600", "syncResponse", {payload});
        };
        return {
            fromZigbee: [
                {
                    cluster: "manuSpecificSalusIt600",
                    type: "commandSyncRequest",
                    convert: async (model, msg, publish, options, meta) => {
                        await sendSyncResponse(msg.endpoint);
                    },
                } satisfies Fz.Converter<"manuSpecificSalusIt600", SalusIt600, "commandSyncRequest">,
            ],
            onEvent: [
                async (event) => {
                    if (event.type === "deviceAnnounce" || (event.type === "deviceInterview" && event.data.status === "successful")) {
                        const endpoint = event.data.device.getEndpoint(endpointId);
                        if (endpoint) await sendSyncResponse(endpoint);
                    }
                },
            ],
            isModernExtend: true,
        };
    },
};

async function it600Write(endpoint: Zh.Endpoint, command: string, ...args: number[]) {
    // Handles 1-127, the device uses the others for its own reports
    it600Handle = (it600Handle % 0x7f) + 1;
    const payload = Buffer.from([it600Handle, ...Buffer.from(command), ...args]);
    await endpoint.commandResponse<"manuSpecificSalusIt600", "write", SalusIt600>("manuSpecificSalusIt600", "write", {payload});
}

const tzLocal = {
    it600_system_mode: {
        key: ["system_mode"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            if (value === "off") {
                await it600Write(entity, "B20", 7); // Standby
            } else {
                await it600Write(entity, "B20", 2); // Permanent hold
                await it600Write(entity, "B48", value === "cool" ? 3 : 4);
            }
            return {state: {system_mode: value}};
        },
    } satisfies Tz.Converter,
    it600_setpoint: {
        key: ["current_heating_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            utils.assertNumber(value, key);
            const cool = (meta.message.system_mode ?? meta.state.system_mode) === "cool";
            await it600Write(entity, cool ? "B33" : "B34", Math.round(value * 2) + 0x20);
            return {state: {current_heating_setpoint: Math.round(value * 2) / 2}};
        },
    } satisfies Tz.Converter,
    it600_child_lock: {
        key: ["child_lock"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            await it600Write(entity, "B03", 0, 0, value === "LOCK" ? 0x41 : 0x42, ...Array(10).fill(0));
            return {state: {child_lock: value}};
        },
    } satisfies Tz.Converter,
    it600_wiring_centre_zones: {
        key: ["wiring_centre_zones"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            utils.assertArray(value, key);
            const wiringCentre: Zh.Device | undefined = globalStore.getValue("salusIt600", "wiringCentre");
            if (!wiringCentre) throw new Error("Wiring centre (KL08RF) has to join first");
            const args = Buffer.alloc(33);
            args.set([0x00, 0x11, 0x01, 0x00]); // Wiring centre number 1
            args.writeUInt16LE(wiringCentre.networkAddress, 4);
            args[6] = 0xfe; // Pair request
            args[7] = 0x01; // Take over zones held by another thermostat
            for (const zone of value) args[7 + Number(zone)] = 0x01;
            await it600Write(entity, "B47", ...args);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SPE600"],
        model: "SPE600",
        vendor: "Salus Controls",
        description: "Smart plug (EU socket)",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SP600"],
        model: "SP600",
        vendor: "Salus Controls",
        description: "Smart plug (UK socket)",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering", fzMetering: fzLocal.SP600_power})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SX885ZB"],
        model: "SX885ZB",
        vendor: "Salus Controls",
        description: "miniSmartPlug",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SR600"],
        model: "SR600",
        vendor: "Salus Controls",
        description: "Relay switch",
        extend: [m.onOff({ota: {manufacturerName: "SalusControls"}})],
    },
    {
        zigbeeModel: ["SW600"],
        model: "SW600",
        vendor: "Salus Controls",
        description: "Door or window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["WLS600"],
        model: "WLS600",
        vendor: "Salus Controls",
        description: "Water leakage sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["OS600"],
        model: "OS600",
        vendor: "Salus Controls",
        description: "Door or window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SS909ZB", "PS600"],
        model: "PS600",
        vendor: "Salus Controls",
        description: "Pipe temperature sensor",
        fromZigbee: [fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.battery(), e.temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["RE600"],
        model: "RE600",
        vendor: "Salus Controls",
        description: "Router Zigbee",
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["FC600", "FC600NH"],
        model: "FC600",
        vendor: "Salus Controls",
        description: "Fan coil thermostat",
        whiteLabel: [{vendor: "Salus Controls", model: "FC600NH", description: "Fan coil thermostat", fingerprint: [{modelID: "FC600NH"}]}],
        extend: [
            m.deviceAddCustomCluster("manuSpecificSalus", {
                name: "manuSpecificSalus",
                ID: 0xfc04,
                manufacturerCode: Zcl.ManufacturerCode.COMPUTIME,
                attributes: {
                    frostSetpoint: {name: "frostSetpoint", ID: 0x0000, type: Zcl.DataType.INT16, write: true, min: -32768},
                    minFrostSetpoint: {name: "minFrostSetpoint", ID: 0x0001, type: Zcl.DataType.INT16, write: true, min: -32768},
                    maxFrostSetpoint: {name: "maxFrostSetpoint", ID: 0x0002, type: Zcl.DataType.INT16, write: true, min: -32768},
                    timeDisplayFormat: {name: "timeDisplayFormat", ID: 0x0003, type: Zcl.DataType.BOOLEAN, write: true},
                    attr4: {name: "attr4", ID: 0x0004, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    attr5: {name: "attr5", ID: 0x0005, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    attr6: {name: "attr6", ID: 0x0006, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    attr7: {name: "attr7", ID: 0x0007, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    autoCoolingSetpoint: {name: "autoCoolingSetpoint", ID: 0x0008, type: Zcl.DataType.INT16, write: true, min: -32768},
                    autoHeatingSetpoint: {name: "autoHeatingSetpoint", ID: 0x0009, type: Zcl.DataType.INT16, write: true, min: -32768},
                    holdType: {name: "holdType", ID: 0x000a, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    shortCycleProtection: {name: "shortCycleProtection", ID: 0x000b, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    coolingFanDelay: {name: "coolingFanDelay", ID: 0x000c, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    ruleCoolingSetpoint: {name: "ruleCoolingSetpoint", ID: 0x000d, type: Zcl.DataType.INT16, write: true, min: -32768},
                    ruleHeatingSetpoint: {name: "ruleHeatingSetpoint", ID: 0x000e, type: Zcl.DataType.INT16, write: true, min: -32768},
                    attr15: {name: "attr15", ID: 0x000f, type: Zcl.DataType.BOOLEAN, write: true},
                },
                commands: {
                    resetDevice: {
                        name: "resetDevice",
                        ID: 0x01,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
            m.enumLookup<"manuSpecificSalus", Salus>({
                name: "preset",
                lookup: {schedule: 0, temporary_override: 1, permanent_override: 2, standby: 7, eco: 10},
                cluster: "manuSpecificSalus",
                attribute: "holdType",
                description: "Operation mode",
                reporting: {min: 0, max: 3600, change: 0},
            }),
        ],
        fromZigbee: [fz.thermostat, fz.fan],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_relay_status_log,
            tz.thermostat_running_state,
            tz.thermostat_keypad_lockout,
            tz.fan_mode,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 40, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "cool", "auto"])
                .withRunningMode(["off", "cool", "heat"])
                .withRunningState(["idle", "heat", "cool"])
                .withLocalTemperatureCalibration(-3, 3, 0.5)
                .withFanMode(["off", "low", "medium", "high", "auto"]),
            e.keypad_lockout(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            const binds = ["genBasic", "genTime", "hvacThermostat", "hvacFanCtrl", "hvacUserInterfaceCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.fanMode(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
        },
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SQ610RFNH"],
        model: "SQ610RFNH",
        vendor: "Salus Controls",
        description: "Quantum wireless thermostat",
        extend: [
            salusExtend.addGatewayBasic(),
            salusExtend.addIt600Cluster(),
            salusExtend.it600Sync(0x20, 9),
            m.forcePowerSource({powerSource: "Battery"}),
        ],
        fromZigbee: [fzLocal.it600_status],
        toZigbee: [tzLocal.it600_system_mode, tzLocal.it600_setpoint, tzLocal.it600_child_lock, tzLocal.it600_wiring_centre_zones],
        exposes: [
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 40, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "heat", "cool"], ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE),
            e.humidity(),
            e.battery(),
            e.child_lock(),
            e
                .list("wiring_centre_zones", ea.SET, e.numeric("zone", ea.SET).withValueMin(1).withValueMax(8))
                .withDescription("Pairs the thermostat with these wiring centre zones, taking them over from any other thermostat"),
        ],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        // Reports no modelId
        fingerprint: [{manufacturerName: "Computime", type: "Router", endpoints: [{ID: 8, profileID: 260}]}],
        model: "KL08RF",
        vendor: "Salus Controls",
        description: "iT600 8-zone wiring centre",
        extend: [
            salusExtend.addGatewayBasic(),
            salusExtend.addIt600Cluster(),
            salusExtend.it600Sync(1, 8),
            m.forcePowerSource({powerSource: "Mains (single phase)"}),
        ],
        onEvent: (event) => {
            // Needed for the zone pairing of the thermostats
            if (event.type === "start") globalStore.putValue("salusIt600", "wiringCentre", event.data.device);
        },
        ota: {manufacturerName: "SalusControls"},
    },
];
