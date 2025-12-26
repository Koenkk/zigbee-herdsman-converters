import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import {repInterval} from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";
import {isDummyDevice} from "../lib/utils";

const NS = "zhc:profalux";
const e = exposes.presets;
const ea = exposes.access;

const mLocal = {
    pollBatteryVoltage: (): ModernExtend => {
        // Poll Battery voltage at most once a day
        // as the Profalux remotes do not report on battery
        return m.poll({
            key: "battery",
            defaultIntervalSeconds: 60 * 60 * 24,
            poll: (device) => {
                const endpoint = device.endpoints.find((e) => e.supportsInputCluster("genPowerCfg"));
                endpoint
                    .read("genPowerCfg", ["batteryVoltage"], {sendPolicy: "queue"})
                    .catch((error) => logger.debug(`Failed to poll battery voltage of '${device.ieeeAddr}' (${error})`, NS));
            },
        });
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MAI-ZTS"],
        fingerprint: [
            {
                manufacturerID: 4368,
                endpoints: [{ID: 1, profileID: 260, deviceID: 513, inputClusters: [0, 3, 21], outputClusters: [3, 4, 5, 6, 8, 256, 64544, 64545]}],
            },
        ],
        model: "NB102",
        vendor: "Profalux",
        description: "Cover remote",
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        // Recent covers are matched by Zigbee model. Their remotes communicate
        // using cluster 0x102 "closuresWindowCovering", so use that.
        // 06/10/20/30 is the torque in Nm. 20/30 have not been seen but
        // extracted from Profalux documentation. C/F seems to be a version. D
        // and E have not been seen in the wild. I suspect A is the earlier
        // model covered below, NSAV061.
        zigbeeModel: [
            "MOT-C1Z06C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "MOT-C1Z10C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "MOT-C1Z20C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "MOT-C1Z30C\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "MOT-C1Z06F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "MOT-C1Z10F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "MOT-C1Z20F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "MOT-C1Z30F\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
        ],
        model: "MOT-C1ZxxC/F",
        vendor: "Profalux",
        description: "Cover",
        fromZigbee: [fz.command_cover_close, fz.command_cover_open, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        options: [],
        exposes: (device, options) => {
            // Motor can be configured using the associated remote:
            //  0: default hard cover         : 2xF Up + Down on the associated remote
            //  1: cover using tilt (aka BSO) : 2xF Stop + Up
            //  2: soft cover (aka store)     : 2xF Stop + Down
            return isDummyDevice(device) || device?.getEndpoint(2).getClusterAttributeValue("manuSpecificProfalux1", "motorCoverType") === 1
                ? [e.cover_position_tilt()]
                : [e.cover_position()];
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await endpoint.read("manuSpecificProfalux1", ["motorCoverType"]).catch((e) => {
                logger.warning(`Failed to read zigbee attributes: ${e}`, NS);
            });
            const coverType = endpoint.getClusterAttributeValue("manuSpecificProfalux1", "motorCoverType");
            // logger.debug(`Profalux '${device.ieeeAddr}' setup as cover type '${coverType)}'`, NS);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
            if (coverType === 1) {
                await reporting.currentPositionTiltPercentage(endpoint);
            }
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        // Identify older covers based on their fingerprint. These do not
        // expose closuresWindowCovering and need to use genLevelCtrl
        // instead. Sniffing a remote would be welcome to confirm that this
        // is the right thing to do.
        fingerprint: [
            {
                manufacturerID: 4368,
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 512, inputClusters: [0, 3, 4, 5, 6, 8, 10, 21, 256, 64544, 64545], outputClusters: [3, 64544]},
                ],
            },
        ],
        model: "NSAV061",
        vendor: "Profalux",
        description: "Cover",
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess("state", ea.ALL)],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genLevelCtrl"]);
            await reporting.brightness(endpoint);
        },
    },
    {
        // Newer remotes. These expose a bunch of things but they are bound to
        // the cover and don't seem to communicate with the coordinator, so
        // nothing is likely to be doable in Z2M.
        zigbeeModel: ["MAI-ZTP20F", "MAI-ZTP20C"],
        model: "MAI-ZTP20",
        vendor: "Profalux",
        description: "Cover remote",
        extend: [
            m.battery({voltage: true, voltageToPercentage: {min: 2200, max: 3100}, percentageReporting: false}),
            m.forcePowerSource({powerSource: "Battery"}),
            // Poll battery voltage as reporting doesn't work
            mLocal.pollBatteryVoltage(),
        ],
    },
    {
        // Newer remotes. These expose a bunch of things but they are bound to
        // the cover and don't seem to communicate with the coordinator, so
        // nothing is likely to be doable in Z2M.
        fingerprint: [
            {
                type: "EndDevice",
                manufacturerName: "Profalux",
                modelID: "MAI-ZTS",
                manufacturerID: 4368,
                endpoints: [
                    {
                        ID: 1,
                        profileID: 260,
                        deviceID: 513,
                        inputClusters: [0, 3, 21, 64514, 64544],
                        outputClusters: [3, 4, 5, 6, 8, 256, 64544, 64545],
                    },
                    {
                        ID: 2,
                        profileID: 260,
                        deviceID: 515,
                        inputClusters: [0, 1, 3, 9, 21, 32, 64514, 64544],
                        outputClusters: [3, 4, 5, 25, 258, 64544, 64545],
                    },
                ],
            },
        ],
        model: "MAI-ZTM20C",
        zigbeeModel: ["MAI-ZTM20C"],
        vendor: "Profalux",
        description: "Cover remote",
        extend: [m.battery({voltage: true, voltageToPercentage: {min: 2200, max: 3100}, percentageReporting: false})],
        fromZigbee: [fz.command_cover_close, fz.command_cover_open, fz.command_cover_stop],
        exposes: [e.action(["up", "down", "stop"])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            // Bind clusters
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genLevelCtrl"]);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genPowerCfg", "closureWindowCovering"]);
            // Configure battery voltage reporting from endpoint 2
            await reporting.batteryVoltage(endpoint2, {min: 3600, max: repInterval.MAX, change: 1});
        },
    },
];
