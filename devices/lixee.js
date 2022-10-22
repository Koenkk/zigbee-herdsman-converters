/* eslint-disable camelcase */
/* eslint-disable max-len */
'use strict';
const exposes = require('../lib/exposes');
const globalStore = require('../lib/store');
const {repInterval} = require('../lib/constants');
const reporting = require('../lib/reporting');
const fz = require('../converters/fromZigbee');
const ea = exposes.access;
const e = exposes.presets;
const utils = require('../lib/utils');
const ota = require('../lib/ota');
const {Buffer} = require('buffer');

const fzLocal = {
    lixee_ha_electrical_measurement: {
        cluster: 'haElectricalMeasurement',
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
                const at_snake = at.split(/(?=[A-Z])/).join('_').toLowerCase();
                if (msg.data[at] != null) {
                    result[at_snake] = msg.data[at];
                }
            }
            return result;
        },
    },
    lixee_private_fz: {
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
                    case 'activeEnerfyOutD01':
                    case 'activeEnerfyOutD02':
                    case 'activeEnerfyOutD03':
                    case 'activeEnerfyOutD04':
                        val = utils.precisionRound(val / 1000, kWh_p); // from Wh to kWh
                        break;
                    }
                    result[at_snake] = val;
                }
            }
            return result;
        },
    },
    lixee_metering: {
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
                        result[at_snake] = utils.precisionRound(((val[0] << 32) + val[1]) / 1000, kWh_p); // Wh to kWh
                        break;
                    }
                }
            }
            // TODO: Check if all tarifs which doesn't publish "currentSummDelivered" use just Tier1 & Tier2
            if (result['current_summ_delivered'] == 0 &&
            (result['current_tier1_summ_delivered'] > 0 || result['current_tier2_summ_delivered'] > 0)) {
                result['current_summ_delivered'] = result['current_tier1_summ_delivered'] + result['current_tier2_summ_delivered'];
            }
            return result;
        },
    },
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
        ]},
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
        ]},
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
        ]},
    histo_BBR: {
        fname: 'Historique - BBR',
        currentTarf: 'BBR', excluded: [
            'BASE',
            'HCHC',
            'HCHP',
            'EJPHN',
            'EJPHPM',
            'PEJP',
        ]},
    stand_SEM_WE_MERCR: {
        fname: 'Standard - Sem WE Mercredi',
        currentTarf: 'SEM WE MERCREDI', excluded: [
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
        ]},
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
        ]},
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
        ]},
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
const exposedData = [
    // Historique
    {cluster: clustersDef._0x0702, att: 'meterSerialNumber', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.text('ADCO', ea.STATE).withProperty('meter_serial_number').withDescription('Serial Number')},
    {cluster: clustersDef._0x0702, att: 'currentSummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BASE', ea.STATE).withUnit('kWh').withProperty('current_summ_delivered').withDescription('Base index')},
    {cluster: clustersDef._0xFF66, att: 'currentTarif', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.text('OPTARIF', ea.STATE).withProperty('current_tarif').withDescription('Tarif option')},
    {cluster: clustersDef._0x0B01, att: 'availablePower', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ISOUSC', ea.STATE).withUnit('A').withProperty('available_power').withDescription('Subscribed intensity level')},
    {cluster: clustersDef._0x0702, att: 'currentTier1SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('HCHC', ea.STATE).withUnit('kWh').withProperty('current_tier1_summ_delivered').withDescription('HCHC index')},
    {cluster: clustersDef._0x0702, att: 'currentTier2SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('HCHP', ea.STATE).withUnit('kWh').withProperty('current_tier2_summ_delivered').withDescription('HCHP index')},
    {cluster: clustersDef._0x0702, att: 'currentTier1SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('EJPHN', ea.STATE).withUnit('kWh').withProperty('current_tier1_summ_delivered').withDescription('EJPHN index')},
    {cluster: clustersDef._0x0702, att: 'currentTier2SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('EJPHPM', ea.STATE).withUnit('kWh').withProperty('current_tier2_summ_delivered').withDescription('EJPHPM index')},
    {cluster: clustersDef._0x0702, att: 'currentTier1SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHCJB', ea.STATE).withUnit('kWh').withProperty('current_tier1_summ_delivered').withDescription('BBRHCJB index')},
    {cluster: clustersDef._0x0702, att: 'currentTier2SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHPJB', ea.STATE).withUnit('kWh').withProperty('current_tier2_summ_delivered').withDescription('BBRHPJB index')},
    {cluster: clustersDef._0x0702, att: 'currentTier3SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHCJW', ea.STATE).withUnit('kWh').withProperty('current_tier3_summ_delivered').withDescription('BBRHCJW index')},
    {cluster: clustersDef._0x0702, att: 'currentTier4SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHPJW', ea.STATE).withUnit('kWh').withProperty('current_tier4_summ_delivered').withDescription('BBRHPJW index')},
    {cluster: clustersDef._0x0702, att: 'currentTier5SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHCJR', ea.STATE).withUnit('kWh').withProperty('current_tier5_summ_delivered').withDescription('BBRHCJR index')},
    {cluster: clustersDef._0x0702, att: 'currentTier6SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHPJR', ea.STATE).withUnit('kWh').withProperty('current_tier6_summ_delivered').withDescription('BBRHPJR index')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrent', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IINST', ea.STATE).withUnit('A').withProperty('rms_current').withDescription('RMS current')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrent', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IINST1', ea.STATE).withUnit('A').withProperty('rms_current').withDescription('RMS current (phase 1)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentPhB', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IINST2', ea.STATE).withUnit('A').withProperty('rms_current_ph_b').withDescription('RMS current (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentPhC', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IINST3', ea.STATE).withUnit('A').withProperty('rms_current_ph_c').withDescription('RMS current (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentMax', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IMAX', ea.STATE).withUnit('A').withProperty('rms_current_max').withDescription('RMS current peak')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentMax', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IMAX1', ea.STATE).withUnit('A').withProperty('rms_current_max').withDescription('RMS current peak (phase 1)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentMaxPhB', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IMAX2', ea.STATE).withUnit('A').withProperty('rms_current_max_ph_b').withDescription('RMS current peak (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentMaxPhC', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IMAX3', ea.STATE).withUnit('A').withProperty('rms_current_max_ph_c').withDescription('RMS current peak (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'activePowerMax', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('PMAX', ea.STATE).withUnit('W').withProperty('active_power_max').withDescription('Three-phase power peak')},
    {cluster: clustersDef._0x0B04, att: 'apparentPower', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('PAPP', ea.STATE).withUnit('VA').withProperty('apparent_power').withDescription('Apparent power')},
    {cluster: clustersDef._0x0702, att: 'activeRegisterTierDelivered', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.text('PTEC', ea.STATE).withProperty('active_register_tier_delivered').withDescription('Current pricing period')},
    {cluster: clustersDef._0xFF66, att: 'tomorrowColor', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.text('DEMAIN', ea.STATE).withProperty('tomorrow_color').withDescription('Tomorrow color')},
    {cluster: clustersDef._0xFF66, att: 'scheduleHPHC', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('HHPHC', ea.STATE).withProperty('schedule_h_p_h_c').withDescription('Schedule HPHC')},
    {cluster: clustersDef._0xFF66, att: 'presencePotential', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('PPOT', ea.STATE).withProperty('presence_potential').withDescription('Presence of potentials')},
    {cluster: clustersDef._0xFF66, att: 'startNoticeEJP', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('PEJP', ea.STATE).withUnit('min').withProperty('start_notice_e_j_p').withDescription('EJP start notice (30min)')},
    {cluster: clustersDef._0xFF66, att: 'warnDPS', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ADPS', ea.STATE).withUnit('A').withProperty('warn_d_p_s').withDescription('Subscribed Power Exceeded Warning')},
    {cluster: clustersDef._0xFF66, att: 'warnDIR1', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ADIR1', ea.STATE).withUnit('A').withProperty('warn_d_i_r1').withDescription('Over Current Warning (phase 1)')},
    {cluster: clustersDef._0xFF66, att: 'warnDIR2', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ADIR2', ea.STATE).withUnit('A').withProperty('warn_d_i_r2').withDescription('Over Current Warning (phase 2)')},
    {cluster: clustersDef._0xFF66, att: 'warnDIR3', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ADIR3', ea.STATE).withUnit('A').withProperty('warn_d_i_r3').withDescription('Over Current Warning (phase 3)')},
    {cluster: clustersDef._0x0702, att: 'meterSerialNumber', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('ADSC', ea.STATE).withProperty('meter_serial_number').withDescription('Serial Number')},
    {cluster: clustersDef._0xFF66, att: 'currentTarif', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('NGTF', ea.STATE).withProperty('current_tarif').withDescription('Supplier pricing schedule name')},
    {cluster: clustersDef._0xFF66, att: 'currentPrice', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('LTARF', ea.STATE).withProperty('current_price').withDescription('Current supplier price label')},
    {cluster: clustersDef._0xFF66, att: 'currentIndexTarif', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('NTARF', ea.STATE).withProperty('current_index_tarif').withDescription('Current tariff index number')},
    {cluster: clustersDef._0x0B01, att: 'softwareRevision', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('VTIC', ea.STATE).withProperty('software_revision').withDescription('Customer tele-information protocol version')},
    {cluster: clustersDef._0xFF66, att: 'currentDate', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('DATE', ea.STATE).withProperty('current_date').withDescription('Current date and time')},
    {cluster: clustersDef._0x0702, att: 'currentSummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EAST', ea.STATE).withUnit('kWh').withProperty('current_summ_delivered').withDescription('Total active power delivered')},
    {cluster: clustersDef._0x0702, att: 'currentTier1SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF01', ea.STATE).withUnit('kWh').withProperty('current_tier1_summ_delivered').withDescription('Total provider active power delivered (index 01)')},
    {cluster: clustersDef._0x0702, att: 'currentTier2SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF02', ea.STATE).withUnit('kWh').withProperty('current_tier2_summ_delivered').withDescription('Total provider active power delivered (index 02)')},
    {cluster: clustersDef._0x0702, att: 'currentTier3SummDelivered', reportable: true, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF03', ea.STATE).withUnit('kWh').withProperty('current_tier3_summ_delivered').withDescription('Total provider active power delivered (index 03)')},
    {cluster: clustersDef._0x0702, att: 'currentTier4SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF04', ea.STATE).withUnit('kWh').withProperty('current_tier4_summ_delivered').withDescription('Total provider active power delivered (index 04)')},
    {cluster: clustersDef._0x0702, att: 'currentTier5SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF05', ea.STATE).withUnit('kWh').withProperty('current_tier5_summ_delivered').withDescription('Total provider active power delivered (index 05)')},
    {cluster: clustersDef._0x0702, att: 'currentTier6SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF06', ea.STATE).withUnit('kWh').withProperty('current_tier6_summ_delivered').withDescription('Total provider active power delivered (index 06)')},
    {cluster: clustersDef._0x0702, att: 'currentTier7SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF07', ea.STATE).withUnit('kWh').withProperty('current_tier7_summ_delivered').withDescription('Total provider active power delivered (index 07)')},
    {cluster: clustersDef._0x0702, att: 'currentTier8SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF08', ea.STATE).withUnit('kWh').withProperty('current_tier8_summ_delivered').withDescription('Total provider active power delivered (index 08)')},
    {cluster: clustersDef._0x0702, att: 'currentTier9SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF09', ea.STATE).withUnit('kWh').withProperty('current_tier9_summ_delivered').withDescription('Total provider active power delivered (index 09)')},
    {cluster: clustersDef._0x0702, att: 'currentTier10SummDelivered', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF10', ea.STATE).withUnit('kWh').withProperty('current_tier10_summ_delivered').withDescription('Total provider active power delivered (index 10)')},
    {cluster: clustersDef._0xFF66, att: 'activeEnerfyOutD01', reportable: true, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASD01', ea.STATE).withUnit('kWh').withProperty('active_enerfy_out_d01').withDescription('Active energy withdrawn Distributor (index 01)')},
    {cluster: clustersDef._0xFF66, att: 'activeEnerfyOutD02', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASD02', ea.STATE).withUnit('kWh').withProperty('active_enerfy_out_d02').withDescription('Active energy withdrawn Distributor (index 02)')},
    {cluster: clustersDef._0xFF66, att: 'activeEnerfyOutD03', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASD03', ea.STATE).withUnit('kWh').withProperty('active_enerfy_out_d03').withDescription('Active energy withdrawn Distributor (index 03)')},
    {cluster: clustersDef._0xFF66, att: 'activeEnerfyOutD04', reportable: false, report: {change: 100}, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASD04', ea.STATE).withUnit('kWh').withProperty('active_enerfy_out_d04').withDescription('Active energy withdrawn Distributor (index 04)')},
    {cluster: clustersDef._0x0702, att: 'currentSummReceived', reportable: true, report: {change: 100}, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EAIT', ea.STATE).withUnit('kWh').withProperty('current_summ_received').withDescription('Total active power injected')},
    {cluster: clustersDef._0x0B04, att: 'totalReactivePower', reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('ERQ1', ea.STATE).withUnit('VArh').withProperty('total_reactive_power').withDescription('Total reactive power (Q1)')},
    {cluster: clustersDef._0x0B04, att: 'reactivePower', reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('ERQ2', ea.STATE).withUnit('VArh').withProperty('reactive_power').withDescription('Total reactive power (Q2)')},
    {cluster: clustersDef._0x0B04, att: 'reactivePowerPhB', reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('ERQ3', ea.STATE).withUnit('VArh').withProperty('reactive_power_ph_b').withDescription('Total reactive power (Q3)')},
    {cluster: clustersDef._0x0B04, att: 'reactivePowerPhC', reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('ERQ4', ea.STATE).withUnit('VArh').withProperty('reactive_power_ph_c').withDescription('Total reactive power (Q4)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrent', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('IRMS1', ea.STATE).withUnit('A').withProperty('rms_current').withDescription('RMS current')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentPhB', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('IRMS2', ea.STATE).withUnit('A').withProperty('rms_current_ph_b').withDescription('RMS current (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'rmsCurrentPhC', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('IRMS3', ea.STATE).withUnit('A').withProperty('rms_current_ph_c').withDescription('RMS current (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'rmsVoltage', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('URMS1', ea.STATE).withUnit('V').withProperty('rms_voltage').withDescription('RMS voltage')},
    {cluster: clustersDef._0x0B04, att: 'rmsVoltagePhB', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('URMS2', ea.STATE).withUnit('V').withProperty('rms_voltage_ph_b').withDescription('RMS voltage (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'rmsVoltagePhC', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('URMS3', ea.STATE).withUnit('V').withProperty('rms_voltage_ph_c').withDescription('RMS voltage (phase 3)')},
    {cluster: clustersDef._0x0B01, att: 'availablePower', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('PREF', ea.STATE).withUnit('kVA').withProperty('available_power').withDescription('Apparent power of reference')},
    {cluster: clustersDef._0xFF66, att: 'statusRegister', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('STGE', ea.STATE).withProperty('status_register').withDescription('Register of Statutes')},
    {cluster: clustersDef._0x0B01, att: 'powerThreshold', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('PCOUP', ea.STATE).withUnit('kVA').withProperty('power_threshold').withDescription('Apparent power threshold')},
    {cluster: clustersDef._0xFF66, att: 'injectedVA', reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTI', ea.STATE).withUnit('VA').withProperty('injected_v_a').withDescription('Instantaneous apparent power injected')},
    {cluster: clustersDef._0xFF66, att: 'injectedVAMaxN', reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXIN', ea.STATE).withUnit('VA').withProperty('injected_v_a_max_n').withDescription('Apparent power max. injected n')},
    {cluster: clustersDef._0xFF66, att: 'injectedVAMaxN1', reportable: false, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXIN-1', ea.STATE).withUnit('VA').withProperty('injected_v_a_max_n1').withDescription('Apparent power max. injected n-1')},
    {cluster: clustersDef._0x0B04, att: 'activePower', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('CCASN', ea.STATE).withUnit('W').withProperty('active_power').withDescription('Current point of the active load curve drawn')},
    {cluster: clustersDef._0x0B04, att: 'activePowerPhB', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('CCASN-1', ea.STATE).withUnit('W').withProperty('active_power_ph_b').withDescription('Previous point of the active load curve drawn')},
    {cluster: clustersDef._0xFF66, att: 'injectedActiveLoadN', reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('CCAIN', ea.STATE).withUnit('W').withProperty('injected_active_load_n').withDescription('Point n of the withdrawn active load curve')},
    {cluster: clustersDef._0xFF66, att: 'injectedActiveLoadN1', reportable: false, onlyProducer: true, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('CCAIN-1', ea.STATE).withUnit('W').withProperty('injected_active_load_n1').withDescription('Point n-1 of the withdrawn active load curve')},
    {cluster: clustersDef._0x0B04, att: 'averageRmsVoltageMeasPeriod', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('UMOY1', ea.STATE).withUnit('V').withProperty('average_rms_voltage_meas_period').withDescription('Average RMS voltage (phase 1)')},
    {cluster: clustersDef._0x0B04, att: 'averageRmsVoltageMeasurePeriodPhB', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('UMOY2', ea.STATE).withUnit('V').withProperty('average_rms_voltage_measure_period_ph_b').withDescription('Average RMS voltage (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'averageRmsVoltageMeasPeriodPhC', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('UMOY3', ea.STATE).withUnit('V').withProperty('average_rms_voltage_meas_period_ph_c').withDescription('Average RMS voltage (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'apparentPower', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTS', ea.STATE).withUnit('VA').withProperty('apparent_power').withDescription('Immediate apparent power delivered')},
    {cluster: clustersDef._0x0B04, att: 'apparentPower', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTS1', ea.STATE).withUnit('VA').withProperty('apparent_power').withDescription('Immediate apparent power delivered (phase 1)')},
    {cluster: clustersDef._0x0B04, att: 'apparentPowerPhB', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTS2', ea.STATE).withUnit('VA').withProperty('apparent_power_ph_b').withDescription('Immediate apparent power delivered (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'apparentPowerPhC', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTS3', ea.STATE).withUnit('VA').withProperty('apparent_power_ph_c').withDescription('Immediate apparent power delivered (phase 3)')},
    {cluster: clustersDef._0x0B04, att: 'activePowerMax', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN', ea.STATE).withUnit('VA').withProperty('active_power_max').withDescription('Apparent power delivered peak')},
    {cluster: clustersDef._0x0B04, att: 'activePowerMax', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN1', ea.STATE).withUnit('VA').withProperty('active_power_max').withDescription('Apparent power delivered peak (phase 1)')},
    {cluster: clustersDef._0x0B04, att: 'activePowerMaxPhB', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN2', ea.STATE).withUnit('VA').withProperty('active_power_max_ph_b').withDescription('Apparent power delivered peak (phase 2)')},
    {cluster: clustersDef._0x0B04, att: 'activePowerMaxPhC', reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN3', ea.STATE).withUnit('VA').withProperty('active_power_max_ph_c').withDescription('Apparent power delivered peak (phase 3)')},
    {cluster: clustersDef._0xFF66, att: 'drawnVAMaxN1', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN-1', ea.STATE).withUnit('VA').withProperty('drawn_v_a_max_n1').withDescription('Apparent power max. draw-off n-1')},
    {cluster: clustersDef._0xFF66, att: 'drawnVAMaxN1', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN1-1', ea.STATE).withUnit('VA').withProperty('drawn_v_a_max_n1').withDescription('Apparent power max. draw-off n-1 (phase 1)')},
    {cluster: clustersDef._0xFF66, att: 'drawnVAMaxN1P2', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN2-1', ea.STATE).withUnit('VA').withProperty('drawn_v_a_max_n1_p2').withDescription('Apparent power max. draw-off n-1 (phase 2)')},
    {cluster: clustersDef._0xFF66, att: 'drawnVAMaxN1P3', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN3-1', ea.STATE).withUnit('VA').withProperty('drawn_v_a_max_n1_p3').withDescription('Apparent power max. draw-off n-1 (phase 3)')},
    {cluster: clustersDef._0xFF66, att: 'message1', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('MSG1', ea.STATE).withProperty('message1').withDescription('Message short')},
    {cluster: clustersDef._0xFF66, att: 'message2', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('MSG2', ea.STATE).withProperty('message2').withDescription('Message ultra-short')},
    {cluster: clustersDef._0x0702, att: 'siteId', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('PRM', ea.STATE).withProperty('site_id').withDescription('PRM number')},
    {cluster: clustersDef._0xFF66, att: 'startMobilePoint1', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('DPM1', ea.STATE).withProperty('start_mobile_point1').withDescription('Start mobile point 1')},
    {cluster: clustersDef._0xFF66, att: 'stopMobilePoint1', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('FPM1', ea.STATE).withProperty('stop_mobile_point1').withDescription('Stop mobile point 1')},
    {cluster: clustersDef._0xFF66, att: 'startMobilePoint2', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('DPM2', ea.STATE).withProperty('start_mobile_point2').withDescription('Start mobile point 2')},
    {cluster: clustersDef._0xFF66, att: 'stopMobilePoint2', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('FPM2', ea.STATE).withProperty('stop_mobile_point2').withDescription('Stop mobile point 2')},
    {cluster: clustersDef._0xFF66, att: 'startMobilePoint3', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('DPM3', ea.STATE).withProperty('start_mobile_point3').withDescription('Start mobile point 3')},
    {cluster: clustersDef._0xFF66, att: 'stopMobilePoint3', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('FPM3', ea.STATE).withProperty('stop_mobile_point3').withDescription('Stop mobile point 3')},
    {cluster: clustersDef._0xFF66, att: 'relais', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('RELAIS', ea.STATE).withProperty('relais')},
    {cluster: clustersDef._0xFF66, att: 'daysNumberCurrentCalendar', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('NJOURF', ea.STATE).withProperty('days_number_current_calendar').withDescription('Current day number supplier calendar')},
    {cluster: clustersDef._0xFF66, att: 'daysNumberNextCalendar', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('NJOURF+1', ea.STATE).withProperty('days_number_next_calendar').withDescription('Next day number supplier calendar')},
    {cluster: clustersDef._0xFF66, att: 'daysProfileCurrentCalendar', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('PJOURF+1', ea.STATE).withProperty('days_profile_current_calendar').withDescription('Profile of the next supplier calendar day')},
    {cluster: clustersDef._0xFF66, att: 'daysProfileNextCalendar', reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('PPOINTE1', ea.STATE).withProperty('days_profile_next_calendar').withDescription('Profile of the next check-in day')},
];

function getCurrentConfig(device, options, logger=console) {
    let endpoint;
    try {
        endpoint = device.getEndpoint(1);
    } catch (error) {
        logger.debug(error);
    }

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
            lMode.raiseError; // raise if undefined
            return (lMode >> bitLinkyMode & 1) == 1 ? valueTrue : valueFalse;
        } catch (err) {
            logger.warn(`Was not able to detect the Linky `+ targetOption +`. Default to ` + valueDefault);
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
        currentTarf = Object.entries(tarifsDef).find(( [k, v] ) => (v.fname == options['tarif']))[1].currentTarf;
    } else {
        try {
            const lixAtts = endpoint.clusters[clustersDef._0xFF66].attributes;
            lixAtts.raiseIfEmpty;
            currentTarf = fzLocal.lixee_private_fz.convert({}, {data: lixAtts}).current_tarif;
        } catch (error) {
            logger.warn(`Not able to detect the current tarif. Not filtering any expose...`);
        }
    }

    logger.debug(`zlinky config: ` + linkyMode + `, `+ linkyPhase + `, `+ linkyProduction.toString() +`, `+ currentTarf);

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
    case linkyMode == linkyModeDef.legacy && currentTarf && currentTarf.startsWith(tarifsDef.histo_BBR.currentTarf):
        myExpose = myExpose.filter((a) => !tarifsDef.histo_BBR.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_SEM_WE_MERCR.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_SEM_WE_MERCR.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_HPHC.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_HPHC.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_BASE.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_BASE.excluded.includes(a.exposes.name));
        break;
    default:
        break;
    }

    // Filter exposed attributes with user whitelist
    if (options && options.hasOwnProperty('tic_command_whitelist')) {
        const tic_commands_str = options['tic_command_whitelist'].toUpperCase();
        if (tic_commands_str !== 'ALL') {
            const tic_commands = tic_commands_str.split(',').map((a) => a.trim());
            myExpose = myExpose.filter((a) => tic_commands.includes(a.exposes.name));
        }
    }

    return myExpose;
}
const definition = {
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
        exposes.enum(`linky_mode`, ea.SET, ['auto', linkyModeDef.legacy, linkyModeDef.standard])
            .withDescription(`Counter with TIC in mode standard or historique. May require restart (default: auto)`),
        exposes.enum(`energy_phase`, ea.SET, ['auto', linkyPhaseDef.single, linkyPhaseDef.three])
            .withDescription(`Power with single or three phase. May require restart (default: auto)`),
        exposes.enum(`production`, ea.SET, ['auto', 'true', 'false']).withDescription(`If you produce energy back to the grid (works ONLY when linky_mode: ${linkyModeDef.standard}, default: auto)`),
        exposes.enum(`tarif`, ea.SET, [...Object.entries(tarifsDef).map(( [k, v] ) => (v.fname)), 'auto'])
            .withDescription(`Overrides the automatic current tarif. This option will exclude unnecesary attributes. Open a issue to support more of them. Default: auto`),
        exposes.options.precision(`kWh`),
        exposes.numeric(`measurement_poll_chunk`, ea.SET).withValueMin(1).withDescription(`During the poll, request multiple exposes to the Zlinky at once for reducing Zigbee network overload. Too much request at once could exceed device limit. Requieres Z2M restart. Default: 1`),
        exposes.text(`tic_command_whitelist`, ea.SET).withDescription(`List of TIC commands to be exposed (separated by comma). Reconfigure device after change. Default: all`),
    ],
    configure: async (device, coordinatorEndpoint, logger, options) => {
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
                logger.warn(`Failed to read zigbee attributes: ${e}`);
            });

        const configReportings = [];
        const suscribeNew = getCurrentConfig(device, options, logger).filter((e) => e.reportable);

        const unsuscribe = endpoint.configuredReportings
            .filter((e) => !suscribeNew.some((r) => e.cluster.name == r.cluster && e.attribute.name == r.att));
        // Unsuscribe reports that doesn't correspond with the current config
        (await Promise.allSettled(unsuscribe.map((e) => endpoint.configureReporting(e.cluster.name, reporting.payload(e.attribute.name, e.minimumReportInterval, 65535, e.reportableChange), {manufacturerCode: null}))))
            .filter((e) => e.status == 'rejected')
            .forEach((e) => {
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
                    console.warn(`Failed to read zigbee attributes: ${e}`);
                });
        } else if (type === 'stop') {
            clearInterval(globalStore.getValue(device, 'interval'));
            globalStore.clearValue(device, 'interval');
        } else if (!globalStore.hasValue(device, 'interval')) {
            const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 60;
            const measurement_poll_chunk = options && options.measurement_poll_chunk ? options.measurement_poll_chunk : 1;

            const interval = setInterval(async () => {
                const currentExposes = getCurrentConfig(device, options)
                    .filter((e) => !endpoint.configuredReportings.some((r) => r.cluster.name == e.cluster && r.attribute.name == e.att));

                for (const key in clustersDef) {
                    if (Object.hasOwnProperty.call(clustersDef, key)) {
                        const cluster = clustersDef[key];

                        const targ = currentExposes.filter((e)=> e.cluster == cluster).map((e)=> e.att);
                        if (targ.length) {
                            let i; let j;
                            // Split array by chunks
                            for (i = 0, j = targ.length; i < j; i += measurement_poll_chunk) {
                                await endpoint
                                    .read(cluster, targ.slice(i, i + measurement_poll_chunk), {manufacturerCode: null})
                                    .catch((e) => {
                                        // https://github.com/Koenkk/zigbee2mqtt/issues/11674
                                        console.warn(`Failed to read zigbee attributes: ${e}`);
                                    });
                            }
                        }
                    }
                }
            }, seconds * 1000);
            globalStore.putValue(device, 'interval', interval);
        }
    },
};

module.exports = [definition];
