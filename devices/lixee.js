/* eslint-disable max-len */
const exposes = require('../lib/exposes');
const globalStore = require('../lib/store');
const {repInterval} = require('../lib/constants');
const reporting = require('../lib/reporting');
const {Buffer} = require('buffer');

const ea = exposes.access;


const linkyModeDef = {
    standard: 'standard',
    legacy: 'historique',
};

const linkyPhaseDef = {
    single: 'single_phase',
    three: 'three_phase',
};

const productionValues = {
    'haElectricalMeasurement': {
        'totalReactivePower': {name: ['ERQ1'], reportable: true},
        'reactivePower': {name: ['ERQ2'], reportable: true},
        'reactivePowerPhB': {name: ['ERQ3'], reportable: true},
        'reactivePowerPhC': {name: ['ERQ4'], reportable: true},

    },
    'seMetering': {
        'currentSummReceived': {name: ['EAIT'], reportable: true},
    },
    'liXeePrivate': {
        'injectedVA': {name: ['SINSTI'], reportable: true},
        'injectedVAMaxN': {name: ['SMAXIN'], reportable: true},
        'injectedActiveLoadN': {name: ['CCAIN', 'CCAIN-1'], reportable: true},

        'injectedVAMaxN1': {name: ['SMAXIN-1'], reportable: false},
    },
};

