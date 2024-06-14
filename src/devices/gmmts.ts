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
    0: {nameFR: 'Mode_TIC',                       descFR: 'Mode_de_communication_TIC'},
    1: {nameFR: 'Mode_electrique',                descFR: 'Mode_de_electrique_du_compteur'},
    2: {nameFR: 'Option_tarifaire',               descFR: 'Option_tarifaire'},
    3: {nameFR: 'Duree_de_fonctionnement',        descFR: 'Duree_depuis_le_dernier_redemarrage'},
    4: {nameFR: 'Duree_actualisation',            descFR: 'Duree_entre_les_actualisations'},
    5: {nameFR: 'Identifiant',                    descFR: 'Numero_de_serie_du_compteur'},
    6: {nameFR: 'Puissance_Max_contrat',          descFR: 'Puissance_Max_contrat'},
    7: {nameFR: 'Index_total',                    descFR: 'Somme_de_tous_les_index'},
    8: {nameFR: 'Index_BASE',                     descFR: 'Index_Tarif_Base'},
    9: {nameFR: 'Index_HC',                       descFR: 'Index_Tarif_Heures_Creuses'},
    10: {nameFR: 'Index_HP',                      descFR: 'Index_Tarif_Heures_Pleines'},
    11: {nameFR: 'Index_EJP_HN',                  descFR: 'Index_Tarif_EJP_Heures_Normales'},
    12: {nameFR: 'Index_EJP_HPM',                 descFR: 'Index_Tarif_EJP_Heures_de_Pointe_Mobile'},
    13: {nameFR: 'Preavis_EJP',                   descFR: 'Preavis_EJP'},
    14: {nameFR: 'Index_BBRHCJB',                 descFR: 'Index_Tarif_Heures_Creuses_Jours_Bleus'},
    15: {nameFR: 'Index_BBRHPJB',                 descFR: 'Index_Tarif_Heures_Pleines_Jours_Bleus'},
    16: {nameFR: 'Index_BBRHCJW',                 descFR: 'Index_Tarif_Heures_Creuses_Jours_Blancs'},
    17: {nameFR: 'Index_BBRHPJW',                 descFR: 'Index_Tarif_Heures_Pleines_Jours_Blancs'},
    18: {nameFR: 'Index_BBRHCJR',                 descFR: 'Index_Tarif_Heures_Creuses_Jours_Rouges'},
    19: {nameFR: 'Index_BBRHPJR',                 descFR: 'Index_Tarif_Heures_Pleines_Jours_Rouges'},
    20: {nameFR: 'Index_7',                       descFR: 'Index_7'},
    21: {nameFR: 'Index_8',                       descFR: 'Index_8'},
    22: {nameFR: 'Index_9',                       descFR: 'Index_9'},
    23: {nameFR: 'Index_10',                      descFR: 'Index_10'},
    24: {nameFR: 'Tarif_en_cours',                descFR: 'Option_tarifaire_en_cours'},
    25: {nameFR: 'Couleur_demain',                descFR: 'Couleur_demain'},
    26: {nameFR: 'Intensite_instantanee',         descFR: 'Intensite_instantanee'},
    27: {nameFR: 'Intensite_instantanee_Ph_A',    descFR: 'Intensite_instantanee_Phase_A'},
    28: {nameFR: 'Intensite_instantanee_Ph_B',    descFR: 'Intensite_instantanee_Phase_B'},
    29: {nameFR: 'Intensite_instantanee_Ph_C',    descFR: 'Intensite_instantanee_Phase_C'},
    30: {nameFR: 'Intensite_maximale',            descFR: 'Intensite_maximale'},
    31: {nameFR: 'Intensite_maximale_Ph_A',       descFR: 'Intensite_maximale_Phase_A'},
    32: {nameFR: 'Intensite_maximale_Ph_B',       descFR: 'Intensite_maximale_Phase_B'},
    33: {nameFR: 'Intensite_maximale_Ph_C',       descFR: 'Intensite_maximale_Phase_C'},
    34: {nameFR: 'Depassement_de_puissance',      descFR: 'Depassement_de_puissance'},
    35: {nameFR: 'Depassement_Itensite_Ph_A',     descFR: 'Depassement_de_puissance_Phase_A'},
    36: {nameFR: 'Depassement_Itensite_Ph_B',     descFR: 'Depassement_de_puissance_Phase_B'},
    37: {nameFR: 'Depassement_Itensite_Ph_C',     descFR: 'Depassement_de_puissance_Phase_C'},
    38: {nameFR: 'Puissance_Apparente',           descFR: 'Puissance_Apparente'},
    39: {nameFR: 'Puissance_Apparente_Ph_A',      descFR: 'Puissance_Apparente_Phase_A'},
    40: {nameFR: 'Puissance_Apparente_Ph_B',      descFR: 'Puissance_Apparente_Phase_B'},
    41: {nameFR: 'Puissance_Apparente_Ph_C',      descFR: 'Puissance_Apparente_Phase_C'},
    42: {nameFR: 'Index_energie_injectee',        descFR: 'Index_energie_injectee'},
    43: {nameFR: 'Puissance_injectee',            descFR: 'Puissance_injectee'},
    44: {nameFR: 'Puissance_max_injectee_Auj.',   descFR: 'Puissance_max_injectee_Aujourdhui'},
    45: {nameFR: 'Heure_PMAX_injectee_Auj.',      descFR: 'Date_et_Heure_puissance_max_injectee_aujourdhui'},
    46: {nameFR: 'Puissance_max_injectee_Hier',   descFR: 'Puissance_max_injectee_Hier'},
    47: {nameFR: 'Heure_PMAX_injectee_Hier',      descFR: 'Date_et_Heure_puissance_max_injectee_hier'},
    48: {nameFR: 'Presence_de_potentiels',        descFR: 'Presence_de_potentiels'},
    49: {nameFR: 'Horaire_Heures_Creuses',        descFR: 'Horaire_Heures_Creuses'},
    50: {nameFR: 'Registre_de_Status',            descFR: 'Registre_de_status_du_compteur'},
    51: {nameFR: 'Index_1_Distributeur',          descFR: 'Index_1_Energie_soutiree_Distributeur'},
    52: {nameFR: 'Index_2_Distributeur',          descFR: 'Index_2_Energie_soutiree_Distributeur'},
    53: {nameFR: 'Index_3_Distributeur',          descFR: 'Index_3_Energie_soutiree_Distributeur'},
    54: {nameFR: 'Index_4_Distributeur',          descFR: 'Index_4_Energie_soutiree_Distributeur'},
    55: {nameFR: 'Tension_instantanee',           descFR: 'Tension_instantanee_efficace'},
    56: {nameFR: 'Tension_instantanee_Ph_A',      descFR: 'Tension_instantanee_efficace_Phase_A'},
    57: {nameFR: 'Tension_instantanee_Ph_B',      descFR: 'Tension_instantanee_efficace_Phase_B'},
    58: {nameFR: 'Tension_instantanee_Ph_C',      descFR: 'Tension_instantanee_efficace_Phase_C'},
    59: {nameFR: 'Tension_moyenne',               descFR: 'Tension_moyenne'},
    60: {nameFR: 'Tension_moyenne_Ph_A',          descFR: 'Tension_moyenne_Phase_A'},
    61: {nameFR: 'Tension_moyenne_Ph_B',          descFR: 'Tension_moyenne_Phase_B'},
    62: {nameFR: 'Tension_moyenne_Ph_C',          descFR: 'Tension_moyenne_Phase_C'},
    63: {nameFR: 'Puissance_max_Auj',             descFR: 'Puissance_max_Aujourdhui'},
    64: {nameFR: 'Heure_Puissance_max_Auj',       descFR: 'Date_et_Heure_de_la_puissance_max_aujourdhui'},
    65: {nameFR: 'Puissance_max_Auj_Ph_A',        descFR: 'Puissance_max_Aujourdhui_Phase_A'},
    66: {nameFR: 'Heure_Puissance_max_Auj_Ph_A',  descFR: 'Date_et_Heure_de_la_puissance_max_aujourdhui_Ph_A'},
    67: {nameFR: 'Puissance_max_Auj_Ph_B',        descFR: 'Puissance_max_Aujourdhui_Phase_B'},
    68: {nameFR: 'Heure_Puissance_max_Auj_Ph_B',  descFR: 'Date_et_Heure_de_la_puissance_max_aujourdhui_Ph_B'},
    69: {nameFR: 'Puissance_max_Auj_Ph_C',        descFR: 'Puissance_max_Aujourdhui_Phase_C'},
    70: {nameFR: 'Heure_Puissance_max_Auj_Ph_C',  descFR: 'Date_et_Heure_de_la_puissance_max_aujourdhui_Ph_C'},
    71: {nameFR: 'Puissance_maximale_triphasee',  descFR: 'Puissance_maximale_triphasee'},
    72: {nameFR: 'Puissance_max_Hier',            descFR: 'Puissance_max_Hier'},
    73: {nameFR: 'Heure_Puissance_max_Hier',      descFR: 'Date_et_Heure_de_la_puissance_max_hier'},
    74: {nameFR: 'Puissance_max_Hier_Ph_A',       descFR: 'Puissance_max_Hier_Phase_A'},
    75: {nameFR: 'Heure_Puissance_max_Hier_Ph_A', descFR: 'Date_et_Heure_de_la_puissance_max_hier_Ph_A'},
    76: {nameFR: 'Puissance_max_Hier_Ph_B',       descFR: 'Puissance_max_Hier_Phase_B'},
    77: {nameFR: 'Heure_Puissance_max_Hier_Ph_B', descFR: 'Date_et_Heure_de_la_puissance_max_hier_Ph_B'},
    78: {nameFR: 'Puissance_max_Hier_Ph_C',       descFR: 'Puissance_max_Hier_Phase_C'},
    79: {nameFR: 'Heure_Puissance_max_Hier_Ph_C', descFR: 'Date_et_Heure_de_la_puissance_max_hier_Ph_C'},
    80: {nameFR: 'Index_en_cours',                descFR: 'Numereo_de_lindex_tarifaire_en_cours'},
    81: {nameFR: 'N_jours_en_cours',              descFR: 'N_jours_en_cours_fournisseur'},
    82: {nameFR: 'N_prochain_jour',               descFR: 'N_prochain_jour_fournisseur'},
    83: {nameFR: 'Relais',                        descFR: 'Relais_virtuel_du_compteur'},
    84: {nameFR: 'PMR',                           descFR: 'Identifiant_Point_Reference_Mesure'},
    85: {nameFR: 'Message_court',                 descFR: 'Message_court'},
    86: {nameFR: 'Message_ultra_court',           descFR: 'Message_ultra_court'},
    87: {nameFR: 'Version_de_la_TIC',             descFR: 'Version_de_la_TIC'},
    88: {nameFR: 'Date_et_heure_Compteur',        descFR: 'Date_et_heure_du_compteur'},
    89: {nameFR: 'Profil_prochain_jour',          descFR: 'Profil_du_prochain_jour'},
    90: {nameFR: 'Profil_prochain_jour_pointe',   descFR: 'Profil_du_prochain_jour_pointe'},
    91: {nameFR: 'Point_n_courbe_soutiree',       descFR: 'Point_n_de_la_courbe_de_charge_active_soutiree'},
    92: {nameFR: 'Point_n-1_courbe_soutiree',     descFR: 'Point_n-1_de_la_courbe_de_charge_active_soutiree'},
    93: {nameFR: 'Point_n_courbe_injectee',       descFR: 'Point_n_de_la_courbe_de_charge_active_injectee'},
    94: {nameFR: 'Point_n-1_courbe_injectee',     descFR: 'Point_n-1_de_la_courbe_de_charge_active_injectee'},
    95: {nameFR: 'Energie_reactive_Q1_totale',    descFR: 'Energie_reactive_Q1_totale'},
    96: {nameFR: 'Energie_reactive_Q2_totale',    descFR: 'Energie_reactive_Q2_totale'},
    97: {nameFR: 'Energie_reactive_Q3_totale',    descFR: 'Energie_reactive_Q3_totale'},
    98: {nameFR: 'Energie_reactive_Q4_totale',    descFR: 'Energie_reactive_Q4_totale'},
    99: {nameFR: 'Debut_Pointe_Mobile_1',         descFR: 'Debut_Pointe_Mobile_1'},
    100: {nameFR: 'Fin_Pointe_Mobile_1',          descFR: 'Fin_Pointe_Mobile_1'},
    101: {nameFR: 'Debut_Pointe_Mobile_2',        descFR: 'Debut_Pointe_Mobile_2'},
    102: {nameFR: 'Fin_Pointe_Mobile_2',          descFR: 'Fin_Pointe_Mobile_2'},
    103: {nameFR: 'Debut_Pointe_Mobile_3',        descFR: 'Debut_Pointe_Mobile_3'},
    104: {nameFR: 'Fin_Pointe_Mobile_3',          descFR: 'Fin_Pointe_Mobile_3'},
};


