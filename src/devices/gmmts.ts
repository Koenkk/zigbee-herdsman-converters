import {Definition, Fz, Tz, KeyValue, Zh} from '../lib/types';
/* eslint-disable max-len */
/* eslint-disable no-multi-spaces */
import * as exposes from '../lib/exposes';
import * as globalStore from '../lib/store';
import * as reporting from '../lib/reporting';
import fz from '../converters/fromZigbee';
import {repInterval} from '../lib/constants';

import * as ota from '../lib/ota';
import {Buffer} from 'buffer';
import {Device} from 'zigbee-herdsman/dist/controller/model';
import {logger} from '../lib/logger';
import {Zcl} from 'zigbee-herdsman';

const ea = exposes.access;
const e = exposes.presets;

const METER_ID_CLUSTER = 'haMeterIdentification'; // 0x0B01
const ELEC_MES_CLUSTER = 'haElectricalMeasurement'; // 0x0B04
const METERING_CLUSTER = 'seMetering'; // 0x0702
const TICMETER_CLUSTER = 'manuSpecificGmmts'; // 0xFF42

const STRING = 'string';
const NUMBER = 'numeric';
const NUM_RW = 'read/write numeric';
const ENUM = 'enum';
const TIME = 'date';

const DEFAULT_POLL_INTERVAL = 120;

const C = {
    ANY: 'AUTO',
    BASE: 'BASE',
    HCHP: 'HCHP',
    EJP: 'EJP',
    TEMPO: 'TEMPO',
};

const E = {
    ANY: 'AUTO',
    MONO: 'MONOPHASE',
    TRI: 'TRIPHASE',
};

const T = {
    ANY: 'AUTO',
    HIST: 'HISTORIQUE',
    STD: 'STANDARD',
};

const modeTICEnum = ['HISTORIQUE', 'STANDARD', 'AUTO'];
const modeElecEnum = ['MONOPHASE', 'TRIPHASE', 'AUTO'];
const modeContractEnum = ['AUTO', 'BASE', 'HCHP', 'EJP', 'TEMPO', 'PRODUCTEUR'];

// prettier-ignore
const ticmeterOptions = [
    e.numeric(`refresh_rate`, ea.SET).withValueMin(60).withDescription(`Temps d'actualisation des valeurs statiques (celles qui possèdent des boutons refresh). Par défaut: ${DEFAULT_POLL_INTERVAL} s`).withValueMin(60).withValueMax(3600),
    e.enum('tic_mode', ea.SET, modeTICEnum).withDescription('Mode de communication TIC du Linky. Par défaut en mode AUTO. À utiliser en cas de problème'),
    e.enum('contract_type', ea.SET, modeContractEnum).withDescription('Contrat électrique actuel sur le Linky. Par défaut en mode AUTO. Permet d\'afficher les bonnes entités. À utiliser en cas de problème'),
    e.enum('linky_elec', ea.SET, modeElecEnum).withDescription('Mode électrique du Linky. Par défaut en mode AUTO. À utiliser en cas de problème'),
    e.binary('producer', ea.SET, 'ON', 'OFF').withDescription('Mode producteur: affiche les index de production électrique. Par défaut: OFF'),
    e.binary('advanced', ea.SET, 'ON', 'OFF').withDescription('Affiche toutes les données du compteur. Pour un usage avancé. Par défaut: OFF'),
];

interface TICMeterData {
    name: string;
    desc: string;
    cluster: string;
    attribute: string;
    type: string;
    unit: string;
    poll: boolean;
    tic: string;
    contract: string;
    elec: string;
    producer: boolean;
    values?: string[];
    min?: number;
    max?: number;
}

