import {Definition, Fz, KeyValue, Zh} from '../lib/types';
/* eslint-disable camelcase */
/* eslint-disable max-len */
/* eslint-disable no-multi-spaces */
/* eslint-disable object-curly-spacing */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as exposes from '../lib/exposes';
import * as globalStore from '../lib/store';
import * as reporting from '../lib/reporting';
import fz from '../converters/fromZigbee';
import {repInterval} from '../lib/constants';

import * as ota from '../lib/ota';
import {Buffer} from 'buffer';
import {Device} from 'zigbee-herdsman/dist/controller/model';
import {logger} from '../lib/logger';
const ea = exposes.access;
const e = exposes.presets;

const METER_ID_CLUSTER = 'haMeterIdentification'; // 0x0B01
const ELEC_MES_CLUSTER = 'haElectricalMeasurement'; // 0x0B04
const METERING_CLUSTER = 'seMetering'; // 0x0702
const TICMETER_CLUSTER = 'manuSpecificGmmts'; // 0xFF42

const STRING = 'string';
const NUMBER = 'numeric';
const ENUM = 'enum';
const TIME = 'date';

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

const mode_tic_enum = ['HISTORIQUE', 'STANDARD', 'AUTO'];
const mode_elec_enum = ['MONOPHASE', 'TRIPHASE', 'AUTO'];
const mode_contract_enum = ['AUTO', 'BASE', 'HCHP', 'EJP', 'TEMPO', 'PRODUCTEUR'];

// prettier-ignore
const ticmeter_options = [
    e.numeric(`refresh_rate`, ea.SET).withValueMin(60).withDescription(`Refresh rate in second`).withValueMin(10).withValueMax(3600),
    e.enum('tic_mode', ea.SET, mode_tic_enum).withDescription('Mode de communication TIC du Linky'),
    e.enum('contract_type', ea.SET, mode_contract_enum).withDescription('Mode de communication TIC du Linky'),
    e.enum('linky_elec', ea.SET, mode_elec_enum).withDescription('Mode électrique du Linky'),
    e.binary('producer', ea.SET, 'ON', 'OFF').withDescription('Mode producteur: affiche les index de production'),
    e.binary('advanced', ea.SET, 'ON', 'OFF').withDescription('Affiche toutes les données du compteur'),
];

