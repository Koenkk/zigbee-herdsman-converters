import {afterEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src";
import type {Definition, KeyValue, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

const BOOST_BASE_META = "cctfr6400BoostSavedSetpoint";
const BOOST_END_META = "cctfr6400BoostEndTime";

let nextIeeeAddr = 1;
let nextTransactionSequenceNumber = 1;

async function mockCctfr6400() {
    const device = mockDevice(
        {
            modelID: "Thermostat",
            manufacturerName: "Schneider Electric",
            ieeeAddr: `0xcctfr6400${nextIeeeAddr++}`,
            endpoints: [{ID: 1, inputClusters: ["genBasic", "genPowerCfg", "hvacThermostat", "msTemperatureMeasurement", "msRelativeHumidity"]}],
        },
        "EndDevice",
    );
    vi.spyOn(device, "save").mockImplementation(() => {});
    const definition = await findByDevice(device);
    expect(definition.model).toBe("CCTFR6400");
    return {device, definition, endpoint: device.endpoints[0]};
}

async function start(definition: Definition, device: Zh.Device, options: KeyValue = {}) {
    await definition.onEvent?.({type: "start", data: {device, state: {}, options, deviceExposesChanged: vi.fn()}});
}

function getFzConverter(definition: Definition, cluster: string, type: string) {
    const converter = definition.fromZigbee?.find(
        (item) => item.cluster === cluster && (Array.isArray(item.type) ? item.type.includes(type) : item.type === type),
    );
    expect(converter).toBeDefined();
    return converter;
}

function getTzConverter(definition: Definition, key: string) {
    const converter = definition.toZigbee?.find((item) => item.key.includes(key));
    expect(converter).toBeDefined();
    return converter;
}

function boostMessage(device: Zh.Device, payload: {enable: number; temperature: number; duration: number}) {
    return {
        data: {command: 3, ...payload},
        endpoint: device.endpoints[0],
        device,
        meta: {zclTransactionSequenceNumber: nextTransactionSequenceNumber++},
        cluster: "hvacThermostat",
        type: "commandSchneiderWiserThermostatBoost",
        groupID: 0,
        linkquality: 100,
    } as never;
}

function uiMessage(device: Zh.Device, deviceInfo: string) {
    return {
        data: {deviceInfo},
        endpoint: device.endpoints[0],
        device,
        meta: {zclTransactionSequenceNumber: nextTransactionSequenceNumber++},
        cluster: "wiserDeviceInfo",
        type: "attributeReport",
        groupID: 0,
        linkquality: 100,
    } as never;
}

function setSetpoint(definition: Definition, device: Zh.Device, value: number) {
    getTzConverter(definition, "occupied_heating_setpoint")?.convertSet?.(device.endpoints[0], "occupied_heating_setpoint", value, {
        device,
    } as never);
}

describe("Schneider Electric CCTFR6400", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("honors a boost commit and restores the saved setpoint when the duration ends", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device);
        setSetpoint(definition, device, 21);

        const publish = vi.fn();
        const converter = getFzConverter(definition, "hvacThermostat", "commandSchneiderWiserThermostatBoost");
        const result = converter?.convert(definition, boostMessage(device, {enable: 1, temperature: 2700, duration: 30}), publish, {}, {
            device,
        } as never);

        expect(result).toStrictEqual({
            action: "boost_set",
            boost_duration: 30,
            boost_temperature: 27,
            occupied_heating_setpoint: 27,
        });
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2700);
        expect(device.meta[BOOST_BASE_META]).toBe(2100);
        expect(device.meta[BOOST_END_META]).toBe(Date.now() + 30 * 60000);

        vi.advanceTimersByTime(30 * 60000);
        expect(publish).toHaveBeenCalledWith({occupied_heating_setpoint: 21});
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2100);
        expect(device.meta[BOOST_BASE_META]).toBeUndefined();
        expect(device.meta[BOOST_END_META]).toBeUndefined();
    });

    it("keeps the original saved setpoint when a new boost commits during a running boost", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device);
        setSetpoint(definition, device, 21);

        const publish = vi.fn();
        const converter = getFzConverter(definition, "hvacThermostat", "commandSchneiderWiserThermostatBoost");
        converter?.convert(definition, boostMessage(device, {enable: 1, temperature: 2700, duration: 30}), publish, {}, {device} as never);
        vi.advanceTimersByTime(10 * 60000);
        converter?.convert(definition, boostMessage(device, {enable: 1, temperature: 2800, duration: 60}), publish, {}, {device} as never);

        expect(device.meta[BOOST_BASE_META]).toBe(2100);
        expect(device.meta[BOOST_END_META]).toBe(Date.now() + 60 * 60000);

        vi.advanceTimersByTime(60 * 60000);
        expect(publish).toHaveBeenCalledWith({occupied_heating_setpoint: 21});
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2100);
    });

    it("restores the saved setpoint immediately when the boost is cancelled on the device", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device);
        setSetpoint(definition, device, 21);

        const publish = vi.fn();
        const converter = getFzConverter(definition, "hvacThermostat", "commandSchneiderWiserThermostatBoost");
        converter?.convert(definition, boostMessage(device, {enable: 1, temperature: 2700, duration: 30}), publish, {}, {device} as never);
        const result = converter?.convert(definition, boostMessage(device, {enable: 0, temperature: 4095, duration: 0}), publish, {}, {
            device,
        } as never);

        expect(result).toStrictEqual({
            action: "boost_cancel",
            boost_duration: 0,
            boost_temperature: null,
            occupied_heating_setpoint: 21,
        });
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2100);
        expect(device.meta[BOOST_BASE_META]).toBeUndefined();

        vi.advanceTimersByTime(30 * 60000);
        expect(publish).not.toHaveBeenCalled();
    });

    it("an external setpoint write cancels the pending restore", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device);
        setSetpoint(definition, device, 21);

        const publish = vi.fn();
        const converter = getFzConverter(definition, "hvacThermostat", "commandSchneiderWiserThermostatBoost");
        converter?.convert(definition, boostMessage(device, {enable: 1, temperature: 2700, duration: 30}), publish, {}, {device} as never);
        setSetpoint(definition, device, 22);

        expect(device.meta[BOOST_BASE_META]).toBeUndefined();
        expect(device.meta[BOOST_END_META]).toBeUndefined();

        vi.advanceTimersByTime(30 * 60000);
        expect(publish).not.toHaveBeenCalled();
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2200);
    });

    it("a +/- press after the boost commit cancels the pending restore and steps the setpoint", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device);
        // configure() seeds this at pairing; without it the keypad counts as locked.
        endpoint.saveClusterAttributeKeyValue("hvacUserInterfaceCfg", {keypadLockout: 0});
        setSetpoint(definition, device, 21);

        const publish = vi.fn();
        const boost = getFzConverter(definition, "hvacThermostat", "commandSchneiderWiserThermostatBoost");
        const ui = getFzConverter(definition, "wiserDeviceInfo", "attributeReport");
        boost?.convert(definition, boostMessage(device, {enable: 1, temperature: 2700, duration: 30}), publish, {}, {device} as never);

        ui?.convert(definition, uiMessage(device, "UI,ScreenWake"), publish, {}, {device} as never);
        const result = ui?.convert(definition, uiMessage(device, "UI,ButtonPressPlusDown"), publish, {}, {device} as never);

        expect(result).toStrictEqual({action: "button_press_plus_down", occupied_heating_setpoint: 27.5});
        expect(device.meta[BOOST_BASE_META]).toBeUndefined();

        vi.advanceTimersByTime(30 * 60000);
        expect(publish).not.toHaveBeenCalled();
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2750);
    });

    it("+/- presses during the boost selection window do not touch the setpoint", async () => {
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device);
        // configure() seeds this at pairing; without it the keypad counts as locked.
        endpoint.saveClusterAttributeKeyValue("hvacUserInterfaceCfg", {keypadLockout: 0});
        setSetpoint(definition, device, 21);

        const publish = vi.fn();
        const ui = getFzConverter(definition, "wiserDeviceInfo", "attributeReport");
        ui?.convert(definition, uiMessage(device, "UI,ScreenWake"), publish, {}, {device} as never);
        ui?.convert(definition, uiMessage(device, "UI,ButtonPressCenterDown"), publish, {}, {device} as never);
        const result = ui?.convert(definition, uiMessage(device, "UI,ButtonPressPlusDown"), publish, {}, {device} as never);

        expect(result).toStrictEqual({action: "button_press_plus_down"});
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2100);

        // The window closes at screen sleep: afterwards +/- steps the setpoint again.
        ui?.convert(definition, uiMessage(device, "UI,ScreenSleep"), publish, {}, {device} as never);
        ui?.convert(definition, uiMessage(device, "UI,ScreenWake"), publish, {}, {device} as never);
        const afterSleep = ui?.convert(definition, uiMessage(device, "UI,ButtonPressPlusDown"), publish, {}, {device} as never);
        expect(afterSleep).toStrictEqual({action: "button_press_plus_down", occupied_heating_setpoint: 21.5});
    });

    it("does not honor boosts when boost_auto_honor is disabled", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device, {boost_auto_honor: false});
        setSetpoint(definition, device, 21);

        const publish = vi.fn();
        const converter = getFzConverter(definition, "hvacThermostat", "commandSchneiderWiserThermostatBoost");
        const result = converter?.convert(
            definition,
            boostMessage(device, {enable: 1, temperature: 2700, duration: 30}),
            publish,
            {boost_auto_honor: false},
            {device} as never,
        );

        expect(result).toStrictEqual({action: "boost_set", boost_duration: 30, boost_temperature: 27});
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2100);
        expect(device.meta[BOOST_BASE_META]).toBeUndefined();

        vi.advanceTimersByTime(30 * 60000);
        expect(publish).not.toHaveBeenCalled();
    });

    it("resumes a persisted boost after a restart and restores at the original end time", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 2700});
        device.meta[BOOST_BASE_META] = 2100;
        device.meta[BOOST_END_META] = Date.now() + 5 * 60000;

        await start(definition, device);
        vi.advanceTimersByTime(5 * 60000);

        // The restore happened, but no publish callback was captured yet: the
        // payload is parked and published with the next incoming message.
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2100);
        expect(device.meta[BOOST_BASE_META]).toBeUndefined();

        const publish = vi.fn();
        const ui = getFzConverter(definition, "wiserDeviceInfo", "attributeReport");
        ui?.convert(definition, uiMessage(device, "UI,ScreenWake"), publish, {}, {device} as never);
        expect(publish).toHaveBeenCalledWith({occupied_heating_setpoint: 21});
    });

    it("restores immediately at start when the boost expired while the controller was down", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 2700});
        device.meta[BOOST_BASE_META] = 2100;
        device.meta[BOOST_END_META] = Date.now() - 60000;

        await start(definition, device);

        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2100);
        expect(device.meta[BOOST_BASE_META]).toBeUndefined();
        expect(device.meta[BOOST_END_META]).toBeUndefined();
    });

    it("keeps the persisted boost across a stop event and does not fire its timer anymore", async () => {
        vi.useFakeTimers();
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device);
        setSetpoint(definition, device, 21);

        const publish = vi.fn();
        const converter = getFzConverter(definition, "hvacThermostat", "commandSchneiderWiserThermostatBoost");
        converter?.convert(definition, boostMessage(device, {enable: 1, temperature: 2700, duration: 30}), publish, {}, {device} as never);

        await definition.onEvent?.({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        vi.advanceTimersByTime(30 * 60000);

        expect(publish).not.toHaveBeenCalled();
        expect(endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint")).toBe(2700);
        // The bookkeeping survives for the next start (restart safety).
        expect(device.meta[BOOST_BASE_META]).toBe(2100);
        expect(device.meta[BOOST_END_META]).toBeDefined();
    });

    it("answers display poll reads from the attribute cache via coordinator endpoint 3", async () => {
        const {device, definition, endpoint} = await mockCctfr6400();
        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).endpoints[0];
        await definition.configure?.(device, coordinatorEndpoint, definition);
        await start(definition, device);
        setSetpoint(definition, device, 21);
        getTzConverter(definition, "pi_heating_demand")?.convertSet?.(device.endpoints[0], "pi_heating_demand", 0, {device} as never);

        const readResponse = vi.spyOn(endpoint, "readResponse").mockImplementation(async () => {});
        expect(device.customReadResponse).toBeDefined();
        const handled = device.customReadResponse?.(
            {
                isCluster: (name: string) => name === "hvacThermostat",
                payload: [{attrId: 0x0012}, {attrId: 0x001c}, {attrId: 0x001b}, {attrId: 0x0008}],
                header: {transactionSequenceNumber: 40},
            } as never,
            endpoint,
        );

        expect(handled).toBe(true);
        expect(readResponse).toHaveBeenCalledWith(
            "hvacThermostat",
            40,
            {occupiedHeatingSetpoint: 2100, systemMode: 4, ctrlSeqeOfOper: 2, pIHeatingDemand: 0},
            {srcEndpoint: 3},
        );
    });

    it("mirrors the manufacturer code when answering manufacturer specific reads", async () => {
        const {device, definition, endpoint} = await mockCctfr6400();
        const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).endpoints[0];
        await definition.configure?.(device, coordinatorEndpoint, definition);
        await start(definition, device);

        const readResponse = vi.spyOn(endpoint, "readResponse").mockImplementation(async () => {});
        const handled = device.customReadResponse?.(
            {
                isCluster: (name: string) => name === "hvacThermostat",
                payload: [{attrId: 0xe110}],
                header: {transactionSequenceNumber: 41, manufacturerCode: 4190},
            } as never,
            endpoint,
        );

        expect(handled).toBe(true);
        expect(readResponse).toHaveBeenCalledWith("hvacThermostat", 41, {schneiderWiserSpecific: 1}, {srcEndpoint: 3, manufacturerCode: 4190});
    });

    it("leaves unknown or uncached reads to the default zigbee-herdsman path", async () => {
        const {device, definition, endpoint} = await mockCctfr6400();
        await start(definition, device);

        const readResponse = vi.spyOn(endpoint, "readResponse").mockImplementation(async () => {});
        // No cached setpoint yet: the whole frame goes to the default path.
        expect(
            device.customReadResponse?.(
                {
                    isCluster: (name: string) => name === "hvacThermostat",
                    payload: [{attrId: 0x0012}],
                    header: {transactionSequenceNumber: 42},
                } as never,
                endpoint,
            ),
        ).toBe(false);
        // Unknown attribute in an otherwise cached frame: default path as well.
        setSetpoint(definition, device, 21);
        expect(
            device.customReadResponse?.(
                {
                    isCluster: (name: string) => name === "hvacThermostat",
                    payload: [{attrId: 0x0012}, {attrId: 0x4242}],
                    header: {transactionSequenceNumber: 43},
                } as never,
                endpoint,
            ),
        ).toBe(false);
        // genBasic reads stay with zigbee-herdsman (it answers them itself).
        expect(
            device.customReadResponse?.(
                {
                    isCluster: (name: string) => name === "genBasic",
                    payload: [{attrId: 0x0000}],
                    header: {transactionSequenceNumber: 44},
                } as never,
                endpoint,
            ),
        ).toBe(false);
        expect(readResponse).not.toHaveBeenCalled();
    });
});
