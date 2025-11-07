// Tuya ME202Z / TS0601 — _TZE284_mxujdmxo
// Submersible Liquid Level Sensor (range: 10–400 cm)

const tuya = require("zigbee-herdsman-converters/lib/tuya");
const exposes = require("zigbee-herdsman-converters/lib/exposes");
const e = exposes.presets;
const ea = exposes.access;

const dp = {
    distance: 2, // liquid height (cm)
    cfg_threshold: 21, // tank depth (mm)
    power_level_v: 5, // power voltage (raw)
};

function round1(v) {
    return Math.round(v * 10) / 10;
}

function getDataValue(datatype, data) {
    try {
        if (Buffer.isBuffer(data)) {
            return data.readUIntBE(0, data.length);
        }
        if (Array.isArray(data)) {
            return data.reduce((acc, b) => (acc << 8) + b, 0);
        }
        return Number(data);
    } catch {
        return Number(data);
    }
}

// Cache object to remember the last threshold
const lastKnown = {};

const fzLocal = {
    reportAll: {
        cluster: "manuSpecificTuya",
        type: ["commandDataReport", "commandDataResponse"],
        convert: (model, msg, publish, options, meta) => {
            const out = {};
            const items = msg.data?.dpValues || [];
            const deviceId = meta.device.ieeeAddr;

            let distanceCm;
            let depthMm = lastKnown[deviceId]?.depthMm;

            for (const {dp: id, datatype, data} of items) {
                if (id === dp.distance) {
                    distanceCm = getDataValue(datatype, data);
                    out.liquid_height = distanceCm;
                } else if (id === dp.cfg_threshold) {
                    depthMm = getDataValue(datatype, data);
                    lastKnown[deviceId] = {depthMm};
                    out.cfg_threshold_mm = depthMm;
                } else if (id === dp.power_level_v) {
                    const val = getDataValue(datatype, data);
                    out.power_level_v = round1(val / 10);
                }
            }

            if (distanceCm != null && depthMm != null && depthMm > 0) {
                out.level_percent = round1((distanceCm / (depthMm / 10)) * 100);
            }

            return out;
        },
    },
};

const tzLocal = {
    cfg_threshold_mm: {
        key: ["cfg_threshold_mm"],
        convertSet: async (entity, key, value, meta) => {
            const val = Number(value);
            await tuya.sendDataPointValue(entity, dp.cfg_threshold, val);
            // Update cache
            lastKnown[meta.device.ieeeAddr] = {depthMm: val};
            return {state: {cfg_threshold_mm: val}};
        },
    },
};

module.exports = [
    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE284_mxujdmxo"}],
        model: "ME202Z-TS0601",
        vendor: "Tuya",
        description: "ME202Z submersible liquid level sensor (range 10–400 cm)",
        fromZigbee: [fzLocal.reportAll],
        toZigbee: [tzLocal.cfg_threshold_mm],
        exposes: [
            e.numeric("liquid_height", ea.STATE).withUnit("cm").withDescription("Measured liquid height in centimeters"),
            e.numeric("level_percent", ea.STATE).withUnit("%").withDescription("Liquid level as percentage of tank depth (1 decimal)"),
            e
                .numeric("cfg_threshold_mm", ea.ALL)
                .withUnit("mm")
                .withValueMin(100)
                .withValueMax(4000)
                .withDescription("Configured tank depth (in millimeters)"),
            e.numeric("power_level_v", ea.STATE).withUnit("V").withDescription("Power supply voltage"),
        ],
        onEvent: async (type, data, device) => {
            if (["deviceAnnounce", "deviceInterview"].includes(type)) {
                const ep = device.getEndpoint(1);
                try {
                    await tuya.sendDataPointQuery(ep, dp.distance);
                } catch {}
                try {
                    await tuya.sendDataPointQuery(ep, dp.cfg_threshold);
                } catch {}
            }
        },
    },
];
