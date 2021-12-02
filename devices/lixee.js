const exposes = require('zigbee-herdsman-converters/lib/exposes');
const globalStore = require('zigbee-herdsman-converters/lib/store');
const {repInterval} = require('zigbee-herdsman-converters/lib/constants');

const {precisionRound, postfixWithEndpointName} = require('zigbee-herdsman-converters/lib/utils');

const ea = exposes.access;


// console.log("Clusters", Zcl.Cluster);

// full list available on https://github.com/fairecasoimeme/Zlinky_TIC/blob/master/README.md
const dataReportable = [
    {
        'name': 'PAPP',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x050F,
        'description': 'Apparent power',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'apparentPower',
        'standard': false,
        'reportable': true,
    },
    {
        'name': 'IINST',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x0508,
        'description': 'RMS current',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrent',
        'standard': false,
        'reportable': true,
    },
    {
        'name': 'IINST1',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x0508,
        'description': 'RMS current (phase 1)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrent',
        'standard': false,
        'reportable': true,
    },
    {
        'name': 'IINST2',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x0908,
        'description': 'RMS current (phase 2)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrentPhB',
        'standard': false,
        'reportable': true,
    },
    {
        'name': 'IINST3',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x0A08,
        'description': 'RMS current (phase 3)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrentPhC',
        'standard': false,
        'reportable': true,
    },
    {
        'name': 'EAST',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0,
        'description': 'Total active power delivered',
        'cluster': 'seMetering',
        'attribut': 'currentSummDelivered',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'CCASN',
        'unit': 'W',
        'clusterId': 0x0B04,
        'attributId': 0x050B,
        'description': 'Current point of the active load curve drawn',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'activePower',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'CCASN-1',
        'unit': 'W',
        'clusterId': 0x0B04,
        'attributId': 0x090B,
        'description': 'Previous point of the active load curve drawn',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'activePowerPhB',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'SINSTS',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x050F,
        'description': 'Immediate apparent power delivered',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'apparentPower',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'SINSTS1',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x050F,
        'description': 'Immediate apparent power delivered (phase 1)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'apparentPower',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'SINSTS2',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x090F,
        'description': 'Immediate apparent power delivered (phase 2)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'apparentPowerPhB',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'SINSTS3',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x0A0F,
        'description': 'Immediate apparent power delivered (phase 3)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'apparentPowerPhC',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'ERQ2',
        'unit': 'VArh',
        'clusterId': 0x0B04,
        'attributId': 0x050E,
        'description': 'Total reactive power (Q2)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'reactivePower',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'ERQ3',
        'unit': 'VArh',
        'clusterId': 0x0B04,
        'attributId': 0x090E,
        'description': 'Total reactive power (Q3)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'reactivePowerPhB',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'ERQ4',
        'unit': 'VArh',
        'clusterId': 0x0B04,
        'attributId': 0x0A0E,
        'description': 'Total reactive power (Q4)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'reactivePowerPhC',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'IRMS1',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x0508,
        'description': 'RMS current (phase 1)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrent',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'IRMS2',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x0908,
        'description': 'RMS current (phase 2)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrentPhB',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'IRMS3',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x0A08,
        'description': 'RMS current (phase 3)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrentPhC',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'URMS1',
        'unit': 'V',
        'clusterId': 0x0B04,
        'attributId': 0x0505,
        'description': 'RMS voltage (phase 1)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsVoltage',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'URMS2',
        'unit': 'V',
        'clusterId': 0x0B04,
        'attributId': 0x0905,
        'description': 'RMS voltage (phase 2)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsVoltagePhB',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'URMS3',
        'unit': 'V',
        'clusterId': 0x0B04,
        'attributId': 0x0A05,
        'description': 'RMS voltage (phase 3)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsVoltagePhC',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'ERQ1',
        'unit': 'VArh',
        'clusterId': 0x0B04,
        'attributId': 0x0305,
        'description': 'Total reactive power (Q1)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'totalReactivePower',
        'standard': true,
        'reportable': true,
    },
    {
        'name': 'EAIT',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 1,
        'description': 'Total active power injected',
        'cluster': 'seMetering',
        'attribut': 'currentSummReceived',
        'standard': true,
        'reportable': true,
    },
];