const values = {
    [linkyModeDef.standard]: {
        values: {
            'haMeterIdentification': {
                'softwareRevision': {name: ['VTIC'], reportable: true},
                'availablePower': {name: ['PREF'], reportable: true},
                'powerThreshold': {name: ['PCOUP'], reportable: true},
            },
            'haElectricalMeasurement': {
                'rmsCurrent': {name: ['IRMS1'], reportable: true},
                'rmsVoltage': {name: ['URMS1'], reportable: true},
                'activePower': {name: ['CCASN'], reportable: true},
                'activePowerPhB': {name: ['CCASN-1'], reportable: true},
                'averageRmsVoltageMeasPeriod': {name: ['UMOY1'], reportable: true},
                'apparentPower': {name: ['SINSTS'], reportable: true},
                'activePowerMax': {name: ['SMAXN'], reportable: true},
            },
            'seMetering': {
                'meterSerialNumber': {name: ['ADSC'], reportable: true},
                'currentSummDelivered': {name: ['EAST'], change: 10, reportable: true},
                'currentTier1SummDelivered': {name: ['EASF01'], reportable: true},
                'currentTier2SummDelivered': {name: ['EASF02'], reportable: true},
                'currentTier3SummDelivered': {name: ['EASF03'], reportable: true},
                'currentTier4SummDelivered': {name: ['EASF04'], reportable: true},
                'currentTier5SummDelivered': {name: ['EASF05'], reportable: true},
                'currentTier6SummDelivered': {name: ['EASF06'], reportable: true},
                'currentTier7SummDelivered': {name: ['EASF07'], reportable: true},
                'currentTier8SummDelivered': {name: ['EASF08'], reportable: true},
                'currentTier9SummDelivered': {name: ['EASF09'], reportable: true},
                'currentTier10SummDelivered': {name: ['EASF10'], reportable: true},

                'siteId': {name: ['RPM'], reportable: false},
            },
            'liXeePrivate': {
                'activeEnerfyOutD01': {name: ['EASD01'], reportable: true},
                'activeEnerfyOutD02': {name: ['EASD02'], reportable: true},
                'activeEnerfyOutD03': {name: ['EASD03'], reportable: true},
                'activeEnerfyOutD04': {name: ['EASD04'], reportable: true},

                'currentTarif': {name: ['NGTF'], reportable: false},
                'currentPrice': {name: ['LTARF'], reportable: false},
                'currentIndexTarif': {name: ['NTARF'], reportable: false},
                'currentDate': {name: ['DATE'], reportable: false},
                'statusRegister': {name: ['STGE'], reportable: false},
                'drawnVAMaxN1': {name: ['SMAXN-1'], reportable: false},
                'message1': {name: ['MSG1'], reportable: false},
                'message2': {name: ['MSG2'], reportable: false},
                'startMobilePoint1': {name: ['DPM1'], reportable: false},
                'stopMobilePoint1': {name: ['FPM1'], reportable: false},
                'startMobilePoint2': {name: ['DPM2'], reportable: false},
                'stopMobilePoint2': {name: ['FPM2'], reportable: false},
                'startMobilePoint3': {name: ['DPM3'], reportable: false},
                'stopMobilePoint3': {name: ['FPM3'], reportable: false},
                'relais': {name: ['RELAIS'], reportable: false},
                'daysNumberCurrentCalendar': {name: ['NJOURF'], reportable: false},
                'daysNumberNextCalendar': {name: ['NJOURF+1'], reportable: false},
                'daysProfileCurrentCalendar': {name: ['PJOURF+1'], reportable: false},
                'daysProfileNextCalendar': {name: ['PPOINTE1'], reportable: false},
            },
        },
        [linkyPhaseDef.single]: {
            [true]: { // Production TRUE
                values: productionValues,
            },
            [false]: { // Production FALSE
                values: productionValues,
            },
        },
        [linkyPhaseDef.three]: {
            values: {
                'haElectricalMeasurement': {
                    'rmsCurrentPhB': {name: ['IRMS2'], reportable: true},
                    'rmsCurrentPhC': {name: ['IRMS3'], reportable: true},
                    'rmsVoltagePhB': {name: ['URMS2'], reportable: true},
                    'rmsVoltagePhC': {name: ['URMS3'], reportable: true},
                    'averageRmsVoltageMeasurePeriodPhB': {name: ['UMOY2'], reportable: true},
                    'averageRmsVoltageMeasPeriodPhC': {name: ['UMOY3'], reportable: true},
                    'apparentPower': {name: ['SINSTS1'], reportable: true},
                    'apparentPowerPhB': {name: ['SINSTS2'], reportable: true},
                    'apparentPowerPhC': {name: ['SINSTS3'], reportable: true},
                    'activePowerMax': {name: ['SMAXN1'], reportable: true},
                    'activePowerMaxPhB': {name: ['SMAXN2'], reportable: true},
                    'activePowerMaxPhC': {name: ['SMAXN3'], reportable: true},
                },
                'liXeePrivate': {
                    'drawnVAMaxN1': {name: ['SMAXN1-1'], reportable: false},
                    'drawnVAMaxN1P2': {name: ['SMAXN2-1'], reportable: false},
                    'drawnVAMaxN1P3': {name: ['SMAXN3-1'], reportable: false},

                },
            },
            [true]: { // Production TRUE
                values: productionValues,
            },
            [false]: { // Production FALSE
                values: productionValues,
            },
        },
    },
    [linkyModeDef.legacy]: { // Historique
        values: {
            'haElectricalMeasurement': {
                'rmsCurrent': {name: ['IINST'], reportable: true},

                'rmsCurrentMax': {name: ['IMAX'], reportable: false},
            },
            'seMetering': {
                'currentSummDelivered': {name: ['BASE'], reportable: true},

                'meterSerialNumber': {name: ['ADCO'], reportable: false},
                'activeRegisterTierDelivered': {name: ['PTEC'], reportable: false},
                'currentTier1SummDelivered': {name: ['HCHC', 'EJPHN', 'BBRHCJB'], reportable: false},
                'currentTier2SummDelivered': {name: ['HCHP', 'EJPHPM', 'BBRHPJB'], reportable: false},
                'currentTier3SummDelivered': {name: ['BBRHCJW'], reportable: false},
                'currentTier4SummDelivered': {name: ['BBRHPJW'], reportable: false},
                'currentTier5SummDelivered': {name: ['BBRHCJR'], reportable: false},
                'currentTier6SummDelivered': {name: ['BBRHPJR'], reportable: false},
            },
            'haMeterIdentification': {
                'availablePower': {name: ['ISOUSC'], reportable: false},
            },
            'liXeePrivate': {
                'tomorrowColor': {name: ['DEMAIN'], reportable: true},
                'startNoticeEJP': {name: ['PEJP'], reportable: true},
                'warnDPS': {name: ['ADPS'], reportable: true},

                'currentTarif': {name: ['OPTARIF'], reportable: false},
                'scheduleHPHC': {name: ['HHPHC'], reportable: false},
            },
        },
        [linkyPhaseDef.single]: {
            [true]: {},
            [false]: {},
        },
        [linkyPhaseDef.three]: {
            values: {
                'haElectricalMeasurement': {
                    'rmsCurrent': {name: ['IINST1'], reportable: true},
                    'rmsCurrentPhB': {name: ['IINST2'], reportable: true},
                    'rmsCurrentPhC': {name: ['IINST3'], reportable: true},
                    'apparentPower': {name: ['PAPP'], reportable: true},

                    'rmsCurrentMax': {name: ['IMAX1'], reportable: false},
                    'rmsCurrentMaxPhB': {name: ['IMAX2'], reportable: false},
                    'rmsCurrentMaxPhC': {name: ['IMAX3'], reportable: false},
                    'activePowerMax': {name: ['PMAX'], reportable: false},
                },
                'liXeePrivate': {
                    'warnDIR1': {name: ['ADIR1'], reportable: true},
                    'warnDIR2': {name: ['ADIR2'], reportable: true},
                    'warnDIR3': {name: ['ADIR3'], reportable: true},

                    'presencePotential': {name: ['PPOT'], reportable: false},
                },
            },
            [true]: {},
            [false]: {},
        },
    },
};


// full list available on https://github.com/fairecasoimeme/Zlinky_TIC/blob/master/README.md

const haMeterIdentificationFZ = {
    cluster: 'haMeterIdentification', // 0x0B01
    type: ['readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};
        const elements = [
            /* 0x000A*/ 'softwareRevision',
            /* 0x000D*/ 'availablePower',
            /* 0x000E*/ 'powerThreshold',
        ];

        for (const at of elements) {
            if (msg.data[at]) {
                result[at] = msg.data[at];
            }
        }

        return result;
    },
};

