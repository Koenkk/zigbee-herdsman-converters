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
const CLUSTER_ELE = 'haElectricalMeasurement'; // 0x0B04
const CLUSTER_MET = 'seMetering'; // 0x0702
const CLUSTER_TIC = 'manuSpecificGmmts'; // 0xFF42

const STRING = 'string';
const NUMBER = 'numeric';
const NUM_RW = 'read/write numeric';
const ENUM = 'enum';
const TIME = 'date';

const TRANSLATION_EN = 'ENGLISH';
const TRANSLATION_FR = 'FRANCAIS';


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

interface TICMeterData {
    id: number;
    name: string;
    desc: string;
    clust: string;
    attr: string;
    type: string;
    unit: string;
    poll: boolean;
    tic: string;
    contract: string;
    elec: string;
    prod: boolean;
    values?: string[];
    min?: number;
    max?: number;
}


interface Translation  {
    nameFR?: string;
    descFR: string;
    descEN?: string;
}

type Translations = {
    [key: number]: Translation;
};

const ticmeterOptionsFRTr: Translations = {
    0: {descEN: `Refresh rate for static values (those with refresh buttons). Default: ${DEFAULT_POLL_INTERVAL} s`, descFR: `Temps d'actualisation des valeurs statiques (celles qui possèdent des boutons refresh). Par défaut: ${DEFAULT_POLL_INTERVAL} s`},
    1: {descEN: 'Linky TIC communication mode. Defaults to AUTO mode. To be used in case of problem', descFR: 'Mode de communication TIC du Linky. Par défaut en mode AUTO. À utiliser en cas de problème'},
    2: {descEN: 'Current electricity contract on Linky. Defaults to AUTO mode. Displays the correct entities. To be used in case of problem', descFR: 'Contrat électrique actuel sur le Linky. Par défaut en mode AUTO. Permet d\'afficher les bonnes entités. À utiliser en cas de problème'},
    3: {descEN: 'Linky electrical mode. Defaults to AUTO mode. To be used in case of problem', descFR: 'Mode électrique du Linky. Par défaut en mode AUTO. À utiliser en cas de problème'},
    4: {descEN: 'Producer mode: displays electricity production indexes. Default: OFF', descFR: 'Mode producteur: affiche les index de production électrique. Par défaut: OFF'},
    5: {descEN: 'Displays all meter data. For advanced use. Default: OFF', descFR: 'Affiche toutes les données du compteur. Pour un usage avancé. Par défaut: OFF'},
    6: {descEN: 'Language: Default French', descFR: 'Langue. Par défaut Francais'},
};

const ticmeterOptions = [
    e.numeric(`refresh_rate`, ea.SET).withValueMin(60).withDescription(ticmeterOptionsFRTr[0].descEN).withValueMin(60).withValueMax(3600),
    e.enum('tic_mode', ea.SET, modeTICEnum).withDescription(ticmeterOptionsFRTr[1].descEN),
    e.enum('contract_type', ea.SET, modeContractEnum).withDescription(ticmeterOptionsFRTr[2].descEN),
    e.enum('linky_elec', ea.SET, modeElecEnum).withDescription(ticmeterOptionsFRTr[3].descEN),
    e.binary('producer', ea.SET, 'ON', 'OFF').withDescription(ticmeterOptionsFRTr[4].descEN),
    e.binary('advanced', ea.SET, 'ON', 'OFF').withDescription(ticmeterOptionsFRTr[5].descEN),
    e.enum('translation', ea.SET, [TRANSLATION_FR, TRANSLATION_EN]).withDescription(ticmeterOptionsFRTr[6].descEN),
];


