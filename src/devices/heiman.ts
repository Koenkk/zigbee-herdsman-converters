import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import {
    addCustomClusterHeimanSpecificAirQuality,
    addCustomClusterHeimanSpecificAirQualityShort,
    addCustomClusterHeimanSpecificInfraRedRemote,
    addCustomClusterHeimanSpecificScenes,
    type HeimanSpecificAirQualityCluster,
} from "../lib/heiman";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, ModernExtend, Reporting, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const defaultResponseOptions = {disableDefaultResponse: false};

interface RadarSensorHeimanZcl {
    attributes: {
        enableIndicator: number;
        sensitivity: number;
        enableSubRegionIsolation: number;
        installationMethod: number;
        cellMountedTable: Buffer;
        wallMountedTable: Buffer;
        subRegionIsolationTable: Buffer;
    };
    commands: never;
    commandResponses: never;
}

interface HeimanPrivateCluster {
    attributes: {
        // Sensor 0x0000~0x0FFF
        sensorPreheatingState: number;
        sensorSelfCheckState: number;
        sensorFaultState: number;
        sensorPollutionLevel: number;
        sensorSensitivityLevel: number;
        sensorPrealarmThreshold: number;
        sensorLifeState: number;
        sensorLifeTime: number;
        deviceMuteControl: number;
        deviceMuteState: number;
        eviceMuteState: number;
        deviceCascadeControlEnable: number;
        deviceSoundToneType: number;
        deviceSoundControl: number[];
        deviceBlinkControl: number[];
        smokeAdValue: number;
        smokeAlarmType: number;
        smokeWaterMistState: number;
        smokeSensorData: number[];
        deviceCascadeState: number;
        sensorPrealarmState: number;
        smokeConcentrationLevel: number;
        smokeChamberContaminationLevel: number;
        smokeConcentationUnit: number;

        // Light/Switch 0x1000~0x1FFF
        indicatorLightControl: number;
        indicatorLightNotDisturbStartTime: number;
        indicatorLightNotDisturbEndTime: number;
        indicatorLightNotDisturbEnable: number;
        indicatorLightLevelControlOf1: number;
        indicatorLightLevelControlOf2: number;
        indicatorLightLevelControlOf3: number;
        interconnectable: number;
        smokeUnit: number;
        rebootedCount: number;
        rejoinedCount: number;
        reportedPackages: number;
    };
    commands: never;
    commandResponses: never;
}

const iasWarningMode = {stop: 0, burglar: 1, fire: 2, emergency: 3, police_panic: 4, fire_panic: 5, emergency_panic: 6};

