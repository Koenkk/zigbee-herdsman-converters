import {beforeEach, describe, expect, it} from "vitest";

import {findByDevice} from "../src/index";
import * as globalStore from "../src/lib/store";
import type {Fz, KeyValue, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Somfy Glydea Ultra Curtain", () => {
    beforeEach(() => {
        globalStore.clear();
    });

    async function setup() {
        const device = mockDevice({
            ieeeAddr: "0x4cc206fffe316577",
            modelID: "Glydea Ultra Curtain",
            manufacturerName: "SOMFY",
            endpoints: [
                {
                    ID: 1,
                    inputClusters: ["closuresWindowCovering"],
                },
            ],
        });

        const definition = await findByDevice(device);

        const endpoint = device.getEndpoint(1);

        const fromConverter = definition.fromZigbee.find((converter) => converter.cluster === "closuresWindowCovering");

        const stateConverter = definition.toZigbee.find((converter) => converter.key?.includes("state"));

        const positionConverter = definition.toZigbee.find((converter) => converter.key?.includes("position"));

        if (!fromConverter || !stateConverter?.convertSet || !positionConverter?.convertSet) {
            throw new Error("Glydea converters not found");
        }

        const stateConvertSet = stateConverter.convertSet;
        const positionConvertSet = positionConverter.convertSet;

        const convert = (data: Record<string, number>, options: KeyValue = {}, type: "attributeReport" | "readResponse" = "attributeReport") => {
            const message = {
                data,
                endpoint,
                device,
                meta: {
                    rawData: Buffer.alloc(0),
                },
                groupID: 0,
                type,
                cluster: "closuresWindowCovering",
                linkquality: 0,
            } as Fz.Message<"closuresWindowCovering", undefined, ["attributeReport", "readResponse"]>;

            return fromConverter.convert(definition, message, () => {}, options, {
                state: {},
                device,
                deviceExposesChanged: () => {},
            });
        };

        const createMeta = (message: KeyValue, options: KeyValue = {}): Tz.Meta => ({
            message,
            device,
            mapped: definition,
            options,
            state: {},
            endpoint_name: undefined,
            publish: () => {},
        });

        const sendState = async (state: string, options: KeyValue = {}) => {
            await stateConvertSet(endpoint, "state", state, createMeta({state}, options));
        };

        const sendPosition = async (position: number, options: KeyValue = {}) => {
            await positionConvertSet(endpoint, "position", position, createMeta({position}, options));
        };

        return {
            convert,
            sendPosition,
            sendState,
        };
    }

    it("filters the spurious zero after closing", async () => {
        const {convert, sendState} = await setup();

        await sendState("CLOSE");

        expect(
            convert({
                currentPositionLiftPercentage: 100,
            }),
        ).toStrictEqual({
            position: 0,
            state: "CLOSE",
        });

        expect(
            convert({
                currentPositionLiftPercentage: 0,
            }),
        ).toStrictEqual({});
    });

    it("filters the spurious zero after stop", async () => {
        const {convert, sendState} = await setup();

        await sendState("STOP");

        expect(
            convert({
                currentPositionLiftPercentage: 0,
            }),
        ).toStrictEqual({});
    });

    it("filters the spurious zero after an intermediate target", async () => {
        const {convert, sendPosition} = await setup();

        await sendPosition(60);

        expect(
            convert({
                currentPositionLiftPercentage: 40,
            }),
        ).toStrictEqual({
            position: 60,
            state: "OPEN",
        });

        expect(
            convert({
                currentPositionLiftPercentage: 0,
            }),
        ).toStrictEqual({});
    });

    it("accepts a genuine fully-open endpoint", async () => {
        const {convert, sendState} = await setup();

        await sendState("OPEN");

        expect(
            convert({
                currentPositionLiftPercentage: 0,
            }),
        ).toStrictEqual({
            position: 100,
            state: "OPEN",
        });
    });

    it("preserves invert_cover for position targets", async () => {
        const {convert, sendPosition} = await setup();

        const options = {
            invert_cover: true,
        };

        await sendPosition(0, options);

        expect(
            convert(
                {
                    currentPositionLiftPercentage: 0,
                },
                options,
            ),
        ).toMatchObject({
            position: 0,
        });
    });

    it("does not change reports without command context", async () => {
        const {convert} = await setup();

        expect(
            convert({
                currentPositionLiftPercentage: 0,
            }),
        ).toStrictEqual({
            position: 100,
            state: "OPEN",
        });
    });

    it("never filters an explicit read response", async () => {
        const {convert, sendState} = await setup();

        await sendState("CLOSE");

        expect(
            convert(
                {
                    currentPositionLiftPercentage: 0,
                },
                {},
                "readResponse",
            ),
        ).toStrictEqual({
            position: 100,
            state: "OPEN",
        });
    });
});