const ticmeterDatasFRTranslation: Translations = {
    0: {nameFR: 'Mode TIC',                       descFR: 'Mode de communication TIC'},
    1: {nameFR: 'Mode électrique',                descFR: 'Mode de électrique du compteur'},
    2: {nameFR: 'Option tarifaire',               descFR: 'Option tarifaire'},
    3: {nameFR: 'Durée de fonctionnement',        descFR: 'Durée depuis le dernier redémmarage'},
    4: {nameFR: 'Durée d\'actualisation',         descFR: 'Durée entre les actualisations'},
    5: {nameFR: 'Identifiant',                    descFR: 'Numéro de serie du compteur'},
    6: {nameFR: 'Puissance Max contrat',          descFR: 'Puissance Max contrat'},
    7: {nameFR: 'Index total',                    descFR: 'Somme de tous les index'},
    8: {nameFR: 'Index BASE',                     descFR: 'Index Tarif Base'},
    9: {nameFR: 'Index HC',                       descFR: 'Index Tarif Heures Creuses'},
    10: {nameFR: 'Index HP',                      descFR: 'Index Tarif Heures Pleines'},
    11: {nameFR: 'Index EJP HN',                  descFR: 'Index Tarif EJP Heures Normales'},
    12: {nameFR: 'Index EJP HPM',                 descFR: 'Index Tarif EJP Heures de Pointe Mobile'},
    13: {nameFR: 'Préavis EJP',                   descFR: 'Préavis EJP'},
    14: {nameFR: 'Index BBRHCJB',                 descFR: 'Index Tarif Heures Creuses Jours Bleus'},
    15: {nameFR: 'Index BBRHPJB',                 descFR: 'Index Tarif Heures Pleines Jours Bleus'},
    16: {nameFR: 'Index BBRHCJW',                 descFR: 'Index Tarif Heures Creuses Jours Blancs'},
    17: {nameFR: 'Index BBRHPJW',                 descFR: 'Index Tarif Heures Pleines Jours Blancs'},
    18: {nameFR: 'Index BBRHCJR',                 descFR: 'Index Tarif Heures Creuses Jours Rouges'},
    19: {nameFR: 'Index BBRHPJR',                 descFR: 'Index Tarif Heures Pleines Jours Rouges'},
    20: {nameFR: 'Index 7',                       descFR: 'Index 7'},
    21: {nameFR: 'Index 8',                       descFR: 'Index 8'},
    22: {nameFR: 'Index 9',                       descFR: 'Index 9'},
    23: {nameFR: 'Index 10',                      descFR: 'Index 10'},
    24: {nameFR: 'Tarif en cours',                descFR: 'Option tarifaire en cours'},
    25: {nameFR: 'Couleur demain',                descFR: 'Couleur demain'},
    26: {nameFR: 'Intensité instantanée',         descFR: 'Intensité instantanée'},
    27: {nameFR: 'Intensité instantanée Ph A',    descFR: 'Intensité instantanée Phase A'},
    28: {nameFR: 'Intensité instantanée Ph B',    descFR: 'Intensité instantanée Phase B'},
    29: {nameFR: 'Intensité instantanée Ph C',    descFR: 'Intensité instantanée Phase C'},
    30: {nameFR: 'Intensité maximale',            descFR: 'Intensité maximale'},
    31: {nameFR: 'Intensité maximale Ph A',       descFR: 'Intensité maximale Phase A'},
    32: {nameFR: 'Intensité maximale Ph B',       descFR: 'Intensité maximale Phase B'},
    33: {nameFR: 'Intensité maximale Ph C',       descFR: 'Intensité maximale Phase C'},
    34: {nameFR: 'Dépassement de puissance',      descFR: 'Dépassement de puissance'},
    35: {nameFR: 'Dépassement Itensité Ph A',     descFR: 'Dépassement de puissance Phase A'},
    36: {nameFR: 'Dépassement Itensité Ph B',     descFR: 'Dépassement de puissance Phase B'},
    37: {nameFR: 'Dépassement Itensité Ph C',     descFR: 'Dépassement de puissance Phase C'},
    38: {nameFR: 'Puissance Apparente',           descFR: 'Puissance Apparente'},
    39: {nameFR: 'Puissance Apparente Ph A',      descFR: 'Puissance Apparente Phase A'},
    40: {nameFR: 'Puissance Apparente Ph B',      descFR: 'Puissance Apparente Phase B'},
    41: {nameFR: 'Puissance Apparente Ph C',      descFR: 'Puissance Apparente Phase C'},
    42: {nameFR: 'Index énergie injectée',        descFR: 'Index énergie injectée'},
    43: {nameFR: 'Puissance injectée',            descFR: 'Puissance injectée'},
    44: {nameFR: 'Puissance max injectée Auj.',   descFR: 'Puissance max injectée Aujourd\'hui'},
    45: {nameFR: 'Heure PMAX injectée Auj.',      descFR: 'Date et Heure puissance max injectée aujourd\'hui'},
    46: {nameFR: 'Puissance max injectée Hier',   descFR: 'Puissance max injectée Hier'},
    47: {nameFR: 'Heure PMAX injectée Hier',      descFR: 'Date et Heure puissance max injectée hier'},
    48: {nameFR: 'Présence de potentiels',        descFR: 'Présence de potentiels'},
    49: {nameFR: 'Horaire Heures Creuses',        descFR: 'Horaire Heures Creuses'},
    50: {nameFR: 'Registre Status',               descFR: 'Registre de status du compteur'},
    51: {nameFR: 'Index 1 Distributeur',          descFR: 'Index 1 Energie soutirée Distributeur'},
    52: {nameFR: 'Index 2 Distributeur',          descFR: 'Index 2 Energie soutirée Distributeur'},
    53: {nameFR: 'Index 3 Distributeur',          descFR: 'Index 3 Energie soutirée Distributeur'},
    54: {nameFR: 'Index 4 Distributeur',          descFR: 'Index 4 Energie soutirée Distributeur'},
    55: {nameFR: 'Tension instantanée',           descFR: 'Tension instantanée efficace'},
    56: {nameFR: 'Tension instantanée Ph A',      descFR: 'Tension instantanée efficace Phase A'},
    57: {nameFR: 'Tension instantanée Ph B',      descFR: 'Tension instantanée efficace Phase B'},
    58: {nameFR: 'Tension instantanée Ph C',      descFR: 'Tension instantanée efficace Phase C'},
    59: {nameFR: 'Tension moyenne',               descFR: 'Tension moyenne'},
    60: {nameFR: 'Tension moyenne Ph A',          descFR: 'Tension moyenne Phase A'},
    61: {nameFR: 'Tension moyenne Ph B',          descFR: 'Tension moyenne Phase B'},
    62: {nameFR: 'Tension moyenne Ph C',          descFR: 'Tension moyenne Phase C'},
    63: {nameFR: 'Puissance max Auj',             descFR: 'Puissance max Aujourd\'hui'},
    64: {nameFR: 'Heure Puissance max Auj',       descFR: 'Date et Heure de la puissance max aujourd\'hui'},
    65: {nameFR: 'Puissance max Auj Ph A',        descFR: 'Puissance max Aujourd\'hui Phase A'},
    66: {nameFR: 'Heure Puissance max Auj Ph A',  descFR: 'Date et Heure de la puissance max aujourd\'hui Ph A'},
    67: {nameFR: 'Puissance max Auj Ph B',        descFR: 'Puissance max Aujourd\'hui Phase B'},
    68: {nameFR: 'Heure Puissance max Auj Ph B',  descFR: 'Date et Heure de la puissance max aujourd\'hui Ph B'},
    69: {nameFR: 'Puissance max Auj Ph C',        descFR: 'Puissance max Aujourd\'hui Phase C'},
    70: {nameFR: 'Heure Puissance max Auj Ph C',  descFR: 'Date et Heure de la puissance max aujourd\'hui Ph C'},
    71: {nameFR: 'Puissance maximale triphasée',  descFR: 'Puissance maximale triphasée'},
    72: {nameFR: 'Puissance max Hier',            descFR: 'Puissance max Hier'},
    73: {nameFR: 'Heure Puissance max Hier',      descFR: 'Date et Heure de la puissance max hier'},
    74: {nameFR: 'Puissance max Hier Ph A',       descFR: 'Puissance max Hier Phase A'},
    75: {nameFR: 'Heure Puissance max Hier Ph A', descFR: 'Date et Heure de la puissance max hier Ph A'},
    76: {nameFR: 'Puissance max Hier Ph B',       descFR: 'Puissance max Hier Phase B'},
    77: {nameFR: 'Heure Puissance max Hier Ph B', descFR: 'Date et Heure de la puissance max hier Ph B'},
    78: {nameFR: 'Puissance max Hier Ph C',       descFR: 'Puissance max Hier Phase C'},
    79: {nameFR: 'Heure Puissance max Hier Ph C', descFR: 'Date et Heure de la puissance max hier Ph C'},
    80: {nameFR: 'Index en cours',                descFR: 'Numeréo de l\'index tarifaire en cours'},
    81: {nameFR: 'N° jours en cours',             descFR: 'N° jours en cours fournisseur'},
    82: {nameFR: 'N° prochain jour',              descFR: 'N° prochain jour fournisseur'},
    83: {nameFR: 'Relais',                        descFR: 'Relais virtuel du compteur'},
    84: {nameFR: 'PMR',                           descFR: 'Identifiant Point Référence Mesure'},
    85: {nameFR: 'Message court',                 descFR: 'Message court'},
    86: {nameFR: 'Message ultra court',           descFR: 'Message ultra court'},
    87: {nameFR: 'Version de la TIC',             descFR: 'Version de la TIC'},
    88: {nameFR: 'Date et heure Compteur',        descFR: 'Date et heure du compteur'},
    89: {nameFR: 'Profil prochain jour',          descFR: 'Profil du prochain jour'},
    90: {nameFR: 'Profil prochain jour pointe',   descFR: 'Profil du prochain jour pointe'},
    91: {nameFR: 'Point n courbe soutirée',       descFR: 'Point n de la courbe de charge active soutirée'},
    92: {nameFR: 'Point n-1 courbe soutirée',     descFR: 'Point n-1 de la courbe de charge active soutirée'},
    93: {nameFR: 'Point n courbe injectée',       descFR: 'Point n de la courbe de charge active injectée'},
    94: {nameFR: 'Point n-1 courbe injectée',     descFR: 'Point n-1 de la courbe de charge active injectée'},
    95: {nameFR: 'Energie réactive Q1 totale',    descFR: 'Energie réactive Q1 totale'},
    96: {nameFR: 'Energie réactive Q2 totale',    descFR: 'Energie réactive Q2 totale'},
    97: {nameFR: 'Energie réactive Q3 totale',    descFR: 'Energie réactive Q3 totale'},
    98: {nameFR: 'Energie réactive Q4 totale',    descFR: 'Energie réactive Q4 totale'},
    99: {nameFR: 'Début Pointe Mobile 1',         descFR: 'Début Pointe Mobile 1'},
    100: {nameFR: 'Fin Pointe Mobile 1',          descFR: 'Fin Pointe Mobile 1'},
    101: {nameFR: 'Début Pointe Mobile 2',        descFR: 'Début Pointe Mobile 2'},
    102: {nameFR: 'Fin Pointe Mobile 2',          descFR: 'Fin Pointe Mobile 2'},
    103: {nameFR: 'Début Pointe Mobile 3',        descFR: 'Début Pointe Mobile 3'},
    104: {nameFR: 'Fin Pointe Mobile 3',          descFR: 'Fin Pointe Mobile 3'},
};


