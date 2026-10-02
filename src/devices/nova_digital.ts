import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import * as tuya from "zigbee-herdsman-converters/lib/tuya";

export default {
    fingerprint: [
        {
            modelID: "TS011F",
            manufacturerName: "_TZ3210_z1kba38n",
        },
    ],

    model: "SA-T2",
    vendor: "NovaDigital",
    description: "Tomada dupla Safira TS011F",

    extend: [
        m.deviceEndpoints({
            endpoints: {
                l1: 1,
                l2: 2,
            },
        }),

        tuya.modernExtend.tuyaBase(),

        tuya.modernExtend.tuyaOnOff({
            endpoints: ["l1", "l2"],
            powerOutageMemory: true,
            indicatorMode: true,
            childLock: true,
            onOffCountdown: true,
        }),
    ],

    meta: {
        multiEndpoint: true,
    },
};