const heimanExtend = {
    heimanClusterRadar: () =>
        m.deviceAddCustomCluster("heimanClusterRadar", {
            ID: 0xfc8b,
            manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
            attributes: {
                enableIndicator: {ID: 0xf001, type: Zcl.DataType.UINT8, write: true}, // 0: off, 1: enable
                sensitivity: {ID: 0xf002, type: Zcl.DataType.UINT8, write: true},
                enableSubRegionIsolation: {ID: 0xf006, type: Zcl.DataType.UINT8, write: true},
                installationMethod: {ID: 0xf007, type: Zcl.DataType.UINT8, write: true},
                cellMountedTable: {ID: 0xf008, type: Zcl.DataType.OCTET_STR, write: true}, // string
                wallMountedTable: {ID: 0xf009, type: Zcl.DataType.OCTET_STR, write: true}, // string
                subRegionIsolationTable: {ID: 0xf00a, type: Zcl.DataType.OCTET_STR, write: true}, // string
            },
            commands: {},
            commandsResponse: {},
        }),

    heimanClusterSpecial: () =>
        m.deviceAddCustomCluster("heimanClusterSpecial", {
            ID: 0xfc90,
            manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
            attributes: {
                // Sensor 0x0000~0x0FFF
                sensorPreheatingState: {ID: 0x0000, type: Zcl.DataType.ENUM8, write: true},
                sensorSelfCheckState: {ID: 0x0001, type: Zcl.DataType.ENUM8, write: true},
                sensorFaultState: {ID: 0x0002, type: Zcl.DataType.BITMAP16, write: true},
                sensorPollutionLevel: {ID: 0x0003, type: Zcl.DataType.UINT8, write: true},
                sensorSensitivityLevel: {ID: 0x0004, type: Zcl.DataType.ENUM8, write: true},
                sensorPrealarmThreshold: {ID: 0x0005, type: Zcl.DataType.ENUM8, write: true},
                sensorLifeState: {ID: 0x0006, type: Zcl.DataType.ENUM8, write: true},
                sensorLifeTime: {ID: 0x0007, type: Zcl.DataType.UINT16, write: true},
                deviceMuteControl: {ID: 0x0008, type: Zcl.DataType.BITMAP32, write: true},
                deviceMuteState: {ID: 0x0009, type: Zcl.DataType.BITMAP16, write: true},
                deviceCascadeControlEnable: {ID: 0x000a, type: Zcl.DataType.BITMAP8, write: true},
                deviceSoundToneType: {ID: 0x000b, type: Zcl.DataType.ENUM8, write: true},
                deviceSoundControl: {ID: 0x000c, type: Zcl.DataType.ARRAY, write: true},
                deviceBlinkControl: {ID: 0x000d, type: Zcl.DataType.ARRAY, write: true},
                smokeAdValue: {ID: 0x000e, type: Zcl.DataType.UINT16, write: true},
                smokeAlarmType: {ID: 0x000f, type: Zcl.DataType.ENUM8, write: true},
                smokeWaterMistState: {ID: 0x0010, type: Zcl.DataType.ENUM8, write: true},
                smokeSensorData: {ID: 0x0011, type: Zcl.DataType.ARRAY, write: true},
                deviceCascadeState: {ID: 0x0012, type: Zcl.DataType.ENUM8, write: true},
                sensorPrealarmState: {ID: 0x0013, type: Zcl.DataType.ENUM8, write: true},
                smokeConcentrationLevel: {ID: 0x0016, type: Zcl.DataType.UINT8},
                smokeChamberContaminationLevel: {ID: 0x0017, type: Zcl.DataType.UINT8},
                smokeConcentationUnit: {ID: 0x0018, type: Zcl.DataType.UINT8},

                // Light/Switch 0x1000~0x1FFF
                indicatorLightControl: {ID: 0x1000, type: Zcl.DataType.BITMAP8, write: true},
                indicatorLightNotDisturbStartTime: {ID: 0x1001, type: Zcl.DataType.UINT16, write: true},
                indicatorLightNotDisturbEndTime: {ID: 0x1002, type: Zcl.DataType.UINT16, write: true},
                indicatorLightNotDisturbEnable: {ID: 0x1003, type: Zcl.DataType.UINT8, write: true},
                indicatorLightLevelControlOf1: {ID: 0x1004, type: Zcl.DataType.UINT8, write: true},
                indicatorLightLevelControlOf2: {ID: 0x1005, type: Zcl.DataType.UINT8, write: true},
                indicatorLightLevelControlOf3: {ID: 0x1006, type: Zcl.DataType.UINT8, write: true},
                interconnectable: {ID: 0x1007, type: Zcl.DataType.UINT8, write: true},
                smokeUnit: {ID: 0x1008, type: Zcl.DataType.UINT8},
                rebootedCount: {ID: 0x1009, type: Zcl.DataType.UINT8},
                rejoinedCount: {ID: 0x100a, type: Zcl.DataType.UINT8},
                reportedPackages: {ID: 0x100b, type: Zcl.DataType.UINT8},
            },
            commands: {},
            commandsResponse: {},
        }),

    heimanClusterIasZone: () =>
        m.deviceAddCustomCluster("ssIasZone", {
            ID: Zcl.Clusters.ssIasZone.ID,
            attributes: {},
            commands: {
                initiateTestMode: {
                    ID: 0x02,
                    parameters: [
                        {name: "testModeDuration", type: Zcl.DataType.UINT8},
                        {name: "sensitivityLevel", type: Zcl.DataType.UINT8},
                    ],
                },
            },
            commandsResponse: {},
        }),
    // ModernExtend define
    heimanClusterRadarActiveIndicatorExtend: (): ModernExtend => {
        const clusterName = "heimanClusterRadar" as const;
        const exposes = utils.exposeEndpoints(e.binary("enable_indicator", ea.ALL, true, false).withDescription("active green indicator"));
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.enableIndicator === undefined) {
                        return;
                    }

                    const state = !!msg.data["enableIndicator"];
                    return {enable_indicator: state};
                },
            } satisfies Fz.Converter<typeof clusterName, RadarSensorHeimanZcl, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["enable_indicator"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, RadarSensorHeimanZcl>(clusterName, ["enableIndicator"], defaultResponseOptions);
                },
                convertSet: async (entity, key, value, meta) => {
                    // const state = (value as Record<string, unknown>) || {};
                    const state = value ? 1 : 0;
                    await entity.write<typeof clusterName, RadarSensorHeimanZcl>(clusterName, {enableIndicator: state}, defaultResponseOptions);
                },
            },
        ];
        return {exposes: exposes, fromZigbee, toZigbee, isModernExtend: true};
    },
    heimanClusterRadarSubRegionEnableExtend: (): ModernExtend => {
        const clusterName = "heimanClusterRadar" as const;
        const exposes = utils.exposeEndpoints(e.binary("enable_sub_region_isolation", ea.ALL, true, false).withDescription("active green indicator"));
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.enableSubRegionIsolation === undefined) {
                        return;
                    }

                    const state = !!msg.data["enableSubRegionIsolation"];
                    return {enable_sub_region_isolation: state};
                },
            } satisfies Fz.Converter<typeof clusterName, RadarSensorHeimanZcl, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["enable_sub_region_isolation"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, RadarSensorHeimanZcl>(clusterName, ["enableSubRegionIsolation"], defaultResponseOptions);
                },
                convertSet: async (entity, key, value, meta) => {
                    const state = value ? 1 : 0;
                    await entity.write<typeof clusterName, RadarSensorHeimanZcl>(
                        clusterName,
                        {enableSubRegionIsolation: state},
                        defaultResponseOptions,
                    );
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterRadarSensitivityExtend: (): ModernExtend => {
        const clusterName = "heimanClusterRadar" as const;
        const exposes = utils.exposeEndpoints(
            e
                .numeric("sensitivity", ea.ALL)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Sensitivity of the radar sensor in range of 0 ~ 100%"),
        );
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    let attrData = null;
                    if (msg.data.sensitivity === undefined) {
                        return;
                    }
                    attrData = msg.data["sensitivity"];
                    return {sensitivity: attrData};
                },
            } satisfies Fz.Converter<typeof clusterName, RadarSensorHeimanZcl, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["sensitivity"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, RadarSensorHeimanZcl>(clusterName, ["sensitivity"], defaultResponseOptions);
                },
                convertSet: async (entity, key, value, meta) => {
                    const state = Number(value);
                    await entity.write<typeof clusterName, RadarSensorHeimanZcl>(clusterName, {sensitivity: state}, defaultResponseOptions);
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterRadarCellMountedTableExtend: (): ModernExtend => {
        const clusterName = "heimanClusterRadar" as const;
        const exposes = utils.exposeEndpoints(
            e
                .text("cell_mounted_table", ea.ALL)
                .withDescription(
                    "Ceiling installation area coordinate table. Format: 'X1,X2,Y1,Y2,height'. Value range: -2000≤X1≤0, 0≤X2≤2000 -2500≤Y1≤0, 0≤Y2≤2500 2300≤height≤3000 Unit:mm",
                ),
        );
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: Record<string, unknown> = {};
                    const value = msg.data["cellMountedTable"];
                    if (Buffer.isBuffer(value) && value.length >= 5) {
                        console.log(value);
                        if (value.length !== 10) {
                            throw new Error(`Invalid cell_mounted_table data length: expected 10 bytes, got ${value.length}.`);
                        }
                        const coordinates = [
                            value.readInt16LE(0), // x1
                            value.readInt16LE(2), // y1
                            value.readInt16LE(4), // x2
                            value.readInt16LE(6), // y2
                            value.readInt16LE(8), // height
                        ];
                        result.cell_mounted_table = coordinates.join(",");
                        console.log(result);
                    }
                    return result;
                },
            } satisfies Fz.Converter<typeof clusterName, RadarSensorHeimanZcl, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["cell_mounted_table"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, RadarSensorHeimanZcl>(clusterName, ["cellMountedTable"], defaultResponseOptions);
                },
                convertSet: async (entity, key, value, meta) => {
                    if (key === "cell_mounted_table" && value !== "") {
                        const coordinates = (value as string).split(",").map((v: string) => Number.parseInt(v, 10));
                        if (coordinates.length !== 5) {
                            throw new Error("cell_mounted_table must be a string with 5 comma-separated values (e.g., '-2000,2000,-2500,2500,2300')");
                        }

                        // Range check
                        if (
                            coordinates[0] < -2000 ||
                            coordinates[0] > 0 || // X1
                            coordinates[1] < 0 ||
                            coordinates[1] > 2000 || // X2
                            coordinates[2] < -2500 ||
                            coordinates[2] > 0 || // Y1
                            coordinates[3] < 0 ||
                            coordinates[3] > 2500 || // Y2
                            coordinates[4] < 2300 ||
                            coordinates[4] > 3000 // height
                        ) {
                            throw new Error("Values out of range for Cell Mounted Table.");
                        }

                        const buffer = Buffer.alloc(10); // 10 bytes + 1 byte
                        buffer.writeInt16LE(coordinates[0], 0); // x1
                        buffer.writeInt16LE(coordinates[1], 2); // x2
                        buffer.writeInt16LE(coordinates[2], 4); // y1
                        buffer.writeInt16LE(coordinates[3], 6); // y2
                        buffer.writeInt16LE(coordinates[4], 8); // height
                        await entity.write<typeof clusterName, RadarSensorHeimanZcl>(clusterName, {cellMountedTable: buffer}, defaultResponseOptions);
                    }
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterRadarWallMountedTableExtend: (): ModernExtend => {
        const clusterName = "heimanClusterRadar" as const;
        const exposes = utils.exposeEndpoints(
            e
                .text("wall_mounted_table", ea.ALL)
                .withDescription(
                    "Wall-mounted installation area coordinate table. Format: 'X1,X2,Y2,height' Value range: -2000≤X1≤0, 0≤X2≤2000 200≤Y2≤4000 1500≤height≤1600  Unit:mm.",
                ),
        );
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: Record<string, unknown> = {};
                    const value = msg.data["wallMountedTable"];
                    if (Buffer.isBuffer(value) && value.length >= 5) {
                        if (value.length !== 8) {
                            throw new Error(`Invalid wall_mounted_table data length: expected 8 bytes, got ${value.length}.`);
                        }
                        const coordinates = [
                            value.readInt16LE(0), // x1
                            value.readInt16LE(2), // y1
                            value.readInt16LE(4), // x2
                            value.readInt16LE(6), // height
                        ];
                        result.wall_mounted_table = coordinates.join(",");
                    }
                    return result;
                },
            } satisfies Fz.Converter<typeof clusterName, RadarSensorHeimanZcl, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["wall_mounted_table"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, RadarSensorHeimanZcl>(clusterName, ["wallMountedTable"], defaultResponseOptions);
                },
                convertSet: async (entity, key, value, meta) => {
                    if (key === "wall_mounted_table" && value !== "") {
                        const coordinates = (value as string).split(",").map((v: string) => Number.parseInt(v, 10));
                        if (coordinates.length !== 4) {
                            throw new Error("wall_mounted_table must be a string with 4 comma-separated values (e.g., '-2000,2000,4000,1600')");
                        }

                        if (
                            coordinates[0] < -2000 ||
                            coordinates[0] > 0 || // X1
                            coordinates[1] < 0 ||
                            coordinates[1] > 2000 || // X2
                            coordinates[2] < 200 ||
                            coordinates[2] > 4000 || // Y2
                            coordinates[3] < 1500 ||
                            coordinates[3] > 1600 // height
                        ) {
                            throw new Error("Values out of range for Wall Mounted Table.");
                        }

                        const buffer = Buffer.alloc(8); // 8 bytes + 1 byte
                        buffer.writeInt16LE(coordinates[0], 0); // x1
                        buffer.writeInt16LE(coordinates[1], 2); // x2
                        buffer.writeInt16LE(coordinates[2], 4); // y2
                        buffer.writeInt16LE(coordinates[3], 6); // height
                        await entity.write<typeof clusterName, RadarSensorHeimanZcl>(clusterName, {wallMountedTable: buffer}, defaultResponseOptions);
                    }
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterRadarSubRegionIsolationTableExtend: (): ModernExtend => {
        const clusterName = "heimanClusterRadar" as const;
        const exposes = utils.exposeEndpoints(
            e
                .text("sub_region_isolation_table", ea.ALL)
                .withDescription(
                    "Undetectable area coordinate table. Format: 'x1,x2,y1,y2,z1,z2'. Ranges: X1≤x1≤x2≤X2 When wall-mounted:  200≤y1≤y2≤Y2 0≤z1≤z2≤2300 Ceiling installation: Y1≤y1≤y2≤Y2 0≤z1≤z2≤height Unit:mm",
                ),
        );
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: Record<string, unknown> = {};
                    const value = msg.data["subRegionIsolationTable"];
                    if (Buffer.isBuffer(value) && value.length >= 5) {
                        if (value.length !== 12) {
                            throw new Error(`Invalid sub_region_isolation_table data length: expected 12 bytes, got ${value.length}.`);
                        }
                        const coordinates = [
                            value.readInt16LE(0), // x1
                            value.readInt16LE(2), // y1
                            value.readInt16LE(4), // x2
                            value.readInt16LE(6), // y2
                            value.readInt16LE(8), // z1
                            value.readInt16LE(10), // z2
                        ];
                        result.sub_region_isolation_table = coordinates.join(",");
                    }
                    return result;
                },
            } satisfies Fz.Converter<typeof clusterName, RadarSensorHeimanZcl, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["sub_region_isolation_table"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, RadarSensorHeimanZcl>(clusterName, ["subRegionIsolationTable"], defaultResponseOptions);
                },
                convertSet: async (entity, key, value, meta) => {
                    if (key === "sub_region_isolation_table" && value !== "") {
                        const coordinates = (value as string).split(",").map((v: string) => Number.parseInt(v, 10));
                        if (coordinates.length !== 6) {
                            throw new Error(
                                "sub_region_isolation_table must be a string with 6 comma-separated values (e.g., '-2000,2000,-2500,2500,2300,3000')",
                            );
                        }

                        if (
                            coordinates[0] < -2000 ||
                            coordinates[0] > 2000 || // X1
                            coordinates[1] < -2000 ||
                            coordinates[1] > 2000 // X2
                        ) {
                            throw new Error("Values out of range for Sub-Region Isolation Table.");
                        }

                        const buffer = Buffer.alloc(12); // 12 bytes + 1 byte
                        buffer.writeInt16LE(coordinates[0], 0); // x1
                        buffer.writeInt16LE(coordinates[1], 2); // x2
                        buffer.writeInt16LE(coordinates[2], 4); // y1
                        buffer.writeInt16LE(coordinates[3], 6); // y2
                        buffer.writeInt16LE(coordinates[4], 8); // z1
                        buffer.writeInt16LE(coordinates[5], 10); // z2
                        await entity.write<typeof clusterName, RadarSensorHeimanZcl>(
                            clusterName,
                            {subRegionIsolationTable: buffer},
                            defaultResponseOptions,
                        );
                    }
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterRadarSenseExtend: (): ModernExtend => {
        const clusterName = "msOccupancySensing" as const;
        const exposes = [
            e.binary("occupancy", ea.STATE, true, false).withDescription("Indicates if someone is present"),
            e.enum("sensor_status", ea.STATE, ["none", "activity", "unknown"]).withDescription("Sensor activity status"),
            e.enum("fall_status", ea.STATE, ["normal", "fall_warning", "fall_alarm", "unknown"]).withDescription("Fall detection status"),
        ];
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: Record<string, unknown> = {};
                    if (Object.hasOwn(msg.data, "occupancy")) {
                        const occupancy = msg.data.occupancy;
                        const bit0 = occupancy & 0x01; // Bit 0: Occupancy (0: no one, 1: someone)
                        const bit1to3 = (occupancy >> 1) & 0x07; // Bits 1-3: Sensor status
                        const bit4to5 = (occupancy >> 4) & 0x03; // Bits 4-5: Fall status

                        // Interprete bitmap
                        result.occupancy = bit0 === 1;
                        result.sensor_status = ["none", "activity"][bit1to3] || "unknown";
                        result.fall_status = ["normal", "fall_warning", "fall_alarm"][bit4to5] || "unknown";
                    }

                    return result;
                },
            } satisfies Fz.Converter<typeof clusterName, undefined, ["attributeReport", "readResponse"]>,
        ];

        return {
            exposes: exposes,
            fromZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterLegacyIlluminanceExtend: (): ModernExtend => {
        const clusterName = "msIlluminanceMeasurement" as const;
        const exposes = utils.exposeEndpoints(e.numeric("ambient_light", ea.STATE_GET).withUnit("Lx").withDescription("ambient illuminance in lux"));
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    let attrData = null;
                    if (msg.data.measuredValue === undefined) {
                        return;
                    }

                    attrData = msg.data["measuredValue"];
                    return {ambient_light: attrData};
                },
            } satisfies Fz.Converter<typeof clusterName, undefined, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["ambient_light"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, RadarSensorHeimanZcl>(clusterName, ["measuredValue"], defaultResponseOptions);
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterSensorFaultState: (): ModernExtend => {
        const clusterName = "heimanClusterSpecial" as const;
        const faultStateBitMap = {
            0: "fault", // bit0
            1: "sensor_open_circuit_fault", // bit1
            2: "sensor_short_circuit_fault", // bit2
            3: "sensor_pollution_fault", // bit3
        };
        const exposes = utils.exposeEndpoints(e.text("fault_state", ea.STATE_GET).withDescription("Device fault status (normal or fault types)."));
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    let attrData = null;
                    let attrValue = 0;
                    if (msg.data.sensorFaultState === undefined) {
                        return;
                    }

                    attrData = msg.data["sensorFaultState"];
                    attrValue = Number(attrData);
                    const activeFaults: string[] = [];
                    for (const [bit, faultDesc] of Object.entries(faultStateBitMap)) {
                        const bitNum = Number(bit);
                        const isFault = (attrValue & (1 << bitNum)) !== 0;
                        if (isFault) {
                            activeFaults.push(faultDesc);
                        }
                    }
                    const faultResult = activeFaults.length > 0 ? activeFaults.join(" | ") : "normal";
                    return {fault_state: faultResult};
                },
            } satisfies Fz.Converter<typeof clusterName, HeimanPrivateCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["fault_state"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, HeimanPrivateCluster>(clusterName, ["sensorFaultState"], defaultResponseOptions);
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterDeviceMuteState: (): ModernExtend => {
        const clusterName = "heimanClusterSpecial" as const;
        const muteStateBitMap = {
            0: "mute", // bit0
            1: "alarm_mute", // bit1
            2: "fault_mute", // bit2
            3: "low_battery_mute", // bit3
        };
        const exposes = utils.exposeEndpoints(e.text("muted", ea.STATE_GET).withDescription("Device mute status (normal or mute types)."));
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    let attrData = null;
                    let attrValue = 0;

                    if (msg.data.deviceMuteState === undefined) {
                        return;
                    }

                    attrData = msg.data["deviceMuteState"];
                    attrValue = Number(attrData);

                    const activeMutes: string[] = [];
                    for (const [bit, muteDesc] of Object.entries(muteStateBitMap)) {
                        const bitNum = Number(bit);
                        const isFault = (attrValue & (1 << bitNum)) !== 0;
                        if (isFault) {
                            activeMutes.push(muteDesc);
                        }
                    }
                    const muteResult = activeMutes.length > 0 ? activeMutes.join(" | ") : "normal";
                    return {Muted: muteResult};
                },
            } satisfies Fz.Converter<typeof clusterName, HeimanPrivateCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["muted"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, HeimanPrivateCluster>(clusterName, ["deviceMuteState"], defaultResponseOptions);
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterIndicatorLight: (): ModernExtend => {
        const clusterName = "heimanClusterSpecial" as const;
        const exposes = utils.exposeEndpoints(e.binary("heartbeat_indicator", ea.ALL, true, false).withDescription("active green indicator"));
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.indicatorLightLevelControlOf1 === undefined) {
                        return;
                    }

                    const state = !!msg.data["indicatorLightLevelControlOf1"];
                    return {heartbeat_indicator: state};
                },
            } satisfies Fz.Converter<typeof clusterName, HeimanPrivateCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["heartbeat_indicator"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, HeimanPrivateCluster>(
                        clusterName,
                        ["indicatorLightLevelControlOf1"],
                        defaultResponseOptions,
                    );
                },
                convertSet: async (entity, key, value, meta) => {
                    // const state = (value as Record<string, unknown>) || {};
                    const state = value ? 1 : 0;
                    await entity.write<typeof clusterName, HeimanPrivateCluster>(
                        clusterName,
                        {indicatorLightLevelControlOf1: state},
                        defaultResponseOptions,
                    );
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    heimanClusterSensorInterconnectable: (): ModernExtend => {
        const clusterName = "heimanClusterSpecial" as const;
        const exposes = utils.exposeEndpoints(
            e.binary("interconnectable", ea.STATE_GET, true, false).withDescription("used for interconnection automation."),
        );
        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.interconnectable === undefined) {
                        return;
                    }

                    const state = !!msg.data["interconnectable"];
                    return {interconnectable: state};
                },
            } satisfies Fz.Converter<typeof clusterName, HeimanPrivateCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["interconnectable"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, HeimanPrivateCluster>(clusterName, ["interconnectable"], defaultResponseOptions);
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    iasZoneInitiateTestMode: (): ModernExtend => {
        const exposes = utils.exposeEndpoints(e.enum("trigger_selftest", ea.SET, ["test"]).withDescription("Trigger smoke alarm self-check test."));
        const toZigbee: Tz.Converter[] = [
            {
                key: ["trigger_selftest"],
                convertSet: async (entity, key, value, meta) => {
                    const testMode = {
                        testModeDuration: 0x01,
                        currentZoneSensitivityLevel: 0x01,
                    };
                    await entity.command("ssIasZone", "initTestMode", testMode);
                    return {state: {[key]: value}};
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee: [],
            toZigbee,
            isModernExtend: true,
        };
    },
    iasWarningDeviceControl: (args?: {warningMode?: (keyof typeof iasWarningMode)[]}): ModernExtend => {
        const defaultModes = Object.keys(iasWarningMode) as (keyof typeof iasWarningMode)[];
        const displayModes = args?.warningMode ?? defaultModes;

        const invalidModes = displayModes.filter((m) => !defaultModes.includes(m));
        if (invalidModes.length > 0) {
            throw new Error(`Invalid alarm mode: ${invalidModes.join(", ")}, 
            Legal values: ${defaultModes.join(", ")}`);
        }

        // biome-ignore lint/correctness/noUnusedVariables: In the future use.
        const level = {low: 0, medium: 1, high: 2, very_high: 3};
        // biome-ignore lint/correctness/noUnusedVariables: In the future use.
        const strobeLevel = {low: 0, medium: 1, high: 2, very_high: 3};
        const exposes = utils.exposeEndpoints(
            e
                .composite("warning_control", "warning_control", ea.SET)
                .withDescription("Make the device trigger an alarm.")
                .withFeature(e.enum("mode", ea.SET, displayModes).withDescription("Mode of the warning (sound effect)"))
                .withFeature(e.numeric("duration", ea.SET).withUnit("s").withDescription("Duration in seconds of the alarm")),
        );

        const toZigbee: Tz.Converter[] = [
            {
                key: ["warning_control"],
                convertSet: async (entity, key, value, meta) => {
                    const warningModeKey = "mode";
                    const warningDurationKey = "duration";
                    const warningModeStr = value[warningModeKey as keyof typeof value];
                    const warningDurationValue = Number(value[warningDurationKey as keyof typeof value]);
                    const warningModeValue = iasWarningMode[warningModeStr as keyof typeof iasWarningMode];
                    if (warningModeValue === undefined) {
                        throw new Error(`Invalid warning mode: ${invalidModes.join(", ")}, Valid modes:${defaultModes.join(", ")}`);
                    }

                    if (Number.isNaN(warningDurationValue) || warningDurationValue < 0) {
                        throw new Error(`Invalid duration: ${warningDurationValue}. Must be a non-negative number.`);
                    }
                    const values = {
                        mode: warningModeValue,
                        level: warningModeValue ? 1 : 0,
                        strobe: false,
                        duration: warningDurationValue,
                        strobeDutyCycle: 0,
                        strobeLevel: 0,
                    };

                    if (Array.isArray(meta.mapped)) throw new Error("Not supported for groups");

                    const info = (values.mode << 4) + ((values.strobe ? 1 : 0) << 2) + values.level;
                    await entity.command(
                        "ssIasWd",
                        "startWarning",
                        {
                            startwarninginfo: info,
                            warningduration: values.duration,
                            strobedutycycle: values.strobeDutyCycle,
                            strobelevel: values.strobeLevel,
                        },
                        utils.getOptions(meta.mapped, entity),
                    );
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee: [],
            toZigbee,
            isModernExtend: true,
        };
    },
    iasWarningDeviceMute: (): ModernExtend => {
        const exposes = utils.exposeEndpoints(
            e.enum("temporary_mute", ea.SET, ["mute"]).withDescription("temporarily mute smoke alarm but please ensure there is no real fire."),
        );
        const toZigbee: Tz.Converter[] = [
            {
                key: ["temporary_mute"],
                convertSet: async (entity, key, value, meta) => {
                    const values = {
                        mode: 0,
                        level: 0,
                        strobe: false,
                        duration: 0,
                        strobeDutyCycle: 0,
                        strobeLevel: 0,
                    };

                    if (Array.isArray(meta.mapped)) throw new Error("Not supported for groups");

                    const info = (values.mode << 4) + ((values.strobe ? 1 : 0) << 2) + values.level;
                    await entity.command(
                        "ssIasWd",
                        "startWarning",
                        {
                            startwarninginfo: info,
                            warningduration: values.duration,
                            strobedutycycle: values.strobeDutyCycle,
                            strobelevel: values.strobeLevel,
                        },
                        utils.getOptions(meta.mapped, entity),
                    );
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee: [],
            toZigbee,
            isModernExtend: true,
        };
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PIRILLSensor-EF-3.0"],
        model: "HS1MIS-3.0",
        vendor: "Heiman",
        description: "Smart occupancy sensor",
        fromZigbee: [fz.occupancy, fz.battery],
        exposes: [e.occupancy(), e.battery()],
        configure: async (device, cordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, cordinatorEndpoint, ["msOccupancySensing", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint1);
            await reporting.occupancy(endpoint1);
        },
        extend: [m.illuminance()],
    },
    {
        fingerprint: tuya.fingerprint("TS0212", ["_TYZB01_wpmo3ja3"]),
        zigbeeModel: ["CO_V15", "CO_YDLV10", "CO_V16", "1ccaa94c49a84abaa9e38687913947ba", "CO_CTPG"],
        model: "HS1CA-M",
        description: "Smart carbon monoxide sensor",
        vendor: "Heiman",
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.carbon_monoxide(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ["PIRSensor-N", "PIRSensor-EM", "PIRSensor-EF-3.0", "PIR_TPV13"],
        model: "HS3MS",
        vendor: "Heiman",
        description: "Smart motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["SmartPlug", "SmartPlug-EF-3.0"],
        model: "HS2SK",
        description: "Smart metering plug",
        vendor: "Heiman",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        whiteLabel: [{vendor: "Schneider Electric", model: "CCTFR6500"}],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
    },
    {
        fingerprint: [{modelID: "SmartPlug-N", manufacturerName: "HEIMAN"}],
        model: "HS2SK_nxp",
        description: "Smart metering plug",
        vendor: "Heiman",
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        extend: [tuya.modernExtend.electricityMeasurementPoll()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: [
            "SMOK_V16",
            "SMOK_V15",
            "b5db59bfd81e4f1f95dc57fdbba17931",
            "98293058552c49f38ad0748541ee96ba",
            "SMOK_YDLV10",
            "FB56-SMF02HM1.4",
            "SmokeSensor-N-3.0",
            "319fa36e7384414a9ea62cba8f6e7626",
            "c3442b4ac59b4ba1a83119d938f283ab",
            "SmokeSensor-EF-3.0",
            "SMOK_HV14",
        ],
        model: "HS1SA",
        vendor: "Heiman",
        description: "Smoke detector",
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.battery(), e.test()],
    },
    {
        zigbeeModel: ["SmokeSensor-N", "SmokeSensor-EM"],
        model: "HS3SA/HS1SA",
        vendor: "Heiman",
        description: "Smoke detector",
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.battery(), e.test()],
    },
    {
        zigbeeModel: ["HS2SA-EF-3.0"],
        model: "HS2SA-EF-3.0",
        vendor: "Heiman",
        description: "Smoke detector",
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.battery(), e.test()],
    },
    {
        zigbeeModel: ["GASSensor-N", "GASSensor-N-3.0", "d90d7c61c44d468a8e906ca0841e0a0c"],
        model: "HS3CG",
        vendor: "Heiman",
        description: "Combustible gas sensor",
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["GASSensor-EN"],
        model: "HS1CG-M",
        vendor: "Heiman",
        description: "Combustible gas sensor",
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["HY0022"],
        model: "HS1CG_H",
        vendor: "Heiman",
        description: "Smart combustible gas sensor",
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["RH3070"],
        model: "HS1CG",
        vendor: "Heiman",
        description: "Smart combustible gas sensor",
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["GAS_V15"],
        model: "HS1CG_M",
        vendor: "Heiman",
        description: "Combustible gas sensor",
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["DoorSensor-N", "DoorSensor-N-3.0"],
        model: "HS3DS",
        vendor: "Heiman",
        description: "Door sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
        exposes: [e.contact(), e.battery(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["HS8DS-EF2-3.0"],
        model: "HS8DS-EFA",
        vendor: "Heiman",
        description: "Door sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]})],
    },
    {
        zigbeeModel: ["D1-EF2-3.0"],
        model: "D1-EFA",
        vendor: "Heiman",
        description: "Door sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low", "tamper"]})],
    },
    {
        zigbeeModel: ["DoorSensor-EM", "DoorSensor-EF-3.0"],
        model: "HS1DS",
        vendor: "Heiman",
        description: "Door sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["DOOR_TPV13", "DOOR_TPV12"],
        model: "Heiman-M1",
        vendor: "Heiman",
        description: "Door sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["WaterSensor-N", "WaterSensor-EM", "WaterSensor-N-3.0", "WaterSensor-EF-3.0", "WATER_TPV13"],
        model: "HS1WL/HS3WL",
        vendor: "Heiman",
        description: "Water leakage sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["WaterSensor2-EF-3.0"],
        model: "HS2WL",
        vendor: "Heiman",
        description: "Water leakage sensor",
        fromZigbee: [],
        toZigbee: [],
        extend: [m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1"]}), m.temperature(), m.battery({lowStatus: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "msTemperatureMeasurement"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await endpoint.read("msTemperatureMeasurement", ["measuredValue"]);
        },
    },
    {
        fingerprint: [{modelID: "RC-N", manufacturerName: "HEIMAN"}],
        model: "HS1RC-N",
        vendor: "Heiman",
        description: "Smart remote controller",
        fromZigbee: [fz.battery, fz.command_arm, fz.command_emergency],
        toZigbee: [],
        exposes: [e.battery(), e.action(["emergency", "disarm", "arm_partial_zones", "arm_all_zones"])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
    },
    {
        fingerprint: [{modelID: "RC-EF-3.0", manufacturerName: "HEIMAN"}],
        model: "HM1RC-2-E",
        vendor: "Heiman",
        description: "Smart remote controller",
        fromZigbee: [fz.battery, fz.command_arm, fz.command_emergency],
        toZigbee: [],
        exposes: [e.battery(), e.action(["emergency", "disarm", "arm_day_zones", "arm_all_zones"])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
        extend: [m.iasArmCommandDefaultResponse()],
    },
    {
        fingerprint: [{modelID: "RC-EM", manufacturerName: "HEIMAN"}],
        model: "HS1RC-EM",
        vendor: "Heiman",
        description: "Smart remote controller",
        fromZigbee: [fz.battery, fz.command_arm, fz.command_emergency],
        toZigbee: [],
        exposes: [e.battery(), e.action(["emergency", "disarm", "arm_partial_zones", "arm_all_zones"])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
    },
    {
        zigbeeModel: ["COSensor-EM", "COSensor-N", "COSensor-EF-3.0"],
        model: "HS1CA-E",
        vendor: "Heiman",
        description: "Smart carbon monoxide sensor",
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.carbon_monoxide(), e.battery_low(), e.battery()],
    },
    {
        fingerprint: tuya.fingerprint("TS0216", ["_TYZB01_8scntis1", "_TYZB01_4obovpbi"]),
        zigbeeModel: ["WarningDevice", "WarningDevice-EF-3.0"],
        model: "HS2WD-E",
        vendor: "Heiman",
        description: "Smart siren",
        fromZigbee: [fz.battery, fz.ias_wd],
        toZigbee: [tz.warning, tz.ias_max_duration],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("ssIasWd", ["maxDuration"]);
        },
        exposes: [
            e.battery(),
            e
                .numeric("max_duration", ea.ALL)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(600)
                .withDescription("Max duration of Siren")
                .withCategory("config"),
            e
                .warning()
                .removeFeature("level")
                .removeFeature("strobe_level")
                .removeFeature("mode")
                .withFeature(e.enum("mode", ea.SET, ["stop", "emergency"]).withDescription("Mode of the warning (sound effect)")),
        ],
    },
    {
        zigbeeModel: ["HT-EM", "TH-EM", "TH-T_V14"],
        model: "HS1HT",
        vendor: "Heiman",
        description: "Smart temperature & humidity Sensor",
        exposes: [e.battery(), e.temperature(), e.humidity()],
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        whiteLabel: [{vendor: "Ferguson", model: "TH-T_V14"}],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msRelativeHumidity", "genPowerCfg"]);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
    },
    {
        zigbeeModel: ["HT-N", "HT-EF-3.0"],
        model: "HS1HT-N",
        vendor: "Heiman",
        description: "Smart temperature & humidity Sensor",
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1);
            await endpoint1.read("genPowerCfg", ["batteryPercentageRemaining"]);

            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msRelativeHumidity"]);
            await reporting.humidity(endpoint2);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ["E_Socket"],
        model: "HS2ESK-E",
        vendor: "Heiman",
        description: "Smart in wall plug",
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        fingerprint: [
            {modelID: "SOS-EM", manufacturerName: "HEIMAN"},
            {modelID: "SOS-EF-3.0", manufacturerName: "HEIMAN"},
        ],
        model: "HS1EB/HS1EB-E",
        vendor: "Heiman",
        description: "Smart emergency button",
        fromZigbee: [fz.command_status_change_notification_action, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["off", "single", "double", "hold"])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
    },
    {
        fingerprint: [{modelID: "SceneSwitch-EM-3.0", manufacturerName: "HEIMAN"}],
        model: "HS2SS",
        vendor: "Heiman",
        description: "Smart scene switch",
        extend: [addCustomClusterHeimanSpecificScenes()],
        fromZigbee: [fz.battery, fz.heiman_scenes],
        exposes: [e.battery(), e.action(["cinema", "at_home", "sleep", "go_out", "repast"])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "heimanSpecificScenes"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["TempDimmerSw-EM-3.0"],
        model: "HS2WDSC-E",
        vendor: "Heiman",
        description: "Remote dimmer and temperature control",
        fromZigbee: [
            fz.battery,
            fz.command_on,
            fz.command_off,
            fz.command_move,
            fz.command_stop,
            fz.command_move_to_color,
            fz.command_move_to_color_temp,
        ],
        exposes: [e.battery(), e.action(["on", "off", "move", "stop", "color_move", "color_temperature_move"])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: constants.repInterval.MINUTES_5, max: constants.repInterval.HOUR});
        },
    },
    {
        fingerprint: [{modelID: "ColorDimmerSw-EM-3.0", manufacturerName: "HEIMAN"}],
        model: "HS2WDSR-E",
        vendor: "Heiman",
        description: "Remote dimmer and color control",
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.command_move_to_color],
        exposes: [e.battery(), e.action(["on", "off", "move", "stop", "color_move"])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff", "genLevelCtrl", "lightingColorCtrl"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: constants.repInterval.MINUTES_5, max: constants.repInterval.HOUR});
        },
    },
    {
        zigbeeModel: ["HS3HT-EFA-3.0"],
        model: "HS3HT",
        vendor: "Heiman",
        description: "Temperature & humidity sensor with display",
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1);
            await endpoint1.read("genPowerCfg", ["batteryPercentageRemaining"]);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msRelativeHumidity"]);
            await reporting.humidity(endpoint2);
        },
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ["GASSensor-EM", "358e4e3e03c644709905034dae81433e"],
        model: "HS1CG-E",
        vendor: "Heiman",
        description: "Combustible gas sensor",
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        whiteLabel: [{vendor: "Piri", model: "HSIO18008"}],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["GASSensor-EFR-3.0", "GASSensor-EF-3.0"],
        model: "HS1CG-E_3.0",
        vendor: "Heiman",
        description: "Combustible gas sensor",
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: [{modelID: "Vibration-N", manufacturerName: "HEIMAN"}],
        model: "HS1VS-N",
        vendor: "Heiman",
        description: "Vibration sensor",
        fromZigbee: [fz.ias_vibration_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
        exposes: [e.vibration(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        fingerprint: [
            {modelID: "Vibration-EF_3.0", manufacturerName: "HEIMAN"},
            {modelID: "Vibration-EF-3.0", manufacturerName: "HEIMAN"},
        ],
        model: "HS1VS-EF",
        vendor: "Heiman",
        description: "Vibration sensor",
        fromZigbee: [fz.ias_vibration_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
        },
        exposes: [e.vibration(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        fingerprint: [{modelID: "HS2AQ-EM", manufacturerName: "HEIMAN"}],
        model: "HS2AQ-EM",
        vendor: "Heiman",
        description: "Air quality monitor",
        extend: [addCustomClusterHeimanSpecificAirQuality()],
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.pm25, fz.heiman_hcho, fz.heiman_air_quality],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const heiman = {
                configureReporting: {
                    pm25MeasuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"pm25Measurement">("measuredValue", 0, constants.repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting("pm25Measurement", payload);
                    },
                    formAldehydeMeasuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"msFormaldehyde">("measuredValue", 0, constants.repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting("msFormaldehyde", payload);
                    },
                    batteryState: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>(
                            "batteryState",
                            0,
                            constants.repInterval.HOUR,
                            1,
                            overrides,
                        );
                        await endpoint.configureReporting("heimanSpecificAirQuality", payload);
                    },
                    pm10measuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>(
                            "pm10measuredValue",
                            0,
                            constants.repInterval.HOUR,
                            1,
                            overrides,
                        );
                        await endpoint.configureReporting("heimanSpecificAirQuality", payload);
                    },
                    tvocMeasuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>(
                            "tvocMeasuredValue",
                            0,
                            constants.repInterval.HOUR,
                            1,
                            overrides,
                        );
                        await endpoint.configureReporting("heimanSpecificAirQuality", payload);
                    },
                    aqiMeasuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>(
                            "aqiMeasuredValue",
                            0,
                            constants.repInterval.HOUR,
                            1,
                            overrides,
                        );
                        await endpoint.configureReporting("heimanSpecificAirQuality", payload);
                    },
                },
            };

            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                "genPowerCfg",
                "genTime",
                "msTemperatureMeasurement",
                "msRelativeHumidity",
                "pm25Measurement",
                "msFormaldehyde",
                "heimanSpecificAirQuality",
            ]);

            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);

            await heiman.configureReporting.pm25MeasuredValue(endpoint);
            await heiman.configureReporting.formAldehydeMeasuredValue(endpoint);
            await heiman.configureReporting.batteryState(endpoint);
            await heiman.configureReporting.pm10measuredValue(endpoint);
            await heiman.configureReporting.tvocMeasuredValue(endpoint);
            await heiman.configureReporting.aqiMeasuredValue(endpoint);

            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);

            // Seems that it is bug in Heiman, device does not asks for the time with binding
            // So, we need to write time during configure
            const time = Math.round((Date.now() - constants.OneJanuary2000) / 1000);
            // Time-master + synchronised
            const values = {timeStatus: 3, time: time, timeZone: new Date().getTimezoneOffset() * -1 * 60};
            await endpoint.write("genTime", values);
        },
        exposes: [
            e.battery(),
            e.temperature(),
            e.humidity(),
            e.pm25(),
            e.hcho(),
            e.voc(),
            e.aqi(),
            e.pm10(),
            e.enum("battery_state", ea.STATE, ["not_charging", "charging", "charged"]),
        ],
    },
    {
        fingerprint: [{modelID: "IRControl-EM", manufacturerName: "HEIMAN"}],
        model: "HS2IRC",
        vendor: "Heiman",
        description: "Smart IR Control",
        extend: [addCustomClusterHeimanSpecificInfraRedRemote()],
        fromZigbee: [fz.battery, fz.heiman_ir_remote],
        toZigbee: [tz.heiman_ir_remote],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "heimanSpecificInfraRedRemote"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["HS2SW1L-EF-3.0", "HS2SW1L-EFR-3.0", "HS2SW1A-N"],
        fingerprint: [
            {modelID: "HS2SW1A-EF-3.0", manufacturerName: "HEIMAN"},
            {modelID: "HS2SW1A-EFR-3.0", manufacturerName: "HEIMAN"},
        ],
        model: "HS2SW1A/HS2SW1A-N",
        vendor: "Heiman",
        description: "Smart switch - 1 gang with neutral wire",
        fromZigbee: [fz.on_off, fz.device_temperature],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genDeviceTempCfg"]);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);
        },
        exposes: [e.switch(), e.device_temperature()],
    },
    {
        zigbeeModel: ["HS2SW2L-EF-3.0", "HS2SW2L-EFR-3.0", "HS2SW2A-N"],
        fingerprint: [
            {modelID: "HS2SW2A-EF-3.0", manufacturerName: "HEIMAN"},
            {modelID: "HS2SW2A-EFR-3.0", manufacturerName: "HEIMAN"},
        ],
        model: "HS2SW2A/HS2SW2A-N",
        vendor: "Heiman",
        description: "Smart switch - 2 gang with neutral wire",
        fromZigbee: [fz.on_off, fz.device_temperature],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff", "genDeviceTempCfg"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.deviceTemperature(device.getEndpoint(1));
        },
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("right"), e.device_temperature()],
    },
    {
        zigbeeModel: ["HS2SW3L-EF-3.0", "HS2SW3L-EFR-3.0", "HS2SW3A-N"],
        fingerprint: [
            {modelID: "HS2SW3A-EF-3.0", manufacturerName: "HEIMAN"},
            {modelID: "HS2SW3A-EFR-3.0", manufacturerName: "HEIMAN"},
        ],
        model: "HS2SW3A/HS2SW3A-N",
        vendor: "Heiman",
        description: "Smart switch - 3 gang with neutral wire",
        fromZigbee: [fz.on_off, fz.device_temperature],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {left: 1, center: 2, right: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff", "genDeviceTempCfg"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.deviceTemperature(device.getEndpoint(1));
        },
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("center"), e.switch().withEndpoint("right"), e.device_temperature()],
    },
    {
        zigbeeModel: ["TemperLight"],
        model: "HS2WDS",
        vendor: "Heiman",
        description: "LED 9W CCT E27",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["ColorLight"],
        model: "HS1RGB",
        vendor: "Heiman",
        description: "Bulb E26/E27, RGB+WW 2700K, globe, opal, 400lm",
        extend: [m.light({colorTemp: {range: [275, 295]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ["CurtainMo-EF-3.0", "CurtainMo-EF"],
        model: "HS2CM-N-DC",
        vendor: "Heiman",
        description: "Gear window shade motor",
        fromZigbee: [fz.cover_position_via_brightness],
        toZigbee: [tz.cover_via_brightness],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genLevelCtrl", "genPowerCfg"]);
            await reporting.brightness(endpoint);
        },
        exposes: [e.cover_position().setAccess("state", ea.ALL)],
    },
    {
        zigbeeModel: ["PIR_TPV16"],
        model: "HS1MS-M",
        vendor: "Heiman",
        description: "Smart motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["TY0202"],
        model: "HS1MS-EF",
        vendor: "Heiman",
        description: "Smart motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: [{modelID: "DoorBell-EM", manufacturerName: "HEIMAN"}],
        model: "HS2DB",
        vendor: "Heiman",
        description: "Smart doorbell button",
        fromZigbee: [fz.battery, fz.heiman_doorbell_button],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.action(["pressed"]), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: [{modelID: "DoorBell-EF-3.0", manufacturerName: "HEIMAN"}],
        model: "HS2SS-E_V03",
        vendor: "Heiman",
        description: "Smart doorbell button",
        fromZigbee: [fz.battery, fz.heiman_doorbell_button],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.action(["pressed"]), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["HS3AQ-EFA-3.0"],
        model: "HS3AQ",
        vendor: "Heiman",
        description: "Smart air quality monitor",
        fromZigbee: [fz.co2, fz.humidity, fz.battery, fz.temperature],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msRelativeHumidity", "genPowerCfg", "msTemperatureMeasurement", "msCO2"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint, {min: 1, max: constants.repInterval.MINUTES_5, change: 10}); // 0.1 degree change
            await reporting.humidity(endpoint, {min: 1, max: constants.repInterval.MINUTES_5, change: 10}); // 0.1 % change
            await reporting.co2(endpoint, {min: 5, max: constants.repInterval.MINUTES_5, change: 0.00005}); // 50 ppm change
        },
        exposes: [e.co2(), e.battery(), e.humidity(), e.temperature()],
    },
    {
        zigbeeModel: ["RouteLight-EF-3.0"],
        model: "HS2RNL",
        vendor: "Heiman",
        description: "Smart repeater & night light",
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff", "genLevelCtrl"]);
            await reporting.onOff(endpoint); // switch the night light on/off
            await reporting.batteryPercentageRemaining(endpoint); // internal backup battery in case of power outage
        },
        exposes: [e.switch(), e.battery()],
    },
    {
        zigbeeModel: ["PIR_TPV12"],
        model: "PIR_TPV12",
        vendor: "Heiman",
        description: "Motion sensor",
        extend: [
            m.battery({voltageToPercentage: {min: 2500, max: 3000}, voltage: true}),
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
        ],
    },
    {
        zigbeeModel: ["HS15A-M"],
        model: "HS15A-M",
        vendor: "Heiman",
        description: "Smoke detector relabeled for zipato",
        extend: [m.iasZoneAlarm({zoneType: "smoke", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}), m.battery(), m.iasWarning()],
    },
    {
        zigbeeModel: ["HS2FD-EF1-3.0"],
        model: "HS2FD-EF1-3.0",
        vendor: "Heiman",
        description: "Fall Detection Sensor",
        extend: [
            // m.occupancy(),
            heimanExtend.heimanClusterRadar(),
            heimanExtend.heimanClusterRadarActiveIndicatorExtend(),
            heimanExtend.heimanClusterRadarSubRegionEnableExtend(),
            heimanExtend.heimanClusterRadarSenseExtend(),
            heimanExtend.heimanClusterRadarCellMountedTableExtend(),
            heimanExtend.heimanClusterRadarWallMountedTableExtend(),
            heimanExtend.heimanClusterRadarSubRegionIsolationTableExtend(),

            m.enumLookup({
                name: "sensitivity",
                lookup: {Off: 0, LowSensitivity: 1, HighSensitivity: 2},
                cluster: "heimanClusterRadar",
                attribute: {ID: 0xf002, type: Zcl.DataType.UINT8},
                description: "0: Off, 1: Low sensitivity, 2: High sensitivity",
                access: "ALL",
            }),
            m.enumLookup({
                name: "installation_method",
                lookup: {WallMounted: 0, Ceiling: 1, RotateCeiling45: 2},
                cluster: "heimanClusterRadar",
                attribute: {ID: 0xf007, type: Zcl.DataType.UINT8},
                description: "0: Wall-mounted, 1: Ceiling, 2: Rotate ceiling 45°",
                access: "ALL",
            }),
        ],
        fromZigbee: [fz.identify],
        toZigbee: [],
        ota: true,
        exposes: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msOccupancySensing", "heimanClusterRadar"]);
            await reporting.occupancy(endpoint);
            await endpoint.read<"heimanClusterRadar", RadarSensorHeimanZcl>("heimanClusterRadar", [
                "cellMountedTable",
                "wallMountedTable",
                "subRegionIsolationTable",
            ]);
        },
        endpoint: (device) => ({default: 1}),
    },
    {
        zigbeeModel: ["HS8OS-EF1-3.0"],
        model: "HS8OS-EF1-3.0",
        vendor: "Heiman",
        description: "Human presence sensor",
        extend: [
            m.occupancy(),
            heimanExtend.heimanClusterRadar(),
            heimanExtend.heimanClusterRadarActiveIndicatorExtend(),
            heimanExtend.heimanClusterRadarSensitivityExtend(),
            heimanExtend.heimanClusterLegacyIlluminanceExtend(),

            m.numeric({
                name: "radar_delay_time",
                cluster: 0x0406,
                attribute: {ID: 0x0020, type: 0x21},
                description: "Occupied to unoccupied delay",
                valueMin: 60,
                valueMax: 3600,
                access: "ALL",
            }),
        ],
        fromZigbee: [],
        toZigbee: [],
        ota: true,
        exposes: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                "msOccupancySensing",
                "msIlluminanceMeasurement",
                "heimanClusterRadar",
                "haDiagnostic",
            ]);
            await endpoint.read("msIlluminanceMeasurement", ["measuredValue"]);
            await endpoint.read("msOccupancySensing", ["ultrasonicOToUDelay"]);
            await endpoint.read("heimanClusterRadar", [0xf001, 0xf002], {manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD});
        },
        endpoint: (device) => ({default: 1}),
    },
    {
        fingerprint: [{modelID: "HS2AQ-EF-3.0", manufacturerName: "HEIMAN"}],
        model: "HS2AQ-EF-3.0",
        vendor: "Heiman",
        description: "Air quality monitor",
        extend: [
            addCustomClusterHeimanSpecificAirQualityShort(),
            m.battery(),
            m.humidity(),
            m.enumLookup<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>({
                name: "charging_status",
                lookup: {NotCharged: 0, Charging: 1, FullyCharged: 2},
                cluster: "heimanSpecificAirQuality",
                attribute: "batteryState",
                description: "Current charging status",
                access: "STATE_GET",
            }),
        ],
        fromZigbee: [fz.temperature, fz.pm25, fz.heiman_hcho, fz.heiman_air_quality],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            const heiman = {
                configureReporting: {
                    pm25MeasuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload({ID: 0x0000, type: Zcl.DataType.UINT16}, 0, constants.repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting("pm25Measurement", payload);
                    },

                    formAldehydeMeasuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload({ID: 0x0000, type: Zcl.DataType.UINT16}, 0, constants.repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting("msFormaldehyde", payload);
                    },

                    batteryState: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>(
                            "batteryState",
                            0,
                            constants.repInterval.HOUR,
                            1,
                            overrides,
                        );
                        await endpoint.configureReporting("heimanSpecificAirQuality", payload);
                    },

                    pm10measuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>(
                            "pm10measuredValue",
                            0,
                            constants.repInterval.HOUR,
                            1,
                            overrides,
                        );
                        await endpoint.configureReporting("heimanSpecificAirQuality", payload);
                    },

                    aqiMeasuredValue: async (endpoint: Zh.Endpoint, overrides?: Reporting.Override) => {
                        const payload = reporting.payload<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>(
                            "aqiMeasuredValue",
                            0,
                            constants.repInterval.HOUR,
                            1,
                            overrides,
                        );
                        await endpoint.configureReporting("heimanSpecificAirQuality", payload);
                    },
                },
            };

            await reporting.bind(endpoint, coordinatorEndpoint, [
                "genTime",
                "msTemperatureMeasurement",
                "pm25Measurement",
                "msFormaldehyde",
                "heimanSpecificAirQuality",
            ]);

            await reporting.temperature(endpoint);

            await heiman.configureReporting.pm25MeasuredValue(endpoint);
            await heiman.configureReporting.formAldehydeMeasuredValue(endpoint);
            await heiman.configureReporting.batteryState(endpoint);
            await heiman.configureReporting.pm10measuredValue(endpoint);
            await heiman.configureReporting.aqiMeasuredValue(endpoint);

            await endpoint.read("msTemperatureMeasurement", ["measuredValue"]);
            await endpoint.read("pm25Measurement", ["measuredValue"]);
            await endpoint.read("msFormaldehyde", ["measuredValue"]);
            await endpoint.read<"heimanSpecificAirQuality", HeimanSpecificAirQualityCluster>("heimanSpecificAirQuality", [
                "batteryState",
                "pm10measuredValue",
                "aqiMeasuredValue",
            ]);

            // Bug Heiman
            const time = Math.round((Date.now() - constants.OneJanuary2000) / 1000);

            await endpoint.write("genTime", {
                timeStatus: 3,
                time,
                timeZone: new Date().getTimezoneOffset() * -1 * 60,
            });
        },
        exposes: [e.temperature(), e.pm25(), e.hcho(), e.aqi(), e.pm10()],
    },
    {
        zigbeeModel: ["HS1SA-EF-3.0"],
        model: "HS1SA-E",
        vendor: "Heiman",
        description: "Smoke detector",
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [tz.warning],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", 0xfc90]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("ssIasZone", ["zoneStatus", "zoneState", "iasCieAddr", "zoneId"]);
            await endpoint.read("heimanClusterSpecial", [0x0002, 0x009, 0x1004, 0x1007, 0x0016, 0x0017, 0x0018, 0x0019, 0x001a, 0x001b], {
                manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
            });
        },
        exposes: [],
        extend: [
            m.battery(),
            m.temperature(),
            m.iasZoneAlarm({zoneType: "smoke", zoneAttributes: ["alarm_1", "battery_low", "test"]}),
            heimanExtend.heimanClusterSpecial(),
            heimanExtend.heimanClusterSensorFaultState(),
            heimanExtend.heimanClusterDeviceMuteState(),
            heimanExtend.iasZoneInitiateTestMode(),
            heimanExtend.iasWarningDeviceMute(),
            heimanExtend.heimanClusterIndicatorLight(),
            heimanExtend.heimanClusterSensorInterconnectable(),
            m.numeric({
                name: "smoke_level",
                unit: "",
                scale: 0.1,
                valueMin: 0,
                valueMax: 20,
                cluster: "heimanClusterSpecial",
                attribute: {ID: 0x0016, type: Zcl.DataType.UINT8},
                description: "smoke level",
                access: "STATE_GET",
            }),
            m.enumLookup({
                name: "smoke_unit",
                lookup: {"dB/m": 0, "%ft OBS": 1},
                cluster: "heimanClusterSpecial",
                attribute: {ID: 0x0018, type: Zcl.DataType.UINT8},
                description: "smoke level unit",
                access: "STATE_GET",
            }),
            m.enumLookup({
                name: "chamber_contamination",
                lookup: {normal: 0, light_contamination: 1, medium_contamication: 2, critical_contamication: 3},
                cluster: "heimanClusterSpecial",
                attribute: {ID: 0x0017, type: Zcl.DataType.UINT8},
                description: "it indicates that how serious the smoke chamber get contaminated.",
                access: "STATE_GET",
            }),
            m.enumLookup({
                name: "siren_for_automation_only",
                lookup: {stop: 0, smoke_siren: 1, co_siren: 2},
                cluster: "heimanClusterSpecial",
                attribute: {ID: 0x0012, type: Zcl.DataType.UINT8},
                description: "siren effect",
                access: "ALL",
            }),
            m.numeric({
                name: "reported_packages",
                unit: "",
                valueMin: 0,
                valueMax: 60000,
                cluster: "heimanClusterSpecial",
                attribute: {ID: 0x001b, type: Zcl.DataType.UINT8},
                description: "for diagnostic purpose, how many zigbee packages has the reported in a day.",
                access: "STATE_GET",
            }),
            m.numeric({
                name: "rejoin_count",
                unit: "",
                valueMin: 0,
                valueMax: 60000,
                cluster: "heimanClusterSpecial",
                attribute: {ID: 0x001a, type: Zcl.DataType.UINT8},
                description: "for diagnostic purpose, how many times has the product rejoined to zigbee network.",
                access: "STATE_GET",
            }),
            m.numeric({
                name: "reboot_count",
                unit: "",
                valueMin: 0,
                valueMax: 60000,
                cluster: "heimanClusterSpecial",
                attribute: {ID: 0x0019, type: Zcl.DataType.UINT8},
                description: "for diagnostic purpose, how many times has the product rebooted.",
                access: "STATE_GET",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["WarningDevice-EFA1-3.0"],
        model: "HS2WD-EF",
        vendor: "Heiman",
        description: "Smart siren",
        fromZigbee: [fz.battery, fz.ias_wd],
        toZigbee: [tz.warning, tz.ias_max_duration],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("ssIasWd", ["maxDuration"]);
        },
        exposes: [
            e.battery(),
            e
                .numeric("max_duration", ea.ALL)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(1800)
                .withDescription("Max duration of Siren")
                .withCategory("config"),
            e
                .warning()
                .removeFeature("strobe_level")
                .removeFeature("mode")
                .withFeature(e.enum("mode", ea.SET, ["stop", "burglar", "fire", "emergency"]).withDescription("Mode of the warning(sound effect)")),
        ],
        ota: true,
    },
];