// prettier-ignore
const ticmeter_data = [
    {name: 'Mode TIC',                      desc: 'Mode de communication TIC',                           cluster: TICMETER_CLUSTER,   attribute: 'ticMode',                            type: ENUM,   unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false, values: mode_tic_enum  },
    {name: 'Mode électrique',               desc: 'Mode de électrique du compteur',                      cluster: TICMETER_CLUSTER,   attribute: 'elecMode',                           type: ENUM,   unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false, values: mode_elec_enum },
    {name: 'Option tarifaire',              desc: 'Option tarifaire',                                    cluster: TICMETER_CLUSTER,   attribute: 'contractType',                       type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Durée de fonctionnement',       desc: 'Durée depuis le dernier redémmarage',                 cluster: TICMETER_CLUSTER,   attribute: 'uptime',                             type: NUMBER, unit: 's',    poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Identifiant',                   desc: 'Numéro de serie du compteur',                         cluster: METERING_CLUSTER,   attribute: 'meterSerialNumber',                  type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Puissance Max contrat',         desc: 'Puissance Max contrat',                               cluster: TICMETER_CLUSTER,   attribute: 'maxContractPower',                   type: NUMBER, unit: 'kVA',  poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index total',                   desc: 'Somme de tous les index',                             cluster: METERING_CLUSTER,   attribute: 'currentSummDelivered',               type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index BASE',                    desc: 'Index Tarif Base',                                    cluster: METERING_CLUSTER,   attribute: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.BASE,  elec: E.ANY,  producer: false                         },
    {name: 'Index HC',                      desc: 'Index Tarif Heures Creuses',                          cluster: METERING_CLUSTER,   attribute: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  producer: false                         },
    {name: 'Index HP',                      desc: 'Index Tarif Heures Pleines',                          cluster: METERING_CLUSTER,   attribute: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  producer: false                         },
    {name: 'Index EJP HN',                  desc: 'Index Tarif EJP Heures Normales',                     cluster: METERING_CLUSTER,   attribute: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
    {name: 'Index EJP HPM',                 desc: 'Index Tarif EJP Heures de Pointe Mobile',             cluster: METERING_CLUSTER,   attribute: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
    {name: 'Préavis EJP',                   desc: 'Préavis EJP',                                         cluster: TICMETER_CLUSTER,   attribute: 'startEJP',                           type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
    {name: 'Index BBRHCJB',                 desc: 'Index Tarif Heures Creuses Jours Bleus',              cluster: METERING_CLUSTER,   attribute: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false                         },
    {name: 'Index BBRHPJB',                 desc: 'Index Tarif Heures Pleines Jours Bleus',              cluster: METERING_CLUSTER,   attribute: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false                         },
    {name: 'Index BBRHCJW',                 desc: 'Index Tarif Heures Creuses Jours Blancs',             cluster: METERING_CLUSTER,   attribute: 'currentTier3SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false                         },
    {name: 'Index BBRHPJW',                 desc: 'Index Tarif Heures Pleines Jours Blancs',             cluster: METERING_CLUSTER,   attribute: 'currentTier4SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false                         },
    {name: 'Index BBRHCJR',                 desc: 'Index Tarif Heures Creuses Jours Rouges',             cluster: METERING_CLUSTER,   attribute: 'currentTier5SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false                         },
    {name: 'Index BBRHPJR',                 desc: 'Index Tarif Heures Pleines Jours Rouges',             cluster: METERING_CLUSTER,   attribute: 'currentTier6SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false                         },
    {name: 'Index 7',                       desc: 'Index 7',                                             cluster: METERING_CLUSTER,   attribute: 'currentTier7SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index 8',                       desc: 'Index 8',                                             cluster: METERING_CLUSTER,   attribute: 'currentTier8SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index 9',                       desc: 'Index 9',                                             cluster: METERING_CLUSTER,   attribute: 'currentTier9SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index 10',                      desc: 'Index 10',                                            cluster: METERING_CLUSTER,   attribute: 'currentTier10SummDelivered',         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Tarif en cours',                desc: 'Option tarifaire en cours',                           cluster: TICMETER_CLUSTER,   attribute: 'activeRegisterTierDelivered',        type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Couleur demain',                desc: 'Couleur demain',                                      cluster: TICMETER_CLUSTER,   attribute: 'tomorowColor',                       type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  producer: false                         },
    {name: 'Intensité instantanée',         desc: 'Intensité instantanée',                               cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrent',                         type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Intensité instantanée Ph A',    desc: 'Intensité instantanée Phase A',                       cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrent',                         type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Intensité instantanée Ph B',    desc: 'Intensité instantanée Phase B',                       cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentPhB',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Intensité instantanée Ph C',    desc: 'Intensité instantanée Phase C',                       cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentPhC',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Intensité maximale',            desc: 'Intensité maximale',                                  cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentMax',                      type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Intensité maximale Ph A',       desc: 'Intensité maximale Phase A',                          cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentMax',                      type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Intensité maximale Ph B',       desc: 'Intensité maximale Phase B',                          cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentMaxPhB',                   type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Intensité maximale Ph C',       desc: 'Intensité maximale Phase C',                          cluster: ELEC_MES_CLUSTER,   attribute: 'rmsCurrentMaxPhC',                   type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Dépassement de puissance',      desc: 'Dépassement de puissance',                            cluster: TICMETER_CLUSTER,   attribute: 'powerOverrun',                       type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Dépassement Itensité Ph A',     desc: 'Dépassement de puissance Phase A',                    cluster: TICMETER_CLUSTER,   attribute: 'powerOverrunA',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Dépassement Itensité Ph B',     desc: 'Dépassement de puissance Phase B',                    cluster: TICMETER_CLUSTER,   attribute: 'powerOverrunB',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Dépassement Itensité Ph C',     desc: 'Dépassement de puissance Phase C',                    cluster: TICMETER_CLUSTER,   attribute: 'powerOverrunC',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance Apparente',           desc: 'Puissance Apparente',                                 cluster: ELEC_MES_CLUSTER,   attribute: 'apparentPower',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Puissance Apparente Ph A',      desc: 'Puissance Apparente Phase A',                         cluster: ELEC_MES_CLUSTER,   attribute: 'apparentPower',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance Apparente Ph B',      desc: 'Puissance Apparente Phase B',                         cluster: ELEC_MES_CLUSTER,   attribute: 'apparentPowerPhB',                   type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance Apparente Ph C',      desc: 'Puissance Apparente Phase C',                         cluster: ELEC_MES_CLUSTER,   attribute: 'apparentPowerPhC',                   type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Index énergie injectée',        desc: 'Index énergie injectée',                              cluster: METERING_CLUSTER,   attribute: 'currentSummReceived',                type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true                          },
    {name: 'Puissance injectée',            desc: 'Puissance injectée',                                  cluster: TICMETER_CLUSTER,   attribute: 'powerInjected',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true                          },
    {name: 'Puissance max injectée Auj.',   desc: 'Puissance max injectée Aujourd\'hui',                 cluster: TICMETER_CLUSTER,   attribute: 'powerMaxInjected',                   type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true                          },
    {name: 'Heure PMAX injectée Auj.',      desc: 'Date et Heure puissance max injectée aujourd\'hui',   cluster: TICMETER_CLUSTER,   attribute: 'powerMaxInjectedTime',               type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true                          },
    {name: 'Puissance max injectée Hier',   desc: 'Puissance max injectée Hier',                         cluster: TICMETER_CLUSTER,   attribute: 'powerMaxInjectedYesterday',          type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true                          },
    {name: 'Heure PMAX injectée Hier',      desc: 'Date et Heure puissance max injectée hier',           cluster: TICMETER_CLUSTER,   attribute: 'powerMaxInjectedYesterdayTime',      type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true                          },
    {name: 'Présence de potentiels',        desc: 'Présence de potentiels',                              cluster: TICMETER_CLUSTER,   attribute: 'potentialPresence',                  type: NUMBER, unit: '',     poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Horaire Heures Creuses',        desc: 'Horaire Heures Creuses',                              cluster: TICMETER_CLUSTER,   attribute: 'hcHours',                            type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Registre Status',               desc: 'Registre de status du compteur',                      cluster: TICMETER_CLUSTER,   attribute: 'motdetat',                           type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index 1 Distributeur',          desc: 'Index 1 Energie soutirée Distributeur',               cluster: TICMETER_CLUSTER,   attribute: 'index1Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index 2 Distributeur',          desc: 'Index 2 Energie soutirée Distributeur',               cluster: TICMETER_CLUSTER,   attribute: 'index2Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index 3 Distributeur',          desc: 'Index 3 Energie soutirée Distributeur',               cluster: TICMETER_CLUSTER,   attribute: 'index3Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Index 4 Distributeur',          desc: 'Index 4 Energie soutirée Distributeur',               cluster: TICMETER_CLUSTER,   attribute: 'index4Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Tension instantanée',           desc: 'Tension instantanée efficace',                        cluster: ELEC_MES_CLUSTER,   attribute: 'rmsVoltage',                         type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Tension instantanée Ph A',      desc: 'Tension instantanée efficace Phase A',                cluster: ELEC_MES_CLUSTER,   attribute: 'rmsVoltage',                         type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Tension instantanée Ph B',      desc: 'Tension instantanée efficace Phase B',                cluster: ELEC_MES_CLUSTER,   attribute: 'rmsVoltagePhB',                      type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Tension instantanée Ph C',      desc: 'Tension instantanée efficace Phase C',                cluster: ELEC_MES_CLUSTER,   attribute: 'rmsVoltagePhC',                      type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Tension moyenne',               desc: 'Tension moyenne',                                     cluster: ELEC_MES_CLUSTER,   attribute: 'averageRmsVoltageMeasPeriod',        type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Tension moyenne Ph A',          desc: 'Tension moyenne Phase A',                             cluster: ELEC_MES_CLUSTER,   attribute: 'averageRmsVoltageMeasPeriod',        type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Tension moyenne Ph B',          desc: 'Tension moyenne Phase B',                             cluster: ELEC_MES_CLUSTER,   attribute: 'averageRmsVoltageMeasurePeriodPhB',  type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Tension moyenne Ph C',          desc: 'Tension moyenne Phase C',                             cluster: ELEC_MES_CLUSTER,   attribute: 'averageRmsVoltageMeasPeriodPhC',     type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance max Auj',             desc: 'Puissance max Aujourd\'hui',                          cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMax',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Heure Puissance max Auj',       desc: 'Date et Heure de la puissance max aujourd\'hui',      cluster: TICMETER_CLUSTER,   attribute: 'powerMaxTodayTime',                  type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Puissance max Auj Ph A',        desc: 'Puissance max Aujourd\'hui Phase A',                  cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMax',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Heure Puissance max Auj Ph A',  desc: 'Date et Heure de la puissance max aujourd\'hui Ph A', cluster: TICMETER_CLUSTER,   attribute: 'powerMaxToday1Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance max Auj Ph B',        desc: 'Puissance max Aujourd\'hui Phase B',                  cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMaxPhB',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Heure Puissance max Auj Ph B',  desc: 'Date et Heure de la puissance max aujourd\'hui Ph B', cluster: TICMETER_CLUSTER,   attribute: 'powerMaxToday2Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance max Auj Ph C',        desc: 'Puissance max Aujourd\'hui Phase C',                  cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMaxPhC',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Heure Puissance max Auj Ph C',  desc: 'Date et Heure de la puissance max aujourd\'hui Ph C', cluster: TICMETER_CLUSTER,   attribute: 'powerMaxToday3Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance maximale triphasée',  desc: 'Puissance maximale triphasée',                        cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerMax',                     type: NUMBER, unit: 'W',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance max Hier',            desc: 'Puissance max Hier',                                  cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Heure Puissance max Hier',      desc: 'Date et Heure de la puissance max hier',              cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterdayTime',              type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, producer: false                         },
    {name: 'Puissance max Hier Ph A',       desc: 'Puissance max Hier Phase A',                          cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday1',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Heure Puissance max Hier Ph A', desc: 'Date et Heure de la puissance max hier Ph A',         cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday1Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance max Hier Ph B',       desc: 'Puissance max Hier Phase B',                          cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday2',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Heure Puissance max Hier Ph B', desc: 'Date et Heure de la puissance max hier Ph B',         cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday2Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Puissance max Hier Ph C',       desc: 'Puissance max Hier Phase C',                          cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday3',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Heure Puissance max Hier Ph C', desc: 'Date et Heure de la puissance max hier Ph C',         cluster: TICMETER_CLUSTER,   attribute: 'powerMaxYesterday3Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  producer: false                         },
    {name: 'Index en cours',                desc: 'Numeréo de l\'index tarifaire en cours',              cluster: TICMETER_CLUSTER,   attribute: 'currentIndex',                       type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'N° jours en cours',             desc: 'N° jours en cours fournisseur',                       cluster: TICMETER_CLUSTER,   attribute: 'calendarSupplierDay',                type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'N° prochain jour',              desc: 'N° prochain jour fournisseur',                        cluster: TICMETER_CLUSTER,   attribute: 'nextSupplierCalendarDay',            type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Relais',                        desc: 'Relais virtuel du compteur',                          cluster: TICMETER_CLUSTER,   attribute: 'relays',                             type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'PMR',                           desc: 'Identifiant Point Référence Mesure',                  cluster: METERING_CLUSTER,   attribute: 'siteId',                             type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Message court',                 desc: 'Message court',                                       cluster: TICMETER_CLUSTER,   attribute: 'shortMsg',                           type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Message ultra court',           desc: 'Message ultra court',                                 cluster: TICMETER_CLUSTER,   attribute: 'ultraShortMsg',                      type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Version de la TIC',             desc: 'Version de la TIC',                                   cluster: TICMETER_CLUSTER,   attribute: 'ticVersion',                         type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Date et heure Compteur',        desc: 'Date et heure du compteur',                           cluster: TICMETER_CLUSTER,   attribute: 'date',                               type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Profil prochain jour',          desc: 'Profil du prochain jour',                             cluster: TICMETER_CLUSTER,   attribute: 'calendarDay',                        type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Profil prochain jour pointe',   desc: 'Profil du prochain jour pointe',                      cluster: TICMETER_CLUSTER,   attribute: 'calendarDayPointe',                  type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Point n courbe soutirée',       desc: 'Point n de la courbe de charge active soutirée',      cluster: ELEC_MES_CLUSTER,   attribute: 'activePower',                        type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Point n-1 courbe soutirée',     desc: 'Point n-1 de la courbe de charge active soutirée',    cluster: ELEC_MES_CLUSTER,   attribute: 'activePowerPhB',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Point n courbe injectée',       desc: 'Point n de la courbe de charge active injectée',      cluster: TICMETER_CLUSTER,   attribute: 'injectedLoadN',                      type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true                          },
    {name: 'Point n-1 courbe injectée',     desc: 'Point n-1 de la courbe de charge active injectée',    cluster: TICMETER_CLUSTER,   attribute: 'injectedLoadN_1',                    type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: true                          },
    {name: 'Energie réactive Q1 totale',    desc: 'Energie réactive Q1 totale',                          cluster: ELEC_MES_CLUSTER,   attribute: 'totalReactivePower',                 type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Energie réactive Q2 totale',    desc: 'Energie réactive Q2 totale',                          cluster: ELEC_MES_CLUSTER,   attribute: 'reactivePower',                      type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Energie réactive Q3 totale',    desc: 'Energie réactive Q3 totale',                          cluster: ELEC_MES_CLUSTER,   attribute: 'reactivePowerPhB',                   type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Energie réactive Q4 totale',    desc: 'Energie réactive Q4 totale',                          cluster: ELEC_MES_CLUSTER,   attribute: 'reactivePowerPhC',                   type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  producer: false                         },
    {name: 'Début Pointe Mobile 1',         desc: 'Début Pointe Mobile 1',                               cluster: TICMETER_CLUSTER,   attribute: 'startEJP1',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
    {name: 'Fin Pointe Mobile 1',           desc: 'Fin Pointe Mobile 1',                                 cluster: TICMETER_CLUSTER,   attribute: 'stopEJP1',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
    {name: 'Début Pointe Mobile 2',         desc: 'Début Pointe Mobile 2',                               cluster: TICMETER_CLUSTER,   attribute: 'startEJP2',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
    {name: 'Fin Pointe Mobile 2',           desc: 'Fin Pointe Mobile 2',                                 cluster: TICMETER_CLUSTER,   attribute: 'stopEJP2',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
    {name: 'Début Pointe Mobile 3',         desc: 'Début Pointe Mobile 3',                               cluster: TICMETER_CLUSTER,   attribute: 'startEJP3',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
    {name: 'Fin Pointe Mobile 3',           desc: 'Fin Pointe Mobile 3',                                 cluster: TICMETER_CLUSTER,   attribute: 'stopEJP3',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  producer: false                         },
];

function toSnakeCase(str: string) {
    return str.split(/(?=[A-Z])/).join('_').toLowerCase();
}

const fzLocal = {
    ticmeter_ha_electrical_measurement: {
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
                const at_snake = at
                    .split(/(?=[A-Z])/)
                    .join('_')
                    .toLowerCase();
                if (msg.data[at] != null) {
                    result[at_snake] = msg.data[at];
                }
            }
            return result;
        },
    } satisfies Fz.Converter,

    ticmeter_cluster_fz: {
        cluster: TICMETER_CLUSTER,
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const keys = Object.keys(msg.data);
            keys.forEach((key) => {
                const found = ticmeter_data.find((x) => x.attribute == key);
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
                        value = new Date(msg.data[key] * 1000).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
                        break;
                    }
                    result[toSnakeCase(found.attribute)] = value;
                } else {
                    logger.warn(`TICMeter: key not found: ${key}`);
                }
            });
            return result;
        },
    } satisfies Fz.Converter,

    ticmeter_metering: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const elements = [
                'currentSummDelivered',
                'currentSummReceived',
                'activeRegisterTierDelivered',
                'currentTier1SummDelivered',
                'currentTier2SummDelivered',
                'currentTier3SummDelivered',
                'currentTier4SummDelivered',
                'currentTier5SummDelivered',
                'currentTier6SummDelivered',
                'currentTier7SummDelivered',
                'currentTier8SummDelivered',
                'currentTier9SummDelivered',
                'currentTier10SummDelivered',
                'siteId',
                'meterSerialNumber',
            ];
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
                        result[at_snake] = (val[0] << 32) + val[1];
                        break;
                    }
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
};

function split_tab(tableau: any, taille: number): string[][] {
    const result: any[][] = [];
    for (let i = 0; i < tableau.length; i += taille) {
        result.push(tableau.slice(i, i + taille));
    }
    return result;
}

async function poll(endpoint: Zh.Endpoint, device: Device) {
    const current_contract = globalStore.getValue(device, 'contract_type');
    const current_elec = globalStore.getValue(device, 'elec_mode');
    const current_tic = globalStore.getValue(device, 'tic_mode');
    const current_producer = globalStore.getValue(device, 'producer');
    logger.info(`TICMeter: Polling: ${current_contract} ${current_elec} ${current_tic} ${current_producer}`);
    const start: any = new Date();

    let to_read = [];
    for (const item of ticmeter_data) {
        if (item.poll && (item.tic == current_tic || item.tic == T.ANY) && (item.contract == current_contract || item.contract == C.ANY) && (item.elec == current_elec || item.elec == E.ANY)) {
            to_read.push(item);
        }
    }

    to_read = to_read.sort((a, b) => a.cluster.localeCompare(b.cluster));
    const groupedByCluster: { [key: string]: any } = {};
    to_read.forEach((item) => {
        if (!groupedByCluster[item.cluster]) {
            groupedByCluster[item.cluster] = [];
        }
        groupedByCluster[item.cluster].push(item);
    });
    const splited = Object.keys(groupedByCluster).map((cluster) => {
        return {
            cluster: cluster,
            attributes: split_tab(
                groupedByCluster[cluster].map((item: any) => item.attribute),
                3,
            ),
        };
    });
    for (const item of splited) {
        for (const attr of item.attributes) {
            await endpoint
                .read(item.cluster, attr)
                .catch((e) => {
                    logger.warn(`TICMeter: Polling Error: ${attr} ${e}`);
                })
                .then((result) => {});
        }
    }
    const end: any = new Date();
    logger.info(`TICMeter: Polling Duration: ${end - start} ms`);
}

function init_config(device: Device, name: string, value: any) {
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
        toZigbee: [],
        exposes: (device, options) => {
            let endpoint: Zh.Endpoint;
            const exposes: any[] = [];

            let current_contract: any = '';
            let current_elec: any = '';
            let current_tic: any = '';
            let current_producer: any = '';

            if (device == null) {
                return [];
            }

            try {
                endpoint = device.getEndpoint(1);
            } catch (error) {
                logger.warn('TICMeter: Exposes: No endpoint');
            }
            if (endpoint != null && endpoint.hasOwnProperty('clusters') && endpoint.clusters[TICMETER_CLUSTER] != undefined) {
                if (endpoint.clusters[TICMETER_CLUSTER].hasOwnProperty('attributes') && endpoint.clusters[TICMETER_CLUSTER].attributes != undefined) {
                    const attr = endpoint.clusters[TICMETER_CLUSTER].attributes;

                    if (globalStore.getValue(device, 'tic_mode') == undefined) {
                        if (attr.hasOwnProperty('ticMode') && attr.ticMode != null) {
                            logger.info(`TICMeter: Load ticMode: ${attr.ticMode}`);
                            globalStore.putValue(device, 'tic_mode', mode_tic_enum[Number(attr.ticMode)]);
                        }
                    }

                    if (globalStore.getValue(device, 'elec_mode') == undefined) {
                        if (attr.hasOwnProperty('elecMode') && attr.elecMode != null) {
                            logger.info(`TICMeter: Load elecMode: ${attr.elecMode}`);
                            globalStore.putValue(device, 'elec_mode', mode_elec_enum[Number(attr.elecMode)]);
                        }
                    }

                    if (globalStore.getValue(device, 'contract_type') == undefined) {
                        if (attr.hasOwnProperty('contractType') && attr.contractType != null) {
                            let string: any = attr.contractType;
                            if (Buffer.isBuffer(string)) {
                                string = string.toString();
                            }
                            logger.info(`TICMeter: Load contractType: ${string}`);
                            globalStore.putValue(device, 'contract_type', string);
                        }
                    }

                    if (attr.hasOwnProperty('powerInjected') && attr.powerInjected != null) {
                        logger.info(`TICMeter: Load powerInjected: ${attr.powerInjected}`);
                        globalStore.putValue(device, 'producer', 'ON');
                    }
                }
            }

            if (options && options.hasOwnProperty('contract_type') && options.contract_type != 'AUTO') {
                current_contract = options.contract_type;
                logger.debug(`TICMeter: contract: ${current_contract}`);
            } else {
                current_contract = globalStore.getValue(device, 'contract_type');
                logger.debug(`TICMeter: contract: ${current_contract}`);
                if (current_contract == undefined) {
                    logger.debug('TICMeter: Force contract to AUTO');
                    current_contract = 'AUTO';
                }
            }

            if (options && options.hasOwnProperty('linky_elec') && options.linky_elec != 'AUTO') {
                current_elec = options.linky_elec;
                logger.debug(`TICMeter: Manual elec: ${current_elec}`);
            } else {
                current_elec = globalStore.getValue(device, 'elec_mode');
                logger.debug(`TICMeter: AUTO elec: ${current_elec}`);
                if (current_elec == undefined) {
                    logger.debug('TICMeter: Force elec to AUTO');
                    current_elec = 'AUTO';
                }
            }

            if (options && options.hasOwnProperty('tic_mode') && options.tic_mode != 'AUTO') {
                current_tic = options.tic_mode;
                logger.debug(`TICMeter: Manual tic: ${current_tic}`);
            } else {
                current_tic = globalStore.getValue(device, 'tic_mode');
                logger.debug(`TICMeter: TIC: ${current_tic}`);
                if (current_tic == undefined) {
                    logger.debug('TICMeter: Force TIC to AUTO');
                    current_tic = 'AUTO';
                }
            }

            if (options && options.hasOwnProperty('producer') && options.producer != 'AUTO') {
                current_producer = options.producer;
                logger.debug(`TICMeter: Manual producer: ${current_producer}`);
            } else {
                current_producer = globalStore.getValue(device, 'producer');
                if (current_producer == undefined) {
                    logger.debug('TICMeter: Force producer to AUTO');
                    current_producer = 'OFF';
                }
            }

            globalStore.putValue(device, 'contract_type', current_contract);
            globalStore.putValue(device, 'elec_mode', current_elec);
            globalStore.putValue(device, 'tic_mode', current_tic);
            globalStore.putValue(device, 'producer', current_producer);


            ticmeter_data.forEach((item: any) => {
                let contract_ok = false;
                let elec_ok = false;
                let tic_ok = false;
                let producer_ok = true;
                if (item.hasOwnProperty('contract')) {
                    if (item['contract'] == current_contract || item['contract'] == C.ANY) {
                        contract_ok = true;
                    }
                } else {
                    logger.warn(`TICMeter: No contract for ${item.name}`);
                }

                if (item.hasOwnProperty('elec')) {
                    if (item['elec'] == current_elec || item['elec'] == E.ANY) {
                        elec_ok = true;
                    }
                } else {
                    logger.warn(`TICMeter: No elec for ${item.name}`);
                }

                if (item.hasOwnProperty('tic')) {
                    if (item['tic'] == current_tic || item['tic'] == T.ANY) {
                        tic_ok = true;
                    }
                } else {
                    logger.warn(`TICMeter: No tic for ${item.name}`);
                }

                if (item.hasOwnProperty('producer')) {
                    if (item['producer'] == true && current_producer == 'OFF') {
                        producer_ok = false;
                    }
                } else {
                    logger.warn(`TICMeter: No producer for ${item.name}`);
                }

                if (contract_ok && elec_ok && tic_ok && producer_ok) {
                    switch (item.type) {
                    case STRING:
                        exposes.push(e.text(item.name, ea.STATE).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc));
                        break;
                    case NUMBER:
                        exposes.push(e.numeric(item.name, ea.STATE).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc).withUnit(item.unit));
                        break;
                    case ENUM:
                        exposes.push(e.enum(item.name, ea.STATE, item.values).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc));
                        break;
                    case TIME:
                        exposes.push(e.text(item.name, ea.STATE).withProperty(toSnakeCase(item.attribute)).withDescription(item.desc));
                        break;
                    }
                }
            });
            logger.info(`TICMeter: Exposes ${exposes.length} attributes`);

            exposes.push(e.linkquality());

            return exposes;
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            logger.info('TICMeter: Configure');
            device.powerSource = 'Battery';
            device.save();
            const endpoint = device.getEndpoint(1);

            const tic_mode = init_config(device, 'tic_mode', 'AUTO');
            const contract_type = init_config(device, 'contract_type', 'AUTO');
            const elec_mode = init_config(device, 'elec_mode', 'AUTO');
            const producer = init_config(device, 'producer', false);
            init_config(device, 'refresh_rate', '60');
            
            logger.info(`TICMeter: Configure: ${tic_mode} ${contract_type} ${elec_mode} ${producer}`);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', { acCurrentDivisor: 1, acCurrentMultiplier: 1 });
            endpoint.saveClusterAttributeKeyValue('seMetering', { divisor: 1, multiplier: 1 });

            await reporting.bind(endpoint, coordinatorEndpoint, [
                TICMETER_CLUSTER,
                ELEC_MES_CLUSTER,
                METERING_CLUSTER,
                METER_ID_CLUSTER,
            ]);

            const reporting_config: any []= [];

            const wanted: any[] = [];
            for (const item of ticmeter_data) {
                if (!item.poll && (item.tic == tic_mode || item.tic == T.ANY) && (item.contract == contract_type || item.contract == C.ANY) && (item.elec == elec_mode || item.elec == E.ANY) && (item.producer == producer || item.producer == false)) {
                    wanted.push(item);
                }
            }

            logger.info(`TICMeter: Configure wanted ${wanted.length}`);

            endpoint.configuredReportings.forEach(async (r) => {
                await endpoint.configureReporting(r.cluster.name, reporting.payload(r.attribute.name, r.minimumReportInterval, 65535, r.reportableChange), { manufacturerCode: null });
            });

            for (const item of wanted) {
                let conf = {
                    attribute: item.attribute,
                    change: 1,
                    min: repInterval.SECONDS_10,
                    max: repInterval.MINUTES_10,
                };

                if (item.hasOwnProperty('report')) {
                    conf = {
                        ...conf,
                        ...item.report,
                    };
                }
                logger.info(`TICMeter: Configure ${item.name} ${item.cluster} ${item.attribute} ${conf.min} ${conf.max} ${conf.change}`);
                reporting_config.push(endpoint.configureReporting(item.cluster, reporting.payload(item.attribute, conf.min, conf.max, conf.change), { manufacturerCode: null }));
            }

            await Promise.allSettled(reporting_config.map(async (config) => {
                try {
                    await config;
                } catch (error) {
                    logger.warn(`TICMeter: Configure failed: ${error}`);
                    throw error;
                }
            }));
        },
        options: ticmeter_options,
        onEvent: async (type, data, device, options) => {
            const endpoint = device.getEndpoint(1);
            const intervalDefined = globalStore.hasValue(device, 'interval');

            if (data.data) {
                if (data.data.hasOwnProperty('ticMode')) {
                    const ticMode = mode_tic_enum[data.data.ticMode];
                    globalStore.putValue(device, 'tic_mode', ticMode);
                    // settings.changeEntityOptions(device, { tic_mode: ticMode });
                }
                if (data.data.hasOwnProperty('elecMode')) {
                    const elecMode = mode_elec_enum[data.data.elecMode];
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
                const seconds: any = options && options.refresh_rate ? options.refresh_rate : 60;
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
                    const seconds: any = options && options.refresh_rate ? options.refresh_rate : 120;
                    const defined_seconds = globalStore.getValue(device, 'refresh_rate');
                    if (seconds != defined_seconds) {
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