const haElectricalMeasurementFZ = {
    cluster: 'haElectricalMeasurement', // 0x0B04
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};

        const elements = [
            /* 0x0305 */ 'totalReactivePower',
            /* 0x0505 */ 'rmsVoltage',
            /* 0x0508 */ 'rmsCurrent',
            /* 0x050A */ 'rmsCurrentMax',
            /* 0x050B */ 'activePower',
            /* 0x050D */ 'activePowerMax',
            /* 0x050E */ 'reactivePower',
            /* 0x050F */ 'apparentPower',
            /* 0x0511 */ 'averageRmsVoltageMeasPeriod',
            /* 0x0905 */ 'rmsVoltagePhB',
            /* 0x0908 */ 'rmsCurrentPhB',
            /* 0x090A */ 'rmsCurrentMaxPhB',
            /* 0x090B */ 'activePowerPhB',
            /* 0x090E */ 'reactivePowerPhB',
            /* 0x090D */ 'activePowerMaxPhB',
            /* 0x090F */ 'apparentPowerPhB',
            /* 0x0911 */ 'averageRmsVoltageMeasurePeriodPhB',
            /* 0x0A05 */ 'rmsVoltagePhC',
            /* 0x0A08 */ 'rmsCurrentPhC',
            /* 0x0A0A */ 'rmsCurrentMaxPhC',
            /* 0x0A0D */ 'activePowerMaxPhC',
            /* 0x0A0E */ 'reactivePowerPhC',
            /* 0x0A0F */ 'apparentPowerPhC',
            /* 0x0A11 */ 'averageRmsVoltageMeasPeriodPhC',
        ];

        for (const at of elements) {
            if (msg.data[at]) {
                result[at] = msg.data[at];
            }
        }

        return result;
    },
};

const seMeteringFZ = {
    cluster: 'seMetering', // 0x0702
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};

        const elements = [
            /* 0x0000 */ 'currentSummDelivered',
            /* 0x0001 */ 'currentSummReceived',
            /* 0x0020 */ 'activeRegisterTierDelivered',
            /* 0x0100 */ 'currentTier1SummDelivered',
            /* 0x0102 */ 'currentTier2SummDelivered',
            /* 0x0104 */ 'currentTier3SummDelivered',
            /* 0x0106 */ 'currentTier4SummDelivered',
            /* 0x0108 */ 'currentTier5SummDelivered',
            /* 0x010A */ 'currentTier6SummDelivered',
            /* 0x010C */ 'currentTier7SummDelivered',
            /* 0x010E */ 'currentTier8SummDelivered',
            /* 0x0110 */ 'currentTier9SummDelivered',
            /* 0x0112 */ 'currentTier10SummDelivered',
            /* 0x0307 */ 'siteId',
            /* 0x0308 */ 'meterSerialNumber',
        ];

        for (const at of elements) {
            const val = msg.data[at];
            if (val) {
                result[at] = val; // By default we assign raw value
                switch (at) {
                case 'meterSerialNumber': // If we receive a Buffer, transform to human readable text
                    if (Buffer.isBuffer(val)) {
                        result[at] = val.toString();
                    }
                    break;
                }
            }
        }

        // TODO: Check if all tarifs which doesn't publish "currentSummDelivered" use just Tier1 & Tier2
        if (result['currentSummDelivered'] == 0 && (result['currentTier1SummDelivered'] > 0 || result['currentTier2SummDelivered'] > 0)) {
            result['currentSummDelivered'] = result['currentTier1SummDelivered'] + result['currentTier2SummDelivered'];
        }

        return result;
    },
};


const seLixeePrivateFZ = {
    cluster: 'liXeePrivate', // 0xFF66
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const result = {};

        const elements = [
            /* 0x0000 */ 'currentTarif',
            /* 0x0001 */ 'tomorrowColor',
            /* 0x0002 */ 'scheduleHPHC',
            /* 0x0003 */ 'presencePotential',
            /* 0x0004 */ 'startNoticeEJP',
            /* 0x0005 */ 'warnDPS',
            /* 0x0006 */ 'warnDIR1',
            /* 0x0007 */ 'warnDIR2',
            /* 0x0008 */ 'warnDIR3',
            /* 0x0200 */ 'currentPrice',
            /* 0x0201 */ 'currentIndexTarif',
            /* 0x0202 */ 'currentDate',
            /* 0x0203 */ 'activeEnerfyOutD01',
            /* 0x0204 */ 'activeEnerfyOutD02',
            /* 0x0205 */ 'activeEnerfyOutD03',
            /* 0x0206 */ 'activeEnerfyOutD04',
            /* 0x0207 */ 'injectedVA',
            /* 0x0208 */ 'injectedVAMaxN',
            /* 0x0209 */ 'injectedVAMaxN1',
            /* 0x0210 */ 'injectedActiveLoadN',
            /* 0x0211 */ 'injectedActiveLoadN1',
            /* 0x0212 */ 'drawnVAMaxN1',
            /* 0x0213 */ 'drawnVAMaxN1P2',
            /* 0x0214 */ 'drawnVAMaxN1P3',
            /* 0x0215 */ 'message1',
            /* 0x0216 */ 'message2',
            /* 0x0217 */ 'statusRegister',
            /* 0x0218 */ 'startMobilePoint1',
            /* 0x0219 */ 'stopMobilePoint1',
            /* 0x0220 */ 'startMobilePoint2',
            /* 0x0221 */ 'stopMobilePoint2',
            /* 0x0222 */ 'startMobilePoint3',
            /* 0x0223 */ 'stopMobilePoint3',
            /* 0x0224 */ 'relais',
            /* 0x0225 */ 'daysNumberCurrentCalendar',
            /* 0x0226 */ 'daysNumberNextCalendar',
            /* 0x0227 */ 'daysProfileCurrentCalendar',
            /* 0x0228 */ 'daysProfileNextCalendar',
        ];

        for (const at of elements) {
            const val = msg.data[at];
            if (val) {
                result[at] = val;
                switch (at) {
                case 'currentTarif':
                case 'tomorrowColor':
                case 'currentDate':
                case 'message1':
                case 'message2':
                    result[at] = val.replace(/\0/g, ''); // Remove all null chars
                    break;
                }
            }
        }

        return result;
    },
};

