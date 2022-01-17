/* eslint-disable max-len */
'use strict';
const exposes = require('../lib/exposes');
const globalStore = require('../lib/store');
const {repInterval} = require('../lib/constants');
const reporting = require('../lib/reporting');
const fz = require('../converters/fromZigbee');
const ea = exposes.access;
const ota = require('../lib/ota');


const tarifsDef = {
    histo_BASE: {fname: 'Historique - BASE',
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
    histo_HCHP: {fname: 'Historique - HCHP',
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
    histo_EJP: {fname: 'Historique - EJP',
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
    histo_BBR: {fname: 'Historique - BBR',
        currentTarf: 'BBR', excluded: [
            'BASE',
            'HCHC',
            'HCHP',
            'EJPHN',
            'EJPHPM',
            'PEJP',
        ]},
    stand_SEM_WE_MERCR: {fname: 'Standard - Sem WE Mercredi',
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

const exposedData = [
    // Historique
    {cluster: clustersDef._0x0702, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.text('ADCO', ea.STATE).withProperty('meterSerialNumber').withDescription('Serial Number')},
    {cluster: clustersDef._0x0702, reportable: true, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BASE', ea.STATE).withUnit('kWh').withProperty('currentSummDelivered').withDescription('Base index')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.text('OPTARIF', ea.STATE).withProperty('currentTarif').withDescription('Tarif option')},
    {cluster: clustersDef._0x0B01, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ISOUSC', ea.STATE).withUnit('A').withProperty('availablePower').withDescription('Subscribed intensity level')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('HCHC', ea.STATE).withUnit('kWh').withProperty('currentTier1SummDelivered').withDescription('HCHC index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('HCHP', ea.STATE).withUnit('kWh').withProperty('currentTier2SummDelivered').withDescription('HCHP index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('EJPHN', ea.STATE).withUnit('kWh').withProperty('currentTier1SummDelivered').withDescription('EJPHN index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('EJPHPM', ea.STATE).withUnit('kWh').withProperty('currentTier2SummDelivered').withDescription('EJPHPM index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHCJB', ea.STATE).withUnit('kWh').withProperty('currentTier1SummDelivered').withDescription('BBRHCJB index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHPJB', ea.STATE).withUnit('kWh').withProperty('currentTier2SummDelivered').withDescription('BBRHPJB index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHCJW', ea.STATE).withUnit('kWh').withProperty('currentTier3SummDelivered').withDescription('BBRHCJW index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHPJW', ea.STATE).withUnit('kWh').withProperty('currentTier4SummDelivered').withDescription('BBRHPJW index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHCJR', ea.STATE).withUnit('kWh').withProperty('currentTier5SummDelivered').withDescription('BBRHCJR index')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('BBRHPJR', ea.STATE).withUnit('kWh').withProperty('currentTier6SummDelivered').withDescription('BBRHPJR index')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IINST', ea.STATE).withUnit('A').withProperty('rmsCurrent').withDescription('RMS current')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IINST1', ea.STATE).withUnit('A').withProperty('rmsCurrent').withDescription('RMS current (phase 1)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IINST2', ea.STATE).withUnit('A').withProperty('rmsCurrentPhB').withDescription('RMS current (phase 2)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IINST3', ea.STATE).withUnit('A').withProperty('rmsCurrentPhC').withDescription('RMS current (phase 3)')},
    {cluster: clustersDef._0x0B04, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IMAX', ea.STATE).withUnit('A').withProperty('rmsCurrentMax').withDescription('RMS current peak')},
    {cluster: clustersDef._0x0B04, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IMAX1', ea.STATE).withUnit('A').withProperty('rmsCurrentMax').withDescription('RMS current peak (phase 1)')},
    {cluster: clustersDef._0x0B04, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IMAX2', ea.STATE).withUnit('A').withProperty('rmsCurrentMaxPhB').withDescription('RMS current peak (phase 2)')},
    {cluster: clustersDef._0x0B04, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('IMAX3', ea.STATE).withUnit('A').withProperty('rmsCurrentMaxPhC').withDescription('RMS current peak (phase 3)')},
    {cluster: clustersDef._0x0B04, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('PMAX', ea.STATE).withUnit('W').withProperty('activePowerMax').withDescription('Three-phase power peak')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('PAPP', ea.STATE).withUnit('VA').withProperty('apparentPower').withDescription('Apparent power')},
    {cluster: clustersDef._0x0702, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.text('PTEC', ea.STATE).withProperty('activeRegisterTierDelivered').withDescription('Current pricing period')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.text('DEMAIN', ea.STATE).withProperty('tomorrowColor').withDescription('Tomorrow color')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('HHPHC', ea.STATE).withProperty('scheduleHPHC').withDescription('Schedule HPHC')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('PPOT', ea.STATE).withProperty('presencePotential').withDescription('Presence of potentials')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('PEJP', ea.STATE).withUnit('min').withProperty('startNoticeEJP').withDescription('EJP start notice (30min)')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ADPS', ea.STATE).withUnit('A').withProperty('warnDPS').withDescription('Subscribed Power Exceeded Warning')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ADIR1', ea.STATE).withUnit('A').withProperty('warnDIR1').withDescription('Over Current Warning (phase 1)')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ADIR2', ea.STATE).withUnit('A').withProperty('warnDIR2').withDescription('Over Current Warning (phase 2)')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.legacy, exposes: exposes.numeric('ADIR3', ea.STATE).withUnit('A').withProperty('warnDIR3').withDescription('Over Current Warning (phase 3)')},
    {cluster: clustersDef._0x0702, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('ADSC', ea.STATE).withProperty('meterSerialNumber').withDescription('Serial Number')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('NGTF', ea.STATE).withProperty('currentTarif').withDescription('Supplier pricing schedule name')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('LTARF', ea.STATE).withProperty('currentPrice').withDescription('Current supplier price label')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('NTARF', ea.STATE).withProperty('currentIndexTarif').withDescription('Current tariff index number')},
    {cluster: clustersDef._0x0B01, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('VTIC', ea.STATE).withProperty('softwareRevision').withDescription('Customer tele-information protocol version')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('DATE', ea.STATE).withProperty('currentDate').withDescription('Current date and time')},
    {cluster: clustersDef._0x0702, reportable: true, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EAST', ea.STATE).withUnit('kWh').withProperty('currentSummDelivered').withDescription('Total active power delivered')},
    {cluster: clustersDef._0x0702, reportable: true, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF01', ea.STATE).withUnit('kWh').withProperty('currentTier1SummDelivered').withDescription('Total provider active power delivered (index 01)')},
    {cluster: clustersDef._0x0702, reportable: true, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF02', ea.STATE).withUnit('kWh').withProperty('currentTier2SummDelivered').withDescription('Total provider active power delivered (index 02)')},
    {cluster: clustersDef._0x0702, reportable: true, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF03', ea.STATE).withUnit('kWh').withProperty('currentTier3SummDelivered').withDescription('Total provider active power delivered (index 03)')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF04', ea.STATE).withUnit('kWh').withProperty('currentTier4SummDelivered').withDescription('Total provider active power delivered (index 04)')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF05', ea.STATE).withUnit('kWh').withProperty('currentTier5SummDelivered').withDescription('Total provider active power delivered (index 05)')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF06', ea.STATE).withUnit('kWh').withProperty('currentTier6SummDelivered').withDescription('Total provider active power delivered (index 06)')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF07', ea.STATE).withUnit('kWh').withProperty('currentTier7SummDelivered').withDescription('Total provider active power delivered (index 07)')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF08', ea.STATE).withUnit('kWh').withProperty('currentTier8SummDelivered').withDescription('Total provider active power delivered (index 08)')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF09', ea.STATE).withUnit('kWh').withProperty('currentTier9SummDelivered').withDescription('Total provider active power delivered (index 09)')},
    {cluster: clustersDef._0x0702, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASF10', ea.STATE).withUnit('kWh').withProperty('currentTier10SummDelivered').withDescription('Total provider active power delivered (index 10)')},
    {cluster: clustersDef._0xFF66, reportable: true, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASD01', ea.STATE).withUnit('kWh').withProperty('activeEnerfyOutD01').withDescription('Active energy withdrawn Distributor (index 01)')},
    {cluster: clustersDef._0xFF66, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASD02', ea.STATE).withUnit('kWh').withProperty('activeEnerfyOutD02').withDescription('Active energy withdrawn Distributor (index 02)')},
    {cluster: clustersDef._0xFF66, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASD03', ea.STATE).withUnit('kWh').withProperty('activeEnerfyOutD03').withDescription('Active energy withdrawn Distributor (index 03)')},
    {cluster: clustersDef._0xFF66, reportable: false, reportChange: 100, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EASD04', ea.STATE).withUnit('kWh').withProperty('activeEnerfyOutD04').withDescription('Active energy withdrawn Distributor (index 04)')},
    {cluster: clustersDef._0x0702, reportable: true, reportChange: 100, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('EAIT', ea.STATE).withUnit('kWh').withProperty('currentSummReceived').withDescription('Total active power injected')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('ERQ1', ea.STATE).withUnit('VArh').withProperty('totalReactivePower').withDescription('Total reactive power (Q1)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('ERQ2', ea.STATE).withUnit('VArh').withProperty('reactivePower').withDescription('Total reactive power (Q2)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('ERQ3', ea.STATE).withUnit('VArh').withProperty('reactivePowerPhB').withDescription('Total reactive power (Q3)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('ERQ4', ea.STATE).withUnit('VArh').withProperty('reactivePowerPhC').withDescription('Total reactive power (Q4)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('IRMS1', ea.STATE).withUnit('A').withProperty('rmsCurrent').withDescription('RMS current')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('IRMS2', ea.STATE).withUnit('A').withProperty('rmsCurrentPhB').withDescription('RMS current (phase 2)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('IRMS3', ea.STATE).withUnit('A').withProperty('rmsCurrentPhC').withDescription('RMS current (phase 3)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('URMS1', ea.STATE).withUnit('V').withProperty('rmsVoltage').withDescription('RMS voltage')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('URMS2', ea.STATE).withUnit('V').withProperty('rmsVoltagePhB').withDescription('RMS voltage (phase 2)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('URMS3', ea.STATE).withUnit('V').withProperty('rmsVoltagePhC').withDescription('RMS voltage (phase 3)')},
    {cluster: clustersDef._0x0B01, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('PREF', ea.STATE).withUnit('kVA').withProperty('availablePower').withDescription('Apparent power of reference')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.text('STGE', ea.STATE).withProperty('statusRegister').withDescription('Register of Statutes')},
    {cluster: clustersDef._0x0B01, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('PCOUP', ea.STATE).withUnit('kVA').withProperty('powerThreshold').withDescription('Apparent power threshold')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTI', ea.STATE).withUnit('VA').withProperty('injectedVA').withDescription('Instantaneous apparent power injected')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXIN', ea.STATE).withUnit('VA').withProperty('injectedVAMaxN').withDescription('Apparent power max. injected n')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXIN-1', ea.STATE).withUnit('VA').withProperty('injectedVAMaxN1').withDescription('Apparent power max. injected n-1')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('CCASN', ea.STATE).withUnit('W').withProperty('activePower').withDescription('Current point of the active load curve drawn')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('CCASN-1', ea.STATE).withUnit('W').withProperty('activePowerPhB').withDescription('Previous point of the active load curve drawn')},
    {cluster: clustersDef._0xFF66, reportable: true, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('CCAIN', ea.STATE).withUnit('W').withProperty('injectedActiveLoadN').withDescription('Point n of the withdrawn active load curve')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: true, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('CCAIN-1', ea.STATE).withUnit('W').withProperty('injectedActiveLoadN1').withDescription('Point n-1 of the withdrawn active load curve')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.all, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('UMOY1', ea.STATE).withUnit('V').withProperty('averageRmsVoltageMeasPeriod').withDescription('Average RMS voltage (phase 1)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('UMOY2', ea.STATE).withUnit('V').withProperty('averageRmsVoltageMeasurePeriodPhB').withDescription('Average RMS voltage (phase 2)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('UMOY3', ea.STATE).withUnit('V').withProperty('averageRmsVoltageMeasPeriodPhC').withDescription('Average RMS voltage (phase 3)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTS', ea.STATE).withUnit('VA').withProperty('apparentPower').withDescription('Immediate apparent power delivered')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTS1', ea.STATE).withUnit('VA').withProperty('apparentPower').withDescription('Immediate apparent power delivered (phase 1)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTS2', ea.STATE).withUnit('VA').withProperty('apparentPowerPhB').withDescription('Immediate apparent power delivered (phase 2)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SINSTS3', ea.STATE).withUnit('VA').withProperty('apparentPowerPhC').withDescription('Immediate apparent power delivered (phase 3)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN', ea.STATE).withUnit('VA').withProperty('activePowerMax').withDescription('Apparent power delivered peak')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN1', ea.STATE).withUnit('VA').withProperty('activePowerMax').withDescription('Apparent power delivered peak (phase 1)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN2', ea.STATE).withUnit('VA').withProperty('activePowerMaxPhB').withDescription('Apparent power delivered peak (phase 2)')},
    {cluster: clustersDef._0x0B04, reportable: true, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN3', ea.STATE).withUnit('VA').withProperty('activePowerMaxPhC').withDescription('Apparent power delivered peak (phase 3)')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN-1', ea.STATE).withUnit('VA').withProperty('drawnVAMaxN1').withDescription('Apparent power max. draw-off n-1')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN1-1', ea.STATE).withUnit('VA').withProperty('drawnVAMaxN1').withDescription('Apparent power max. draw-off n-1 (phase 1)')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN2-1', ea.STATE).withUnit('VA').withProperty('drawnVAMaxN1P2').withDescription('Apparent power max. draw-off n-1 (phase 2)')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.three, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('SMAXN3-1', ea.STATE).withUnit('VA').withProperty('drawnVAMaxN1P3').withDescription('Apparent power max. draw-off n-1 (phase 3)')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('MSG1', ea.STATE).withProperty('message1').withDescription('Message short')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('MSG2', ea.STATE).withProperty('message2').withDescription('Message ultra-short')},
    {cluster: clustersDef._0x0702, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('PRM', ea.STATE).withProperty('siteId').withDescription('PRM number')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('DPM1', ea.STATE).withProperty('startMobilePoint1').withDescription('Start mobile point 1')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('FPM1', ea.STATE).withProperty('stopMobilePoint1').withDescription('Stop mobile point 1')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('DPM2', ea.STATE).withProperty('startMobilePoint2').withDescription('Start mobile point 2')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('FPM2', ea.STATE).withProperty('stopMobilePoint2').withDescription('Stop mobile point 2')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('DPM3', ea.STATE).withProperty('startMobilePoint3').withDescription('Start mobile point 3')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('FPM3', ea.STATE).withProperty('stopMobilePoint3').withDescription('Stop mobile point 3')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('RELAIS', ea.STATE).withProperty('relais')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('NJOURF', ea.STATE).withProperty('daysNumberCurrentCalendar').withDescription('Current day number supplier calendar')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.numeric('NJOURF+1', ea.STATE).withProperty('daysNumberNextCalendar').withDescription('Next day number supplier calendar')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('PJOURF+1', ea.STATE).withProperty('daysProfileCurrentCalendar').withDescription('Profile of the next supplier calendar day')},
    {cluster: clustersDef._0xFF66, reportable: false, onlyProducer: false, linkyPhase: linkyPhaseDef.single, linkyMode: linkyModeDef.standard, exposes: exposes.text('PPOINTE1', ea.STATE).withProperty('daysProfileNextCalendar').withDescription('Profile of the next check-in day')},
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
    let currentTarf;

    try {
        // Try to remove atributes which doesn't match current tarif
        currentTarf = endpoint.clusters.liXeePrivate.attributes.currentTarif.replace(/\0/g, '');
    } catch (error) {
        currentTarf = '';
        if (options && options.hasOwnProperty('tarif') && options['tarif'] != 'auto') {
            currentTarf = Object.entries(tarifsDef).find(( [k, v] ) => (v.fname == options['tarif']))[1].currentTarf;
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
    case linkyMode == linkyModeDef.legacy && currentTarf.startsWith(tarifsDef.histo_BBR.currentTarf):
        myExpose = myExpose.filter((a) => !tarifsDef.histo_BBR.excluded.includes(a.exposes.name));
        break;
    case linkyMode == linkyModeDef.standard && tarifsDef.stand_SEM_WE_MERCR.currentTarf:
        myExpose = myExpose.filter((a) => !tarifsDef.stand_SEM_WE_MERCR.excluded.includes(a.exposes.name));
        break;
    default:
        break;
    }


    return myExpose;
}
const definition = {
    zigbeeModel: ['ZLinky_TIC'],
    model: 'ZLinky_TIC',
    vendor: 'LiXee',
    description: 'Lixee ZLinky',
    fromZigbee: [fz.lixee_metering, fz.haMeterIdentificationFZ, fz.lixee_haElectricalMeasurement, fz.lixeePrivateFZ],
    toZigbee: [],
    exposes: (device, options) => {
        return getCurrentConfig(device, options)
            .map((e) => e.exposes);
    },
    options: [
        exposes.options.measurement_poll_interval(),
        exposes.enum(`linky_mode`, ea.SET, ['auto', linkyModeDef.legacy, linkyModeDef.standard])
            .withDescription(`Counter with TIC in mode standard or historique. Requires re-configuration (default: auto)`),
        exposes.enum(`energy_phase`, ea.SET, ['auto', linkyPhaseDef.single, linkyPhaseDef.three])
            .withDescription(`Power with single or three phase. Requires re-configuration (default: auto)`),
        exposes.enum(`production`, ea.SET, ['auto', 'true', 'false']).withDescription(`If you produce energy back to the grid (only linky_mode: ${linkyModeDef.standard}, default: auto)`),
        exposes.enum(`tarif`, ea.SET, [...Object.entries(tarifsDef).map(( [k, v] ) => (v.fname)), 'auto'])
            .withDescription(`The current tarif. This option will exclude unnecesary attributes. Default: auto`),
        exposes.options.precision(`kWh`),
    ],
    configure: async (device, coordinatorEndpoint, logger, options) => {
        const endpoint = device.getEndpoint(1);

        await reporting.bind(endpoint, coordinatorEndpoint, [
            clustersDef._0x0702, /* seMetering */
            clustersDef._0x0B01, /* haMeterIdentification */
            clustersDef._0x0B04, /* haElectricalMeasurement */
            clustersDef._0xFF66, /* liXeePrivate */
        ]);

        for (const e of getCurrentConfig(device, options, logger).filter((e) => e.reportable)) {
            let change = 1;
            if (e.hasOwnProperty('reportChange')) {
                change = e['reportChange'];
            }

            await endpoint
                .configureReporting(e.cluster, reporting.payload(e.exposes.property, 0, repInterval.MINUTES_15, change));
        }
    },
    ota: ota.lixee,
    onEvent: async (type, data, device, options) => {
        const endpoint = device.getEndpoint(1);
        if (type === 'stop') {
            clearInterval(globalStore.getValue(device, 'interval'));
            globalStore.clearValue(device, 'interval');
        } else if (!globalStore.hasValue(device, 'interval')) {
            const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 60;

            const interval = setInterval(async () => {
                const currentExposes = getCurrentConfig(device, options)
                    .filter((e) => !endpoint.configuredReportings.some((r) => r.cluster.name == e.cluster && r.attribute.name == e.exposes.property));
                for (const e of currentExposes) {
                    await endpoint
                        .read(e.cluster, [e.exposes.property])
                        .catch((err) => { }); // TODO: Ignore reads error?
                }
            }, seconds * 1000);
            globalStore.putValue(device, 'interval', interval);
        }
    },
};

module.exports = [definition];