// prettier-ignore
const ticmeterDatas: TICMeterData[] = [
    {name: 'Mode TIC',                      desc: 'Mode de communication TIC',                           cluster: TICMETER_CLUSTER,   attribute: 'ticMode',                            type: ENUM,   unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false, values: modeTICEnum},
    {name: 'Mode électrique',               desc: 'Mode de électrique du compteur',                      cluster: TICMETER_CLUSTER,   attribute: 'elecMode',                           type: ENUM,   unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false, values: modeElecEnum},
    {name: 'Option tarifaire',              desc: 'Option tarifaire',                                    cluster: TICMETER_CLUSTER,   attribute: 'contractType',                       type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Durée de fonctionnement',       desc: 'Durée depuis le dernier redémmarage',                 cluster: TICMETER_CLUSTER,   attribute: 'uptime',                             type: NUMBER, unit: 's',    poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Durée d\'actualisation',        desc: 'Durée entre les actualisations',                      cluster: TICMETER_CLUSTER,   attribute: 'refreshRate',                        type: NUM_RW, unit: 's',    poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false, min: 30, max: 300},
    {name: 'Identifiant',                   desc: 'Numéro de serie du compteur',                         cluster: METERING_CLUSTER,   attribute: 'meterSerialNumber',                  type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Puissance Max contrat',         desc: 'Puissance Max contrat',                               cluster: TICMETER_CLUSTER,   attribute: 'maxContractPower',                   type: NUMBER, unit: 'kVA',  poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index total',                   desc: 'Somme de tous les index',                             cluster: METERING_CLUSTER,   attribute: 'currentSummDelivered',               type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index BASE',                    desc: 'Index Tarif Base',                                    cluster: METERING_CLUSTER,   attribute: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.BASE,  elec: E.ANY,  producer: false},
    {name: 'Index HC',                      desc: 'Index Tarif Heures Creuses',                          cluster: METERING_CLUSTER,   attribute: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  producer: false},
    {name: 'Index HP',                      desc: 'Index Tarif Heures Pleines',                          cluster: METERING_CLUSTER,   attribute: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  producer: false},
    {name: 'Index EJP HN',                  desc: 'Index Tarif EJP Heures Normales',                     cluster: METERING_CLUSTER,   attribute: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
    {name: 'Index EJP HPM',                 desc: 'Index Tarif EJP Heures de Pointe Mobile',             cluster: METERING_CLUSTER,   attribute: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
    {name: 'Préavis EJP',                   desc: 'Préavis EJP',                                         cluster: TICMETER_CLUSTER,   attribute: 'startEJP',                           type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
    {name: 'Index BBRHCJB',                 desc: 'Index Tarif Heures Creuses Jours Bleus',              cluster: METERING_CLUSTER,   attribute: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false},
    {name: 'Index BBRHPJB',                 desc: 'Index Tarif Heures Pleines Jours Bleus',              cluster: METERING_CLUSTER,   attribute: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false},
    {name: 'Index BBRHCJW',                 desc: 'Index Tarif Heures Creuses Jours Blancs',             cluster: METERING_CLUSTER,   attribute: 'currentTier3SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false},
    {name: 'Index BBRHPJW',                 desc: 'Index Tarif Heures Pleines Jours Blancs',             cluster: METERING_CLUSTER,   attribute: 'currentTier4SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false},
    {name: 'Index BBRHCJR',                 desc: 'Index Tarif Heures Creuses Jours Rouges',             cluster: METERING_CLUSTER,   attribute: 'currentTier5SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false},
    {name: 'Index BBRHPJR',                 desc: 'Index Tarif Heures Pleines Jours Rouges',             cluster: METERING_CLUSTER,   attribute: 'currentTier6SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false},
    {name: 'Index 7',                       desc: 'Index 7',                                             cluster: METERING_CLUSTER,   attribute: 'currentTier7SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index 8',                       desc: 'Index 8',                                             cluster: METERING_CLUSTER,   attribute: 'currentTier8SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index 9',                       desc: 'Index 9',                                             cluster: METERING_CLUSTER,   attribute: 'currentTier9SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index 10',                      desc: 'Index 10',                                            cluster: METERING_CLUSTER,   attribute: 'currentTier10SummDelivered',         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Tarif en cours',                desc: 'Option tarifaire en cours',                           cluster: TICMETER_CLUSTER,   attribute: 'currentTarif',                       type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Couleur demain',                desc: 'Couleur demain',                                      cluster: TICMETER_CLUSTER,   attribute: 'tomorowColor',                       type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false},
    {name: 'Intensité instantanée',         desc: 'Intensité instantanée',                               cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrent',                         type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Intensité instantanée Ph A',    desc: 'Intensité instantanée Phase A',                       cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrent',                         type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Intensité instantanée Ph B',    desc: 'Intensité instantanée Phase B',                       cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentPhB',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Intensité instantanée Ph C',    desc: 'Intensité instantanée Phase C',                       cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentPhC',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Intensité maximale',            desc: 'Intensité maximale',                                  cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentMax',                      type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Intensité maximale Ph A',       desc: 'Intensité maximale Phase A',                          cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentMax',                      type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Intensité maximale Ph B',       desc: 'Intensité maximale Phase B',                          cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentMaxPhB',                   type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Intensité maximale Ph C',       desc: 'Intensité maximale Phase C',                          cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentMaxPhC',                   type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Dépassement de puissance',      desc: 'Dépassement de puissance',                            cluster: TICMETER_CLUSTER,   attribute: 'powerOverrun',                       type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Dépassement Itensité Ph A',     desc: 'Dépassement de puissance Phase A',                    cluster: TICMETER_CLUSTER,   attribute: 'powerOverrunA',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Dépassement Itensité Ph B',     desc: 'Dépassement de puissance Phase B',                    cluster: TICMETER_CLUSTER,   attribute: 'powerOverrunB',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Dépassement Itensité Ph C',     desc: 'Dépassement de puissance Phase C',                    cluster: TICMETER_CLUSTER,   attribute: 'powerOverrunC',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance Apparente',           desc: 'Puissance Apparente',                                 cluster: ELEC_MES_CLUSTER,   attribute: 'apparentPower',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Puissance Apparente Ph A',      desc: 'Puissance Apparente Phase A',                         cluster: ELEC_MES_CLUSTER,   attribute: 'apparentPower',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance Apparente Ph B',      desc: 'Puissance Apparente Phase B',                         cluster: ELEC_MES_CLUSTER,   attribute: 'apparentPowerPhB',                   type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance Apparente Ph C',      desc: 'Puissance Apparente Phase C',                         cluster: ELEC_MES_CLUSTER,   attribute: 'apparentPowerPhC',                   type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Index énergie injectée',        desc: 'Index énergie injectée',                              cluster: METERING_CLUSTER,   attribute: 'currentSummReceived',                type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true},
    {name: 'Puissance injectée',            desc: 'Puissance injectée',                                  cluster: TICMETER_CLUSTER,   attribute: 'powerInjected',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true},
    {name: 'Puissance max injectée Auj.',   desc: 'Puissance max injectée Aujourd\'hui',                 cluster: TICMETER_CLUSTER,   attribute: 'powerMaxInjected',                   type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true},
    {name: 'Heure PMAX injectée Auj.',      desc: 'Date et Heure puissance max injectée aujourd\'hui',   cluster: TICMETER_CLUSTER,   attribute: 'powerMaxInjectedTime',               type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true},
    {name: 'Puissance max injectée Hier',   desc: 'Puissance max injectée Hier',                         cluster: TICMETER_CLUSTER,   attribute: 'powerMaxInjectedYesterday',          type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true},
    {name: 'Heure PMAX injectée Hier',      desc: 'Date et Heure puissance max injectée hier',           cluster: TICMETER_CLUSTER,   attribute: 'powerMaxInjectedYesterdayTime',      type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true},
    {name: 'Présence de potentiels',        desc: 'Présence de potentiels',                              cluster: TICMETER_CLUSTER,   attribute: 'potentialPresence',                  type: NUMBER, unit: '',     poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Horaire Heures Creuses',        desc: 'Horaire Heures Creuses',                              cluster: TICMETER_CLUSTER,   attribute: 'hcHours',                            type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  producer: false},
    {name: 'Registre Status',               desc: 'Registre de status du compteur',                      cluster: TICMETER_CLUSTER,   attribute: 'motdetat',                           type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index 1 Distributeur',          desc: 'Index 1 Energie soutirée Distributeur',               cluster: TICMETER_CLUSTER,   attribute: 'index1Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index 2 Distributeur',          desc: 'Index 2 Energie soutirée Distributeur',               cluster: TICMETER_CLUSTER,   attribute: 'index2Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index 3 Distributeur',          desc: 'Index 3 Energie soutirée Distributeur',               cluster: TICMETER_CLUSTER,   attribute: 'index3Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Index 4 Distributeur',          desc: 'Index 4 Energie soutirée Distributeur',               cluster: TICMETER_CLUSTER,   attribute: 'index4Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Tension instantanée',           desc: 'Tension instantanée efficace',                        cluster: ELEC_MES_CLUSTER,   attribute: 'rmsVoltage',                         type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Tension instantanée Ph A',      desc: 'Tension instantanée efficace Phase A',                cluster: ELEC_MES_CLUSTER,   attribute: 'rmsVoltage',                         type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Tension instantanée Ph B',      desc: 'Tension instantanée efficace Phase B',                cluster: ELEC_MES_CLUSTER,   attribute: 'rmsVoltagePhB',                      type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Tension instantanée Ph C',      desc: 'Tension instantanée efficace Phase C',                cluster: ELEC_MES_CLUSTER,   attribute: 'rmsVoltagePhC',                      type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Tension moyenne',               desc: 'Tension moyenne',                                     cluster: ELEC_MES_CLUSTER,   attribute: 'averageRmsVoltageMeasPeriod',        type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Tension moyenne Ph A',          desc: 'Tension moyenne Phase A',                             cluster: ELEC_MES_CLUSTER,   attribute: 'averageRmsVoltageMeasPeriod',        type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Tension moyenne Ph B',          desc: 'Tension moyenne Phase B',                             cluster: ELEC_MES_CLUSTER,   attribute: 'averageRmsVoltageMeasurePeriodPhB',  type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Tension moyenne Ph C',          desc: 'Tension moyenne Phase C',                             cluster: ELEC_MES_CLUSTER,   attribute: 'averageRmsVoltageMeasPeriodPhC',     type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance max Auj',             desc: 'Puissance max Aujourd\'hui',                          cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMax',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Heure Puissance max Auj',       desc: 'Date et Heure de la puissance max aujourd\'hui',      cluster: TICMETER_CLUSTER,   attribute: 'powerMaxTodayTime',                  type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Puissance max Auj Ph A',        desc: 'Puissance max Aujourd\'hui Phase A',                  cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMax',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Heure Puissance max Auj Ph A',  desc: 'Date et Heure de la puissance max aujourd\'hui Ph A', cluster: TICMETER_CLUSTER,   attribute: 'powerMaxToday1Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance max Auj Ph B',        desc: 'Puissance max Aujourd\'hui Phase B',                  cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMaxPhB',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Heure Puissance max Auj Ph B',  desc: 'Date et Heure de la puissance max aujourd\'hui Ph B', cluster: TICMETER_CLUSTER,   attribute: 'powerMaxToday2Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance max Auj Ph C',        desc: 'Puissance max Aujourd\'hui Phase C',                  cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMaxPhC',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Heure Puissance max Auj Ph C',  desc: 'Date et Heure de la puissance max aujourd\'hui Ph C', cluster: TICMETER_CLUSTER,   attribute: 'powerMaxToday3Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance maximale triphasée',  desc: 'Puissance maximale triphasée',                        cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMax',                     type: NUMBER, unit: 'W',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance max Hier',            desc: 'Puissance max Hier',                                  cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Heure Puissance max Hier',      desc: 'Date et Heure de la puissance max hier',              cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterdayTime',              type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false},
    {name: 'Puissance max Hier Ph A',       desc: 'Puissance max Hier Phase A',                          cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday1',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Heure Puissance max Hier Ph A', desc: 'Date et Heure de la puissance max hier Ph A',         cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday1Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance max Hier Ph B',       desc: 'Puissance max Hier Phase B',                          cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday2',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Heure Puissance max Hier Ph B', desc: 'Date et Heure de la puissance max hier Ph B',         cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday2Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Puissance max Hier Ph C',       desc: 'Puissance max Hier Phase C',                          cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday3',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Heure Puissance max Hier Ph C', desc: 'Date et Heure de la puissance max hier Ph C',         cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday3Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false},
    {name: 'Index en cours',                desc: 'Numeréo de l\'index tarifaire en cours',              cluster: TICMETER_CLUSTER,   attribute: 'currentIndex',                       type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'N° jours en cours',             desc: 'N° jours en cours fournisseur',                       cluster: TICMETER_CLUSTER,   attribute: 'calendarSupplierDay',                type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'N° prochain jour',              desc: 'N° prochain jour fournisseur',                        cluster: TICMETER_CLUSTER,   attribute: 'nextSupplierCalendarDay',            type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Relais',                        desc: 'Relais virtuel du compteur',                          cluster: TICMETER_CLUSTER,   attribute: 'relays',                             type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'PMR',                           desc: 'Identifiant Point Référence Mesure',                  cluster: METERING_CLUSTER,   attribute: 'siteId',                             type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Message court',                 desc: 'Message court',                                       cluster: TICMETER_CLUSTER,   attribute: 'shortMsg',                           type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Message ultra court',           desc: 'Message ultra court',                                 cluster: TICMETER_CLUSTER,   attribute: 'ultraShortMsg',                      type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Version de la TIC',             desc: 'Version de la TIC',                                   cluster: TICMETER_CLUSTER,   attribute: 'ticVersion',                         type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Date et heure Compteur',        desc: 'Date et heure du compteur',                           cluster: TICMETER_CLUSTER,   attribute: 'date',                               type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Profil prochain jour',          desc: 'Profil du prochain jour',                             cluster: TICMETER_CLUSTER,   attribute: 'calendarDay',                        type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Profil prochain jour pointe',   desc: 'Profil du prochain jour pointe',                      cluster: TICMETER_CLUSTER,   attribute: 'calendarDayPointe',                  type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Point n courbe soutirée',       desc: 'Point n de la courbe de charge active soutirée',      cluster: ELEC_MES_CLUSTER,   attribute: 'activePower',                        type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Point n-1 courbe soutirée',     desc: 'Point n-1 de la courbe de charge active soutirée',    cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerPhB',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Point n courbe injectée',       desc: 'Point n de la courbe de charge active injectée',      cluster: TICMETER_CLUSTER,   attribute: 'injectedLoadN',                      type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true},
    {name: 'Point n-1 courbe injectée',     desc: 'Point n-1 de la courbe de charge active injectée',    cluster: TICMETER_CLUSTER,   attribute: 'injectedLoadN_1',                    type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true},
    {name: 'Energie réactive Q1 totale',    desc: 'Energie réactive Q1 totale',                          cluster: ELEC_MES_CLUSTER,   attribute: 'totalReactivePower',                 type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Energie réactive Q2 totale',    desc: 'Energie réactive Q2 totale',                          cluster: ELEC_MES_CLUSTER,   attribute: 'reactivePower',                      type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Energie réactive Q3 totale',    desc: 'Energie réactive Q3 totale',                          cluster: ELEC_MES_CLUSTER,   attribute: 'reactivePowerPhB',                   type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Energie réactive Q4 totale',    desc: 'Energie réactive Q4 totale',                          cluster: ELEC_MES_CLUSTER,   attribute: 'reactivePowerPhC',                   type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false},
    {name: 'Début Pointe Mobile 1',         desc: 'Début Pointe Mobile 1',                               cluster: TICMETER_CLUSTER,   attribute: 'startEJP1',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
    {name: 'Fin Pointe Mobile 1',           desc: 'Fin Pointe Mobile 1',                                 cluster: TICMETER_CLUSTER,   attribute: 'stopEJP1',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
    {name: 'Début Pointe Mobile 2',         desc: 'Début Pointe Mobile 2',                               cluster: TICMETER_CLUSTER,   attribute: 'startEJP2',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
    {name: 'Fin Pointe Mobile 2',           desc: 'Fin Pointe Mobile 2',                                 cluster: TICMETER_CLUSTER,   attribute: 'stopEJP2',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
    {name: 'Début Pointe Mobile 3',         desc: 'Début Pointe Mobile 3',                               cluster: TICMETER_CLUSTER,   attribute: 'startEJP3',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
    {name: 'Fin Pointe Mobile 3',           desc: 'Fin Pointe Mobile 3',                                 cluster: TICMETER_CLUSTER,   attribute: 'stopEJP3',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false},
];

const ticmeterCustomCluster = {
    ID: 0xff42,
    attributes: {
        contractType: {ID: 0x0000, type: Zcl.DataType.charStr},
        startEJP: {ID: 0x0001, type: Zcl.DataType.uint16},
        refreshRate: {ID: 0x0002, type: Zcl.DataType.uint16},
        tomorowColor: {ID: 0x0003, type: Zcl.DataType.charStr},
        //
        powerOverrun: {ID: 0x0004, type: Zcl.DataType.uint16},
        powerOverrunA: {ID: 0x0005, type: Zcl.DataType.uint16},
        powerOverrunB: {ID: 0x0006, type: Zcl.DataType.uint16},
        powerOverrunC: {ID: 0x0007, type: Zcl.DataType.uint16},
        //
        potentialPresence: {ID: 0x0008, type: Zcl.DataType.uint32},
        //
        hcHours: {ID: 0x0009, type: Zcl.DataType.charStr},
        motdetat: {ID: 0x000a, type: Zcl.DataType.charStr},
        //
        date: {ID: 0x000b, type: Zcl.DataType.uint64},
        //
        index1Dist: {ID: 0x000e, type: Zcl.DataType.uint48},
        index2Dist: {ID: 0x000f, type: Zcl.DataType.uint48},
        index3Dist: {ID: 0x0010, type: Zcl.DataType.uint48},
        index4Dist: {ID: 0x0011, type: Zcl.DataType.uint48},
        //
        powerMaxYesterday: {ID: 0x0012, type: Zcl.DataType.uint16},
        powerMaxYesterday1: {ID: 0x0013, type: Zcl.DataType.uint16},
        powerMaxYesterday2: {ID: 0x0014, type: Zcl.DataType.uint16},
        powerMaxYesterday3: {ID: 0x0015, type: Zcl.DataType.uint16},
        //
        powerInjected: {ID: 0x0016, type: Zcl.DataType.uint32},
        powerMaxInjected: {ID: 0x0017, type: Zcl.DataType.uint32},
        powerMaxInjectedYesterday: {ID: 0x0018, type: Zcl.DataType.uint32},
        //
        injectedLoadN: {ID: 0x0019, type: Zcl.DataType.uint16},
        injectedLoadN_1: {ID: 0x001a, type: Zcl.DataType.uint16},
        //
        startEJP1: {ID: 0x001c, type: Zcl.DataType.uint64},
        stopEJP1: {ID: 0x001d, type: Zcl.DataType.uint64},
        startEJP2: {ID: 0x001e, type: Zcl.DataType.uint64},
        stopEJP2: {ID: 0x001f, type: Zcl.DataType.uint64},
        startEJP3: {ID: 0x0020, type: Zcl.DataType.uint64},
        stopEJP3: {ID: 0x0021, type: Zcl.DataType.uint64},
        //
        shortMsg: {ID: 0x0022, type: Zcl.DataType.charStr},
        ultraShortMsg: {ID: 0x0023, type: Zcl.DataType.charStr},
        //
        relays: {ID: 0x0024, type: Zcl.DataType.charStr},
        //
        currentIndex: {ID: 0x0025, type: Zcl.DataType.uint8},
        //
        currentTarif: {ID: 0x0039, type: Zcl.DataType.charStr},
        calendarSupplierDay: {ID: 0x0026, type: Zcl.DataType.uint16},
        nextSupplierCalendarDay: {ID: 0x0027, type: Zcl.DataType.uint16},
        calendarDay: {ID: 0x0028, type: Zcl.DataType.charStr},
        calendarDayPointe: {ID: 0x0029, type: Zcl.DataType.charStr},
        //
        elecMode: {ID: 0x002a, type: Zcl.DataType.uint8},
        maxContractPower: {ID: 0x002b, type: Zcl.DataType.uint16},
        ticMode: {ID: 0x002c, type: Zcl.DataType.uint8},
        uptime: {ID: 0x002d, type: Zcl.DataType.uint48},
        ticVersion: {ID: 0x002e, type: Zcl.DataType.charStr},
        //
        powerMaxTodayTime: {ID: 0x002f, type: Zcl.DataType.uint64},
        powerMaxToday1Time: {ID: 0x0030, type: Zcl.DataType.uint64},
        powerMaxToday2Time: {ID: 0x0031, type: Zcl.DataType.uint64},
        powerMaxToday3Time: {ID: 0x0032, type: Zcl.DataType.uint64},
        //
        powerMaxYesterdayTime: {ID: 0x0033, type: Zcl.DataType.uint64},
        powerMaxYesterday1Time: {ID: 0x0034, type: Zcl.DataType.uint64},
        powerMaxYesterday2Time: {ID: 0x0035, type: Zcl.DataType.uint64},
        powerMaxYesterday3Time: {ID: 0x0036, type: Zcl.DataType.uint64},
        //
        powerMaxInjectedTime: {ID: 0x0037, type: Zcl.DataType.uint64},
        powerMaxInjectedYesterdayTime: {ID: 0x0038, type: Zcl.DataType.uint64},
    },
    commands: {
        refreshRate: {
            ID: 0,
            parameters: [
                {name: 'refreshRate', type: Zcl.DataType.uint16},
            ],
        },
        reboot: {
            ID: 1,
            parameters: [
                {name: 'seq', type: Zcl.DataType.uint16},
            ],
        },
    },
    commandsResponse: {
        refreshRate: {
            ID: 1,
            parameters: [
                {name: 'seq', type: Zcl.DataType.uint16},
            ],
        },
    },
};

function toSnakeCase(str: string) {
    return str.split(/(?=[A-Z])/).join('_').toLowerCase();
}


function ticmeterConverter(msg: Fz.Message) {
    const result: KeyValue = {};
    const keys = Object.keys(msg.data);
    keys.forEach((key) => {
        const found = ticmeterDatas.find((x) => x.attribute == key);
        if (found) {
            let value;
            switch (found.type) {
            case STRING:
                if (Buffer.isBuffer(msg.data[key])) {
                    value = msg.data[key].toString();
                } else {
                    value = msg.data[key];
                }
                break;
            case NUMBER:
            case NUM_RW:
                if (Array.isArray(msg.data[key])) {
                    value = (msg.data[key][0] << 32) + msg.data[key][1];
                } else {
                    value = msg.data[key];
                }
                break;
            case ENUM:
                value = found.values[msg.data[key]];
                break;
            case TIME:
                value = new Date(msg.data[key] * 1000).toLocaleString('fr-FR', {timeZone: 'Europe/Paris'});
                break;
            }
            result[toSnakeCase(found.attribute)] = value;
        } else {
            logger.warning(`Key not found: ${key}`, 'TICMeter');
        }
    });
    return result;
}

const fzLocal = {
    ticmeter_ha_electrical_measurement: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return ticmeterConverter(msg);
        },
    } satisfies Fz.Converter,

    ticmeter_cluster_fz: {
        cluster: TICMETER_CLUSTER,
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return ticmeterConverter(msg);
        },
    } satisfies Fz.Converter,

    ticmeter_metering: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return ticmeterConverter(msg);
        },
    } satisfies Fz.Converter,
};

function genereateTzLocal() {
    const tzLocal = [];
    for (const item of ticmeterDatas) {
        const key = toSnakeCase(item.attribute);
        const tz : Tz.Converter = {
            key: [key],
            convertGet: async (entity, key, meta) => {
                await entity.read(item.cluster, [item.attribute]);
            },
        } satisfies Tz.Converter;
        if (item.type == NUM_RW) {
            tz.convertSet = async (entity, key, value: unknown, meta) => {
                if (Number(value) < 0 || Number(value) > 65535) {
                    throw new Error('Value must be between 0 and 65535');
                }
                await entity.write(item.cluster, {[item.attribute]: value}, {manufacturerCode: null});
            };
        }
        tzLocal.push(tz);
    }
    return tzLocal;
}

const tzLocal = genereateTzLocal();

function splitTab(tab: string[], size: number): string[][] {
    const result: string[][] = [];
    for (let i = 0; i < tab.length; i += size) {
        result.push(tab.slice(i, i + size));
    }
    return result;
}

async function poll(endpoint: Zh.Endpoint, device: Device) {
    const currentContract = globalStore.getValue(device, 'contract_type');
    const currentElec = globalStore.getValue(device, 'elec_mode');
    const currentTIC = globalStore.getValue(device, 'tic_mode');
    const currentProducer = globalStore.getValue(device, 'producer');
    logger.debug(`Polling: ${currentContract} ${currentElec} ${currentTIC} ${currentProducer}`, 'TICMeter');
    const start: Date = new Date();

    let toRead = [];
    for (const item of ticmeterDatas) {
        if (item.poll && (item.tic == currentTIC || item.tic == T.ANY) && (item.contract == currentContract || item.contract == C.ANY) && (item.elec == currentElec || item.elec == E.ANY) && (item.producer == currentProducer || item.producer == false)) {
            toRead.push(item);
        }
    }

    toRead = toRead.sort((a, b) => a.cluster.localeCompare(b.cluster));
    const groupedByCluster: { [key: string]: TICMeterData[] } = {};
    toRead.forEach((item) => {
        if (!groupedByCluster[item.cluster]) {
            groupedByCluster[item.cluster] = [];
        }
        groupedByCluster[item.cluster].push(item);
    });
    const splited = Object.keys(groupedByCluster).map((cluster) => {
        return {
            cluster: cluster,
            attributes: splitTab(
                groupedByCluster[cluster].map((item: TICMeterData) => item.attribute),
                3,
            ),
        };
    });
    for (const item of splited) {
        for (const attr of item.attributes) {
            await endpoint
                .read(item.cluster, attr)
                .catch((e) => {
                    if (e.message.includes(`Cannot read properties of undefined (reading 'manufacturerID')`)) {
                        // if we remove the device, we stop the polling
                        clearInterval(globalStore.getValue(device, 'interval'));
                        globalStore.clearValue(device, 'interval');
                    } else if (e.message.includes('UNSUPPORTED_ATTRIBUTE')) {
                        // ignore
                    } else {
                        logger.warning(`Polling Error: ${attr} ${e}`, 'TICMeter');
                    }
                })
                .then((result) => {});
        }
    }
    const end: Date = new Date();
    logger.debug(`Polling Duration: ${end.getTime() - start.getTime()} ms`, 'TICMeter');
}

function initConfig(device: Device, name: string, value: unknown) {
    if (!globalStore.hasValue(device, name)) {
        globalStore.putValue(device, name, value);
    }
    return globalStore.getValue(device, name);
}

const definitions: Definition[] = [
    {
        zigbeeModel: ['TICMeter'],
        model: 'TICMeter',
        vendor: 'GammaTroniques',
        description: 'TICMeter pour Linky',
        fromZigbee: [fz.meter_identification, fzLocal.ticmeter_cluster_fz, fzLocal.ticmeter_ha_electrical_measurement, fzLocal.ticmeter_metering],
        toZigbee: tzLocal,
        exposes: (device, options) => {
            let endpoint: Zh.Endpoint;
            const exposes: exposes.Base[] = [];
            exposes.push(e.linkquality());

            let currentContract: string = '';
            let currentElec: string = '';
            let currentTIC: string = '';
            let currentProducer:string = '';

            if (device == null) {
                return exposes;
            }

            try {
                endpoint = device.getEndpoint(1);
            } catch (error) {
                logger.warning('Exposes: No endpoint', 'TICMeter');
            }


            if (endpoint != null && endpoint.hasOwnProperty('clusters') && endpoint.clusters[TICMETER_CLUSTER] != undefined) {
                if (endpoint.clusters[TICMETER_CLUSTER].hasOwnProperty('attributes') && endpoint.clusters[TICMETER_CLUSTER].attributes != undefined) {
                    const attr = endpoint.clusters[TICMETER_CLUSTER].attributes;

                    if (globalStore.getValue(device, 'tic_mode') == undefined) {
                        if (attr.hasOwnProperty('ticMode') && attr.ticMode != null) {
                            logger.debug(`Load ticMode: ${attr.ticMode}`, 'TICMeter');
                            globalStore.putValue(device, 'tic_mode', modeTICEnum[Number(attr.ticMode)]);
                        }
                    }

                    if (globalStore.getValue(device, 'elec_mode') == undefined) {
                        if (attr.hasOwnProperty('elecMode') && attr.elecMode != null) {
                            logger.debug(`Load elecMode: ${attr.elecMode}`, 'TICMeter');
                            globalStore.putValue(device, 'elec_mode', modeElecEnum[Number(attr.elecMode)]);
                        }
                    }

                    if (globalStore.getValue(device, 'contract_type') == undefined) {
                        if (attr.hasOwnProperty('contractType') && attr.contractType != null) {
                            let string = attr.contractType;
                            if (Buffer.isBuffer(string)) {
                                string = string.toString();
                            }
                            logger.debug(`Load contractType: ${string}`, 'TICMeter');
                            globalStore.putValue(device, 'contract_type', string);
                        }
                    }

                    if (attr.hasOwnProperty('powerInjected') && attr.powerInjected != null) {
                        logger.debug(`Load powerInjected: ${attr.powerInjected}`, 'TICMeter');
                        globalStore.putValue(device, 'producer', 'ON');
                    }
                }
            }

            if (options && options.hasOwnProperty('contract_type') && options.contract_type != 'AUTO') {
                currentContract = String(options.contract_type);
                logger.debug(`contract: ${currentContract}`, 'TICMeter');
            } else {
                currentContract = globalStore.getValue(device, 'contract_type');
                logger.debug(`contract: ${currentContract}`, 'TICMeter');
                if (currentContract == undefined) {
                    logger.debug('TICMeter: Force contract to AUTO', 'TICMeter');
                    currentContract = 'AUTO';
                }
            }

            if (options && options.hasOwnProperty('linky_elec') && options.linky_elec != 'AUTO') {
                currentElec = String(options.linky_elec);
                logger.debug(`Manual elec: ${currentElec}`, 'TICMeter');
            } else {
                currentElec = globalStore.getValue(device, 'elec_mode');
                logger.debug(`AUTO elec: ${currentElec}`, 'TICMeter');
                if (currentElec == undefined) {
                    logger.debug('TICMeter: Force elec to AUTO', 'TICMeter');
                    currentElec = 'AUTO';
                }
            }

            if (options && options.hasOwnProperty('tic_mode') && options.tic_mode != 'AUTO') {
                currentTIC = String(options.tic_mode);
                logger.debug(`Manual tic: ${currentTIC}`, 'TICMeter');
            } else {
                currentTIC = globalStore.getValue(device, 'tic_mode', 'TICMeter');
                logger.debug(`TIC: ${currentTIC}`, 'TICMeter');
                if (currentTIC == undefined) {
                    logger.debug('TICMeter: Force TIC to AUTO', 'TICMeter');
                    currentTIC = 'AUTO';
                }
            }

            if (options && options.hasOwnProperty('producer') && options.producer != 'AUTO') {
                currentProducer = String(options.producer);
                logger.debug(`Manual producer: ${currentProducer}`, 'TICMeter');
            } else {
                currentProducer = globalStore.getValue(device, 'producer');
                if (currentProducer == undefined) {
                    logger.debug('Force producer to AUTO', 'TICMeter');
                    currentProducer = 'OFF';
                }
            }

            globalStore.putValue(device, 'contract_type', currentContract);
            globalStore.putValue(device, 'elec_mode', currentElec);
            globalStore.putValue(device, 'tic_mode', currentTIC);
            globalStore.putValue(device, 'producer', currentProducer);


            ticmeterDatas.forEach((item) => {
                let contractOK = false;
                let elecOK = false;
                let ticOK = false;
                let producerOK = true;
                if (item.hasOwnProperty('contract')) {
                    if (item['contract'] == currentContract || item['contract'] == C.ANY) {
                        contractOK = true;
                    }
                } else {
                    logger.warning(`No contract for ${item.name}`, 'TICMeter');
                }

                if (item.hasOwnProperty('elec')) {
                    if (item['elec'] == currentElec || item['elec'] == E.ANY) {
                        elecOK = true;
                    }
                } else {
                    logger.warning(`No elec for ${item.name}`, 'TICMeter');
                }

                if (item.hasOwnProperty('tic')) {
                    if (item['tic'] == currentTIC || item['tic'] == T.ANY) {
                        ticOK = true;
                    }
                } else {
                    logger.warning(`No tic for ${item.name}`, 'TICMeter');
                }

                if (item.hasOwnProperty('producer')) {
                    if (item['producer'] == true && currentProducer == 'OFF') {
                        producerOK = false;
                    }
                } else {
                    logger.warning(`No producer for ${item.name}`, 'TICMeter');
                }

                if (contractOK && elecOK && ticOK && producerOK) {
                    let access: number = ea.STATE;
                    if (item.poll) {
                        access = ea.STATE_GET;
                    }
                    switch (item.type) {
                    case STRING:
                        exposes.push(e.text(item.name, access).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc));
                        break;
                    case NUMBER:
                        exposes.push(e.numeric(item.name, access).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc).withUnit(item.unit));
                        break;
                    case ENUM:
                        exposes.push(e.enum(item.name, access, item.values).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc));
                        break;
                    case TIME:
                        exposes.push(e.text(item.name, access).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc));
                        break;
                    case NUM_RW:
                        exposes.push(e.numeric(item.name, ea.ALL).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc).withUnit(item.unit).withValueMin(item.min).withValueMax(item.max));
                        break;
                    }
                }
            });
            logger.debug(`Exposes ${exposes.length} attributes`, 'TICMeter');

            return exposes;
        },
        configure: async (device, coordinatorEndpoint) => {
            logger.debug('TICMeter: Configure', 'TICMeter');
            device.powerSource = 'Mains (single phase)';
            device.save();
            const endpoint = device.getEndpoint(1);

            const TICMode = initConfig(device, 'tic_mode', 'AUTO');
            const contractType = initConfig(device, 'contract_type', 'AUTO');
            const elecMode = initConfig(device, 'elec_mode', 'AUTO');
            const producer = initConfig(device, 'producer', false);
            initConfig(device, 'refresh_rate', DEFAULT_POLL_INTERVAL);

            logger.debug(`Configure: ${TICMode} ${contractType} ${elecMode} ${producer}`, 'TICMeter');
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1, multiplier: 1});

            await reporting.bind(endpoint, coordinatorEndpoint, [
                TICMETER_CLUSTER,
                ELEC_MES_CLUSTER,
                METERING_CLUSTER,
                METER_ID_CLUSTER,
            ]);

            const reportingConfig: Promise<void> []= [];

            const wanted: TICMeterData[] = [];
            for (const item of ticmeterDatas) {
                if (!item.poll && (item.tic == TICMode || item.tic == T.ANY) && (item.contract == contractType || item.contract == C.ANY) && (item.elec == elecMode || item.elec == E.ANY) && (item.producer == producer || item.producer == false)) {
                    wanted.push(item);
                }
            }

            logger.debug(`Configure wanted ${wanted.length}`, 'TICMeter');

            endpoint.configuredReportings.forEach(async (r) => {
                await endpoint.configureReporting(r.cluster.name, reporting.payload(r.attribute.name, r.minimumReportInterval, 65535, r.reportableChange), {manufacturerCode: null});
            });

            for (const item of wanted) {
                const conf = {
                    attribute: item.attribute,
                    change: 1,
                    min: repInterval.SECONDS_10,
                    max: repInterval.MINUTES_10,
                };

                logger.debug(`Configure ${item.name} ${item.cluster} ${item.attribute} ${conf.min} ${conf.max} ${conf.change}`, 'TICMeter');
                reportingConfig.push(endpoint.configureReporting(item.cluster, reporting.payload(item.attribute, conf.min, conf.max, conf.change), {manufacturerCode: null}));
            }

            await Promise.allSettled(reportingConfig.map(async (config) => {
                try {
                    await config;
                } catch (error) {
                    if (error.message.includes('UNSUPPORTED_ATTRIBUTE')) {
                        // ignore: sometimes the attribute is not supported
                    } else {
                        logger.warning(`Configure failed: ${error}`, 'TICMeter');
                    }
                }
            }));
        },
        options: ticmeterOptions,
        onEvent: async (type, data, device, options) => {
            const endpoint = device.getEndpoint(1);
            if (!device.customClusters[TICMETER_CLUSTER]) {
                device.addCustomCluster(TICMETER_CLUSTER, ticmeterCustomCluster);
            }

            const intervalDefined = globalStore.hasValue(device, 'interval');
            if (data.data) {
                if (data.data.hasOwnProperty('ticMode')) {
                    const ticMode = modeTICEnum[data.data.ticMode];
                    globalStore.putValue(device, 'tic_mode', ticMode);
                    // settings.changeEntityOptions(device, { tic_mode: ticMode });
                }
                if (data.data.hasOwnProperty('elecMode')) {
                    const elecMode = modeElecEnum[data.data.elecMode];
                    globalStore.putValue(device, 'elec_mode', elecMode);
                }
                if (data.data.hasOwnProperty('contractType')) {
                    let contractType;
                    if (Buffer.isBuffer(data.data.contractType)) {
                        contractType = data.data.contractType.toString();
                    } else {
                        contractType = data.data.contractType;
                    }
                    globalStore.putValue(device, 'contract_type', contractType);
                }
            }

            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!intervalDefined) {
                // periodic scan for non-reportable attributs
                const seconds: number = options && options.refresh_rate ? Number(options.refresh_rate) : DEFAULT_POLL_INTERVAL;
                const interval = setInterval(async () => {
                    try {
                        await poll(endpoint, device);
                    } catch (error) {
                        /* Do nothing*/
                    }
                }, seconds * 1000);
                globalStore.putValue(device, 'interval', interval);
                globalStore.putValue(device, 'refresh_rate', seconds);
                try {
                    await poll(endpoint, device);
                } catch (e) {
                    // Do nothing
                }
            } else {
                if (intervalDefined) {
                    const seconds: number = options && options.refresh_rate ? Number(options.refresh_rate) : DEFAULT_POLL_INTERVAL;
                    const definedSeconds = globalStore.getValue(device, 'refresh_rate');
                    if (seconds != definedSeconds) {
                        clearInterval(globalStore.getValue(device, 'interval'));
                        const interval = setInterval(async () => {
                            try {
                                await poll(endpoint, device);
                            } catch (error) {
                                /* Do nothing*/
                            }
                        }, seconds * 1000);
                        globalStore.putValue(device, 'interval', interval);
                        globalStore.putValue(device, 'refresh_rate', seconds);
                    }
                }
            }
        },
        ota: ota.gmmts,
    },
];

export default definitions;
module.exports = definitions;