async function manageAtribute(endpoint, linkyMode, linkyPhase, linkyProduction, isConfig = false, logger=console) {
    let activeEntities = []; // List of active entities (the rest must be disabled for the user)
    async function processValues(values) {
        for (const cluster in values) {
            if (Object.hasOwnProperty.call(values, cluster)) {
                const attributesObject = values[cluster];

                for (const attribute in attributesObject) {
                    if (Object.hasOwnProperty.call(attributesObject, attribute)) {
                        const atConfig = attributesObject[attribute];

                        if (atConfig.hasOwnProperty('name')) {
                            activeEntities.push(...atConfig['name']); // Add to the list of enabled attributes
                        }

                        if (isConfig && atConfig.hasOwnProperty('reportable') && atConfig['reportable'] ) {
                            let change = 1;
                            if (atConfig.hasOwnProperty('change')) {
                                change = atConfig['change'];
                            }

                            await endpoint
                                .configureReporting(cluster, reporting.payload(attribute, 0, repInterval.HOUR, change))
                                .catch((e) => {
                                    logger.debug(`ZLINKY_DEBUG: Error ${cluster}/${attribute}: ${e}`);
                                    logger.warn(`Switching ${cluster}/${attribute} from REPORTABLE to POLL`);
                                });
                        } else { // read
                            await endpoint
                                .read(cluster, [attribute])
                                .catch((e) => logger.debug(`ZLINKY_DEBUG: READ error ${cluster}/${attribute}: ${e}`));
                        }
                    }
                }
            }
        }
    }


    if ('values' in values) {
        await processValues(values['values']); // Global
    }

    if ('values' in values[linkyMode]) {
        await processValues(values[linkyMode]['values']); // Process generic mode
    }

    if ('values' in values[linkyMode][linkyPhase]) {
        await processValues(values[linkyMode][linkyPhase]['values']); // Process mode + generic phase
    }

    if ('values' in values[linkyMode][linkyPhase][linkyProduction]) {
        await processValues(values[linkyMode][linkyPhase][linkyProduction]['values']); // Process mode + phase + production
    }

    if (isConfig) {
        if (linkyMode == linkyModeDef.legacy) {
            // Remove atributes which doesn't match current tarif
            const currentTarf = endpoint.clusters.liXeePrivate.attributes.currentTarif.replace(/\0/g, '');
            switch (currentTarf) {
            case 'BASE':
                activeEntities = activeEntities.filter((a) => ![
                    'HCHC',
                    'HCHP',
                    'HHPHC',
                    'EJPHN',
                    'EJPHPM',
                    'BBRHCJB',
                    'BBRHPJB',
                    'BBRHCJW',
                    'BBRHPJW',
                    'BBRHCJR',
                    'BBRHPJR',
                    'DEMAIN',
                    'PEJP'].includes(a));
                break;
            case 'HC..':
                activeEntities = activeEntities.filter((a) => ![
                    'BASE',
                    'EJPHN',
                    'EJPHPM',
                    'BBRHCJB',
                    'BBRHPJB',
                    'BBRHCJW',
                    'BBRHPJW',
                    'BBRHCJR',
                    'BBRHPJR',
                    'DEMAIN',
                    'PEJP'].includes(a));
                break;
            case 'EJP.':
                activeEntities = activeEntities.filter((a) => ![
                    'BASE',
                    'HCHC',
                    'HCHP',
                    'BBRHCJB',
                    'BBRHPJB',
                    'BBRHCJW',
                    'BBRHPJW',
                    'BBRHCJR',
                    'BBRHPJR',
                    'DEMAIN'].includes(a));
                break;
            case currentTarf.startsWith('BBR'):
                activeEntities = activeEntities.filter((a) => ![
                    'BASE',
                    'HCHC',
                    'HCHP',
                    'EJPHN',
                    'EJPHPM',
                    'PEJP'].includes(a));
                break;
            default:
                break;
            }
        }

        // Expose only entities which are active
        // We must wait to process all values before iterate the array
        for (const exp of exposedData) {
            exp.isVisible(activeEntities.includes(exp.name));
        }
    }
}