const dataNonReportable = [
    {
        'name': 'PMAX',
        'unit': 'W',
        'clusterId': 0x0B04,
        'attributId': 0x050D,
        'description': 'Three-phase power peak',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'activePowerMax',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'IMAX',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x050A,
        'description': 'RMS current peak',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrentMax',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'IMAX1',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x050A,
        'description': 'RMS current peak (phase 1)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrentMax',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'IMAX2',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x090A,
        'description': 'RMS current peak (phase 2)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrentMaxPhB',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'IMAX3',
        'unit': 'A',
        'clusterId': 0x0B04,
        'attributId': 0x0A0A,
        'description': 'RMS current peak (phase 3)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'rmsCurrentMaxPhC',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'ISOUSC',
        'unit': 'A',
        'clusterId': 0x0B01,
        'attributId': 0x000D,
        'description': 'Subscribed intensity level',
        'cluster': 'haMeterIdentification',
        'attribut': 'availablePower',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'BASE',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0,
        'description': 'Base index',
        'cluster': 'seMetering',
        'attribut': 'currentSummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'EASF10',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0112,
        'description': 'Total provider active power delivered (index10)',
        'cluster': 'seMetering',
        'attribut': 'currentTier10SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'HCHC',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0100,
        'description': 'HCHC index',
        'cluster': 'seMetering',
        'attribut': 'currentTier1SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'EJPHN',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0100,
        'description': 'EJPHN index',
        'cluster': 'seMetering',
        'attribut': 'currentTier1SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'BBRHCJB',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0100,
        'description': 'BBRHCJB index',
        'cluster': 'seMetering',
        'attribut': 'currentTier1SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'EASF01',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0100,
        'description': 'Total provider active power delivered (index 01)',
        'cluster': 'seMetering',
        'attribut': 'currentTier1SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'BBRHCJW',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0104,
        'description': 'BBRHCJW index',
        'cluster': 'seMetering',
        'attribut': 'currentTier3SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'BBRHCJR',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0108,
        'description': 'BBRHCJR index',
        'cluster': 'seMetering',
        'attribut': 'currentTier5SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'ADC0',
        'unit': '-', 'clusterId': 0x0702,
        'attributId': 0x0308,
        'description': 'Serial Number',
        'cluster': 'seMetering',
        'attribut': 'meterSerialNumber',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'HCHP',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0102,
        'description': 'HCHP index',
        'cluster': 'seMetering',
        'attribut': 'currentTier2SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'EJPHPM',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0102,
        'description': 'EJPHPM index',
        'cluster': 'seMetering',
        'attribut': 'currentTier2SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'BBRHPJB',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0102,
        'description': 'BBRHPJB index',
        'cluster': 'seMetering',
        'attribut': 'currentTier2SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'BBRHPJW',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0106,
        'description': 'BBRHPJW index',
        'cluster': 'seMetering',
        'attribut': 'currentTier4SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'BBRHPJR',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x010A,
        'description': 'BBRHPJR index',
        'cluster': 'seMetering',
        'attribut': 'currentTier6SummDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'PTEC',
        'unit': '-', 'clusterId': 0x0702,
        'attributId': 0x0020,
        'description': 'Current pricing period',
        'cluster': 'seMetering',
        'attribut': 'activeRegisterTierDelivered',
        'standard': false,
        'reportable': false,
    },
    {
        'name': 'VTIC',
        'unit': '-', 'clusterId': 0x0B01,
        'attributId': 0x000A,
        'description': 'Customer tele-information protocol version',
        'cluster': 'haMeterIdentification',
        'attribut': 'softwareRevision',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'EASF02',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0102,
        'description': 'Provider active power delivered (index 02)',
        'cluster': 'seMetering',
        'attribut': 'currentTier2SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'EASF03',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0104,
        'description': 'Provider active power delivered (index 03)',
        'cluster': 'seMetering',
        'attribut': 'currentTier3SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'EASF04',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0106,
        'description': 'Provider active power delivered (index 04)',
        'cluster': 'seMetering',
        'attribut': 'currentTier4SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'EASF05',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0108,
        'description': 'Provider active power delivered (index 05)',
        'cluster': 'seMetering',
        'attribut': 'currentTier5SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'EASF06',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x010A,
        'description': 'Provider active power delivered (index 06)',
        'cluster': 'seMetering',
        'attribut': 'currentTier6SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'EASF07',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x010C,
        'description': 'Provider active power delivered (index 07)',
        'cluster': 'seMetering',
        'attribut': 'currentTier7SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'EASF09',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x0110,
        'description': 'Provider active power delivered (index 09)',
        'cluster': 'seMetering',
        'attribut': 'currentTier9SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'ADSC',
        'unit': '-', 'clusterId': 0x0702,
        'attributId': 0x0308,
        'description': 'Secondary meter address',
        'cluster': 'seMetering',
        'attribut': 'meterSerialNumber',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'EASF08',
        'unit': 'Wh',
        'clusterId': 0x0702,
        'attributId': 0x010E,
        'description': 'Provider active power delivered (index 08)',
        'cluster': 'seMetering',
        'attribut': 'currentTier8SummDelivered',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'SMAXN',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x050D,
        'description': 'Apparent power delivered peak',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'activePowerMax',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'SMAXN1',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x050D,
        'description': 'Apparent power delivered peak (phase 1)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'activePowerMax',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'SMAXN2',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x090D,
        'description': 'Apparent power delivered peak (phase 2)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'activePowerMaxPhB',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'SMAXN3',
        'unit': 'VA',
        'clusterId': 0x0B04,
        'attributId': 0x0A0D,
        'description': 'Apparent power delivered peak (phase 3)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'activePowerMaxPhC',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'UMOY1',
        'unit': 'V',
        'clusterId': 0x0B04,
        'attributId': 0x0511,
        'description': 'Average RMS voltage (phase 1)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'averageRmsVoltageMeasPeriod',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'UMOY3',
        'unit': 'V',
        'clusterId': 0x0B04,
        'attributId': 0x0A11,
        'description': 'Average RMS voltage (phase 3)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'averageRmsVoltageMeasPeriodPhC',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'UMOY2',
        'unit': 'V',
        'clusterId': 0x0B04,
        'attributId': 0x0911,
        'description': 'Average RMS voltage (phase 2)',
        'cluster': 'haElectricalMeasurement',
        'attribut': 'averageRmsVoltageMeasurePeriodPhB',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'PREF',
        'unit': 'kVA',
        'clusterId': 0x0B01,
        'attributId': 0x000D,
        'description': 'Apparent power of reference (PREF)',
        'cluster': 'haMeterIdentification',
        'attribut': 'availablePower',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'PCOUP',
        'unit': 'kVA',
        'clusterId': 0x0B01,
        'attributId': 0x000E,
        'description': 'Apparent power threshold (PCOUP)',
        'cluster': 'haMeterIdentification',
        'attribut': 'powerThreshold',
        'standard': true,
        'reportable': false,
    },
    {
        'name': 'PRM',
        'unit': '-', 'clusterId': 0x0702,
        'attributId': 0x0307,
        'description': 'PRM',
        'cluster': 'seMetering',
        'attribut': 'siteId',
        'standard': true,
        'reportable': false,
    },
];


