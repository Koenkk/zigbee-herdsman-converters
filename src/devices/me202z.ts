import * as tuya from 'zigbee-herdsman-converters/lib/tuya';
import * as exposes from 'zigbee-herdsman-converters/lib/exposes';
const ea = exposes.access;

// Data points
const dp = {
    distance: 2,          // liquid height (cm)
    cfg_threshold: 21,    // tank depth (mm)
    power_level_v: 5,     // power voltage (raw)
};

// Helper to round 1 decimal
function round1(v: number): number { return Math.round(v * 10) / 10; }

// Safely parse data point values
function getDataValue(datatype: any, data: any): number {
    try {
        if (Buffer.isBuffer(data)) return data.readUIntBE(0, data.length);
        if (Array.isArray(data)) return data.reduce((acc, b) => (acc << 8) + b, 0);
        return Number(data);
    } catch { return Number(data); }
}

// Cache last known tank depth per device
const lastKnown: Record<string, { depthMm?: number }> = {};

// FromZigbee converter
const fzLocal = {
    me202z_report_all: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model: any, msg: any, publish: any, options: any, meta: any) => {
            const out: Record<string, any> = {};
            const items = msg.data?.dpValues || [];
            const deviceId = meta.device.ieeeAddr;

            let distanceCm: number | undefined;
            let depthMm = lastKnown[deviceId]?.depthMm;

            for (const { dp: id, datatype, data } of items) {
                if (id === dp.distance) {
                    distanceCm = getDataValue(datatype, data);
                    out.liquid_height = distanceCm;
                } else if (id === dp.cfg_threshold) {
                    depthMm = getDataValue(datatype, data);
                    lastKnown[deviceId] = { depthMm };
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

// ToZigbee converter
const tzLocal = {
    cfg_threshold_mm: {
        key: ['cfg_threshold_mm'],
        convertSet: async (entity: any, key: any, value: any, meta: any) => {
            const val = Number(value);
            await tuya.sendDataPointValue(entity, dp.cfg_threshold, val);
            lastKnown[meta.device.ieeeAddr] = { depthMm: val };
            return { state: { cfg_threshold_mm: val } };
        },
    },
};

export = [{
    fingerprint: [{ modelID: 'TS0601', manufacturerName: '_TZE284_mxujdmxo' }],
    model: 'ME202Z-TS0601',
    vendor: 'Tuya',
    description: 'ME202Z submersible liquid level sensor (range 10–400 cm)',
    fromZigbee: [fzLocal.me202z_report_all],
    toZigbee: [tzLocal.cfg_threshold_mm],
    exposes: [
        exposes.numeric('liquid_height', ea.STATE)
            .withUnit('cm')
            .withDescription('Measured liquid height in centimeters'),
        exposes.numeric('level_percent', ea.STATE)
            .withUnit('%')
            .withDescription('Liquid level as % of configured tank depth'),
        exposes.numeric('cfg_threshold_mm', ea.ALL)
            .withUnit('mm')
            .withValueMin(100)
            .withValueMax(4000)
            .withDescription('Configured tank depth in millimeters'),
        exposes.numeric('power_level_v', ea.STATE)
            .withUnit('V')
            .withDescription('Power supply voltage'),
    ],
    onEvent: async (type: string, data: any, device: any) => {
        if (['deviceAnnounce', 'deviceInterview'].includes(type)) {
            const ep = device.getEndpoint(1);
            try { await tuya.sendDataPointQuery(ep, dp.distance); } catch {}
            try { await tuya.sendDataPointQuery(ep, dp.cfg_threshold); } catch {}
        }
    },
}];
