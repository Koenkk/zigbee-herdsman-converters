import {Definition, Fz, Tz, KeyValue, Zh} from '../lib/types';
/* eslint-disable camelcase */
/* eslint-disable max-len */
import * as exposes from '../lib/exposes';
import * as globalStore from '../lib/store';
import {repInterval} from '../lib/constants';
import * as reporting from '../lib/reporting';
import fz from '../converters/fromZigbee';
const ea = exposes.access;
const e = exposes.presets;
import * as utils from '../lib/utils';
import * as ota from '../lib/ota';
import {Buffer} from 'buffer';
import {logger} from '../lib/logger';

const NS = 'zhc:lixee';
/* Start ZiPulses */

const unitsZiPulses = [
    'kWh',
    'm3',
    'ft3',
    'ccf',
    'US gl',
    'IMP gl',
    'BTUs',
    'L (litre)',
    'kPA (jauge)',
    'kPA (absolu)',
    'kPA (absolu)',
    'sans unité',
    'MJ',
    'kVar',
];

const tzSeMetering: Tz.Converter = {
    key: ['divisor', 'multiplier', 'unitOfMeasure'],
    convertSet: async (entity, key, value, meta) => {
        if (key === 'unitOfMeasure') {
            utils.assertString(value, 'unitOfMeasure');
            const val = unitsZiPulses.indexOf(value);
            const payload = {768: {value: val, type: 48}};
            await entity.write('seMetering', payload);
            await entity.read('seMetering', [key]);
            return {state: {'unitOfMeasure': value}};
        } else {
            await entity.write('seMetering', {
                [key]: value,
            });
        }

        return {state: {[key]: value}};
    },
    // convertGet: async (entity, key, meta) => {
    //     await entity.read('seMetering', [key]);
    // },
};


const fzZiPulses: Fz.Converter = {
    cluster: 'seMetering',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
        const payload: KeyValue = {};
        if (msg.data.hasOwnProperty('multiplier')) {
            payload['multiplier'] = msg.data['multiplier'];
        }
        if (msg.data.hasOwnProperty('divisor')) {
            payload['divisor'] = msg.data['divisor'];
        }
        if (msg.data.hasOwnProperty('unitOfMeasure')) {
            const val = msg.data['unitOfMeasure'];
            payload['unitOfMeasure'] = unitsZiPulses[val];
        }

        return payload;
    },
};


/* End ZiPulses */