// All attributes avaialables
const data = [
    ...dataReportable,
    ...dataNonReportable,
];

function extractAttribute(cluster, nonReportableOnly) {
    const attributes = (nonReportableOnly ? dataNonReportable : data).filter((item) => item.cluster === cluster);
    return attributes
        .map((i) => i.attribut)
        .filter((a) => a != null)
        .filter((value, index, self) => self.indexOf(value) === index); // Unique attributs
}

// For HomeAssistant
const indexEnergy = () => exposes
    .numeric('energy', ea.STATE)
    .withUnit('Wh')
    .withDescription('Index Base')
    .withProperty('currentSummDelivered');

// Generate all metrics from attributs list
const exposesData = data.map((item) => {
    if (item.unit != null && item.unit != '-' && item.unit != '') {
        return exposes.numeric(item.name, ea.STATE).withDescription(item.description).withProperty(item.attribut).withUnit(item.unit);
    } else {
        return exposes.text(item.name, ea.STATE).withDescription(item.description).withProperty(item.attribut);
    }
}).filter((e) => e != null);


function parsingResponse(model, msg, entries) {
    const payload = {};
    for (const entry of entries) {
        if (msg.data[entry] != null) {
            const val = msg.data[entry];
            if (typeof (val) == 'number') {
                payload[postfixWithEndpointName(entry, msg, model)] = precisionRound(val, 2);
            } else {
                payload[postfixWithEndpointName(entry, msg, model)] = val;
            }
        }
    }
    return payload;
}


const haMeterIdentificationFZ = {
    cluster: 'haMeterIdentification',
    type: ['attributeReport', 'readResponse', 'write'],
    convert: (model, msg, publish, options, meta) => {
        return parsingResponse(model, msg, extractAttribute('haMeterIdentification', false));
    },
};

const haElectricalMeasurementFZ = {
    cluster: 'haElectricalMeasurement',
    type: ['attributeReport', 'readResponse', 'write'],
    convert: (model, msg, publish, options, meta) => {
        return parsingResponse(model, msg, extractAttribute('haElectricalMeasurement', false));
    },
};