const exposedData = [
    // Historique
    exposes.text('ADCO', ea.STATE).withProperty('meterSerialNumber').withDescription('Serial Number'),
    exposes.numeric('BASE', ea.STATE).withUnit('Wh').withProperty('currentSummDelivered').withDescription('Base index'),
    exposes.text('OPTARIF', ea.STATE).withProperty('currentTarif').withDescription('Tarif option'),
    exposes.numeric('ISOUSC', ea.STATE).withUnit('A').withProperty('availablePower').withDescription('Subscribed intensity level'),
    exposes.numeric('HCHC', ea.STATE).withUnit('Wh').withProperty('currentTier1SummDelivered').withDescription('HCHC index'),
    exposes.numeric('HCHP', ea.STATE).withUnit('Wh').withProperty('currentTier2SummDelivered').withDescription('HCHP index'),
    exposes.numeric('EJPHN', ea.STATE).withUnit('Wh').withProperty('currentTier1SummDelivered').withDescription('EJPHN index'),
    exposes.numeric('EJPHPM', ea.STATE).withUnit('Wh').withProperty('currentTier2SummDelivered').withDescription('EJPHPM index'),
    exposes.numeric('BBRHCJB', ea.STATE).withUnit('Wh').withProperty('currentTier1SummDelivered').withDescription('BBRHCJB index'),
    exposes.numeric('BBRHPJB', ea.STATE).withUnit('Wh').withProperty('currentTier2SummDelivered').withDescription('BBRHPJB index'),
    exposes.numeric('BBRHCJW', ea.STATE).withUnit('Wh').withProperty('currentTier3SummDelivered').withDescription('BBRHCJW index'),
    exposes.numeric('BBRHPJW', ea.STATE).withUnit('Wh').withProperty('currentTier4SummDelivered').withDescription('BBRHPJW index'),
    exposes.numeric('BBRHCJR', ea.STATE).withUnit('Wh').withProperty('currentTier5SummDelivered').withDescription('BBRHCJR index'),
    exposes.numeric('BBRHPJR', ea.STATE).withUnit('Wh').withProperty('currentTier6SummDelivered').withDescription('BBRHPJR index'),
    exposes.numeric('IINST', ea.STATE).withUnit('A').withProperty('rmsCurrent').withDescription('RMS current'),
    exposes.numeric('IINST1', ea.STATE).withUnit('A').withProperty('rmsCurrent').withDescription('RMS current (phase 1)'),
    exposes.numeric('IINST2', ea.STATE).withUnit('A').withProperty('rmsCurrentPhB').withDescription('RMS current (phase 2)'),
    exposes.numeric('IINST3', ea.STATE).withUnit('A').withProperty('rmsCurrentPhC').withDescription('RMS current (phase 3)'),
    exposes.numeric('IMAX', ea.STATE).withUnit('A').withProperty('rmsCurrentMax').withDescription('RMS current peak'),
    exposes.numeric('IMAX1', ea.STATE).withUnit('A').withProperty('rmsCurrentMax').withDescription('RMS current peak (phase 1)'),
    exposes.numeric('IMAX2', ea.STATE).withUnit('A').withProperty('rmsCurrentMaxPhB').withDescription('RMS current peak (phase 2)'),
    exposes.numeric('IMAX3', ea.STATE).withUnit('A').withProperty('rmsCurrentMaxPhC').withDescription('RMS current peak (phase 3)'),
    exposes.numeric('PMAX', ea.STATE).withUnit('W').withProperty('activePowerMax').withDescription('Three-phase power peak'),
    exposes.numeric('PAPP', ea.STATE).withUnit('VA').withProperty('apparentPower').withDescription('Apparent power'),
    exposes.text('PTEC', ea.STATE).withProperty('activeRegisterTierDelivered').withDescription('Current pricing period'),
    exposes.text('DEMAIN', ea.STATE).withProperty('tomorrowColor').withDescription('Tomorrow color'),
    exposes.numeric('HHPHC', ea.STATE).withProperty('scheduleHPHC').withDescription('Schedule HPHC'),
    exposes.numeric('PPOT', ea.STATE).withProperty('presencePotential').withDescription('Presence of potentials'),
    exposes.numeric('PEJP', ea.STATE).withUnit('min').withProperty('startNoticeEJP').withDescription('EJP start notice (30min)'),
    exposes.numeric('ADPS', ea.STATE).withUnit('A').withProperty('warnDPS').withDescription('Subscribed Power Exceeded Warning'),
    exposes.numeric('ADIR1', ea.STATE).withUnit('A').withProperty('warnDIR1').withDescription('Over Current Warning (phase 1)'),
    exposes.numeric('ADIR2', ea.STATE).withUnit('A').withProperty('warnDIR2').withDescription('Over Current Warning (phase 2)'),
    exposes.numeric('ADIR3', ea.STATE).withUnit('A').withProperty('warnDIR3').withDescription('Over Current Warning (phase 3)'),

    // Standard
    exposes.text('ADSC', ea.STATE).withProperty('meterSerialNumber').withDescription('Secondary meter address'),
    exposes.text('NGTF', ea.STATE).withProperty('currentTarif').withDescription('Supplier pricing schedule name'),
    exposes.text('LTARF', ea.STATE).withProperty('currentPrice').withDescription('Current supplier price label'),
    exposes.numeric('NTARF', ea.STATE).withProperty('currentIndexTarif').withDescription('Current tariff index number'),
    exposes.numeric('VTIC', ea.STATE).withProperty('softwareRevision').withDescription('Customer tele-information protocol version'),
    exposes.text('DATE', ea.STATE).withProperty('currentDate').withDescription('Current date and time'),
    exposes.numeric('EAST', ea.STATE).withUnit('Wh').withProperty('currentSummDelivered').withDescription('Total active power delivered'),
    exposes.numeric('EASF01', ea.STATE).withUnit('Wh').withProperty('currentTier1SummDelivered').withDescription('Total provider active power delivered (index 01)'),
    exposes.numeric('EASF02', ea.STATE).withUnit('Wh').withProperty('currentTier2SummDelivered').withDescription('Total provider active power delivered (index 02)'),
    exposes.numeric('EASF03', ea.STATE).withUnit('Wh').withProperty('currentTier3SummDelivered').withDescription('Total provider active power delivered (index 03)'),
    exposes.numeric('EASF04', ea.STATE).withUnit('Wh').withProperty('currentTier4SummDelivered').withDescription('Total provider active power delivered (index 04)'),
    exposes.numeric('EASF05', ea.STATE).withUnit('Wh').withProperty('currentTier5SummDelivered').withDescription('Total provider active power delivered (index 05)'),
    exposes.numeric('EASF06', ea.STATE).withUnit('Wh').withProperty('currentTier6SummDelivered').withDescription('Total provider active power delivered (index 06)'),
    exposes.numeric('EASF07', ea.STATE).withUnit('Wh').withProperty('currentTier7SummDelivered').withDescription('Total provider active power delivered (index 07)'),
    exposes.numeric('EASF08', ea.STATE).withUnit('Wh').withProperty('currentTier8SummDelivered').withDescription('Total provider active power delivered (index 08)'),
    exposes.numeric('EASF09', ea.STATE).withUnit('Wh').withProperty('currentTier9SummDelivered').withDescription('Total provider active power delivered (index 09)'),
    exposes.numeric('EASF10', ea.STATE).withUnit('Wh').withProperty('currentTier10SummDelivered').withDescription('Total provider active power delivered (index 10)'),
    exposes.numeric('EASD01', ea.STATE).withUnit('Wh').withProperty('activeEnerfyOutD01').withDescription('Active energy withdrawn Distributor (index 01)'),
    exposes.numeric('EASD02', ea.STATE).withUnit('Wh').withProperty('activeEnerfyOutD02').withDescription('Active energy withdrawn Distributor (index 02)'),
    exposes.numeric('EASD03', ea.STATE).withUnit('Wh').withProperty('activeEnerfyOutD03').withDescription('Active energy withdrawn Distributor (index 03)'),
    exposes.numeric('EASD04', ea.STATE).withUnit('Wh').withProperty('activeEnerfyOutD04').withDescription('Active energy withdrawn Distributor (index 04)'),
    exposes.numeric('EAIT', ea.STATE).withUnit('Wh').withProperty('currentSummReceived').withDescription('Total active power injected'),
    exposes.numeric('ERQ1', ea.STATE).withUnit('VArh').withProperty('totalReactivePower').withDescription('Total reactive power (Q1)'),
    exposes.numeric('ERQ2', ea.STATE).withUnit('VArh').withProperty('reactivePower').withDescription('Total reactive power (Q2)'),
    exposes.numeric('ERQ3', ea.STATE).withUnit('VArh').withProperty('reactivePowerPhB').withDescription('Total reactive power (Q3)'),
    exposes.numeric('ERQ4', ea.STATE).withUnit('VArh').withProperty('reactivePowerPhC').withDescription('Total reactive power (Q4)'),
    exposes.numeric('IRMS1', ea.STATE).withUnit('A').withProperty('rmsCurrent').withDescription('RMS current'),
    exposes.numeric('IRMS2', ea.STATE).withUnit('A').withProperty('rmsCurrentPhB').withDescription('RMS current (phase 2)'),
    exposes.numeric('IRMS3', ea.STATE).withUnit('A').withProperty('rmsCurrentPhC').withDescription('RMS current (phase 3)'),
    exposes.numeric('URMS1', ea.STATE).withUnit('V').withProperty('rmsVoltage').withDescription('RMS voltage'),
    exposes.numeric('URMS2', ea.STATE).withUnit('V').withProperty('rmsVoltagePhB').withDescription('RMS voltage (phase 2)'),
    exposes.numeric('URMS3', ea.STATE).withUnit('V').withProperty('rmsVoltagePhC').withDescription('RMS voltage (phase 3)'),
    exposes.numeric('PREF', ea.STATE).withUnit('kVA').withProperty('availablePower').withDescription('Apparent power of reference'),
    exposes.text('STGE', ea.STATE).withProperty('statusRegister').withDescription('Register of Statutes'),
    exposes.numeric('PCOUP', ea.STATE).withUnit('kVA').withProperty('powerThreshold').withDescription('Apparent power threshold'),
    exposes.numeric('SINSTI', ea.STATE).withUnit('VA').withProperty('injectedVA').withDescription('Instantaneous apparent power injected'),
    exposes.numeric('SMAXIN', ea.STATE).withUnit('VA').withProperty('injectedVAMaxN').withDescription('Apparent power max. injected n'),
    exposes.numeric('SMAXIN-1', ea.STATE).withUnit('VA').withProperty('injectedVAMaxN1').withDescription('Apparent power max. injected n-1'),
    exposes.numeric('CCASN', ea.STATE).withUnit('W').withProperty('activePower').withDescription('Current point of the active load curve drawn'),
    exposes.numeric('CCASN-1', ea.STATE).withUnit('W').withProperty('activePowerPhB').withDescription('Previous point of the active load curve drawn'),
    exposes.numeric('CCAIN', ea.STATE).withUnit('W').withProperty('injectedActiveLoadN').withDescription('Point n of the withdrawn active load curve'),
    exposes.numeric('CCAIN-1', ea.STATE).withUnit('W').withProperty('injectedActiveLoadN1').withDescription('Point n-1 of the withdrawn active load curve'),
    exposes.numeric('UMOY1', ea.STATE).withUnit('V').withProperty('averageRmsVoltageMeasPeriod').withDescription('Average RMS voltage (phase 1)'),
    exposes.numeric('UMOY2', ea.STATE).withUnit('V').withProperty('averageRmsVoltageMeasurePeriodPhB').withDescription('Average RMS voltage (phase 2)'),
    exposes.numeric('UMOY3', ea.STATE).withUnit('V').withProperty('averageRmsVoltageMeasPeriodPhC').withDescription('Average RMS voltage (phase 3)'),
    exposes.numeric('SINSTS', ea.STATE).withUnit('VA').withProperty('apparentPower').withDescription('Immediate apparent power delivered'),
    exposes.numeric('SINSTS1', ea.STATE).withUnit('VA').withProperty('apparentPower').withDescription('Immediate apparent power delivered (phase 1)'),
    exposes.numeric('SINSTS2', ea.STATE).withUnit('VA').withProperty('apparentPowerPhB').withDescription('Immediate apparent power delivered (phase 2)'),
    exposes.numeric('SINSTS3', ea.STATE).withUnit('VA').withProperty('apparentPowerPhC').withDescription('Immediate apparent power delivered (phase 3)'),
    exposes.numeric('SMAXN', ea.STATE).withUnit('VA').withProperty('activePowerMax').withDescription('Apparent power delivered peak'),
    exposes.numeric('SMAXN1', ea.STATE).withUnit('VA').withProperty('activePowerMax').withDescription('Apparent power delivered peak (phase 1)'),
    exposes.numeric('SMAXN2', ea.STATE).withUnit('VA').withProperty('activePowerMaxPhB').withDescription('Apparent power delivered peak (phase 2)'),
    exposes.numeric('SMAXN3', ea.STATE).withUnit('VA').withProperty('activePowerMaxPhC').withDescription('Apparent power delivered peak (phase 3)'),
    exposes.numeric('SMAXN-1', ea.STATE).withUnit('VA').withProperty('drawnVAMaxN1').withDescription('Apparent power max. draw-off n-1'),
    exposes.numeric('SMAXN1-1', ea.STATE).withUnit('VA').withProperty('drawnVAMaxN1').withDescription('Apparent power max. draw-off n-1 (phase 1)'),
    exposes.numeric('SMAXN2-1', ea.STATE).withUnit('VA').withProperty('drawnVAMaxN1P2').withDescription('Apparent power max. draw-off n-1 (phase 2)'),
    exposes.numeric('SMAXN3-1', ea.STATE).withUnit('VA').withProperty('drawnVAMaxN1P3').withDescription('Apparent power max. draw-off n-1 (phase 3)'),
    exposes.text('MSG1', ea.STATE).withProperty('message1').withDescription('Message short'),
    exposes.text('MSG2', ea.STATE).withProperty('message2').withDescription('Message ultra-short'),
    exposes.text('PRM', ea.STATE).withProperty('siteId'),
    exposes.numeric('DPM1', ea.STATE).withProperty('startMobilePoint1').withDescription('Start mobile point 1'),
    exposes.numeric('FPM1', ea.STATE).withProperty('stopMobilePoint1').withDescription('Stop mobile point 1'),
    exposes.numeric('DPM2', ea.STATE).withProperty('startMobilePoint2').withDescription('Start mobile point 2'),
    exposes.numeric('FPM2', ea.STATE).withProperty('stopMobilePoint2').withDescription('Stop mobile point 2'),
    exposes.numeric('DPM3', ea.STATE).withProperty('startMobilePoint3').withDescription('Start mobile point 3'),
    exposes.numeric('FPM3', ea.STATE).withProperty('stopMobilePoint3').withDescription('Stop mobile point 3'),
    exposes.numeric('RELAIS', ea.STATE).withProperty('relais'),
    exposes.numeric('NJOURF', ea.STATE).withProperty('daysNumberCurrentCalendar').withDescription('Current day number supplier calendar'),
    exposes.numeric('NJOURF+1', ea.STATE).withProperty('daysNumberNextCalendar').withDescription('Next day number supplier calendar'),
    exposes.text('PJOURF+1', ea.STATE).withProperty('daysProfileCurrentCalendar').withDescription('Profile of the next supplier calendar day'),
    exposes.text('PPOINTE1', ea.STATE).withProperty('daysProfileNextCalendar').withDescription('Profile of the next check-in day'),
];

