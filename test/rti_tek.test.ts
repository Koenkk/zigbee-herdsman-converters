import {beforeEach, describe, expect, it, vi} from "vitest";
import {
    computeDewPoint,
    computeHumidityComfort,
    computeVpd,
    formatFaultCode,
    toCelsiusTemperature,
    toDisplayTemperature,
    validateAlarmLimits,
} from "../src/devices/rti_tek";
import {findByDevice} from "../src/index";
import type {Definition, Fz, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

function buildDevice() {
    return mockDevice({
        modelID: "STHZB",
        manufacturerName: "Rti-Tek",
        endpoints: [
            {
                ID: 1,
                inputClusters: ["genBasic", "genPowerCfg", "genPollCtrl", "msTemperatureMeasurement", "msRelativeHumidity"],
                inputClusterIDs: [0xfd22],
            },
        ],
    });
}

function buildMeta(device: ReturnType<typeof mockDevice>, definition: Definition, overrides?: Partial<Tz.Meta>): Tz.Meta {
    return {
        state: {},
        device,
        message: {},
        mapped: definition,
        options: {},
        endpoint_name: undefined,
        deviceExposesChanged: () => {},
        ...overrides,
    };
}

describe("Rti-Tek STH1Z helpers", () => {
    it("converts absolute temperatures and temperature deltas", () => {
        expect(toDisplayTemperature(20, "absolute", true)).toBe(68);
        expect(toDisplayTemperature(1, "delta", true)).toBe(1.8);
        expect(toCelsiusTemperature(68, "absolute", true)).toBe(20);
        expect(toCelsiusTemperature(1.8, "delta", true)).toBe(1);
    });

    it("validates alarm limits with the STH1Z device rules", () => {
        expect(() => validateAlarmLimits({temperature_alarm_lower: -30, temperature_alarm_upper: -29.8})).not.toThrow();
        expect(() => validateAlarmLimits({temperature_alarm_lower: 20, temperature_alarm_upper: 20.1})).toThrow("0.2 C");
        expect(() => validateAlarmLimits({humidity_alarm_lower: 50, humidity_alarm_upper: 51})).toThrow("2 %RH");
    });

    it("decodes the documented fault bitmap", () => {
        expect(formatFaultCode(0)).toBe("none");
        expect(formatFaultCode(0b10101)).toBe("internal_sensor_fault,low_battery,battery_too_low_for_ota");
        expect(formatFaultCode(0x20)).toBe("unknown_0x00000020");
    });

    it("calculates environmental values and default comfort limits", () => {
        expect(computeDewPoint(29.4, 40.4)).toBe(14.5);
        expect(computeVpd(29.4, 40.4)).toBe(2.44);
        expect(computeHumidityComfort(22, 40)).toBe("comfort");
        expect(computeHumidityComfort(22, 29)).toBe("dry");
        expect(computeHumidityComfort(22, 61)).toBe("wet");
        expect(computeHumidityComfort(27, 40)).toBe("normal");
    });
});

describe("Rti-Tek STH1Z converter", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Definition;

    beforeEach(async () => {
        device = buildDevice();
        vi.spyOn(device, "save").mockImplementation(() => {});
        definition = await findByDevice(device);
    });

    const findTz = (key: string): Tz.Converter => {
        const converter = definition.toZigbee.find((candidate) => candidate.key?.includes(key));
        if (!converter) throw new Error(`missing toZigbee converter for ${key}`);
        return converter;
    };

    const runFz = (cluster: string, data: KeyValueAny, state: KeyValueAny = {}) => {
        const endpoint = device.getEndpoint(1);
        const meta = {state, device, deviceExposesChanged: vi.fn()} as unknown as Fz.Meta;
        const msg = {
            data,
            endpoint,
            type: "attributeReport",
            cluster,
            device,
            meta: {},
            groupID: 0,
            linkquality: 100,
        } as unknown as Fz.Message;
        let result: KeyValueAny = {};
        for (const converter of definition.fromZigbee.filter(
            (candidate) => candidate.cluster === cluster && candidate.type.includes("attributeReport"),
        )) {
            const partial = converter.convert(definition, msg, () => {}, {}, meta);
            if (partial && typeof partial === "object") result = {...result, ...partial};
        }
        return {result, meta};
    };

    it("maps FD22 faults and standard measurements to STH1Z state", () => {
        expect(runFz("rtiTekFd22", {faultCode: 0b10101}).result).toMatchObject({
            fault_status: "internal_sensor_fault,low_battery,battery_too_low_for_ota",
        });

        const {result} = runFz("msTemperatureMeasurement", {measuredValue: 2940}, {humidity: 40.4});
        expect(result).toMatchObject({
            temperature: 29.4,
            dew_point: 14.5,
            vpd: 2.44,
            humidity_comfort: "normal",
            comfort_humidity_lower_limit: 30,
            comfort_humidity_upper_limit: 60,
            comfort_temperature_lower_limit: 20,
            comfort_temperature_upper_limit: 26,
        });
    });

    it("exposes the complete STH1Z feature set without STH2Z-only controls", () => {
        const names = definition.exposes(device, {}).map((expose) => expose.name);

        expect(names).toEqual(
            expect.arrayContaining([
                "temperature",
                "humidity",
                "battery",
                "temperature_unit",
                "internal_temperature_calibration",
                "internal_humidity_calibration",
                "sample_interval",
                "temperature_alarm_upper",
                "temperature_alarm_lower",
                "humidity_alarm_upper",
                "humidity_alarm_lower",
                "temperature_alarm_status",
                "humidity_alarm_status",
                "fault_status",
                "dew_point",
                "vpd",
                "humidity_comfort",
                "comfort_humidity_lower_limit",
                "comfort_humidity_upper_limit",
                "comfort_temperature_lower_limit",
                "comfort_temperature_upper_limit",
            ]),
        );
        expect(names).not.toContain("product_name");
        expect(names).not.toContain("app_action");
        expect(names).not.toContain("child_lock");
    });

    it("refreshes local environmental state when a battery report arrives", () => {
        const {result} = runFz("genPowerCfg", {batteryPercentageRemaining: 200}, {temperature: 29.4, humidity: 40.4});

        expect(result).toMatchObject({
            dew_point: 14.5,
            vpd: 2.44,
            humidity_comfort: "normal",
            comfort_humidity_lower_limit: 30,
            comfort_humidity_upper_limit: 60,
            comfort_temperature_lower_limit: 20,
            comfort_temperature_upper_limit: 26,
        });
    });

    it("rejects an invalid alarm pair before writing FD22", async () => {
        const endpoint = device.getEndpoint(1);
        const meta = buildMeta(device, definition, {state: {temperature_alarm_lower: 20, temperature_alarm_upper: 25}});

        await expect(findTz("temperature_alarm_upper").convertSet?.(endpoint, "temperature_alarm_upper", 20.1, meta)).rejects.toThrow("0.2 C");
        expect(endpoint.write).not.toHaveBeenCalled();
    });

    it("rejects an invalid humidity alarm pair before writing FD22", async () => {
        const endpoint = device.getEndpoint(1);
        const meta = buildMeta(device, definition, {state: {humidity_alarm_lower: 50, humidity_alarm_upper: 60}});

        await expect(findTz("humidity_alarm_upper").convertSet?.(endpoint, "humidity_alarm_upper", 51, meta)).rejects.toThrow("2 %RH");
        expect(endpoint.write).not.toHaveBeenCalled();
    });

    it("keeps humidity alarm limits while normalizing Fahrenheit state", async () => {
        device.meta.rtiTekTemperatureUnit = "fahrenheit";
        const endpoint = device.getEndpoint(1);
        const meta = buildMeta(device, definition, {state: {humidity_alarm_lower: 50, humidity_alarm_upper: 60}});

        await expect(findTz("humidity_alarm_upper").convertSet?.(endpoint, "humidity_alarm_upper", 51, meta)).rejects.toThrow("2 %RH");
        expect(endpoint.write).not.toHaveBeenCalled();
    });

    it("writes valid alarm limits as Celsius FD22 values", async () => {
        const endpoint = device.getEndpoint(1);
        const meta = buildMeta(device, definition, {state: {temperature_alarm_lower: 20}});

        await findTz("temperature_alarm_upper").convertSet?.(endpoint, "temperature_alarm_upper", 20.2, meta);

        expect(endpoint.write).toHaveBeenCalledWith("rtiTekFd22", {temperatureAlarmUpper: 2020});
    });

    it("converts temperature values and refreshes exposes when the unit changes", async () => {
        const endpoint = device.getEndpoint(1);
        const deviceExposesChanged = vi.fn();
        const meta = buildMeta(device, definition, {
            state: {
                temperature: 20,
                dew_point: 10,
                internal_temperature_calibration: 1,
                temperature_alarm_lower: -30,
                temperature_alarm_upper: 60,
                comfort_temperature_lower_limit: 20,
                comfort_temperature_upper_limit: 26,
            },
            deviceExposesChanged,
        });

        const result = await findTz("temperature_unit").convertSet?.(endpoint, "temperature_unit", "fahrenheit", meta);

        expect(endpoint.write).toHaveBeenCalledWith("rtiTekFd22", {temperatureUnit: 1});
        expect(device.meta.rtiTekTemperatureUnit).toBe("fahrenheit");
        expect(deviceExposesChanged).toHaveBeenCalledOnce();
        expect(result).toMatchObject({
            state: {temperature_unit: "fahrenheit", temperature: 68, temperature_alarm_lower: -22, temperature_alarm_upper: 140},
        });

        await findTz("temperature_alarm_upper").convertSet?.(endpoint, "temperature_alarm_upper", 68, meta);
        expect(endpoint.write).toHaveBeenLastCalledWith("rtiTekFd22", {temperatureAlarmUpper: 2000});
    });

    it("updates state and UI capabilities when the device reports its temperature unit", () => {
        const {result, meta} = runFz(
            "rtiTekFd22",
            {temperatureUnit: 1},
            {temperature: 20, temperature_alarm_lower: -30, temperature_alarm_upper: 60},
        );

        expect(result).toMatchObject({temperature_unit: "fahrenheit", temperature: 68, temperature_alarm_lower: -22, temperature_alarm_upper: 140});
        expect(device.meta.rtiTekTemperatureUnit).toBe("fahrenheit");
        expect(meta.deviceExposesChanged).toHaveBeenCalledOnce();
    });

    it("uses Fahrenheit alarm limits in the refreshed exposes", () => {
        device.meta.rtiTekTemperatureUnit = "fahrenheit";
        const alarmExpose = definition.exposes(device, {}).find((expose) => expose.name === "temperature_alarm_upper");

        expect(alarmExpose).toMatchObject({unit: "°F", value_min: -22, value_max: 140, value_step: 0.1});
    });

    it("returns existing local comfort thresholds in their current display unit", async () => {
        device.meta.rtiTekTemperatureUnit = "fahrenheit";
        const meta = buildMeta(device, definition, {state: {comfort_temperature_lower_limit: 68}});

        const result = await findTz("comfort_temperature_lower_limit").convertGet?.(device.getEndpoint(1), "comfort_temperature_lower_limit", meta);

        expect(result).toStrictEqual({state: {comfort_temperature_lower_limit: 68}});
    });

    it("keeps comfort humidity defaults in %RH when temperature unit is Fahrenheit", async () => {
        device.meta.rtiTekTemperatureUnit = "fahrenheit";

        const {result} = runFz("msTemperatureMeasurement", {measuredValue: 2200}, {humidity: 40});
        expect(result).toMatchObject({comfort_humidity_lower_limit: 30, comfort_humidity_upper_limit: 60});

        const meta = buildMeta(device, definition);
        await expect(
            findTz("comfort_humidity_lower_limit").convertGet?.(device.getEndpoint(1), "comfort_humidity_lower_limit", meta),
        ).resolves.toStrictEqual({state: {comfort_humidity_lower_limit: 30}});
    });

    it("keeps set comfort humidity limits in %RH when temperature unit is Fahrenheit", () => {
        device.meta.rtiTekTemperatureUnit = "fahrenheit";
        const result = findTz("comfort_humidity_lower_limit").convertSet?.(
            device.getEndpoint(1),
            "comfort_humidity_lower_limit",
            35,
            buildMeta(device, definition, {state: {comfort_humidity_upper_limit: 60, temperature: 71.6, humidity: 40}}),
        );

        expect(result).toMatchObject({state: {comfort_humidity_lower_limit: 35}});
    });

    it("validates comfort humidity limits against their stored counterpart", () => {
        const endpoint = device.getEndpoint(1);

        expect(() =>
            findTz("comfort_humidity_lower_limit").convertSet?.(
                endpoint,
                "comfort_humidity_lower_limit",
                50,
                buildMeta(device, definition, {state: {comfort_humidity_lower_limit: 30, comfort_humidity_upper_limit: 40}}),
            ),
        ).toThrow("comfort humidity lower limit must be below upper limit");
        expect(() =>
            findTz("comfort_humidity_upper_limit").convertSet?.(
                endpoint,
                "comfort_humidity_upper_limit",
                40,
                buildMeta(device, definition, {state: {comfort_humidity_lower_limit: 50, comfort_humidity_upper_limit: 60}}),
            ),
        ).toThrow("comfort humidity lower limit must be below upper limit");
    });

    it("registers only the documented STH1Z FD22 attributes", async () => {
        vi.useFakeTimers();
        try {
            const configure = definition.configure;
            if (!configure) throw new Error("STH1Z definition is missing configure");
            const configurePromise = configure(device, device.getEndpoint(1), definition);
            await vi.advanceTimersByTimeAsync(3000);
            await configurePromise;

            const attributes = device.customClusters.rtiTekFd22.attributes;
            expect(attributes).toMatchObject({temperatureUnit: {ID: 0x0000}, faultCode: {ID: 0x0002}, temperatureAlarmUpper: {ID: 0xe00a}});
            expect(Object.values(attributes).map((attribute) => attribute.ID)).not.toContain(0xe014);
            expect(Object.values(attributes).map((attribute) => attribute.ID)).not.toContain(0xe017);
        } finally {
            vi.useRealTimers();
        }
    });

    it("continues initial reads when the device rejects standard reporting configuration", async () => {
        vi.useFakeTimers();
        try {
            const endpoint = device.getEndpoint(1);
            vi.mocked(endpoint.configureReporting).mockRejectedValueOnce(new Error("UNSUPPORTED_ATTRIBUTE"));
            const configure = definition.configure;
            if (!configure) throw new Error("STH1Z definition is missing configure");

            const configurePromise = configure(device, endpoint, definition);
            await vi.advanceTimersByTimeAsync(3000);
            await expect(configurePromise).resolves.toBeUndefined();

            expect(endpoint.configureReporting).toHaveBeenNthCalledWith(1, "msTemperatureMeasurement", [
                {attribute: "measuredValue", minimumReportInterval: 5, maximumReportInterval: 3600, reportableChange: 50},
            ]);
            expect(endpoint.configureReporting).toHaveBeenNthCalledWith(2, "msRelativeHumidity", [
                {attribute: "measuredValue", minimumReportInterval: 5, maximumReportInterval: 3600, reportableChange: 200},
            ]);
            expect(endpoint.read).toHaveBeenCalledWith(0xfd22, [0x0000, 0x0002, 0xe005, 0xe006]);
        } finally {
            vi.useRealTimers();
        }
    });

    it("propagates standard reporting errors so Z2M can retry configuration", async () => {
        const endpoint = device.getEndpoint(1);
        vi.mocked(endpoint.configureReporting).mockRejectedValueOnce(new Error("TIMEOUT"));
        const configure = definition.configure;
        if (!configure) throw new Error("STH1Z definition is missing configure");

        await expect(configure(device, endpoint, definition)).rejects.toThrow("TIMEOUT");
    });

    it("propagates battery reporting errors so Z2M can retry configuration", async () => {
        const endpoint = device.getEndpoint(1);
        vi.mocked(endpoint.configureReporting)
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error("NO_ROUTE"));
        const configure = definition.configure;
        if (!configure) throw new Error("STH1Z definition is missing configure");

        await expect(configure(device, endpoint, definition)).rejects.toThrow("NO_ROUTE");
    });
});