const seMeteringFZ = {
    cluster: 'seMetering',
    type: ['attributeReport', 'readResponse', 'write'],
    convert: (model, msg, publish, options, meta) => {
        const payload = parsingResponse(model, msg, extractAttribute('seMetering', false));
        // merging of off-peak and peak hour meter
        if (payload['currentSummDelivered'] == 0) {
            if (payload['currentTier1SummDelivered'] > 0 || payload['currentTier2SummDelivered'] > 0) {
                payload['currentSummDelivered'] = payload['currentTier1SummDelivered'] + payload['currentTier2SummDelivered'];
            }
        }
        return payload;
    },
};


// Read attributs when are not reportable
async function poll(endpoint) {
    const attrs = extractAttribute('haMeterIdentification', true);
    await endpoint.read('haMeterIdentification', attrs);
    let chunks = [
        [
            'activePowerMax',
            'apparentPower',
        ],
        [
            'rmsCurrent',
            'rmsCurrentPhB',
            'rmsCurrentPhC',
        ],
        [
            'rmsCurrentMax',
            'rmsCurrentMaxPhB',
            'rmsCurrentMaxPhC',
        ],
        [

            'activePower',
            'activePowerPhB',
        ],
        [
            'apparentPowerPhB',
            'apparentPowerPhC',
        ],
        [
            'reactivePower',
            'reactivePowerPhB',
            'reactivePowerPhC',
        ],
        [
            'rmsVoltage',
            'rmsVoltagePhB',
            'rmsVoltagePhC',
        ],
        [
            'totalReactivePower',
        ],
    ];
    for (const chunk of chunks) {
        await endpoint.read('haElectricalMeasurement', chunk);
    }

    chunks = [
        [
            'currentSummDelivered',
            'currentTier1SummDelivered',
            'currentTier2SummDelivered',
            'currentTier3SummDelivered',
        ],
        [
            'meterSerialNumber',
            'activeRegisterTierDelivered', // 32
        ],
        [
            'currentSummReceived',
            'siteId',
        ],
    ];

    for (const chunk of chunks) {
        await endpoint.read('seMetering', chunk);
    }
}


const definition = {
    zigbeeModel: ['ZLinky_TIC'],
    model: 'ZLinky_TIC',
    vendor: 'LiXee',
    description: 'Lixee ZLinky',
    fromZigbee: [haMeterIdentificationFZ, seMeteringFZ, haElectricalMeasurementFZ],
    toZigbee: [],
    exposes: [indexEnergy(), ...exposesData],
    configure: async (device, coordinatorEndpoint, logger) => {
        const SW1_ENDPOINT = 1;
        const endpoint = device.getEndpoint(SW1_ENDPOINT);

        // ZLinky don't emit divisor and multiplier
        endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1, acCurrentMultiplier: 1});
        endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1, multiplier: 1});

        for (const reportable of dataReportable) {
            logger.debug(`ZLINKY_TIC: Start configure reporting for ${reportable.name} (${reportable.cluster}/${reportable.attribut}).`);
            // await endpoint.read(reportable.cluster, [reportable.attribut]);
            endpoint.configureReporting(reportable.cluster || reportable.clusterId,
                [{
                    attribute: reportable.attribut || reportable.attributId,
                    minimumReportInterval: 1,
                    maximumReportInterval: repInterval.MINUTES_5,
                    reportableChange: 1,
                }]).then(() => {
                logger
                    .debug(`ZLINKY_TIC: ${reportable.name} (${reportable.cluster}/${reportable.attribut}) report successfully configured.`);
            }).catch((e) => { // Bug on firmware v1.0.0 (2021 11 01) -> Some attributs reportable cannot be configured
                logger.warning(`ZLINKY_TIC: Failed to configure reporting for ` +
                        `${reportable.name} (${reportable.cluster}/${reportable.attribut}). Adding in polling attributs list.`);
                dataNonReportable.push(reportable);
            });
        }
    },
    options: [exposes.options.measurement_poll_interval()],
    onEvent: async (type, data, device, options) => {
        const endpoint = device.getEndpoint(1);
        if (type === 'stop') {
            clearInterval(globalStore.getValue(device, 'interval'));
            globalStore.clearValue(device, 'interval');
        } else if (!globalStore.hasValue(device, 'interval')) {
            // periodic scan for non-reportable attributs

            const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 120;
            await poll(endpoint);

            const interval = setInterval(async () => {
                try {
                    await poll(endpoint);
                } catch (error) {/* Do nothing*/}
            }, seconds * 1000);
            globalStore.putValue(device, 'interval', interval);
        }
    },
    endpoint: (dev) => {
        return {
            'haElectricalMeasurement': 1, 'seMetering': 1, 'haMeterIdentification': 1,
        };
    },
};

module.exports = definition;
