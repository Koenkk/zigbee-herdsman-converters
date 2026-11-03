import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {
                type: "Router",
                endpoints: [
                    {
                        ID: 1,
                        profileID: 260,
                        deviceID: 81,
                        inputClusters: [0, 3, 4, 5, 6, 10, 57344, 1794, 2820, 4096, 6280],
                        outputClusters: [25],
                    },
                ],
            },
        ],
        model: "ZIGEE-PLUG-16A",
        vendor: "Zigee Link",
        description: "Smart plug 16A with power monitoring",
        fromZigbee: [fz.electrical_measurement, fz.metering],
        exposes: [e.power(), e.voltage(), e.current(), e.energy()],
        extend: [
            tuya.modernExtend.tuyaOnOff({
                powerOutageMemory: true,
                indicatorMode: true,
                childLock: true,
                onOffCountdown: true,
            }),
        ],
    },
];