const fzLocal = {
    lixee_ha_electrical_measurement: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};

            const elements = [
                /* 0x0305 */ 'totalReactivePower',
                /* 0x0306 */ 'totalApparentPower',
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
                const at_snake = at.split(/(?=[A-Z])/).join('_').toLowerCase();
                if (msg.data[at] != null) {
                    result[at_snake] = msg.data[at];
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    lixee_private_fz: {
        cluster: 'liXeePrivate', // 0xFF66
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
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
                /* 0x0009 */ 'motDEtat',
                /* 0x0200 */ 'currentPrice',
                /* 0x0201 */ 'currentIndexTarif',
                /* 0x0202 */ 'currentDate',
                /* 0x0203 */ 'activeEnergyOutD01',
                /* 0x0204 */ 'activeEnergyOutD02',
                /* 0x0205 */ 'activeEnergyOutD03',
                /* 0x0206 */ 'activeEnergyOutD04',
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
            const kWh_p = options && options.kWh_precision ? options.kWh_precision : 0;
            for (const at of elements) {
                const at_snake = at.split(/(?=[A-Z])/).join('_').toLowerCase();
                let val = msg.data[at];
                if (val != null) {
                    if (val.hasOwnProperty('type') && val.type === 'Buffer') {
                        val = Buffer.from(val.data);
                    }
                    if (Buffer.isBuffer(val)) {
                        val = val.toString(); // Convert buffer to string
                    }
                    if (typeof val === 'string' || val instanceof String) {
                        val = val.replace(/\0/g, ''); // Remove all null chars when str
                        val = val.replace(/\s+/g, ' ').trim(); // Remove extra and leading spaces
                    }
                    switch (at) {
                    case 'activeEnergyOutD01':
                    case 'activeEnergyOutD02':
                    case 'activeEnergyOutD03':
                    case 'activeEnergyOutD04':
                        // @ts-expect-error
                        val = utils.precisionRound(val / 1000, kWh_p); // from Wh to kWh
                        break;
                    case 'relais': {
                        // relais is a decimal value representing the bits
                        // of 8 virtual dry contacts.
                        // 0 for an open relay
                        // 1 for a closed relay
                        // relais1 Hot water === legacy dry contact
                        // relais2 Main heater
                        // relais3 Secondary heater
                        // relais4 AC or Heat pump
                        // relais5 EV charge
                        // relais6 Storage or injection
                        // relais7 Unassigned
                        // relais8 Unassigned
                        const relais_breakout: KeyValue = {};
                        for (let i = 0; i < 8; i++) {
                            relais_breakout[at_snake + (i+1)] = (val & (1<<i)) >>> i;
                        }
                        result[at_snake + '_breakout'] = relais_breakout;
                        break;
                    }
                    case 'statusRegister': {
                        // val is a String representing hex.
                        // Must convert
                        const valhex = Number('0x' + val);
                        const statusRegister_breakout: KeyValue = {};
                        // contact sec
                        statusRegister_breakout['contact_sec'] = (valhex & 0x1) == 1 ? 'ouvert' : 'ferme';
                        // organe de coupure
                        switch ((valhex >>> 1) & 0x7) {
                        case 0:
                            statusRegister_breakout['organe_coupure'] = 'ferme';
                            break;
                        case 1:
                            statusRegister_breakout['organe_coupure'] = 'surpuissance';
                            break;
                        case 2:
                            statusRegister_breakout['organe_coupure'] = 'surtension';
                            break;
                        case 3:
                            statusRegister_breakout['organe_coupure'] = 'delestage';
                            break;
                        case 4:
                            statusRegister_breakout['organe_coupure'] = 'ordre_CPL_Euridis';
                            break;
                        case 5:
                            statusRegister_breakout['organe_coupure'] = 'surchauffe_surcourant';
                            break;
                        case 6:
                            statusRegister_breakout['organe_coupure'] = 'surchauffe_simple';
                            break;
                        }
                        // etat cache borne distributeur
                        statusRegister_breakout['cache_borne_dist'] = ((valhex >>> 4) & 0x1) == 0 ? 'ferme' : 'ouvert';
                        // bit 5 inutilise
                        // surtension sur une des phases
                        statusRegister_breakout['surtension_phase'] = (valhex >>> 6) & 0x1;
                        // depassement puissance de reference
                        statusRegister_breakout['depassement_ref_pow'] = (valhex >>> 7) & 0x1;
                        // consommateur ou producteur
                        statusRegister_breakout['producteur'] = (valhex >>> 8) & 0x1;
                        // sens de l'energie active
                        statusRegister_breakout['sens_energie_active'] = ((valhex >>> 9) & 0x1) == 0 ? 'positive' : 'negative';
                        // tarif en cours sur le contrat fourniture
                        statusRegister_breakout['tarif_four'] = 'index_' + (((valhex >>> 10) & 0xF) + 1);
                        // tarif en cours sur le contrat distributeur
                        statusRegister_breakout['tarif_dist'] = 'index_' + (((valhex >>> 14) & 0x3) + 1);
                        // mode degrade de l'horloge
                        statusRegister_breakout['horloge'] = ((valhex >>> 16) & 0x1) == 0 ? 'correcte' : 'degradee';
                        // TIC historique ou standard
                        statusRegister_breakout['type_tic'] = ((valhex >>> 17) & 0x1) == 0 ? 'historique' : 'standard';
                        // bit 18 inutilise
                        // etat sortie communicateur Euridis
                        switch ((valhex >>> 19) & 0x3) {
                        case 0:
                            statusRegister_breakout['comm_euridis'] = 'desactivee';
                            break;
                        case 1:
                            statusRegister_breakout['comm_euridis'] = 'activee sans securite';
                            break;
                        case 3:
                            statusRegister_breakout['comm_euridis'] = 'activee avec securite';
                            break;
                        }
                        // etat CPL
                        switch ((valhex >>> 21) & 0x3) {
                        case 0:
                            statusRegister_breakout['etat_cpl'] = 'nouveau_deverrouille';
                            break;
                        case 1:
                            statusRegister_breakout['etat_cpl'] = 'nouveau_verrouille';
                            break;
                        case 2:
                            statusRegister_breakout['etat_cpl'] = 'enregistre';
                            break;
                        }
                        // synchronisation CPL
                        statusRegister_breakout['sync_cpl'] = ((valhex >>> 23) & 0x1) == 0 ? 'non_synchronise' : 'synchronise';
                        // couleur du jour contrat TEMPO historique
                        switch ((valhex >>> 24) & 0x3) {
                        case 0:
                            statusRegister_breakout['tempo_jour'] = 'UNDEF';
                            break;
                        case 1:
                            statusRegister_breakout['tempo_jour'] = 'BLEU';
                            break;
                        case 2:
                            statusRegister_breakout['tempo_jour'] = 'BLANC';
                            break;
                        case 3:
                            statusRegister_breakout['tempo_jour'] = 'ROUGE';
                            break;
                        }
                        // couleur demain contrat TEMPO historique
                        switch ((valhex >>> 26) & 0x3) {
                        case 0:
                            statusRegister_breakout['tempo_demain'] = 'UNDEF';
                            break;
                        case 1:
                            statusRegister_breakout['tempo_demain'] = 'BLEU';
                            break;
                        case 2:
                            statusRegister_breakout['tempo_demain'] = 'BLANC';
                            break;
                        case 3:
                            statusRegister_breakout['tempo_demain'] = 'ROUGE';
                            break;
                        }
                        // preavis pointe mobile
                        switch ((valhex >>> 28) & 0x3) {
                        case 0:
                            statusRegister_breakout['preavis_pointe_mobile'] = 'AUCUN';
                            break;
                        case 1:
                            statusRegister_breakout['preavis_pointe_mobile'] = 'PM1';
                            break;
                        case 2:
                            statusRegister_breakout['preavis_pointe_mobile'] = 'PM2';
                            break;
                        case 3:
                            statusRegister_breakout['preavis_pointe_mobile'] = 'PM3';
                            break;
                        }
                        // pointe mobile
                        switch ((valhex >>> 30) & 0x3) {
                        case 0:
                            statusRegister_breakout['pointe_mobile'] = 'AUCUN';
                            break;
                        case 1:
                            statusRegister_breakout['pointe_mobile'] = 'PM1';
                            break;
                        case 2:
                            statusRegister_breakout['pointe_mobile'] = 'PM2';
                            break;
                        case 3:
                            statusRegister_breakout['pointe_mobile'] = 'PM3';
                            break;
                        }
                        result[at_snake + '_breakout'] = statusRegister_breakout;
                    }
                    }
                    result[at_snake] = val;
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    lixee_metering: {
        cluster: 'seMetering', // 0x0702
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
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
            const kWh_p = options && options.kWh_precision ? options.kWh_precision : 0;
            for (const at of elements) {
                const at_snake = at.split(/(?=[A-Z])/).join('_').toLowerCase();
                const val = msg.data[at];
                if (val != null) {
                    result[at_snake] = val; // By default we assign raw value
                    switch (at) {
                    // If we receive a Buffer, transform to human readable text
                    case 'meterSerialNumber':
                    case 'siteId':
                        if (Buffer.isBuffer(val)) {
                            result[at_snake] = val.toString();
                        }
                        break;
                    case 'currentSummDelivered':
                    case 'currentSummReceived':
                    case 'currentTier1SummDelivered':
                    case 'currentTier2SummDelivered':
                    case 'currentTier3SummDelivered':
                    case 'currentTier4SummDelivered':
                    case 'currentTier5SummDelivered':
                    case 'currentTier6SummDelivered':
                    case 'currentTier7SummDelivered':
                    case 'currentTier8SummDelivered':
                    case 'currentTier9SummDelivered':
                    case 'currentTier10SummDelivered':
                        // @ts-expect-error
                        result[at_snake] = utils.precisionRound(((val[0] << 32) + val[1]) / 1000, kWh_p); // Wh to kWh
                        break;
                    }
                }
            }
            // TODO: Check if all tarifs which doesn't publish "currentSummDelivered" use just Tier1 & Tier2
            if (result['current_summ_delivered'] == 0 &&
                // @ts-expect-error
                (result['current_tier1_summ_delivered'] > 0 || result['current_tier2_summ_delivered'] > 0)) {
                // @ts-expect-error
                result['current_summ_delivered'] = result['current_tier1_summ_delivered'] + result['current_tier2_summ_delivered'];
            }
            return result;
        },
    } satisfies Fz.Converter,
};


// we are doing it with exclusion and not inclusion because the list is dynamic (based on zlinky mode),
// and change based on that. Just some few attributes are useless, so we exclude them
const tarifsDef = {
    histo_BASE: {
        fname: 'Historique - BASE',
        currentTarf: 'BASE', excluded: [
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
            'PEJP',
        ],
    },
    histo_HCHP: {
        fname: 'Historique - HCHP',
        currentTarf: 'HC..', excluded: [
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
            'PEJP',
        ],
    },
    histo_EJP: {
        fname: 'Historique - EJP',
        currentTarf: 'EJP.', excluded: [
            'BASE',
            'HCHC',
            'HCHP',
            'BBRHCJB',
            'BBRHPJB',
            'BBRHCJW',
            'BBRHPJW',
            'BBRHCJR',
            'BBRHPJR',
            'DEMAIN',
        ],
    },
    histo_BBR: {
        fname: 'Historique - BBR',
        currentTarf: 'BBR', excluded: [
            'BASE',
            'HCHC',
            'HCHP',
            'EJPHN',
            'EJPHPM',
            'PEJP',
        ],
    },
    stand_SEM_WE_LUNDI: {
        fname: 'Standard - Sem WE Lundi',
        currentTarf: 'SEM WE LUNDI', excluded: [
            'EASF07',
            'EASF08',
            'EASF09',
            'EASF10',
            'EASD02',
            'EASD03',
            'EASD04',
            'DPM1',
            'DPM2',
            'DPM3',
            'FPM1',
            'FPM2',
            'FPM3',
            'NJOURF',
            'NJOURF+1',
            'PJOURF+1',
            'PPOINTE1',
        ],
    },
    stand_SEM_WE_MERCR: {
        fname: 'Standard - Sem WE Mercredi',
        currentTarf: 'SEM WE MERCREDI', excluded: [
            'EASF07',
            'EASF08',
            'EASF09',
            'EASF10',
            'EASD02',
            'EASD03',
            'EASD04',
            'DPM1',
            'DPM2',
            'DPM3',
            'FPM1',
            'FPM2',
            'FPM3',
            'NJOURF',
            'NJOURF+1',
            'PJOURF+1',
            'PPOINTE1',
        ],
    },
    stand_SEM_WE_VENDR: {
        fname: 'Standard - Sem WE Vendredi',
        currentTarf: 'SEM WE VENDREDI', excluded: [
            'EASF07',
            'EASF08',
            'EASF09',
            'EASF10',
            'EASD02',
            'EASD03',
            'EASD04',
            'DPM1',
            'DPM2',
            'DPM3',
            'FPM1',
            'FPM2',
            'FPM3',
            'NJOURF',
            'NJOURF+1',
            'PJOURF+1',
            'PPOINTE1',
        ],
    },
    stand_BASE: {
        fname: 'Standard - BASE',
        currentTarf: 'BASE',
        excluded: [
            'EASF03',
            'EASF04',
            'EASF05',
            'EASF06',
            'EASF07',
            'EASF08',
            'EASF09',
            'EASF10',
            'EASD02',
            'EASD03',
            'EASD04',
            'DPM1',
            'DPM2',
            'DPM3',
            'FPM1',
            'FPM2',
            'FPM3',
            'NJOURF',
            'NJOURF+1',
            'PJOURF+1',
            'PPOINTE1',
        ],
    },
    stand_HPHC: {
        fname: 'Standard - Heure Pleine Heure Creuse',
        currentTarf: 'H PLEINE/CREUSE', excluded: [
            'EASF03',
            'EASF04',
            'EASF05',
            'EASF06',
            'EASF07',
            'EASF08',
            'EASF09',
            'EASF10',
            'EASD03',
            'EASD04',
            'DPM1',
            'DPM2',
            'DPM3',
            'FPM1',
            'FPM2',
            'FPM3',
            'NJOURF',
            'NJOURF+1',
            'PJOURF+1',
            'PPOINTE1',
        ],
    },
    stand_H_SUPER_CREUSES: {
        fname: 'Standard - Heures Super Creuses',
        currentTarf: 'H SUPER CREUSES', excluded: [
            'EASF07',
            'EASF08',
            'EASF09',
            'EASF10',
            'DPM1',
            'DPM2',
            'DPM3',
            'FPM1',
            'FPM2',
            'FPM3',
            'NJOURF',
            'NJOURF+1',
            'PJOURF+1',
            'PPOINTE1',
        ],
    },
    stand_TEMPO: {
        fname: 'Standard - TEMPO',
        currentTarf: 'TEMPO', excluded: [
            'EASF07',
            'EASF08',
            'EASF09',
            'EASF10',
            'EASD03',
            'EASD04',
            'DPM1',
            'DPM2',
            'DPM3',
            'FPM1',
            'FPM2',
            'FPM3',
            'NJOURF',
            'NJOURF+1',
            'PJOURF+1',
            'PPOINTE1',
        ],
    },
    stand_ZEN_FLEX: {
        fname: 'Standard - ZEN Flex',
        currentTarf: 'ZEN Flex', excluded: [
            'EASF05',
            'EASF06',
            'EASF07',
            'EASF08',
            'EASF09',
            'EASF10',
            'EASD03',
            'EASD04',
            'DPM1',
            'DPM2',
            'DPM3',
            'FPM1',
            'FPM2',
            'FPM3',
            'NJOURF',
            'NJOURF+1',
            'PJOURF+1',
        ],
    },
};


const linkyModeDef = {
    standard: 'standard',
    legacy: 'historique',
};

const linkyPhaseDef = {
    single: 'single_phase',
    three: 'three_phase',
    all: 'both',
};

const clustersDef = {
    _0xFF66: 'liXeePrivate', // 0xFF66
    _0x0B04: 'haElectricalMeasurement', // 0x0B04
    _0x0702: 'seMetering', // 0x0702
    _0x0B01: 'haMeterIdentification', // 0x0B01
};


// full list available on https://github.com/fairecasoimeme/Zlinky_TIC/blob/master/README.md
// Properties must be EAXCTLY ".split(/(?=[A-Z])/).join('_').toLowerCase()" of att
const allPhaseData = [
    {cluster: clustersDef._0x0702, att: 'currentSummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EAST', ea.STATE).withUnit('kWh').withProperty('current_summ_delivered').withDescription('Total active power delivered')},
    {cluster: clustersDef._0x0702, att: 'currentSummReceived', reportable: true, report: {change: 100}, onlyProducer: true, exposes: e.numeric('EAIT', ea.STATE).withUnit('kWh').withProperty('current_summ_received').withDescription('Total active power injected')},
    {cluster: clustersDef._0x0702, att: 'currentTier1SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF01', ea.STATE).withUnit('kWh').withProperty('current_tier1_summ_delivered').withDescription('Total provider active power delivered (index 01)')},
    {cluster: clustersDef._0x0702, att: 'currentTier2SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF02', ea.STATE).withUnit('kWh').withProperty('current_tier2_summ_delivered').withDescription('Total provider active power delivered (index 02)')},
    {cluster: clustersDef._0x0702, att: 'currentTier3SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF03', ea.STATE).withUnit('kWh').withProperty('current_tier3_summ_delivered').withDescription('Total provider active power delivered (index 03)')},
    {cluster: clustersDef._0x0702, att: 'currentTier4SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF04', ea.STATE).withUnit('kWh').withProperty('current_tier4_summ_delivered').withDescription('Total provider active power delivered (index 04)')},
    {cluster: clustersDef._0x0702, att: 'currentTier5SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF05', ea.STATE).withUnit('kWh').withProperty('current_tier5_summ_delivered').withDescription('Total provider active power delivered (index 05)')},
    {cluster: clustersDef._0x0702, att: 'currentTier6SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF06', ea.STATE).withUnit('kWh').withProperty('current_tier6_summ_delivered').withDescription('Total provider active power delivered (index 06)')},
    {cluster: clustersDef._0x0702, att: 'currentTier7SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF07', ea.STATE).withUnit('kWh').withProperty('current_tier7_summ_delivered').withDescription('Total provider active power delivered (index 07)')},
    {cluster: clustersDef._0x0702, att: 'currentTier8SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF08', ea.STATE).withUnit('kWh').withProperty('current_tier8_summ_delivered').withDescription('Total provider active power delivered (index 08)')},
    {cluster: clustersDef._0x0702, att: 'currentTier9SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF09', ea.STATE).withUnit('kWh').withProperty('current_tier9_summ_delivered').withDescription('Total provider active power delivered (index 09)')},
    {cluster: clustersDef._0x0702, att: 'currentTier10SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASF10', ea.STATE).withUnit('kWh').withProperty('current_tier10_summ_delivered').withDescription('Total provider active power delivered (index 10)')},
    {cluster: clustersDef._0x0702, att: 'meterSerialNumber', reportable: false, onlyProducer: false, exposes: e.text('ADSC', ea.STATE).withProperty('meter_serial_number').withDescription('Serial Number')},
    {cluster: clustersDef._0x0702, att: 'siteId', reportable: false, onlyProducer: false, exposes: e.text('PRM', ea.STATE).withProperty('site_id').withDescription('PRM number')},
    {cluster: clustersDef._0x0B01, att: 'availablePower', reportable: false, onlyProducer: false, exposes: e.numeric('PREF', ea.STATE).withUnit('kVA').withProperty('available_power').withDescription('Apparent power of reference')},
    {cluster: clustersDef._0x0B01, att: 'powerThreshold', reportable: false, onlyProducer: false, exposes: e.numeric('PCOUP', ea.STATE).withUnit('kVA').withProperty('power_threshold').withDescription('Apparent power threshold')},
    {cluster: clustersDef._0x0B01, att: 'softwareRevision', reportable: false, onlyProducer: false, exposes: e.numeric('VTIC', ea.STATE).withProperty('software_revision').withDescription('Customer tele-information protocol version')},
    {cluster: clustersDef._0x0B04, att: 'activePower', reportable: true, onlyProducer: false, exposes: e.numeric('CCASN', ea.STATE).withUnit('W').withProperty('active_power').withDescription('Current point of the active load curve drawn')},
    {cluster: clustersDef._0x0B04, att: 'activePowerPhB', reportable: true, onlyProducer: false, exposes: e.numeric('CCASN-1', ea.STATE).withUnit('W').withProperty('active_power_ph_b').withDescription('Previous point of the active load curve drawn')},
    {cluster: clustersDef._0x0B04, att: 'averageRmsVoltageMeasPeriod', reportable: true, onlyProducer: false, exposes: e.numeric('UMOY1', ea.STATE).withUnit('V').withProperty('average_rms_voltage_meas_period').withDescription('Average RMS voltage (phase 1)')},
    {cluster: clustersDef._0x0B04, att: 'totalReactivePower', reportable: true, onlyProducer: true, exposes: e.numeric('ERQ1', ea.STATE).withUnit('VArh').withProperty('total_reactive_power').withDescription('Total reactive power (Q1)')},
    {cluster: clustersDef._0x0B04, att: 'reactivePower', reportable: true, onlyProducer: true, exposes: e.numeric('ERQ2', ea.STATE).withUnit('VArh').withProperty('reactive_power').withDescription('Total reactive power (Q2)')},
    {cluster: clustersDef._0x0B04, att: 'reactivePowerPhB', reportable: true, onlyProducer: true, exposes: e.numeric('ERQ3', ea.STATE).withUnit('VArh').withProperty('reactive_power_ph_b').withDescription('Total reactive power (Q3)')},
    {cluster: clustersDef._0x0B04, att: 'reactivePowerPhC', reportable: true, onlyProducer: true, exposes: e.numeric('ERQ4', ea.STATE).withUnit('VArh').withProperty('reactive_power_ph_c').withDescription('Total reactive power (Q4)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrent', reportable: true, onlyProducer: false, exposes: e.numeric('IRMS1', ea.STATE).withUnit('A').withProperty('rms_current').withDescription('RMS current')},
    {cluster: clustersDef._0x0B04, att: 'rmsVoltage', reportable: true, onlyProducer: false, exposes: e.numeric('URMS1', ea.STATE).withUnit('V').withProperty('rms_voltage').withDescription('RMS voltage')},
    {cluster: clustersDef._0xFF66, att: 'activeEnergyOutD01', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASD01', ea.STATE).withUnit('kWh').withProperty('active_energy_out_d01').withDescription('Active energy withdrawn Distributor (index 01)')},
    {cluster: clustersDef._0xFF66, att: 'activeEnergyOutD02', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASD02', ea.STATE).withUnit('kWh').withProperty('active_energy_out_d02').withDescription('Active energy withdrawn Distributor (index 02)')},
    {cluster: clustersDef._0xFF66, att: 'activeEnergyOutD03', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASD03', ea.STATE).withUnit('kWh').withProperty('active_energy_out_d03').withDescription('Active energy withdrawn Distributor (index 03)')},
    {cluster: clustersDef._0xFF66, att: 'activeEnergyOutD04', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EASD04', ea.STATE).withUnit('kWh').withProperty('active_energy_out_d04').withDescription('Active energy withdrawn Distributor (index 04)')},
    {cluster: clustersDef._0xFF66, att: 'currentDate', reportable: false, onlyProducer: false, exposes: e.text('DATE', ea.STATE).withProperty('current_date').withDescription('Current date and time')},
    {cluster: clustersDef._0xFF66, att: 'currentIndexTarif', reportable: false, onlyProducer: false, exposes: e.numeric('NTARF', ea.STATE).withProperty('current_index_tarif').withDescription('Current tariff index number')},
    {cluster: clustersDef._0xFF66, att: 'currentPrice', reportable: false, onlyProducer: false, exposes: e.text('LTARF', ea.STATE).withProperty('current_price').withDescription('Current supplier price label')},
    {cluster: clustersDef._0xFF66, att: 'currentTarif', reportable: false, onlyProducer: false, exposes: e.text('NGTF', ea.STATE).withProperty('current_tarif').withDescription('Supplier pricing schedule name')},
    {cluster: clustersDef._0xFF66, att: 'daysNumberCurrentCalendar', reportable: false, onlyProducer: false, exposes: e.numeric('NJOURF', ea.STATE).withProperty('days_number_current_calendar').withDescription('Current day number supplier calendar')},
    {cluster: clustersDef._0xFF66, att: 'daysNumberNextCalendar', reportable: false, onlyProducer: false, exposes: e.numeric('NJOURF+1', ea.STATE).withProperty('days_number_next_calendar').withDescription('Next day number supplier calendar')},
    {cluster: clustersDef._0xFF66, att: 'daysProfileCurrentCalendar', reportable: false, onlyProducer: false, exposes: e.text('PJOURF+1', ea.STATE).withProperty('days_profile_current_calendar').withDescription('Profile of the next supplier calendar day')},
    {cluster: clustersDef._0xFF66, att: 'daysProfileNextCalendar', reportable: false, onlyProducer: false, exposes: e.text('PPOINTE1', ea.STATE).withProperty('days_profile_next_calendar').withDescription('Profile of the next check-in day')},
    {cluster: clustersDef._0xFF66, att: 'injectedActiveLoadN', reportable: true, onlyProducer: true, exposes: e.numeric('CCAIN', ea.STATE).withUnit('W').withProperty('injected_active_load_n').withDescription('Point n of the withdrawn active load curve')},
    {cluster: clustersDef._0xFF66, att: 'injectedActiveLoadN1', reportable: false, onlyProducer: true, exposes: e.numeric('CCAIN-1', ea.STATE).withUnit('W').withProperty('injected_active_load_n1').withDescription('Point n-1 of the withdrawn active load curve')},
    {cluster: clustersDef._0xFF66, att: 'injectedVA', reportable: true, onlyProducer: true, exposes: e.numeric('SINSTI', ea.STATE).withUnit('VA').withProperty('injected_v_a').withDescription('Instantaneous apparent power injected')},
    {cluster: clustersDef._0xFF66, att: 'injectedVAMaxN', reportable: true, onlyProducer: true, exposes: e.numeric('SMAXIN', ea.STATE).withUnit('VA').withProperty('injected_v_a_max_n').withDescription('Apparent power max. injected n')},
    {cluster: clustersDef._0xFF66, att: 'injectedVAMaxN1', reportable: false, onlyProducer: true, exposes: e.numeric('SMAXIN-1', ea.STATE).withUnit('VA').withProperty('injected_v_a_max_n1').withDescription('Apparent power max. injected n-1')},
    {cluster: clustersDef._0xFF66, att: 'message1', reportable: false, onlyProducer: false, exposes: e.text('MSG1', ea.STATE).withProperty('message1').withDescription('Message short')},
    {cluster: clustersDef._0xFF66, att: 'message2', reportable: false, onlyProducer: false, exposes: e.text('MSG2', ea.STATE).withProperty('message2').withDescription('Message ultra-short')},
    {cluster: clustersDef._0xFF66, att: 'relais', reportable: false, onlyProducer: false, exposes: e.numeric('RELAIS', ea.STATE).withProperty('relais')},
    {cluster: clustersDef._0xFF66, att: 'startMobilePoint1', reportable: false, onlyProducer: false, exposes: e.numeric('DPM1', ea.STATE).withProperty('start_mobile_point1').withDescription('Start mobile point 1')},
    {cluster: clustersDef._0xFF66, att: 'startMobilePoint2', reportable: false, onlyProducer: false, exposes: e.numeric('DPM2', ea.STATE).withProperty('start_mobile_point2').withDescription('Start mobile point 2')},
    {cluster: clustersDef._0xFF66, att: 'startMobilePoint3', reportable: false, onlyProducer: false, exposes: e.numeric('DPM3', ea.STATE).withProperty('start_mobile_point3').withDescription('Start mobile point 3')},
    {cluster: clustersDef._0xFF66, att: 'statusRegister', reportable: false, onlyProducer: false, exposes: e.text('STGE', ea.STATE).withProperty('status_register').withDescription('Register of Statutes')},
    {cluster: clustersDef._0xFF66, att: 'stopMobilePoint1', reportable: false, onlyProducer: false, exposes: e.numeric('FPM1', ea.STATE).withProperty('stop_mobile_point1').withDescription('Stop mobile point 1')},
    {cluster: clustersDef._0xFF66, att: 'stopMobilePoint2', reportable: false, onlyProducer: false, exposes: e.numeric('FPM2', ea.STATE).withProperty('stop_mobile_point2').withDescription('Stop mobile point 2')},
    {cluster: clustersDef._0xFF66, att: 'stopMobilePoint3', reportable: false, onlyProducer: false, exposes: e.numeric('FPM3', ea.STATE).withProperty('stop_mobile_point3').withDescription('Stop mobile point 3')},
].map((x) => {
    return {...x, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard};
});


const singlePhaseData = [
    {cluster: clustersDef._0x0B04, att: 'activePowerMax', reportable: true, onlyProducer: false, exposes: e.numeric('SMAXN', ea.STATE).withUnit('VA').withProperty('active_power_max').withDescription('Apparent power delivered peak')},
    {cluster: clustersDef._0x0B04, att: 'apparentPower', reportable: true, onlyProducer: false, exposes: e.numeric('SINSTS', ea.STATE).withUnit('VA').withProperty('apparent_power').withDescription('Immediate apparent power delivered')},
    {cluster: clustersDef._0xFF66, att: 'drawnVAMaxN1', reportable: false, onlyProducer: false, exposes: e.numeric('SMAXN-1', ea.STATE).withUnit('VA').withProperty('drawn_v_a_max_n1').withDescription('Apparent power max. draw-off n-1')},
].map((x) => {
    return {...x, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard};
});

const threePhasesData = [
    {cluster: clustersDef._0x0B04, att: 'activePowerMax', reportable: true, onlyProducer: false, exposes: e.numeric('SMAXN1', ea.STATE).withUnit('VA').withProperty('active_power_max').withDescription('Apparent power delivered peak (phase 1)')},
    {cluster: clustersDef._0x0B04, att: 'activePowerMaxPhB', reportable: true, onlyProducer: false, exposes: e.numeric('SMAXN2', ea.STATE).withUnit('VA').withProperty('active_power_max_ph_b').withDescription('Apparent power delivered peak (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'activePowerMaxPhC', reportable: true, onlyProducer: false, exposes: e.numeric('SMAXN3', ea.STATE).withUnit('VA').withProperty('active_power_max_ph_c').withDescription('Apparent power delivered peak (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'apparentPower', reportable: true, onlyProducer: false, exposes: e.numeric('SINSTS1', ea.STATE).withUnit('VA').withProperty('apparent_power').withDescription('Immediate apparent power delivered (phase 1)')},
    {cluster: clustersDef._0x0B04, att: 'apparentPowerPhB', reportable: true, onlyProducer: false, exposes: e.numeric('SINSTS2', ea.STATE).withUnit('VA').withProperty('apparent_power_ph_b').withDescription('Immediate apparent power delivered (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'apparentPowerPhC', reportable: true, onlyProducer: false, exposes: e.numeric('SINSTS3', ea.STATE).withUnit('VA').withProperty('apparent_power_ph_c').withDescription('Immediate apparent power delivered (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'totalApparentPower', reportable: true, onlyProducer: false, exposes: e.numeric('SINSTS', ea.STATE).withUnit('VA').withProperty('total_apparent_power').withDescription('Total immediate apparent power delivered')},
    {cluster: clustersDef._0x0B04, att: 'averageRmsVoltageMeasPeriodPhC', reportable: true, onlyProducer: false, exposes: e.numeric('UMOY3', ea.STATE).withUnit('V').withProperty('average_rms_voltage_meas_period_ph_c').withDescription('Average RMS voltage (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'averageRmsVoltageMeasurePeriodPhB', reportable: true, onlyProducer: false, exposes: e.numeric('UMOY2', ea.STATE).withUnit('V').withProperty('average_rms_voltage_measure_period_ph_b').withDescription('Average RMS voltage (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentPhB', reportable: true, onlyProducer: false, exposes: e.numeric('IRMS2', ea.STATE).withUnit('A').withProperty('rms_current_ph_b').withDescription('RMS current (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentPhC', reportable: true, onlyProducer: false, exposes: e.numeric('IRMS3', ea.STATE).withUnit('A').withProperty('rms_current_ph_c').withDescription('RMS current (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'rmsVoltagePhB', reportable: true, onlyProducer: false, exposes: e.numeric('URMS2', ea.STATE).withUnit('V').withProperty('rms_voltage_ph_b').withDescription('RMS voltage (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'rmsVoltagePhC', reportable: true, onlyProducer: false, exposes: e.numeric('URMS3', ea.STATE).withUnit('V').withProperty('rms_voltage_ph_c').withDescription('RMS voltage (phase 3)')},
    {cluster: clustersDef._0xFF66, att: 'drawnVAMaxN1', reportable: false, onlyProducer: false, exposes: e.numeric('SMAXN1-1', ea.STATE).withUnit('VA').withProperty('drawn_v_a_max_n1').withDescription('Apparent power max. draw-off n-1 (phase 1)')},
    {cluster: clustersDef._0xFF66, att: 'drawnVAMaxN1P2', reportable: false, onlyProducer: false, exposes: e.numeric('SMAXN2-1', ea.STATE).withUnit('VA').withProperty('drawn_v_a_max_n1_p2').withDescription('Apparent power max. draw-off n-1 (phase 2)')},
    {cluster: clustersDef._0xFF66, att: 'drawnVAMaxN1P3', reportable: false, onlyProducer: false, exposes: e.numeric('SMAXN3-1', ea.STATE).withUnit('VA').withProperty('drawn_v_a_max_n1_p3').withDescription('Apparent power max. draw-off n-1 (phase 3)')},
].map((x) => {
    return {...x, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard};
});

const legacyData = [
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'activeRegisterTierDelivered', reportable: false, onlyProducer: false, exposes: e.text('PTEC', ea.STATE).withProperty('active_register_tier_delivered').withDescription('Current pricing period')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentSummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('BASE', ea.STATE).withUnit('kWh').withProperty('current_summ_delivered').withDescription('Base index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier1SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('BBRHCJB', ea.STATE).withUnit('kWh').withProperty('current_tier1_summ_delivered').withDescription('BBRHCJB index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier1SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EJPHN', ea.STATE).withUnit('kWh').withProperty('current_tier1_summ_delivered').withDescription('EJPHN index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier1SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('HCHC', ea.STATE).withUnit('kWh').withProperty('current_tier1_summ_delivered').withDescription('HCHC index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier2SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('BBRHPJB', ea.STATE).withUnit('kWh').withProperty('current_tier2_summ_delivered').withDescription('BBRHPJB index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier2SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('EJPHPM', ea.STATE).withUnit('kWh').withProperty('current_tier2_summ_delivered').withDescription('EJPHPM index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier2SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('HCHP', ea.STATE).withUnit('kWh').withProperty('current_tier2_summ_delivered').withDescription('HCHP index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier3SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('BBRHCJW', ea.STATE).withUnit('kWh').withProperty('current_tier3_summ_delivered').withDescription('BBRHCJW index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier4SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('BBRHPJW', ea.STATE).withUnit('kWh').withProperty('current_tier4_summ_delivered').withDescription('BBRHPJW index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier5SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('BBRHCJR', ea.STATE).withUnit('kWh').withProperty('current_tier5_summ_delivered').withDescription('BBRHCJR index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'currentTier6SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, exposes: e.numeric('BBRHPJR', ea.STATE).withUnit('kWh').withProperty('current_tier6_summ_delivered').withDescription('BBRHPJR index')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0702, att: 'meterSerialNumber', reportable: false, onlyProducer: false, exposes: e.text('ADCO', ea.STATE).withProperty('meter_serial_number').withDescription('Serial Number')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0B01, att: 'availablePower', reportable: false, onlyProducer: false, exposes: e.numeric('ISOUSC', ea.STATE).withUnit('A').withProperty('available_power').withDescription('Subscribed intensity level')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0x0B04, att: 'apparentPower', reportable: true, onlyProducer: false, exposes: e.numeric('PAPP', ea.STATE).withUnit('VA').withProperty('apparent_power').withDescription('Apparent power')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0xFF66, att: 'currentTarif', reportable: false, onlyProducer: false, exposes: e.text('OPTARIF', ea.STATE).withProperty('current_tarif').withDescription('Tarif option')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0xFF66, att: 'motDEtat', reportable: false, onlyProducer: false, exposes: e.text('MOTDETAT', ea.STATE).withProperty('MOTDETAT').withDescription('Meter Status Word')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0xFF66, att: 'scheduleHPHC', reportable: false, onlyProducer: false, exposes: e.numeric('HHPHC', ea.STATE).withProperty('schedule_h_p_h_c').withDescription('Schedule HPHC')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0xFF66, att: 'startNoticeEJP', reportable: true, onlyProducer: false, exposes: e.numeric('PEJP', ea.STATE).withUnit('min').withProperty('start_notice_e_j_p').withDescription('EJP start notice (30min)')},
    {linkyPhase: linkyPhaseDef.all, cluster: clustersDef._0xFF66, att: 'tomorrowColor', reportable: true, onlyProducer: false, exposes: e.text('DEMAIN', ea.STATE).withProperty('tomorrow_color').withDescription('Tomorrow color')},
    {linkyPhase: linkyPhaseDef.single, cluster: clustersDef._0x0B04, att: 'rmsCurrent', reportable: true, onlyProducer: false, exposes: e.numeric('IINST', ea.STATE).withUnit('A').withProperty('rms_current').withDescription('RMS current')},
    {linkyPhase: linkyPhaseDef.single, cluster: clustersDef._0x0B04, att: 'rmsCurrentMax', reportable: false, onlyProducer: false, exposes: e.numeric('IMAX', ea.STATE).withUnit('A').withProperty('rms_current_max').withDescription('RMS current peak')},
    {linkyPhase: linkyPhaseDef.single, cluster: clustersDef._0xFF66, att: 'warnDPS', reportable: true, onlyProducer: false, exposes: e.numeric('ADPS', ea.STATE).withUnit('A').withProperty('warn_d_p_s').withDescription('Subscribed Power Exceeded Warning')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0x0B04, att: 'activePowerMax', reportable: false, onlyProducer: false, exposes: e.numeric('PMAX', ea.STATE).withUnit('W').withProperty('active_power_max').withDescription('Three-phase power peak')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0x0B04, att: 'rmsCurrent', reportable: true, onlyProducer: false, exposes: e.numeric('IINST1', ea.STATE).withUnit('A').withProperty('rms_current').withDescription('RMS current (phase 1)')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0x0B04, att: 'rmsCurrentMax', reportable: false, onlyProducer: false, exposes: e.numeric('IMAX1', ea.STATE).withUnit('A').withProperty('rms_current_max').withDescription('RMS current peak (phase 1)')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0x0B04, att: 'rmsCurrentMaxPhB', reportable: false, onlyProducer: false, exposes: e.numeric('IMAX2', ea.STATE).withUnit('A').withProperty('rms_current_max_ph_b').withDescription('RMS current peak (phase 2)')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0x0B04, att: 'rmsCurrentMaxPhC', reportable: false, onlyProducer: false, exposes: e.numeric('IMAX3', ea.STATE).withUnit('A').withProperty('rms_current_max_ph_c').withDescription('RMS current peak (phase 3)')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0x0B04, att: 'rmsCurrentPhB', reportable: true, onlyProducer: false, exposes: e.numeric('IINST2', ea.STATE).withUnit('A').withProperty('rms_current_ph_b').withDescription('RMS current (phase 2)')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0x0B04, att: 'rmsCurrentPhC', reportable: true, onlyProducer: false, exposes: e.numeric('IINST3', ea.STATE).withUnit('A').withProperty('rms_current_ph_c').withDescription('RMS current (phase 3)')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0xFF66, att: 'presencePotential', reportable: false, onlyProducer: false, exposes: e.numeric('PPOT', ea.STATE).withProperty('presence_potential').withDescription('Presence of potentials')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0xFF66, att: 'warnDIR1', reportable: true, onlyProducer: false, exposes: e.numeric('ADIR1', ea.STATE).withUnit('A').withProperty('warn_d_i_r1').withDescription('Over Current Warning (phase 1)')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0xFF66, att: 'warnDIR2', reportable: true, onlyProducer: false, exposes: e.numeric('ADIR2', ea.STATE).withUnit('A').withProperty('warn_d_i_r2').withDescription('Over Current Warning (phase 2)')},
    {linkyPhase: linkyPhaseDef.three, cluster: clustersDef._0xFF66, att: 'warnDIR3', reportable: true, onlyProducer: false, exposes: e.numeric('ADIR3', ea.STATE).withUnit('A').withProperty('warn_d_i_r3').withDescription('Over Current Warning (phase 3)')},
].map((x) => {
    return {...x, linkyMode: linkyModeDef.legacy};
});

const exposedData = [allPhaseData, singlePhaseData, threePhasesData, legacyData].flat();

function getCurrentConfig(device: Zh.Device, options: KeyValue) {
    let endpoint: Zh.Endpoint;
    try {
        endpoint = device.getEndpoint(1);
    } catch (error) {
        logger.debug(error, NS);
    }
    // @ts-expect-error
    function getConfig(targetOption, bitLinkyMode, valueTrue, valueFalse) {
        const valueDefault = valueFalse;
        if (options && options.hasOwnProperty(targetOption) && options[targetOption] != 'auto') {
            if (options[targetOption] === 'true' || options[targetOption] === 'false') {
                return options[targetOption] === 'true'; // special case for production
            }
            return options[targetOption];
        }

        let lMode;
        try {
            lMode = endpoint.clusters[clustersDef._0xFF66].attributes['linkyMode'];
            // @ts-expect-error
            lMode.raiseError; // raise if undefined
            // @ts-expect-error
            return (lMode >> bitLinkyMode & 1) == 1 ? valueTrue : valueFalse;
        } catch (err) {
            logger.warning(`Was not able to detect the Linky ` + targetOption + `. Default to ` + valueDefault, NS);
            return valueDefault; // default value in the worst case
        }
    }

    const linkyMode = getConfig('linky_mode', 0, linkyModeDef.standard, linkyModeDef.legacy);

    const linkyPhase = getConfig('energy_phase', 1, linkyPhaseDef.three, linkyPhaseDef.single);

    let linkyProduction = false; // In historique we can't be producer

    if (linkyMode == linkyModeDef.standard) {
        linkyProduction = getConfig('production', 2, true, false);
    }

    // Main filter
    let myExpose = exposedData
        .filter((e) => e.linkyMode == linkyMode && (e.linkyPhase == linkyPhase || e.linkyPhase == linkyPhaseDef.all) && (linkyProduction || !e.onlyProducer));

    // Filter even more, based on our current tarif
    let currentTarf = '';

    if (options && options.hasOwnProperty('tarif') && options['tarif'] != 'auto') {
        currentTarf = Object.entries(tarifsDef).find(([k, v]) => (v.fname == options['tarif']))[1].currentTarf;
    } else {
        try {
            const lixAtts = endpoint.clusters[clustersDef._0xFF66].attributes;
            lixAtts.raiseIfEmpty;
            // @ts-expect-error
            currentTarf = fzLocal.lixee_private_fz.convert({}, {data: lixAtts}).current_tarif;
        } catch (error) {
            logger.warning(`Not able to detect the current tarif. Not filtering any expose...`, NS);
        }
    }

    logger.debug(`zlinky config: ` + linkyMode + `, ` + linkyPhase + `, ` + linkyProduction.toString() + `, ` + currentTarf, NS);

    switch (currentTarf) {
    case linkyMode == linkyModeDef.legacy && tarifsDef.histo_BASE.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.histo_BASE.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.legacy && tarifsDef.histo_HCHP.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.histo_HCHP.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.legacy && tarifsDef.histo_EJP.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.histo_EJP.excluded.includes(a.exposes.name));
        break;
    // @ts-expect-error
    case linkyMode == linkyModeDef.legacy && currentTarf && currentTarf.startsWith(tarifsDef.histo_BBR.currentTarf):
        myExpose = myExpose.filter((a) => !tarifsDef.histo_BBR.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_SEM_WE_LUNDI.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_SEM_WE_LUNDI.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_SEM_WE_MERCR.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_SEM_WE_MERCR.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_SEM_WE_VENDR.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_SEM_WE_VENDR.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_HPHC.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_HPHC.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_BASE.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_BASE.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_H_SUPER_CREUSES.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_H_SUPER_CREUSES.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_TEMPO.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_TEMPO.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_ZEN_FLEX.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_ZEN_FLEX.excluded.includes(a.exposes.name));
        break;
    default:
        break;
    }

    // Filter exposed attributes with user whitelist
    if (options && options.hasOwnProperty('tic_command_whitelist')) {
        // @ts-expect-error
        const tic_commands_str = options['tic_command_whitelist'].toUpperCase();
        if (tic_commands_str !== 'ALL') {
            // @ts-expect-error
            const tic_commands = tic_commands_str.split(',').map((a) => a.trim());
            myExpose = myExpose.filter((a) => tic_commands.includes(a.exposes.name));
        }
    }

    return myExpose;
}
const definitions: Definition[] = [
    {
        zigbeeModel: ['ZLinky_TIC', 'ZLinky_TIC\u0000'],
        model: 'ZLinky_TIC',
        vendor: 'LiXee',
        description: 'Lixee ZLinky',
        fromZigbee: [fzLocal.lixee_metering, fz.meter_identification, fzLocal.lixee_ha_electrical_measurement, fzLocal.lixee_private_fz],
        toZigbee: [],
        exposes: (device, options) => {
            // docs generation
            let exposes;
            if (device == null && options == null) {
                exposes = exposedData.map((e) => e.exposes)
                    .filter((value, index, self) =>
                        index === self.findIndex((t) => (
                            t.property === value.property // Remove duplicates
                        )),
                    );
            } else {
                exposes = getCurrentConfig(device, options).map((e) => e.exposes);
            }

            exposes.push(e.linkquality());
            return exposes;
        },
        options: [
            exposes.options.measurement_poll_interval(),
            e.enum(`linky_mode`, ea.SET, ['auto', linkyModeDef.legacy, linkyModeDef.standard])
                .withDescription(`Counter with TIC in mode standard or historique. May require restart (default: auto)`),
            e.enum(`energy_phase`, ea.SET, ['auto', linkyPhaseDef.single, linkyPhaseDef.three])
                .withDescription(`Power with single or three phase. May require restart (default: auto)`),
            e.enum(`production`, ea.SET, ['auto', 'true', 'false']).withDescription(`If you produce energy back to the grid (works ONLY when linky_mode: ${linkyModeDef.standard}, default: auto)`),
            e.enum(`tarif`, ea.SET, [...Object.entries(tarifsDef).map(([k, v]) => (v.fname)), 'auto'])
                .withDescription(`Overrides the automatic current tarif. This option will exclude unnecessary attributes. Open a issue to support more of them. Default: auto`),
            exposes.options.precision(`kWh`),
            e.numeric(`measurement_poll_chunk`, ea.SET).withValueMin(1).withDescription(`During the poll, request multiple exposes to the Zlinky at once for reducing Zigbee network overload. Too much request at once could exceed device limit. Requires Z2M restart. Default: 1`),
            e.text(`tic_command_whitelist`, ea.SET).withDescription(`List of TIC commands to be exposed (separated by comma). Reconfigure device after change. Default: all`),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            await reporting.bind(endpoint, coordinatorEndpoint, [
                clustersDef._0x0702, /* seMetering */
                clustersDef._0x0B01, /* haMeterIdentification */
                clustersDef._0x0B04, /* haElectricalMeasurement */
                clustersDef._0xFF66, /* liXeePrivate */
            ]);

            await endpoint.read('liXeePrivate', ['linkyMode', 'currentTarif'], {manufacturerCode: null})
                .catch((e) => {
                    // https://github.com/Koenkk/zigbee2mqtt/issues/11674
                    logger.warning(`Failed to read zigbee attributes: ${e}`, NS);
                });

            const configReportings = [];
            const suscribeNew = getCurrentConfig(device, {}).filter((e) => e.reportable);

            const unsuscribe = endpoint.configuredReportings
                .filter((e) => !suscribeNew.some((r) => e.cluster.name == r.cluster && e.attribute.name == r.att));
            // Unsuscribe reports that doesn't correspond with the current config
            (await Promise.allSettled(unsuscribe.map((e) => endpoint.configureReporting(e.cluster.name, reporting.payload(e.attribute.name, e.minimumReportInterval, 65535, e.reportableChange), {manufacturerCode: null}))))
                .filter((e) => e.status == 'rejected')
                .forEach((e) => {
                    // @ts-expect-error
                    throw e.reason;
                });

            for (const e of suscribeNew) {
                let params = {
                    att: e.att,
                    min: repInterval.MINUTE,
                    max: repInterval.MINUTES_15,
                    change: 1,
                };
                // Override reportings
                if (e.hasOwnProperty('report')) {
                    // @ts-expect-error
                    params = {...params, ...e.report};
                }
                configReportings.push(endpoint
                    .configureReporting(
                        e.cluster, reporting.payload(params.att, params.min, params.max, params.change),
                        {manufacturerCode: null}),
                );
            }
            (await Promise.allSettled(configReportings))
                .filter((e) => e.status == 'rejected')
                .forEach((e) => {
                    // @ts-expect-error
                    throw e.reason;
                });
        },
        ota: ota.lixee,
        onEvent: async (type, data, device, options) => {
            const endpoint = device.getEndpoint(1);
            if (type === 'start') {
                endpoint.read('liXeePrivate', ['linkyMode', 'currentTarif'], {manufacturerCode: null})
                    .catch((e) => {
                        // https://github.com/Koenkk/zigbee2mqtt/issues/11674
                        logger.warning(`Failed to read zigbee attributes: ${e}`, NS);
                    });
            } else if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 600;
                utils.assertNumber(seconds);
                const measurement_poll_chunk = options && options.measurement_poll_chunk ? options.measurement_poll_chunk : 4;
                utils.assertNumber(measurement_poll_chunk);

                const setTimer = () => {
                    const timer = setTimeout(async () => {
                        try {
                            const currentExposes = getCurrentConfig(device, options)
                                .filter((e) => !endpoint.configuredReportings.some((r) => r.cluster.name == e.cluster && r.attribute.name == e.att));

                            for (const key in clustersDef) {
                                if (Object.hasOwnProperty.call(clustersDef, key)) {
                                    // @ts-expect-error
                                    const cluster = clustersDef[key];
                                    const targ = currentExposes.filter((e) => e.cluster == cluster).map((e) => e.att);
                                    if (targ.length) {
                                        let i; let j;
                                        // Split array by chunks
                                        for (i = 0, j = targ.length; i < j; i += measurement_poll_chunk) {
                                            await endpoint
                                                .read(cluster, targ.slice(i, i + measurement_poll_chunk), {manufacturerCode: null})
                                                .catch((e) => {
                                                    // https://github.com/Koenkk/zigbee2mqtt/issues/11674
                                                    logger.warning(`Failed to read zigbee attributes: ${e}`, NS);
                                                });
                                        }
                                    }
                                }
                            }
                        } catch (error) {/* Do nothing*/}
                        setTimer();
                    }, seconds * 1000);
                    globalStore.putValue(device, 'interval', timer);
                };
                setTimer();
            }
        },
    },
    {
        zigbeeModel: ['ZiPulses'],
        model: 'ZiPulses',
        vendor: 'LiXee',
        description: 'Lixee ZiPulses',
        fromZigbee: [fz.battery, fz.temperature, fz.metering, fzZiPulses],
        toZigbee: [tzSeMetering],
        exposes: [e.battery(), e.battery_voltage(), e.temperature(),
            e.numeric('multiplier', ea.STATE_SET).withValueMin(1).withValueMax(1000).withDescription('It is necessary to press the link button to update'),
            e.numeric('divisor', ea.STATE_SET).withValueMin(1).withValueMax(1000).withDescription('It is necessary to press the link button to update'),
            e.enum('unitOfMeasure', ea.STATE_SET, unitsZiPulses).withDescription('It is necessary to press the link button to update'),
            e.numeric('energy', ea.STATE),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'seMetering', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await endpoint.read('seMetering', ['divisor', 'unitOfMeasure', 'multiplier']);
        },
    },
];

export default definitions;
module.exports = definitions;