async function dynamicExposedEndpoints(endpoint, options, isConfig = false, logger=console) {
    const linkyMode = (options.hasOwnProperty('linky_mode')? options['linky_mode'] : linkyModeDef.legacy);
    const linkyPhase = (options.hasOwnProperty('energy_phase')? options['energy_phase'] : linkyPhaseDef.single);
    const linkyProduction = (options.hasOwnProperty('production')? options['production'] : false);

    if (isConfig) {
        logger.debug(`ZLINKY_DEBUG: Current configuration with mode ${linkyMode}, phase ${linkyPhase} and production set to ${linkyProduction}`);
    }

    await manageAtribute(endpoint, linkyMode, linkyPhase, linkyProduction, isConfig, logger);
}

const definition = {
    zigbeeModel: ['ZLinky_TIC'],
    model: 'ZLinky_TIC',
    vendor: 'LiXee',
    description: 'Lixee ZLinky',
    fromZigbee: [seMeteringFZ, haMeterIdentificationFZ, haElectricalMeasurementFZ, seLixeePrivateFZ],
    toZigbee: [],
    exposes: exposedData,
    options: [
        exposes.options.measurement_poll_interval(),
        exposes.enum(`linky_mode`, ea.SET, [linkyModeDef.legacy, linkyModeDef.standard])
            .withDescription(`Counter with TIC in mode standard or historique. Requires re-configuration (default: historique)`),
        exposes.enum(`energy_phase`, ea.SET, [linkyPhaseDef.single, linkyPhaseDef.three])
            .withDescription(`Power with single or three phase. Requires re-configuration (default: single_phase)`),
        exposes.binary(`production`, ea.SET, true, false).withDescription(`If you produce energy back to the grid. Requires re-configuration (only linky_mode: ${linkyModeDef.standard}, default: false)`),
    ],
    configure: async (device, coordinatorEndpoint, logger) => {
        const SW1_ENDPOINT = 1;
        const endpoint = device.getEndpoint(SW1_ENDPOINT);

        await reporting.bind(endpoint, coordinatorEndpoint, [
            /* 0x0702 */ 'seMetering',
            /* 0x0B01 */ 'haMeterIdentification',
            /* 0x0B04 */ 'haElectricalMeasurement',
            /* 0xFF66 */ 'liXeePrivate',
        ])
            .catch((e) => {
                logger.error(`ZLINKY_DEBUG: failed to bind: ${e.message}`);
            });

        // ZLinky don't emit divisor and multiplier
        await endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1, acCurrentMultiplier: 1});
        await endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1, multiplier: 1});
    },
    onEvent: (type, data, device, options) => {
        const endpoint = device.getEndpoint(1);
        if (type === 'stop') {
            clearInterval(globalStore.getValue(device, 'interval'));
            globalStore.clearValue(device, 'interval');
        } else if (type === 'devicesChanged') {
            dynamicExposedEndpoints(endpoint, options, true)
                .then(() => {/* Just wait */});
        } else if (type === 'start') {
            const SW1_ENDPOINT = 1;
            const endpoint = device.getEndpoint(SW1_ENDPOINT);

            dynamicExposedEndpoints(endpoint, options, true)
                .then(() => {/* Just wait */});
        } else if (!globalStore.hasValue(device, 'interval')) {
            const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 60;

            const interval = setInterval(async () => {
                try {
                    await dynamicExposedEndpoints(endpoint, options, false);
                } catch (error) {/* Do nothing*/}
            }, seconds * 1000);
            globalStore.putValue(device, 'interval', interval);
        }
    },
    endpoint: (dev) => {
        return {
            'haElectricalMeasurement': 1, 'liXeePrivate': 1, 'seMetering': 1, 'haMeterIdentification': 1, 'default': 1,
        };
    },
};

module.exports = [definition];
