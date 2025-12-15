import type {Models as ZHModels} from "zigbee-herdsman";
import {Zcl} from "zigbee-herdsman";
import type {ClusterCommandKeys, ClusterOrRawAttributeKeys, ClusterOrRawPayload, TCustomCluster} from "zigbee-herdsman/dist/controller/tstype";
import {access as ea} from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {Configure, DefinitionWithExtend, ModernExtend, OnEvent, Tz} from "../lib/types";
import {determineEndpoint, getFromLookup, isString} from "../lib/utils";

const NS = "zhc:yandex";
const manufacturerCodeOld = 0x140a;
const manufacturerCodeNew = 0x132f;
interface Yandex {
    attributes: {
        switchMode: number;
        switchType: number;
        powerType: number;
        ledIndicator: number;
        interlock: number;
        buttonMode: number;
        displayFlip: boolean;
        windowDetection: boolean;
        frostProtection: boolean;
        scaleProtection: boolean;
        autoCalibration: boolean;
    };
    commands: {
        switchMode: {value: number};
        switchType: {value: number};
        powerType: {value: number};
        ledIndicator: {value: number};
        interlock: {value: number};
        buttonMode: {value: number};
        displayFlip: {value: boolean};
    };
    commandResponses: never;
}

interface EnumLookupWithSetCommandArgs extends m.EnumLookupArgs<"manuSpecificYandex", Yandex> {
    setCommand: ClusterCommandKeys<"manuSpecificYandex", Yandex>[number];
}

function enumLookupWithSetCommand(args: EnumLookupWithSetCommandArgs): ModernExtend {
    const {name, lookup, cluster, attribute, zigbeeCommandOptions, setCommand} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const access = ea[args.access ?? "ALL"];

    const mExtend = m.enumLookup<"manuSpecificYandex", Yandex>(args);

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          const payloadValue = getFromLookup(value, lookup);
                          await determineEndpoint(entity, meta, cluster).command<typeof cluster, typeof setCommand, Yandex>(
                              cluster,
                              setCommand,
                              {value: payloadValue},
                              zigbeeCommandOptions,
                          );
                          await determineEndpoint(entity, meta, cluster).read<typeof cluster, Yandex>(cluster, [attributeKey], zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await determineEndpoint(entity, meta, cluster).read<typeof cluster, Yandex>(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    return {...mExtend, toZigbee};
}

interface BinaryWithSetCommandArgs<Cl extends string | number, Custom extends TCustomCluster | undefined = undefined>
    extends m.BinaryArgs<Cl, Custom> {
    setCommand: ClusterCommandKeys<Cl, Custom>[number];
}

function binaryWithSetCommand<Cl extends string | number, Custom extends TCustomCluster | undefined = undefined>(
    args: BinaryWithSetCommandArgs<Cl, Custom>,
): ModernExtend {
    const {name, cluster, attribute, valueOn, valueOff, zigbeeCommandOptions, setCommand} = args;

    const access = ea[args.access ?? "ALL"];

    const mExtend = m.binary<Cl, Custom>(args);

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          const payloadValue = value === valueOn[0] ? valueOn[1] : valueOff[1];
                          await determineEndpoint(entity, meta, cluster).command<Cl, typeof setCommand, Custom>(
                              cluster,
                              setCommand,
                              {value: payloadValue} as ClusterOrRawPayload<Cl, typeof setCommand, Custom>,
                              zigbeeCommandOptions,
                          );
                          await determineEndpoint(entity, meta, cluster).read<Cl, Custom>(
                              cluster,
                              [attribute] as ClusterOrRawAttributeKeys<Cl, Custom>,
                              zigbeeCommandOptions,
                          );
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await determineEndpoint(entity, meta, cluster).read<Cl, Custom>(
                              cluster,
                              [attribute] as ClusterOrRawAttributeKeys<Cl, Custom>,
                              zigbeeCommandOptions,
                          );
                      }
                    : undefined,
        },
    ];

    return {...mExtend, toZigbee};
}