const ticmeterDatas: TICMeterData[] = [
    {id: 0,   name: 'TIC_Mode',                          desc: 'TIC_Communication_Mode',                     clust: CLUSTER_TIC,   attr: 'ticMode',                            type: ENUM,   unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false, values: modeTICEnum},
    {id: 1,   name: 'Electric_Mode',                     desc: 'Meter_Electric_Mode',                        clust: CLUSTER_TIC,   attr: 'elecMode',                           type: ENUM,   unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false, values: modeElecEnum},
    {id: 2,   name: 'Tariff_Option',                     desc: 'Tariff_Option',                              clust: CLUSTER_TIC,   attr: 'contractType',                       type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 3,   name: 'Uptime',                            desc: 'Duration_since_last_restart',                clust: CLUSTER_TIC,   attr: 'uptime',                             type: NUMBER, unit: 's',    poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 4,   name: 'Refresh_Rate',                      desc: 'Time_between_refreshes',                     clust: CLUSTER_TIC,   attr: 'refreshRate',                        type: NUM_RW, unit: 's',    poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false, min: 30, max: 300},
    {id: 5,   name: 'Identifier',                        desc: 'Meter_serial_number',                        clust: CLUSTER_MET,   attr: 'meterSerialNumber',                  type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 6,   name: 'Max_Contract_Power',                desc: 'Max_Contract_Power',                         clust: CLUSTER_TIC,   attr: 'maxContractPower',                   type: NUMBER, unit: 'kVA',  poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 7,   name: 'Total_Index',                       desc: 'Sum_of_all_Index',                           clust: CLUSTER_MET,   attr: 'currentSummDelivered',               type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 8,   name: 'BASE_Index',                        desc: 'Base_Tariff_Index',                          clust: CLUSTER_MET,   attr: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.BASE,  elec: E.ANY,  prod: false},
    {id: 9,   name: 'Off-Peak_Index',                    desc: 'Off-Peak_Tariff_Index',                      clust: CLUSTER_MET,   attr: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  prod: false},
    {id: 10,  name: 'Peak_Index',                        desc: 'Peak_Tariff_Index',                          clust: CLUSTER_MET,   attr: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  prod: false},
    {id: 11,  name: 'EJP_Normal_Hours_Index',            desc: 'EJP_Normal_Hours_Tariff_Index',              clust: CLUSTER_MET,   attr: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 12,  name: 'EJP_Mobile_Peak_Hours_Index',       desc: 'EJP_Mobile_Peak_Hours_Tariff_Index',         clust: CLUSTER_MET,   attr: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 13,  name: 'EJP_Notice',                        desc: 'EJP_Notice',                                 clust: CLUSTER_TIC,   attr: 'startEJP',                           type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 14,  name: 'BBRHCJB_Index',                     desc: 'Blue_Days_Off-Peak_Tariff_Index',            clust: CLUSTER_MET,   attr: 'currentTier1SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 15,  name: 'BBRHPJB_Index',                     desc: 'Blue_Days_Peak_Tariff_Index',                clust: CLUSTER_MET,   attr: 'currentTier2SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 16,  name: 'BBRHCJW_Index',                     desc: 'White_Days_Off-Peak_Tariff_Index',           clust: CLUSTER_MET,   attr: 'currentTier3SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 17,  name: 'BBRHPJW_Index',                     desc: 'White_Days_Peak_Tariff_Index',               clust: CLUSTER_MET,   attr: 'currentTier4SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 18,  name: 'BBRHCJR_Index',                     desc: 'Red_Days_Off-Peak_Tariff_Index',             clust: CLUSTER_MET,   attr: 'currentTier5SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 19,  name: 'BBRHPJR_Index',                     desc: 'Red_Days_Peak_Tariff_Index',                 clust: CLUSTER_MET,   attr: 'currentTier6SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 20,  name: 'Index_7',                           desc: 'Index_7',                                    clust: CLUSTER_MET,   attr: 'currentTier7SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 21,  name: 'Index_8',                           desc: 'Index_8',                                    clust: CLUSTER_MET,   attr: 'currentTier8SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 22,  name: 'Index_9',                           desc: 'Index_9',                                    clust: CLUSTER_MET,   attr: 'currentTier9SummDelivered',          type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 23,  name: 'Index_10',                          desc: 'Index_10',                                   clust: CLUSTER_MET,   attr: 'currentTier10SummDelivered',         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 24,  name: 'Current_Tariff',                    desc: 'Current_Tariff_Option',                      clust: CLUSTER_TIC,   attr: 'currentTarif',                       type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 25,  name: 'Tomorrow_Color',                    desc: 'Tomorrow_Color',                             clust: CLUSTER_TIC,   attr: 'tomorowColor',                       type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.TEMPO, elec: E.ANY,  prod: false},
    {id: 26,  name: 'Instant_Intensity',                 desc: 'Instant_Intensity',                          clust: CLUSTER_ELE,   attr: 'rmsCurrent',                         type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 27,  name: 'Instant_Intensity_Phase_A',         desc: 'Instant_Intensity_Phase_A',                  clust: CLUSTER_ELE,   attr: 'rmsCurrent',                         type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 28,  name: 'Instant_Intensity_Phase_B',         desc: 'Instant_Intensity_Phase_B',                  clust: CLUSTER_ELE,   attr: 'rmsCurrentPhB',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 29,  name: 'Instant_Intensity_Phase_C',         desc: 'Instant_Intensity_Phase_C',                  clust: CLUSTER_ELE,   attr: 'rmsCurrentPhC',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 30,  name: 'Max_Intensity',                     desc: 'Max_Intensity',                              clust: CLUSTER_ELE,   attr: 'rmsCurrentMax',                      type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 31,  name: 'Max_Intensity_Phase_A',             desc: 'Max_Intensity_Phase_A',                      clust: CLUSTER_ELE,   attr: 'rmsCurrentMax',                      type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 32,  name: 'Max_Intensity_Phase_B',             desc: 'Max_Intensity_Phase_B',                      clust: CLUSTER_ELE,   attr: 'rmsCurrentMaxPhB',                   type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 33,  name: 'Max_Intensity_Phase_C',             desc: 'Max_Intensity_Phase_C',                      clust: CLUSTER_ELE,   attr: 'rmsCurrentMaxPhC',                   type: NUMBER, unit: 'A',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 34,  name: 'Power_Exceedance',                  desc: 'Power_Exceedance',                           clust: CLUSTER_TIC,   attr: 'powerOverrun',                       type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 35,  name: 'Power_Exceedance_Phase_A',          desc: 'Power_Exceedance_Phase_A',                   clust: CLUSTER_TIC,   attr: 'powerOverrunA',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 36,  name: 'Power_Exceedance_Phase_B',          desc: 'Power_Exceedance_Phase_B',                   clust: CLUSTER_TIC,   attr: 'powerOverrunB',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 37,  name: 'Power_Exceedance_Phase_C',          desc: 'Power_Exceedance_Phase_C',                   clust: CLUSTER_TIC,   attr: 'powerOverrunC',                      type: NUMBER, unit: 'A',    poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 38,  name: 'Apparent_Power',                    desc: 'Apparent_Power',                             clust: CLUSTER_ELE,   attr: 'apparentPower',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 39,  name: 'Apparent_Power_Phase_A',            desc: 'Apparent_Power_Phase_A',                     clust: CLUSTER_ELE,   attr: 'apparentPower',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 40,  name: 'Apparent_Power_Phase_B',            desc: 'Apparent_Power_Phase_B',                     clust: CLUSTER_ELE,   attr: 'apparentPowerPhB',                   type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 41,  name: 'Apparent_Power_Phase_C',            desc: 'Apparent_Power_Phase_C',                     clust: CLUSTER_ELE,   attr: 'apparentPowerPhC',                   type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 42,  name: 'Injected_Energy_Index',             desc: 'Injected_Energy_Index',                      clust: CLUSTER_MET,   attr: 'currentSummReceived',                type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 43,  name: 'Injected_Power',                    desc: 'Injected_Power',                             clust: CLUSTER_TIC,   attr: 'powerInjected',                      type: NUMBER, unit: 'VA',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 44,  name: 'Today_Max_Injected_Power',          desc: 'Max_Injected_Power_Today',                   clust: CLUSTER_TIC,   attr: 'powerMaxInjected',                   type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 45,  name: 'Today_Time_Max_Injected_Power',     desc: 'Date_and_Time_of_Today_Max_Injected',        clust: CLUSTER_TIC,   attr: 'powerMaxInjectedTime',               type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 46,  name: 'Yesterday_Max_Injected_Power',      desc: 'Max_Injected_Power_Yesterday',               clust: CLUSTER_TIC,   attr: 'powerMaxInjectedYesterday',          type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 47,  name: 'Yesterday_Time_Max_Injected_Power', desc: 'Date_and_Time_of_Yesterday_Max_Injected',    clust: CLUSTER_TIC,   attr: 'powerMaxInjectedYesterdayTime',      type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 48,  name: 'Potential_Presence',                desc: 'Potential_Presence',                         clust: CLUSTER_TIC,   attr: 'potentialPresence',                  type: NUMBER, unit: '',     poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 49,  name: 'Off-Peak_Hours_Schedule',           desc: 'Off-Peak_Hours_Schedule',                    clust: CLUSTER_TIC,   attr: 'hcHours',                            type: STRING, unit: '',     poll: false,  tic: T.ANY,  contract: C.HCHP,  elec: E.ANY,  prod: false},
    {id: 50,  name: 'Status_Register',                   desc: 'Meter_Status_Register',                      clust: CLUSTER_TIC,   attr: 'motdetat',                           type: STRING, unit: '',     poll: true,   tic: T.ANY,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 51,  name: 'Distributor_Index_1',               desc: 'Distributor_Drawn_Energy_Index_1',           clust: CLUSTER_TIC,   attr: 'index1Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 52,  name: 'Distributor_Index_2',               desc: 'Distributor_Drawn_Energy_Index_2',           clust: CLUSTER_TIC,   attr: 'index2Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 53,  name: 'Distributor_Index_3',               desc: 'Distributor_Drawn_Energy_Index_3',           clust: CLUSTER_TIC,   attr: 'index3Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 54,  name: 'Distributor_Index_4',               desc: 'Distributor_Drawn_Energy_Index_4',           clust: CLUSTER_TIC,   attr: 'index4Dist',                         type: NUMBER, unit: 'Wh',   poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 55,  name: 'Instantaneous_Voltage',             desc: 'Instantaneous_Effective_Voltage',            clust: CLUSTER_ELE,   attr: 'rmsVoltage',                         type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 56,  name: 'Instantaneous_Voltage_Phase_A',     desc: 'Instantaneous_Effective_Voltage_Phase_A',    clust: CLUSTER_ELE,   attr: 'rmsVoltage',                         type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 57,  name: 'Instantaneous_Voltage_Phase_B',     desc: 'Instantaneous_Effective_Voltage_Phase_B',    clust: CLUSTER_ELE,   attr: 'rmsVoltagePhB',                      type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 58,  name: 'Instantaneous_Voltage_Phase_C',     desc: 'Instantaneous_Effective_Voltage_Phase_C',    clust: CLUSTER_ELE,   attr: 'rmsVoltagePhC',                      type: NUMBER, unit: 'V',    poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 59,  name: 'Average_Voltage',                   desc: 'Average_Voltage',                            clust: CLUSTER_ELE,   attr: 'averageRmsVoltageMeasPeriod',        type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 60,  name: 'Average_Voltage_Phase_A',           desc: 'Average_Voltage_Phase_A',                    clust: CLUSTER_ELE,   attr: 'averageRmsVoltageMeasPeriod',        type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 61,  name: 'Average_Voltage_Phase_B',           desc: 'Average_Voltage_Phase_B',                    clust: CLUSTER_ELE,   attr: 'averageRmsVoltageMeasurePeriodPhB',  type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 62,  name: 'Average_Voltage_Phase_C',           desc: 'Average_Voltage_Phase_C',                    clust: CLUSTER_ELE,   attr: 'averageRmsVoltageMeasPeriodPhC',     type: NUMBER, unit: 'V',    poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 63,  name: 'Today_Max_Power',                   desc: 'Max_Power_Today',                            clust: CLUSTER_ELE,   attr: 'activePowerMax',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 64,  name: 'Time_Today_Max_Power',              desc: 'Date_and_Time_of_Max_Power_Today',           clust: CLUSTER_TIC,   attr: 'powerMaxTodayTime',                  type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 65,  name: 'Today_Max_Power_Phase_A',           desc: 'Max_Power_Today_Phase_A',                    clust: CLUSTER_ELE,   attr: 'activePowerMax',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 66,  name: 'Time_Today_Max_Power_Phase_A',      desc: 'Date_and_Time_of_Today_Max Power_Phase_A',   clust: CLUSTER_TIC,   attr: 'powerMaxToday1Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 67,  name: 'Today_Max_Power_Phase_B',           desc: 'Max_Power_Today_Phase_B',                    clust: CLUSTER_ELE,   attr: 'activePowerMaxPhB',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 68,  name: 'Time_Today_Max_Power_Phase_B',      desc: 'Date_and_Time_of_Max_Power_Today_Phase_B',   clust: CLUSTER_TIC,   attr: 'powerMaxToday2Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 69,  name: 'Today_Max_Power_Phase_C',           desc: 'Max_Power_Today_Phase_C',                    clust: CLUSTER_ELE,   attr: 'activePowerMaxPhC',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 70,  name: 'Time_Today_Max_Power_Phase_C',      desc: 'Date_and_Time_of_Max_Power_Today_Phase_C',   clust: CLUSTER_TIC,   attr: 'powerMaxToday3Time',                 type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 71,  name: 'Three-Phase_Max_Power',             desc: 'Three-Phase_Max_Power',                      clust: CLUSTER_ELE,   attr: 'activePowerMax',                     type: NUMBER, unit: 'W',    poll: true,   tic: T.HIST, contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 72,  name: 'Yesterday_Max_Power',               desc: 'Max_Power_Yesterday',                        clust: CLUSTER_TIC,   attr: 'powerMaxYesterday',                  type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 73,  name: 'Time_Yesterday_Max_Power',          desc: 'Date_and_Time_of_Max_Power_Yesterday',       clust: CLUSTER_TIC,   attr: 'powerMaxYesterdayTime',              type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.MONO, prod: false},
    {id: 74,  name: 'Max_Yesterday_Power_Phase_A',       desc: 'Max_Power_Yesterday_Phase_A',                clust: CLUSTER_TIC,   attr: 'powerMaxYesterday1',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 75,  name: 'Time_Yesterday_Max_Power_Phase_A',  desc: 'DateTime_of_Max_Power_Yesterday_Phase_A',    clust: CLUSTER_TIC,   attr: 'powerMaxYesterday1Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 76,  name: 'Max_Yesterday_Power_Phase_B',       desc: 'Max_Power_Yesterday_Phase_B',                clust: CLUSTER_TIC,   attr: 'powerMaxYesterday2',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 77,  name: 'Time_Yesterday_Max_Power_Phase_B',  desc: 'DateTime_of_Max_Power_Yesterday_Phase_B',    clust: CLUSTER_TIC,   attr: 'powerMaxYesterday2Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 78,  name: 'Max_Yesterday_Power_Phase_C',       desc: 'Max_Power_Yesterday_Phase_C',                clust: CLUSTER_TIC,   attr: 'powerMaxYesterday3',                 type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 79,  name: 'Time_Yesterday_Max_Power_Phase_C',  desc: 'DateTime_of_Max_Power_Yesterday_Phase_C',    clust: CLUSTER_TIC,   attr: 'powerMaxYesterday3Time',             type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.TRI,  prod: false},
    {id: 80,  name: 'Current_Index',                     desc: 'Current_Tariff_Index_Number',                clust: CLUSTER_TIC,   attr: 'currentIndex',                       type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 81,  name: 'Current_Days_Number',               desc: 'Current_Supplier_Days_Number',               clust: CLUSTER_TIC,   attr: 'calendarSupplierDay',                type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 82,  name: 'Next_Day_Number',                   desc: 'Next_Supplier_Day_Number',                   clust: CLUSTER_TIC,   attr: 'nextSupplierCalendarDay',            type: NUMBER, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 83,  name: 'Relay',                             desc: 'Meter_Virtual_Relay',                        clust: CLUSTER_TIC,   attr: 'relays',                             type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 84,  name: 'PMR',                               desc: 'Measurement_Reference_Point_Identifier',     clust: CLUSTER_MET,   attr: 'siteId',                             type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 85,  name: 'Short_Message',                     desc: 'Short_Message',                              clust: CLUSTER_TIC,   attr: 'shortMsg',                           type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 86,  name: 'Ultra-Short_Message',               desc: 'Ultra-Short_Message',                        clust: CLUSTER_TIC,   attr: 'ultraShortMsg',                      type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 87,  name: 'TIC_Version',                       desc: 'TIC_Version',                                clust: CLUSTER_TIC,   attr: 'ticVersion',                         type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 88,  name: 'Meter_Date_and_Time',               desc: 'Meter_Date_and_Time',                        clust: CLUSTER_TIC,   attr: 'date',                               type: TIME,   unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 89,  name: 'Next_Day_Profile',                  desc: 'Next_Day_Profile',                           clust: CLUSTER_TIC,   attr: 'calendarDay',                        type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 90,  name: 'Next_Day_Peak_Profile',             desc: 'Next_Day_Peak_Profile',                      clust: CLUSTER_TIC,   attr: 'calendarDayPointe',                  type: STRING, unit: '',     poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 91,  name: 'Current_Drawn_Curve_Point',         desc: 'Current_Drawn_Active_Load_Curve_Point',      clust: CLUSTER_ELE,   attr: 'activePower',                        type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 92,  name: 'Previous_Drawn_Curve_Point',        desc: 'Previous_Drawn_Active_Load_Curve_Point',     clust: CLUSTER_ELE,   attr: 'activePowerPhB',                     type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 93,  name: 'Current_Injected_Curve_Point',      desc: 'Current_Injected_Active_Load_Curve_Point',   clust: CLUSTER_TIC,   attr: 'injectedLoadN',                      type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 94,  name: 'Previous_Injected_Curve_Point',     desc: 'Previous_Injected_Active_Load_Curve_Point',  clust: CLUSTER_TIC,   attr: 'injectedLoadN_1',                    type: NUMBER, unit: 'VA',   poll: true,   tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: true},
    {id: 95,  name: 'Total_Reactive_Energy_Q1',          desc: 'Total_Reactive_Energy_Q1',                   clust: CLUSTER_ELE,   attr: 'totalReactivePower',                 type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 96,  name: 'Total_Reactive_Energy_Q2',          desc: 'Total_Reactive_Energy_Q2',                   clust: CLUSTER_ELE,   attr: 'reactivePower',                      type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 97,  name: 'Total_Reactive_Energy_Q3',          desc: 'Total_Reactive_Energy_Q3',                   clust: CLUSTER_ELE,   attr: 'reactivePowerPhB',                   type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 98,  name: 'Total_Reactive_Energy_Q4',          desc: 'Total_Reactive_Energy_Q4',                   clust: CLUSTER_ELE,   attr: 'reactivePowerPhC',                   type: NUMBER, unit: 'VARh', poll: false,  tic: T.STD,  contract: C.ANY,   elec: E.ANY,  prod: false},
    {id: 99,  name: 'Start_Mobile_Peak_1',               desc: 'Start_Mobile_Peak_1',                        clust: CLUSTER_TIC,   attr: 'startEJP1',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 100, name: 'End_Mobile_Peak_1',                 desc: 'End_Mobile_Peak_1',                          clust: CLUSTER_TIC,   attr: 'stopEJP1',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 101, name: 'Start_Mobile_Peak_2',               desc: 'Start_Mobile_Peak_2',                        clust: CLUSTER_TIC,   attr: 'startEJP2',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 102, name: 'End_Mobile_Peak_2',                 desc: 'End_Mobile_Peak_2',                          clust: CLUSTER_TIC,   attr: 'stopEJP2',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 103, name: 'Start_Mobile_Peak_3',               desc: 'Start_Mobile_Peak_3',                        clust: CLUSTER_TIC,   attr: 'startEJP3',                          type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
    {id: 104, name: 'End_Mobile_Peak_3',                 desc: 'End_Mobile_Peak_3',                          clust: CLUSTER_TIC,   attr: 'stopEJP3',                           type: TIME,   unit: '',     poll: true,   tic: T.ANY,  contract: C.EJP,   elec: E.ANY,  prod: false},
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

            if (found.attr == 'uptime') {
                value = value / 1000; // convert ms to s
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