const ticmeterDatas: TICMeterData[] = [
    {id: 0,   name: 'TIC Mode',                          desc: 'TIC Communication Mode',                     clust: CLUSTER_TIC,   attr: 'ticMode',                            type: ENUM,   unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false, values: modeTICEnum},
    {id: 1,   name: 'Electric Mode',                     desc: 'Meter Electric Mode',                        clust: CLUSTER_TIC,   attr: 'elecMode',                           type: ENUM,   unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false, values: modeElecEnum},
    {id: 2,   name: 'Tariff Option',                     desc: 'Tariff Option',                              clust: CLUSTER_TIC,   attr: 'contractType',                       type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 3,   name: 'Uptime',                            desc: 'Duration since last restart',                clust: CLUSTER_TIC,   attr: 'uptime',                             type: NUMBER, unit: 's',    poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 4,   name: 'Refresh Rate',                      desc: 'Time between refreshes',                     clust: CLUSTER_TIC,   attr: 'refreshRate',                        type: NUM_RW, unit: 's',    poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false, min: 30, max: 300},
    {id: 5,   name: 'Identifier',                        desc: 'Meter serial number',                        clust: CLUSTER_MET,   attr: 'meterSerialNumber',                  type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 6,   name: 'Max Contract Power',                desc: 'Max Contract Power',                         clust: CLUSTER_TIC,   attr: 'maxContractPower',                   type: NUMBER, unit: 'kVA',  poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 7,   name: 'Total Index',                       desc: 'Sum of all Index',                           clust: CLUSTER_MET,   attr: 'currentSummDelivered',               type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 8,   name: 'BASE Index',                        desc: 'Base Tariff Index',                          clust: CLUSTER_MET,   attr: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.BASE,  elec: E.ANY,  prod: false},
    {id: 9,   name: 'Off-Peak Index',                    desc: 'Off-Peak Tariff Index',                      clust: CLUSTER_MET,   attr: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  prod: false},
    {id: 10,  name: 'Peak Index',                        desc: 'Peak Tariff Index',                          clust: CLUSTER_MET,   attr: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  prod: false},
    {id: 11,  name: 'EJP Normal Hours Index',            desc: 'EJP Normal Hours Tariff Index',              clust: CLUSTER_MET,   attr: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 12,  name: 'EJP Mobile Peak Hours Index',       desc: 'EJP Mobile Peak Hours Tariff Index',         clust: CLUSTER_MET,   attr: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 13,  name: 'EJP Notice',                        desc: 'EJP Notice',                                 clust: CLUSTER_TIC,   attr: 'startEJP',                           type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 14,  name: 'BBRHCJB Index',                     desc: 'Blue Days Off-Peak Tariff Index',            clust: CLUSTER_MET,   attr: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 15,  name: 'BBRHPJB Index',                     desc: 'Blue Days Peak Tariff Index',                clust: CLUSTER_MET,   attr: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 16,  name: 'BBRHCJW Index',                     desc: 'White Days Off-Peak Tariff Index',           clust: CLUSTER_MET,   attr: 'currentTier3SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 17,  name: 'BBRHPJW Index',                     desc: 'White Days Peak Tariff Index',               clust: CLUSTER_MET,   attr: 'currentTier4SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 18,  name: 'BBRHCJR Index',                     desc: 'Red Days Off-Peak Tariff Index',             clust: CLUSTER_MET,   attr: 'currentTier5SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 19,  name: 'BBRHPJR Index',                     desc: 'Red Days Peak Tariff Index',                 clust: CLUSTER_MET,   attr: 'currentTier6SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 20,  name: 'Index 7',                           desc: 'Index 7',                                    clust: CLUSTER_MET,   attr: 'currentTier7SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 21,  name: 'Index 8',                           desc: 'Index 8',                                    clust: CLUSTER_MET,   attr: 'currentTier8SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 22,  name: 'Index 9',                           desc: 'Index 9',                                    clust: CLUSTER_MET,   attr: 'currentTier9SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 23,  name: 'Index 10',                          desc: 'Index 10',                                   clust: CLUSTER_MET,   attr: 'currentTier10SummDelivered',         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 24,  name: 'Current Tariff',                    desc: 'Current Tariff Option',                      clust: CLUSTER_TIC,   attr: 'currentTarif',                       type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 25,  name: 'Tomorrow Color',                    desc: 'Tomorrow Color',                             clust: CLUSTER_TIC,   attr: 'tomorowColor',                       type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 26,  name: 'Instant Intensity',                 desc: 'Instant Intensity',                          clust: CLUSTER_ELE,   attr: 'rmsCurrent',                         type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 27,  name: 'Instant Intensity Phase A',         desc: 'Instant Intensity Phase A',                  clust: CLUSTER_ELE,   attr: 'rmsCurrent',                         type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 28,  name: 'Instant Intensity Phase B',         desc: 'Instant Intensity Phase B',                  clust: CLUSTER_ELE,   attr: 'rmsCurrentPhB',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 29,  name: 'Instant Intensity Phase C',         desc: 'Instant Intensity Phase C',                  clust: CLUSTER_ELE,   attr: 'rmsCurrentPhC',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 30,  name: 'Max Intensity',                     desc: 'Max Intensity',                              clust: CLUSTER_ELE,   attr: 'rmsCurrentMax',                      type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 31,  name: 'Max Intensity Phase A',             desc: 'Max Intensity Phase A',                      clust: CLUSTER_ELE,   attr: 'rmsCurrentMax',                      type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 32,  name: 'Max Intensity Phase B',             desc: 'Max Intensity Phase B',                      clust: CLUSTER_ELE,   attr: 'rmsCurrentMaxPhB',                   type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 33,  name: 'Max Intensity Phase C',             desc: 'Max Intensity Phase C',                      clust: CLUSTER_ELE,   attr: 'rmsCurrentMaxPhC',                   type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 34,  name: 'Power Exceedance',                  desc: 'Power Exceedance',                           clust: CLUSTER_TIC,   attr: 'powerOverrun',                       type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 35,  name: 'Power Exceedance Phase A',          desc: 'Power Exceedance Phase A',                   clust: CLUSTER_TIC,   attr: 'powerOverrunA',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 36,  name: 'Power Exceedance Phase B',          desc: 'Power Exceedance Phase B',                   clust: CLUSTER_TIC,   attr: 'powerOverrunB',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 37,  name: 'Power Exceedance Phase C',          desc: 'Power Exceedance Phase C',                   clust: CLUSTER_TIC,   attr: 'powerOverrunC',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 38,  name: 'Apparent Power',                    desc: 'Apparent Power',                             clust: CLUSTER_ELE,   attr: 'apparentPower',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 39,  name: 'Apparent Power Phase A',            desc: 'Apparent Power Phase A',                     clust: CLUSTER_ELE,   attr: 'apparentPower',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 40,  name: 'Apparent Power Phase B',            desc: 'Apparent Power Phase B',                     clust: CLUSTER_ELE,   attr: 'apparentPowerPhB',                   type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 41,  name: 'Apparent Power Phase C',            desc: 'Apparent Power Phase C',                     clust: CLUSTER_ELE,   attr: 'apparentPowerPhC',                   type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 42,  name: 'Injected Energy Index',             desc: 'Injected Energy Index',                      clust: CLUSTER_MET,   attr: 'currentSummReceived',                type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 43,  name: 'Injected Power',                    desc: 'Injected Power',                             clust: CLUSTER_TIC,   attr: 'powerInjected',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 44,  name: 'Today Max Injected Power',          desc: 'Max Injected Power Today',                   clust: CLUSTER_TIC,   attr: 'powerMaxInjected',                   type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 45,  name: 'Today Time Max Injected Power',     desc: 'Date and Time of Today Max Injected ',       clust: CLUSTER_TIC,   attr: 'powerMaxInjectedTime',               type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 46,  name: 'Yesterday Max Injected Power',      desc: 'Max Injected Power Yesterday',               clust: CLUSTER_TIC,   attr: 'powerMaxInjectedYesterday',          type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 47,  name: 'Yesterday Time Max Injected Power', desc: 'Date and Time of Yesterday Max Injected',    clust: CLUSTER_TIC,   attr: 'powerMaxInjectedYesterdayTime',      type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 48,  name: 'Potential Presence',                desc: 'Potential Presence',                         clust: CLUSTER_TIC,   attr: 'potentialPresence',                  type: NUMBER, unit: '',     poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 49,  name: 'Off-Peak Hours Schedule',           desc: 'Off-Peak Hours Schedule',                    clust: CLUSTER_TIC,   attr: 'hcHours',                            type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  prod: false},
    {id: 50,  name: 'Status Register',                   desc: 'Meter Status Register',                      clust: CLUSTER_TIC,   attr: 'motdetat',                           type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 51,  name: 'Distributor Index 1',               desc: 'Distributor Drawn Energy Index 1',           clust: CLUSTER_TIC,   attr: 'index1Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 52,  name: 'Distributor Index 2',               desc: 'Distributor Drawn Energy Index 2',           clust: CLUSTER_TIC,   attr: 'index2Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 53,  name: 'Distributor Index 3',               desc: 'Distributor Drawn Energy Index 3',           clust: CLUSTER_TIC,   attr: 'index3Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 54,  name: 'Distributor Index 4',               desc: 'Distributor Drawn Energy Index 4',           clust: CLUSTER_TIC,   attr: 'index4Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 55,  name: 'Instantaneous Voltage',             desc: 'Instantaneous Effective Voltage',            clust: CLUSTER_ELE,   attr: 'rmsVoltage',                         type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 56,  name: 'Instantaneous Voltage Phase A',     desc: 'Instantaneous Effective Voltage Phase A',    clust: CLUSTER_ELE,   attr: 'rmsVoltage',                         type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 57,  name: 'Instantaneous Voltage Phase B',     desc: 'Instantaneous Effective Voltage Phase B',    clust: CLUSTER_ELE,   attr: 'rmsVoltagePhB',                      type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 58,  name: 'Instantaneous Voltage Phase C',     desc: 'Instantaneous Effective Voltage Phase C',    clust: CLUSTER_ELE,   attr: 'rmsVoltagePhC',                      type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 59,  name: 'Average Voltage',                   desc: 'Average Voltage',                            clust: CLUSTER_ELE,   attr: 'averageRmsVoltageMeasPeriod',        type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 60,  name: 'Average Voltage Phase A',           desc: 'Average Voltage Phase A',                    clust: CLUSTER_ELE,   attr: 'averageRmsVoltageMeasPeriod',        type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 61,  name: 'Average Voltage Phase B',           desc: 'Average Voltage Phase B',                    clust: CLUSTER_ELE,   attr: 'averageRmsVoltageMeasurePeriodPhB',  type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 62,  name: 'Average Voltage Phase C',           desc: 'Average Voltage Phase C',                    clust: CLUSTER_ELE,   attr: 'averageRmsVoltageMeasPeriodPhC',     type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 63,  name: 'Today Max Power',                   desc: 'Max Power Today',                            clust: CLUSTER_ELE,   attr: 'activePowerMax',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 64,  name: 'Time Today Max Power',              desc: 'Date and Time of Max Power Today',           clust: CLUSTER_TIC,   attr: 'powerMaxTodayTime',                  type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 65,  name: 'Today Max Power Phase A',           desc: 'Max Power Today Phase A',                    clust: CLUSTER_ELE,   attr: 'activePowerMax',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 66,  name: 'Time Today Max Power Phase A',      desc: 'Date and Time of Today Max Power Phase A',   clust: CLUSTER_TIC,   attr: 'powerMaxToday1Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 67,  name: 'Today Max Power Phase B',           desc: 'Max Power Today Phase B',                    clust: CLUSTER_ELE,   attr: 'activePowerMaxPhB',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 68,  name: 'Time Today Max Power Phase B',      desc: 'Date and Time of Max Power Today Phase B',   clust: CLUSTER_TIC,   attr: 'powerMaxToday2Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 69,  name: 'Today Max Power Phase C',           desc: 'Max Power Today Phase C',                    clust: CLUSTER_ELE,   attr: 'activePowerMaxPhC',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 70,  name: 'Time Today Max Power Phase C',      desc: 'Date and Time of Max Power Today Phase C',   clust: CLUSTER_TIC,   attr: 'powerMaxToday3Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 71,  name: 'Three-Phase Max Power',             desc: 'Three-Phase Max Power',                      clust: CLUSTER_ELE,   attr: 'activePowerMax',                     type: NUMBER, unit: 'W',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 72,  name: 'Yesterday Max Power',               desc: 'Max Power Yesterday',                        clust: CLUSTER_TIC,   attr: 'powerMaxYesterday',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 73,  name: 'Time Yesterday Max Power',          desc: 'Date and Time of Max Power Yesterday',       clust: CLUSTER_TIC,   attr: 'powerMaxYesterdayTime',              type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 74,  name: 'Max Yesterday Power Phase A',       desc: 'Max Power Yesterday Phase A',                clust: CLUSTER_TIC,   attr: 'powerMaxYesterday1',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 75,  name: 'Time Yesterday Max Power Phase A',  desc: 'DateTime of Max Power Yesterday Phase A',    clust: CLUSTER_TIC,   attr: 'powerMaxYesterday1Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 76,  name: 'Max Yesterday Power Phase B',       desc: 'Max Power Yesterday Phase B',                clust: CLUSTER_TIC,   attr: 'powerMaxYesterday2',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 77,  name: 'Time Yesterday Max Power Phase B',  desc: 'DateTime of Max Power Yesterday Phase B',    clust: CLUSTER_TIC,   attr: 'powerMaxYesterday2Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 78,  name: 'Max Yesterday Power Phase C',       desc: 'Max Power Yesterday Phase C',                clust: CLUSTER_TIC,   attr: 'powerMaxYesterday3',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 79,  name: 'Time Yesterday Max Power Phase C',  desc: 'DateTime of Max Power Yesterday Phase C',    clust: CLUSTER_TIC,   attr: 'powerMaxYesterday3Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 80,  name: 'Current Index',                     desc: 'Current Tariff Index Number',                clust: CLUSTER_TIC,   attr: 'currentIndex',                       type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 81,  name: 'Current Days Number',               desc: 'Current Supplier Days Number',               clust: CLUSTER_TIC,   attr: 'calendarSupplierDay',                type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 82,  name: 'Next Day Number',                   desc: 'Next Supplier Day Number',                   clust: CLUSTER_TIC,   attr: 'nextSupplierCalendarDay',            type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 83,  name: 'Relay',                             desc: 'Meter Virtual Relay',                        clust: CLUSTER_TIC,   attr: 'relays',                             type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 84,  name: 'PMR',                               desc: 'Measurement Reference Point Identifier',     clust: CLUSTER_MET,   attr: 'siteId',                             type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 85,  name: 'Short Message',                     desc: 'Short Message',                              clust: CLUSTER_TIC,   attr: 'shortMsg',                           type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 86,  name: 'Ultra-Short Message',               desc: 'Ultra-Short Message',                        clust: CLUSTER_TIC,   attr: 'ultraShortMsg',                      type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 87,  name: 'TIC Version',                       desc: 'TIC Version',                                clust: CLUSTER_TIC,   attr: 'ticVersion',                         type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 88,  name: 'Meter Date and Time',               desc: 'Meter Date and Time',                        clust: CLUSTER_TIC,   attr: 'date',                               type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 89,  name: 'Next Day Profile',                  desc: 'Next Day Profile',                           clust: CLUSTER_TIC,   attr: 'calendarDay',                        type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 90,  name: 'Next Day Peak Profile',             desc: 'Next Day Peak Profile',                      clust: CLUSTER_TIC,   attr: 'calendarDayPointe',                  type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 91,  name: 'Current Drawn Curve Point',         desc: 'Current Drawn Active Load Curve Point',      clust: CLUSTER_ELE,   attr: 'activePower',                        type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 92,  name: 'Previous Drawn Curve Point',        desc: 'Previous Drawn Active Load Curve Point',     clust: CLUSTER_ELE,   attr: 'activePowerPhB',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 93,  name: 'Current Injected Curve Point',      desc: 'Current Injected Active Load Curve Point',   clust: CLUSTER_TIC,   attr: 'injectedLoadN',                      type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 94,  name: 'Previous Injected Curve Point',     desc: 'Previous Injected Active Load Curve Point',  clust: CLUSTER_TIC,   attr: 'injectedLoadN_1',                    type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 95,  name: 'Total Reactive Energy Q1',          desc: 'Total Reactive Energy Q1',                   clust: CLUSTER_ELE,   attr: 'totalReactivePower',                 type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 96,  name: 'Total Reactive Energy Q2',          desc: 'Total Reactive Energy Q2',                   clust: CLUSTER_ELE,   attr: 'reactivePower',                      type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 97,  name: 'Total Reactive Energy Q3',          desc: 'Total Reactive Energy Q3',                   clust: CLUSTER_ELE,   attr: 'reactivePowerPhB',                   type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 98,  name: 'Total Reactive Energy Q4',          desc: 'Total Reactive Energy Q4',                   clust: CLUSTER_ELE,   attr: 'reactivePowerPhC',                   type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 99,  name: 'Start Mobile Peak 1',               desc: 'Start Mobile Peak 1',                        clust: CLUSTER_TIC,   attr: 'startEJP1',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 100, name: 'End Mobile Peak 1',                 desc: 'End Mobile Peak 1',                          clust: CLUSTER_TIC,   attr: 'stopEJP1',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 101, name: 'Start Mobile Peak 2',               desc: 'Start Mobile Peak 2',                        clust: CLUSTER_TIC,   attr: 'startEJP2',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 102, name: 'End Mobile Peak 2',                 desc: 'End Mobile Peak 2',                          clust: CLUSTER_TIC,   attr: 'stopEJP2',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 103, name: 'Start Mobile Peak 3',               desc: 'Start Mobile Peak 3',                        clust: CLUSTER_TIC,   attr: 'startEJP3',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 104, name: 'End Mobile Peak 3',                 desc: 'End Mobile Peak 3',                          clust: CLUSTER_TIC,   attr: 'stopEJP3',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
];

const ticmeterCustomCluster = {
    ID: 0xff42,
    attributes: {
        contractType: {ID: 0x0000, type: Zcl.DataType.CHAR_STR},
        startEJP: {ID: 0x0001, type: Zcl.DataType.UINT16},
        refreshRate: {ID: 0x0002, type: Zcl.DataType.UINT16},
        tomorowColor: {ID: 0x0003, type: Zcl.DataType.CHAR_STR},
        //
        powerOverrun: {ID: 0x0004, type: Zcl.DataType.UINT16},
        powerOverrunA: {ID: 0x0005, type: Zcl.DataType.UINT16},
        powerOverrunB: {ID: 0x0006, type: Zcl.DataType.UINT16},
        powerOverrunC: {ID: 0x0007, type: Zcl.DataType.UINT16},
        //
        potentialPresence: {ID: 0x0008, type: Zcl.DataType.UINT32},
        //
        hcHours: {ID: 0x0009, type: Zcl.DataType.CHAR_STR},
        motdetat: {ID: 0x000a, type: Zcl.DataType.CHAR_STR},
        //
        date: {ID: 0x000b, type: Zcl.DataType.UINT64},
        //
        index1Dist: {ID: 0x000e, type: Zcl.DataType.UINT48},
        index2Dist: {ID: 0x000f, type: Zcl.DataType.UINT48},
        index3Dist: {ID: 0x0010, type: Zcl.DataType.UINT48},
        index4Dist: {ID: 0x0011, type: Zcl.DataType.UINT48},
        //
        powerMaxYesterday: {ID: 0x0012, type: Zcl.DataType.UINT16},
        powerMaxYesterday1: {ID: 0x0013, type: Zcl.DataType.UINT16},
        powerMaxYesterday2: {ID: 0x0014, type: Zcl.DataType.UINT16},
        powerMaxYesterday3: {ID: 0x0015, type: Zcl.DataType.UINT16},
        //
        powerInjected: {ID: 0x0016, type: Zcl.DataType.UINT32},
        powerMaxInjected: {ID: 0x0017, type: Zcl.DataType.UINT32},
        powerMaxInjectedYesterday: {ID: 0x0018, type: Zcl.DataType.UINT32},
        //
        injectedLoadN: {ID: 0x0019, type: Zcl.DataType.UINT16},
        injectedLoadN_1: {ID: 0x001a, type: Zcl.DataType.UINT16},
        //
        startEJP1: {ID: 0x001c, type: Zcl.DataType.UINT64},
        stopEJP1: {ID: 0x001d, type: Zcl.DataType.UINT64},
        startEJP2: {ID: 0x001e, type: Zcl.DataType.UINT64},
        stopEJP2: {ID: 0x001f, type: Zcl.DataType.UINT64},
        startEJP3: {ID: 0x0020, type: Zcl.DataType.UINT64},
        stopEJP3: {ID: 0x0021, type: Zcl.DataType.UINT64},
        //
        shortMsg: {ID: 0x0022, type: Zcl.DataType.CHAR_STR},
        ultraShortMsg: {ID: 0x0023, type: Zcl.DataType.CHAR_STR},
        //
        relays: {ID: 0x0024, type: Zcl.DataType.CHAR_STR},
        //
        currentIndex: {ID: 0x0025, type: Zcl.DataType.UINT8},
        //
        currentTarif: {ID: 0x0039, type: Zcl.DataType.CHAR_STR},
        calendarSupplierDay: {ID: 0x0026, type: Zcl.DataType.UINT16},
        nextSupplierCalendarDay: {ID: 0x0027, type: Zcl.DataType.UINT16},
        calendarDay: {ID: 0x0028, type: Zcl.DataType.CHAR_STR},
        calendarDayPointe: {ID: 0x0029, type: Zcl.DataType.CHAR_STR},
        //
        elecMode: {ID: 0x002a, type: Zcl.DataType.UINT8},
        maxContractPower: {ID: 0x002b, type: Zcl.DataType.UINT16},
        ticMode: {ID: 0x002c, type: Zcl.DataType.UINT8},
        uptime: {ID: 0x002d, type: Zcl.DataType.UINT48},
        ticVersion: {ID: 0x002e, type: Zcl.DataType.CHAR_STR},
        //
        powerMaxTodayTime: {ID: 0x002f, type: Zcl.DataType.UINT64},
        powerMaxToday1Time: {ID: 0x0030, type: Zcl.DataType.UINT64},
        powerMaxToday2Time: {ID: 0x0031, type: Zcl.DataType.UINT64},
        powerMaxToday3Time: {ID: 0x0032, type: Zcl.DataType.UINT64},
        //
        powerMaxYesterdayTime: {ID: 0x0033, type: Zcl.DataType.UINT64},
        powerMaxYesterday1Time: {ID: 0x0034, type: Zcl.DataType.UINT64},
        powerMaxYesterday2Time: {ID: 0x0035, type: Zcl.DataType.UINT64},
        powerMaxYesterday3Time: {ID: 0x0036, type: Zcl.DataType.UINT64},
        //
        powerMaxInjectedTime: {ID: 0x0037, type: Zcl.DataType.UINT64},
        powerMaxInjectedYesterdayTime: {ID: 0x0038, type: Zcl.DataType.UINT64},
    },
    commands: {
        refreshRate: {
            ID: 0,
            parameters: [
                {name: 'refreshRate', type: Zcl.DataType.UINT16},
            ],
        },
        reboot: {
            ID: 1,
            parameters: [
                {name: 'seq', type: Zcl.DataType.UINT16},
            ],
        },
    },
    commandsResponse: {
        refreshRate: {
            ID: 1,
            parameters: [
                {name: 'seq', type: Zcl.DataType.UINT16},
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
        const found = ticmeterDatas.find((x) => x.attr == key);
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
            result[toSnakeCase(found.attr)] = value;
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
        cluster: CLUSTER_TIC,
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
        const key = toSnakeCase(item.attr);
        const tz : Tz.Converter = {
            key: [key],
            convertGet: async (entity, key, meta) => {
                await entity.read(item.clust, [item.attr]);
            },
        } satisfies Tz.Converter;
        if (item.type == NUM_RW) {
            tz.convertSet = async (entity, key, value: unknown, meta) => {
                if (Number(value) < 0 || Number(value) > 65535) {
                    throw new Error('Value must be between 0 and 65535');
                }
                await entity.write(item.clust, {[item.attr]: value}, {manufacturerCode: null});
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
        if (item.poll &&
            (item.tic == currentTIC || item.tic == T.ANY) &&
            (item.contract == currentContract || item.contract == C.ANY) &&
            (item.elec == currentElec || item.elec == E.ANY) &&
            (item.prod == currentProducer || item.prod == false)) {
            toRead.push(item);
        }
    }

    toRead = toRead.sort((a, b) => a.clust.localeCompare(b.clust));
    const groupedByCluster: { [key: string]: TICMeterData[] } = {};
    toRead.forEach((item) => {
        if (!groupedByCluster[item.clust]) {
            groupedByCluster[item.clust] = [];
        }
        groupedByCluster[item.clust].push(item);
    });
    const splited = Object.keys(groupedByCluster).map((cluster) => {
        return {
            cluster: cluster,
            attributes: splitTab(
                groupedByCluster[cluster].map((item: TICMeterData) => item.attr),
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
            let translation: string = '';

            if (device == null) {
                return exposes;
            }

            try {
                endpoint = device.getEndpoint(1);
            } catch (error) {
                logger.warning('Exposes: No endpoint', 'TICMeter');
            }


            if (endpoint != null && endpoint.hasOwnProperty('clusters') && endpoint.clusters[CLUSTER_TIC] != undefined) {
                if (endpoint.clusters[CLUSTER_TIC].hasOwnProperty('attributes') && endpoint.clusters[CLUSTER_TIC].attributes != undefined) {
                    const attr = endpoint.clusters[CLUSTER_TIC].attributes;

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

            if (options && options.hasOwnProperty('translation')) {
                translation = String(options.translation);
            } else {
                translation = TRANSLATION_FR;
            }

            globalStore.putValue(device, 'contract_type', currentContract);
            globalStore.putValue(device, 'elec_mode', currentElec);
            globalStore.putValue(device, 'tic_mode', currentTIC);
            globalStore.putValue(device, 'producer', currentProducer);
            globalStore.putValue(device, 'translation', translation);


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

                if (item.hasOwnProperty('prod')) {
                    if (item['prod'] == true && currentProducer == 'OFF') {
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
                    let name = item.name;
                    let desc = item.desc;
                    if (translation == TRANSLATION_FR) {
                        name = ticmeterDatasFRTranslation[item.id].nameFR;
                        desc = ticmeterDatasFRTranslation[item.id].descFR;
                    }
                    switch (item.type) {
                    case STRING:
                        exposes.push(e.text(name, access).withProperty(toSnakeCase(item.attr)).withDescription(desc));
                        break;
                    case NUMBER:
                        exposes.push(e.numeric(name, access).withProperty(toSnakeCase(item.attr)).withDescription(desc).withUnit(item.unit));
                        break;
                    case ENUM:
                        exposes.push(e.enum(name, access, item.values).withProperty(toSnakeCase(item.attr)).withDescription(desc));
                        break;
                    case TIME:
                        exposes.push(e.text(name, access).withProperty(toSnakeCase(item.attr)).withDescription(desc));
                        break;
                    case NUM_RW:
                        exposes.push(e.numeric(name, ea.ALL).withProperty(toSnakeCase(item.attr)).withDescription(desc).withUnit(item.unit).withValueMin(item.min).withValueMax(item.max));
                        break;
                    }
                }
            });
            logger.debug(`Exposes ${exposes.length} attributes`, 'TICMeter');

            if (options.hasOwnProperty('translation')) {
                switch (options.translation) {
                case TRANSLATION_FR:
                    for (let i = 0; i < ticmeterOptions.length; i++) {
                        ticmeterOptions[i].description = ticmeterOptionsFRTr[i].descFR;
                    }
                    break;
                case TRANSLATION_EN:
                    for (let i = 0; i < ticmeterOptions.length; i++) {
                        ticmeterOptions[i].description = ticmeterOptionsFRTr[i].descEN;
                    }
                    break;
                default:
                    logger.warning(`Unknown translation: ${options.translation}`, 'TICMeter');
                }
            }
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
                CLUSTER_TIC,
                CLUSTER_ELE,
                CLUSTER_MET,
                METER_ID_CLUSTER,
            ]);

            const reportingConfig: Promise<void> []= [];

            const wanted: TICMeterData[] = [];
            for (const item of ticmeterDatas) {
                if (!item.poll && (item.tic == TICMode || item.tic == T.ANY) &&
                (item.contract == contractType || item.contract == C.ANY) &&
                (item.elec == elecMode || item.elec == E.ANY) &&
                (item.prod == producer || item.prod == false)) {
                    wanted.push(item);
                }
            }

            logger.debug(`Configure wanted ${wanted.length}`, 'TICMeter');

            endpoint.configuredReportings.forEach(async (r) => {
                await endpoint.configureReporting(r.cluster.name, reporting.payload(r.attribute.name, r.minimumReportInterval, 65535, r.reportableChange), {manufacturerCode: null});
            });

            for (const item of wanted) {
                const conf = {
                    attribute: item.attr,
                    change: 1,
                    min: repInterval.SECONDS_10,
                    max: repInterval.MINUTES_10,
                };

                logger.debug(`Configure ${item.name} ${item.clust} ${item.attr} ${conf.min} ${conf.max} ${conf.change}`, 'TICMeter');
                reportingConfig.push(endpoint.configureReporting(item.clust, reporting.payload(item.attr, conf.min, conf.max, conf.change), {manufacturerCode: null}));
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
            if (!device.customClusters[CLUSTER_TIC]) {
                device.addCustomCluster(CLUSTER_TIC, ticmeterCustomCluster);
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