function YandexCluster(manufacturerCode: number): ModernExtend {
    return m.deviceAddCustomCluster("manuSpecificYandex", {
        ID: 0xfc03,
        manufacturerCode: manufacturerCode,
        attributes: {
            switchMode: {ID: 0x0001, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
            switchType: {ID: 0x0002, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
            powerType: {ID: 0x0003, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
            ledIndicator: {ID: 0x0005, type: Zcl.DataType.BOOLEAN, write: true},
            interlock: {ID: 0x0007, type: Zcl.DataType.BOOLEAN, write: true},
            buttonMode: {ID: 0x0008, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
            displayFlip: {ID: 0x0009, type: Zcl.DataType.BOOLEAN, write: true},
            windowDetection: {ID: 0x000a, type: Zcl.DataType.BOOLEAN, write: true},
            frostProtection: {ID: 0x000d, type: Zcl.DataType.BOOLEAN, write: true},
            scaleProtection: {ID: 0x000e, type: Zcl.DataType.BOOLEAN, write: true},
            autoCalibration: {ID: 0x000f, type: Zcl.DataType.BOOLEAN, write: true},
        },
        commands: {
            switchMode: {
                ID: 0x01,
                parameters: [{name: "value", type: Zcl.DataType.UINT8, max: 0xff}],
            },
            switchType: {
                ID: 0x02,
                parameters: [{name: "value", type: Zcl.DataType.UINT8, max: 0xff}],
            },
            powerType: {
                ID: 0x03,
                parameters: [{name: "value", type: Zcl.DataType.UINT8, max: 0xff}],
            },
            ledIndicator: {
                ID: 0x05,
                parameters: [{name: "value", type: Zcl.DataType.BOOLEAN}],
            },
            interlock: {
                ID: 0x07,
                parameters: [{name: "value", type: Zcl.DataType.UINT8, max: 0xff}],
            },
            buttonMode: {
                ID: 0x08,
                parameters: [{name: "value", type: Zcl.DataType.UINT8, max: 0xff}],
            },
            displayFlip: {
                ID: 0x09,
                parameters: [{name: "value", type: Zcl.DataType.BOOLEAN}],
            },
        },
        commandsResponse: {},
    });
}

interface YandexThermostat {
    attributes: {
        calibrated: boolean;
    };
    commands: {
        calibrate: {value: boolean};
    };
    commandResponses: never;
}

function YandexThermostatCluster(manufacturerCode: number): ModernExtend {
    return m.deviceAddCustomCluster("hvacThermostat", {
        ID: Zcl.Clusters.hvacThermostat.ID,
        attributes: {
            calibrated: {
                ID: 0xf000,
                type: Zcl.DataType.BOOLEAN,
                manufacturerCode: manufacturerCode,

                write: true,
            },
        },
        commands: {
            calibrate: {
                ID: 0x00,
                parameters: [{name: "value", type: Zcl.DataType.UINT8, max: 0xff}],
            },
        },
        commandsResponse: {},
    });
}

function reinterview(): ModernExtend {
    let coordEnd: ZHModels.Endpoint | number = 1;
    const configure: Configure[] = [
        (device, coordinatorEndpoint, definition) => {
            coordEnd = coordinatorEndpoint;
        },
    ];
    const onEvent: OnEvent.Handler[] = [
        async (event) => {
            if (event.type === "deviceAnnounce") {
                // reinterview
                const {device, deviceExposesChanged} = event.data;
                try {
                    await device.interview(true);
                    logger.info(`Successfully interviewed '${device.ieeeAddr}'`, NS);
                    // bind extended endpoint to coordinator
                    for (const endpoint of device.endpoints) {
                        if (endpoint.supportsOutputCluster("genOnOff")) {
                            await endpoint.bind("genOnOff", coordEnd);
                        }
                    }
                    // send updates to clients
                    deviceExposesChanged();
                } catch (error) {
                    logger.error(`Reinterview failed for '${device.ieeeAddr} with error '${error}'`, NS);
                }
            }
        },
    ];

    return {onEvent, configure, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["YNDX-00537"],
        model: "YNDX_00537",
        vendor: "Yandex",
        description: "Single relay",
        extend: [
            reinterview(),
            YandexCluster(manufacturerCodeOld),
            m.deviceEndpoints({
                endpoints: {"1": 1, "": 2},
            }),
            m.onOff({
                endpointNames: ["1"],
            }),
            enumLookupWithSetCommand({
                name: "power_type",
                cluster: "manuSpecificYandex",
                attribute: "powerType",
                setCommand: "powerType",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Power supply type",
                lookup: {
                    full: 0x03,
                    low: 0x02,
                    medium: 0x01,
                    high: 0x00,
                },
                entityCategory: "config",
            }),
            enumLookupWithSetCommand({
                name: "switch_type",
                cluster: "manuSpecificYandex",
                attribute: "switchType",
                setCommand: "switchType",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                endpointName: "1",
                description: "External switch type 1",
                lookup: {
                    rocker: 0x00,
                    button: 0x01,
                    decoupled: 0x02,
                },
                entityCategory: "config",
            }),
            m.commandsOnOff({endpointNames: [""]}),
        ],
    },
    {
        zigbeeModel: ["YNDX-00538"],
        model: "YNDX_00538",
        vendor: "Yandex",
        description: "Double relay",
        extend: [
            reinterview(),
            YandexCluster(manufacturerCodeOld),
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, b1: 3, b2: 4},
            }),
            m.onOff({
                endpointNames: ["1", "2"],
            }),
            enumLookupWithSetCommand({
                name: "power_type",
                cluster: "manuSpecificYandex",
                attribute: "powerType",
                setCommand: "powerType",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Power supply type",
                lookup: {
                    full: 0x03,
                    low: 0x02,
                    medium: 0x01,
                    high: 0x00,
                },
                entityCategory: "config",
            }),
            binaryWithSetCommand<"manuSpecificYandex", Yandex>({
                name: "interlock",
                cluster: "manuSpecificYandex",
                attribute: "interlock",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                setCommand: "interlock",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Interlock",
                entityCategory: "config",
            }),
            enumLookupWithSetCommand({
                name: "switch_type",
                cluster: "manuSpecificYandex",
                attribute: "switchType",
                setCommand: "switchType",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                endpointName: "1",
                description: "External switch type 1",
                lookup: {
                    rocker: 0x00,
                    button: 0x01,
                    decoupled: 0x02,
                },
                entityCategory: "config",
            }),
            enumLookupWithSetCommand({
                name: "switch_type",
                cluster: "manuSpecificYandex",
                attribute: "switchType",
                setCommand: "switchType",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                endpointName: "2",
                description: "External switch type 2",
                lookup: {
                    rocker: 0x00,
                    button: 0x01,
                    decoupled: 0x02,
                },
                entityCategory: "config",
            }),
            m.commandsOnOff({endpointNames: ["b1", "b2"]}),
        ],
    },
    {
        zigbeeModel: ["YNDX-00534"],
        model: "YNDX_00534",
        vendor: "Yandex",
        description: "Single gang wireless switch",
        extend: [
            YandexCluster(manufacturerCodeOld),
            m.deviceEndpoints({
                endpoints: {down: 1, up: 2},
            }),
            m.commandsOnOff({endpointNames: ["up", "down"]}),
            m.battery(),
        ],
    },
    {
        zigbeeModel: ["YNDX-00535"],
        model: "YNDX_00535",
        vendor: "Yandex",
        description: "Double gang wireless switch",
        extend: [
            YandexCluster(manufacturerCodeOld),
            m.deviceEndpoints({
                endpoints: {b1_down: 1, b2_down: 2, b1_up: 3, b2_up: 4},
            }),
            m.commandsOnOff({endpointNames: ["b1_up", "b1_down", "b2_up", "b2_down"]}),
            m.battery(),
        ],
    },
    {
        zigbeeModel: ["YNDX-00531"],
        model: "YNDX_00531",
        vendor: "Yandex",
        description: "Single gang switch",
        extend: [
            reinterview(),
            YandexCluster(manufacturerCodeOld),
            m.deviceEndpoints({
                endpoints: {"1": 1, down: 2, up: 3},
            }),
            m.onOff({
                endpointNames: ["1"],
            }),
            enumLookupWithSetCommand({
                name: "power_type",
                cluster: "manuSpecificYandex",
                attribute: "powerType",
                setCommand: "powerType",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Power supply type",
                lookup: {
                    full: 0x03,
                    low: 0x02,
                    medium: 0x01,
                    high: 0x00,
                },
                entityCategory: "config",
            }),
            m.commandsOnOff({endpointNames: ["up", "down"]}),
            enumLookupWithSetCommand({
                name: "operation_mode",
                cluster: "manuSpecificYandex",
                attribute: "switchMode",
                setCommand: "switchMode",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Switch mode (control_relay - the button control the relay, decoupled - button send events when pressed)",
                lookup: {
                    control_relay: 0x00,
                    up_decoupled: 0x01,
                    decoupled: 0x02,
                    down_decoupled: 0x03,
                },
                entityCategory: "config",
                endpointName: "1",
            }),
            binaryWithSetCommand<"manuSpecificYandex", Yandex>({
                name: "led_indicator",
                cluster: "manuSpecificYandex",
                attribute: "ledIndicator",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                setCommand: "ledIndicator",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Led indicator",
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["YNDX-00532"],
        model: "YNDX_00532",
        vendor: "Yandex",
        description: "Double gang switch",
        extend: [
            reinterview(),
            YandexCluster(manufacturerCodeOld),
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, b1_down: 3, b2_down: 4, b1_up: 5, b2_up: 6},
            }),
            m.onOff({
                endpointNames: ["1", "2"],
            }),
            enumLookupWithSetCommand({
                name: "power_type",
                cluster: "manuSpecificYandex",
                attribute: "powerType",
                setCommand: "powerType",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Power supply type",
                lookup: {
                    full: 0x03,
                    low: 0x02,
                    medium: 0x01,
                    high: 0x00,
                },
                entityCategory: "config",
            }),
            m.commandsOnOff({endpointNames: ["b1_up", "b1_down", "b2_up", "b2_down"]}),
            enumLookupWithSetCommand({
                name: "operation_mode",
                cluster: "manuSpecificYandex",
                attribute: "switchMode",
                setCommand: "switchMode",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Switch mode (control_relay - the button control the relay, decoupled - button send events when pressed)",
                lookup: {
                    control_relay: 0x00,
                    up_decoupled: 0x01,
                    decoupled: 0x02,
                    down_decoupled: 0x03,
                },
                entityCategory: "config",
                endpointName: "1",
            }),
            enumLookupWithSetCommand({
                name: "operation_mode",
                cluster: "manuSpecificYandex",
                attribute: "switchMode",
                setCommand: "switchMode",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Switch mode (control_relay - the buttons control the relay, decoupled - buttons send events when pressed)",
                lookup: {
                    control_relay: 0x00,
                    up_decoupled: 0x01,
                    decoupled: 0x02,
                    down_decoupled: 0x03,
                },
                entityCategory: "config",
                endpointName: "2",
            }),
            binaryWithSetCommand<"manuSpecificYandex", Yandex>({
                name: "led_indicator",
                cluster: "manuSpecificYandex",
                attribute: "ledIndicator",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                setCommand: "ledIndicator",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Led indicator",
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["YNDX-00530"],
        model: "YNDX_00530",
        vendor: "Yandex",
        description: "Dimmer",
        extend: [
            YandexCluster(manufacturerCodeOld),
            m.light({
                effect: true,
                powerOnBehavior: true,
                configureReporting: true,
                levelReportingConfig: {min: "MIN", max: "MAX", change: 1},
            }),
            m.lightingBallast(),
            binaryWithSetCommand<"manuSpecificYandex", Yandex>({
                name: "led_indicator",
                cluster: "manuSpecificYandex",
                attribute: "ledIndicator",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                setCommand: "ledIndicator",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Led indicator",
                entityCategory: "config",
            }),
            enumLookupWithSetCommand({
                name: "button_mode",
                cluster: "manuSpecificYandex",
                attribute: "buttonMode",
                setCommand: "buttonMode",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeOld},
                description: "Dimmer button mode",
                lookup: {
                    general: 0x00,
                    alternative: 0x01,
                },
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["YNDX-00518"],
        model: "YNDX-00518",
        vendor: "Yandex",
        description: "Thermostatic radiator valve",
        extend: [
            YandexCluster(manufacturerCodeNew),
            YandexThermostatCluster(manufacturerCodeNew),
            m.onOff({
                powerOnBehavior: false,
            }),
            m.thermostat({
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                setpoints: {
                    values: {occupiedHeatingSetpoint: {min: 5, max: 30, step: 0.5}},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: true,
                },
            }),
            binaryWithSetCommand<"manuSpecificYandex", Yandex>({
                name: "display_flip",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "manuSpecificYandex",
                attribute: "displayFlip",
                setCommand: "displayFlip",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeNew},
                description: "Flip display orientation",
                entityCategory: "config",
            }),
            m.binary({
                name: "child_lock",
                valueOn: ["LOCK", 1],
                valueOff: ["UNLOCK", 0],
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                description: "Enables/disables physical input on the device",
                access: "ALL",
                reporting: {min: 0, max: 3600, change: 0},
            }),
            m.binary<"manuSpecificYandex", Yandex>({
                name: "frost_protection",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "manuSpecificYandex",
                attribute: "frostProtection",
                description: "Enables/disables antifreeze function",
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeNew},
            }),
            m.binary<"manuSpecificYandex", Yandex>({
                name: "window_detection",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "manuSpecificYandex",
                attribute: "windowDetection",
                description: "Enables/disables window detection on the device",
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeNew},
            }),
            m.binary<"manuSpecificYandex", Yandex>({
                name: "scale_protection",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "manuSpecificYandex",
                attribute: "scaleProtection",
                description: "Enables/disables anti-scale protection",
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeNew},
            }),
            m.binary<"manuSpecificYandex", Yandex>({
                name: "auto_calibration",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "manuSpecificYandex",
                attribute: "autoCalibration",
                description: "Enables/disables auto calibration",
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeNew},
            }),
            binaryWithSetCommand<"hvacThermostat", YandexThermostat>({
                name: "calibrated",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: "calibrated",
                setCommand: "calibrate",
                zigbeeCommandOptions: {manufacturerCode: manufacturerCodeNew},
                description: "OFF if calibration needs to be performed",
                entityCategory: "config",
                reporting: {min: 0, max: 3600, change: 0},
            }),
        ],
    },
];
