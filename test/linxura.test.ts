import {beforeEach, describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, Fz, KeyValueAny} from "../src/lib/types";
import {mockDevice, reportingItem} from "./utils";

function buildDevice(modelID: string, inputClusters: string[]) {
    return mockDevice(
        {
            modelID,
            manufacturerName: "Linxura",
            endpoints: [{ID: 1, inputClusters}],
        },
        "EndDevice",
    );
}

function runIasConverter(
    definition: Definition,
    device: ReturnType<typeof mockDevice>,
    type: "attributeReport" | "readResponse" | "commandStatusChangeNotification",
    data: KeyValueAny,
) {
    const converter = definition.fromZigbee.find((item) => item.cluster === "ssIasZone" && item.type.includes(type));
    const msg = {
        data,
        endpoint: device.getEndpoint(1),
        type,
        cluster: "ssIasZone",
        device,
        meta: {},
        groupID: 0,
        linkquality: 100,
    } as unknown as Fz.Message;
    const meta = {state: {}, device, deviceExposesChanged: null} as unknown as Fz.Meta;
    return converter?.convert(definition, msg, () => {}, {}, meta);
}

describe("Linxura Aura Smart Button", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Definition;

    beforeEach(async () => {
        device = buildDevice("Aura Smart Button", ["genBasic", "ssIasZone", "genPowerCfg"]);
        definition = await findByDevice(device);
    });

    it("matches the firmware fingerprint", () => {
        expect(definition.model).toBe("Aura Smart Button");
        expect(definition.vendor).toBe("Linxura");
    });

    it("maps every button and gesture from IAS zoneStatus", () => {
        const actionTypes = ["click", "double_click", "hold"];

        for (let button = 1; button <= 12; button++) {
            for (let actionIndex = 0; actionIndex < actionTypes.length; actionIndex++) {
                const zoneStatus = (button - 1) * 6 + actionIndex * 2 + 1;
                expect(runIasConverter(definition, device, "attributeReport", {zoneStatus})).toStrictEqual({
                    action: `button_${button}_${actionTypes[actionIndex]}`,
                });
            }
        }
    });

    it("supports IAS status-change notifications", () => {
        expect(runIasConverter(definition, device, "commandStatusChangeNotification", {zonestatus: 69})).toStrictEqual({
            action: "button_12_double_click",
        });
    });

    it.each([0, 2, 4, 6, 72])("ignores idle or invalid zoneStatus %s", (zoneStatus) => {
        expect(runIasConverter(definition, device, "attributeReport", {zoneStatus})).toBeUndefined();
    });

    it("configures event-driven reporting without an extra periodic battery wakeup", async () => {
        const coordinatorEndpoint = device.getEndpoint(1);
        await definition.configure?.(device, coordinatorEndpoint, definition);

        expect(device.getEndpoint(1).bind).toHaveBeenNthCalledWith(1, "ssIasZone", coordinatorEndpoint);
        expect(device.getEndpoint(1).bind).toHaveBeenNthCalledWith(2, "genPowerCfg", coordinatorEndpoint);
        expect(device.getEndpoint(1).configureReporting).toHaveBeenCalledWith("genPowerCfg", [
            reportingItem("batteryPercentageRemaining", 3600, 0, 1),
        ]);
        expect(device.getEndpoint(1).read).toHaveBeenCalledWith("genPowerCfg", ["batteryPercentageRemaining"]);
    });
});

describe("Linxura Smart Controller", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Definition;

    beforeEach(async () => {
        device = buildDevice("Smart Controller", ["genBasic", "ssIasZone"]);
        definition = await findByDevice(device);
    });

    it("matches the four-button device fingerprint", () => {
        expect(definition.model).toBe("Smart Controller");
        expect(definition.vendor).toBe("Linxura");
    });

    it("maps every button and gesture", () => {
        const actionTypes = ["click", "double_click", "hold"];

        for (let button = 1; button <= 4; button++) {
            for (let actionIndex = 0; actionIndex < actionTypes.length; actionIndex++) {
                const zoneStatus = (button - 1) * 6 + actionIndex * 2 + 1;
                expect(runIasConverter(definition, device, "attributeReport", {zoneStatus})).toStrictEqual({
                    action: `button_${button}_${actionTypes[actionIndex]}`,
                });
            }
        }
    });

    it("does not expose Aura-only buttons", () => {
        expect(runIasConverter(definition, device, "attributeReport", {zoneStatus: 25})).toBeUndefined();
        const actionExpose = definition.exposes.find((expose) => expose.property === "action");
        expect(actionExpose?.values).toHaveLength(12);
    });

    it("only configures IAS Zone", async () => {
        const coordinatorEndpoint = device.getEndpoint(1);
        await definition.configure?.(device, coordinatorEndpoint, definition);

        expect(device.getEndpoint(1).bind).toHaveBeenCalledOnce();
        expect(device.getEndpoint(1).bind).toHaveBeenCalledWith("ssIasZone", coordinatorEndpoint);
        expect(device.getEndpoint(1).configureReporting).not.toHaveBeenCalled();
        expect(device.getEndpoint(1).read).not.toHaveBeenCalled();
    });
});
