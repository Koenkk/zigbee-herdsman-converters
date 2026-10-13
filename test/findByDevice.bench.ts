import {bench, describe} from "vitest";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

/**
 * https://vitest.dev/api/#bench
 *
 * NOTE: These are not a good measure of actual performance due to various "uncontrolled" caching mechanisms triggered while executing.
 * They should however provide decent enough feedback to notice changes from PR to PR as necessary.
 */
describe("findByDevice", () => {
    const noop = (a: unknown) => {};

    bench("unknown without generate - index of size 0", async () => {
        const device = mockDevice(
            {
                modelID: "test_no_generate",
                endpoints: [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "Router",
        );

        noop(await findByDevice(device));
    });

    bench("unknown with generate - index of size 0", async () => {
        const device = mockDevice(
            {
                modelID: "test_generate",
                endpoints: [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "Router",
        );

        noop(await findByDevice(device, true));
    });

    bench("find by model ID - index of size 1", async () => {
        const device = mockDevice(
            {
                modelID: "lumi.sensor_motion",
                endpoints: [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "Unknown",
        );

        noop(await findByDevice(device));
    });

    bench("find by fingerprint - index of size 2", async () => {
        const device = mockDevice(
            {
                modelID: "CCT Lighting",
                manufacturerID: 4635,
                manufacturerName: "MLI",
                endpoints: [
                    {ID: 1, profileID: 49246, deviceID: 544, inputClusterIDs: [0, 3, 4, 5, 6, 8, 768, 2821, 4096], outputClusterIDs: [25]},
                    {ID: 242, profileID: 41440, deviceID: 102, inputClusterIDs: [33], outputClusterIDs: [33]},
                ],
            },
            "Router",
            {
                powerSource: "Mains (single phase)",
            },
        );

        noop(await findByDevice(device));
    });

    bench("find by fingerprint - index of size 10+", async () => {
        const device = mockDevice(
            {
                modelID: "Dimmer-Switch-ZB3.0",
                manufacturerName: "Light Solutions",
                endpoints: [],
            },
            "Router",
        );

        noop(await findByDevice(device));
    });

    bench("find by fingerprint - index of size 35+", async () => {
        const device = mockDevice(
            {
                modelID: "TS011F",
                endpoints: [],
            },
            "Router",
            {
                softwareBuildID: "1.0.5\u0000",
            },
        );

        noop(await findByDevice(device));
    });

    bench("find by fingerprint - index of size 250+", async () => {
        const device = mockDevice(
            {
                modelID: "TS0601",
                manufacturerName: "_TZE204_aoclfnxz",
                endpoints: [],
            },
            "EndDevice",
        );

        noop(await findByDevice(device));
    });
});
