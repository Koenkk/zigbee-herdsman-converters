import iconv from "iconv-lite";
import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import {utcToDeviceLocal2000Seconds} from "../lib/sonoff";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import {assertObject, assertString} from "../lib/utils";

const NS = "zhc:easyiot";
const ea = exposes.access;
const e = exposes.presets;

interface EasyiotDoorLock {
    attributes: Record<string, never>;
    commands: {
        unlockDoor: {timeout: number; pincodevalue: Buffer};
        unlockDoorWithTimeout: {timeout: number; pincodevalue: Buffer};
        setEphemeralPin: {startTime: number; endTime: number; userid: number; validTimes: number; pincodevalue: Buffer};
        clearEphemeralPin: {userid: number};
        clearAllEphemeralPins: Record<string, never>;
    };
    commandResponses: Record<string, never>;
}

// protocol utilities for ZB-IR01
const protocolUtils = {
    /**
     * XOR checksum algorithm - based on ZB-IR01 protocol 1.2.3
     * Perform XOR operation on all bytes
     */
    calculateXor: (data: number[]): number => {
        let xorResult = 0;
        for (const byte of data) {
            xorResult ^= byte;
        }
        return xorResult;
    },

    /**
     * Convert string to hex byte array
     * Example: "gree_1" -> [0x67, 0x72, 0x65, 0x65, 0x5f, 0x31]
     */
    buildCommand: (commandByte: number, byte2: number, byte3: number, byte4: number): Buffer => {
        const data = [commandByte, byte2, byte3, byte4, 0x00];
        const xor = protocolUtils.calculateXor(data);
        return Buffer.from([...data, xor]);
    },

    /**
     * kfid is derived from brand and model offset. The offset is 1-based index within the brand's model range.
     * Example: brand = "gree", model = "gree_1", offset = 1 -> kfid = 1
     */
    acBrandModels: {
        gree: {name: "gree", name1: "5qC85Yqb", range: [0, 19]},
        haier: {name: "haier", name1: "5rW35bCU", range: [20, 39]},
        midea: {name: "midea", name1: "576O55qE", range: [40, 59]},
        changhong: {name: "changhong", name1: "6ZW/6Jm5", range: [60, 79]},
        chigo: {name: "chigo", name1: "5b+X6auY", range: [80, 99]},
        aux: {name: "aux", name1: "5aWl5YWL5pav", range: [100, 119]},
        tcl: {name: "tcl", name1: "VENM", range: [120, 139]},
        hisense: {name: "hisense", name1: "5rW35L+h", range: [140, 159]},
        kelon: {name: "kelon", name1: "56eR6b6Z", range: [160, 179]},
        xiaomi: {name: "xiaomi", name1: "5bCP57Gz", range: [180, 189]},
        hitachi: {name: "hitachi", name1: "5pel56uL", range: [190, 209]},
        natpanasonic: {name: "natpanasonic", name1: "5p2+5LiL", range: [210, 235]},
        toshiba: {name: "toshiba", name1: "5Lic6Iqd", range: [236, 245]},
        galanz: {name: "galanz", name1: "5qC85YWw5LuV", range: [246, 259]},
        mitsubishiheavy: {name: "mitsubishiheavy", name1: "5LiJ6I+x6YeN5bel", range: [260, 279]},
        mitsubishielectric: {name: "mitsubishielectric", name1: "5LiJ6I+x55S15py6", range: [280, 299]},
        samsung: {name: "samsung", name1: "5LiJ5pif", range: [300, 319]},
        lg: {name: "lg", name1: "TEc=", range: [320, 329]},
        whirlpool: {name: "whirlpool", name1: "5oOg6ICM5rWm", range: [330, 339]},
        electrolux: {name: "electrolux", name1: "5LyK6I6x5YWL5pav", range: [340, 349]},
        konka: {name: "konka", name1: "5bq35L2z", range: [350, 359]},
        daikin: {name: "daikin", name1: "5aSn6YeR", range: [360, 389]},
        sharp: {name: "sharp", name1: "5aSP5pmu", range: [390, 409]},
        trane: {name: "trane", name1: "54m554G1", range: [410, 419]},
        skyworth: {name: "skyworth", name1: "5Yib57u0", range: [420, 429]},
        york: {name: "york", name1: "57qm5YWL", range: [430, 443]},
        fujitsu: {name: "fujitsu", name1: "5a+M5aOr6YCa", range: [444, 459]},
        shinco: {name: "shinco", name1: "5paw56eR", range: [460, 469]},
        yangzi: {name: "yangzi", name1: "5oms5a2Q", range: [470, 479]},
        mbo: {name: "mbo", name1: "576O5Y2a", range: [480, 489]},
        mcquay: {name: "mcquay", name1: "6bqm5YWL57u05bCU", range: [490, 499]},
        frestech: {name: "frestech", name1: "5paw6aOe", range: [500, 506]},
        xiaoya: {name: "xiaoya", name1: "5bCP6bit", range: [507, 509]},
        tica: {name: "tica", name1: "VElDQQ==", range: [510, 515]},
        sast: {name: "sast", name1: "5YWI56eR", range: [516, 519]},
        littleswan: {name: "littleswan", name1: "5bCP5aSp6bmF", range: [520, 529]},
        sanyo: {name: "sanyo", name1: "5LiJ5rSL", range: [530, 559]},
        royalsta: {name: "royalsta", name1: "6I2j5LqL6L6+", range: [560, 565]},
        rca: {name: "rca", name1: "UkNB", range: [566, 569]},
        lejn: {name: "lejn", name1: "5LmQ5Lqs", range: [570, 573]},
        rowa: {name: "rowa", name1: "5LmQ5Y2O", range: [574, 589]},
        casarte: {name: "casarte", name1: "5Y2h6JCo5bid", range: [590, 595]},
        carrier: {name: "carrier", name1: "5byA5Yip", range: [596, 619]},
        giwee: {name: "giwee", name1: "56ev5b6u", range: [620, 622]},
        jensany: {name: "jensany", name1: "6YeR5LiJ5rSL", range: [623, 629]},
        hualing: {name: "hualing", name1: "5Y2O5YeM", range: [630, 639]},
        gome: {name: "gome", name1: "5Zu9576O", range: [640, 644]},
        gelin: {name: "gelin", name1: "5q2M5p6X", range: [645, 655]},
        chunlan: {name: "chunlan", name1: "5pil5YWw", range: [656, 666]},
        aoli: {name: "aoli", name1: "5aWl5Yqb", range: [667, 669]},
        aucma: {name: "aucma", name1: "5r6z5p+v546b", range: [670, 675]},
        shuanglu: {name: "shuanglu", name1: "5Y+M6bm/", range: [676, 679]},
        jiwu: {name: "jiwu", name1: "6IuP5a6B5p6B54mp", range: [680, 683]},
        leader: {name: "leader", name1: "57uf5biF", range: [684, 688]},
        tomsen: {name: "tomsen", name1: "5rGk5aeG5qOu", range: [689, 693]},
        hyundai: {name: "hyundai", name1: "546w5Luj", range: [694, 699]},
        panda: {name: "panda", name1: "54aK54yr", range: [700, 704]},
        xyingyan: {name: "xyingyan", name1: "5paw6L+O54eV", range: [705, 709]},
        shenhua: {name: "shenhua", name1: "55Sz6Iqx", range: [710, 712]},
        pascmio: {name: "pascmio", name1: "5Lit5p2+", range: [713, 714]},
        yuetu: {name: "yuetu", name1: "5pyI5YWU", range: [715, 719]},
        fzm: {name: "fzm", name1: "5pa557Gz", range: [720, 721]},
        xft: {name: "xft", name1: "6Zuq6I+y54m5", range: [722, 723]},
        boyin: {name: "boyin", name1: "5rOi6Z+z", range: [724, 725]},
        huabao: {name: "huabao", name1: "5Y2O5a6d", range: [726, 729]},
        daewoo: {name: "daewoo", name1: "5aSn5a6H", range: [730, 735]},
        conrowa: {name: "conrowa", name1: "6auY6Lev5Y2O", range: [736, 739]},
        guqiao: {name: "guqiao", name1: "5Y+k5qGl", range: [740, 745]},
        huake: {name: "huake", name1: "5Y2O56eR", range: [746, 749]},
        huamei: {name: "huamei", name1: "5Y2O576O", range: [750, 754]},
        jinsong: {name: "jinsong", name1: "6YeR5p2+", range: [755, 759]},
        risuo: {name: "risuo", name1: "5pel57Si", range: [760, 764]},
        shenbao: {name: "shenbao", name1: "57uF5a6d", range: [765, 769]},
        wanbao: {name: "wanbao", name1: "5LiH5a6d", range: [770, 774]},
        neitian: {name: "neitian", name1: "5YaF55Sw", range: [775, 779]},
        electra: {name: "electra", name1: "5YeJ5a6H", range: [780, 784]},
        bluestar: {name: "bluestar", name1: "Qmx1ZVN0YXI=", range: [785, 789]},
        voltas: {name: "voltas", name1: "Vm9sdGFz", range: [790, 794]},
        akira: {name: "akira", name1: "54ix5a625LmQ", range: [795, 799]},
        panlisen: {name: "panlisen", name1: "UGFubGlzZW4=", range: [800, 801]},
        rasonic: {name: "rasonic", name1: "5LmQ5L+h", range: [802, 809]},
        palcsicons: {name: "palcsicons", name1: "6LWi5p2+", range: [810, 811]},
        itan: {name: "itan", name1: "55uI55Sw", range: [812, 814]},
        whircipol: {name: "whircipol", name1: "V2hpcmNpUG9s", range: [815, 819]},
        changgu: {name: "changgu", name1: "6ZW/6LC3", range: [820, 824]},
        funiki: {name: "funiki", name1: "RnVuaWtp", range: [825, 829]},
        yiruite: {name: "yiruite", name1: "5Lq/55Ge54m5", range: [830, 834]},
        sanzuan: {name: "sanzuan", name1: "5LiJ6ZK7", range: [835, 839]},
        deroxi: {name: "deroxi", name1: "5b635r6z6KW/", range: [840, 844]},
        fedders: {name: "fedders", name1: "6aOe6L6+5LuV", range: [845, 849]},
        paonoca: {name: "paonoca", name1: "6Z+p5Lqa", range: [850, 854]},
        wuq: {name: "wuq", name1: "5LqU5by6", range: [855, 859]},
        sinro: {name: "sinro", name1: "5paw6I+x", range: [860, 864]},
        insignia: {name: "insignia", name1: "5b2x6ZuF", range: [865, 869]},
        elco: {name: "elco", name1: "5a6c56eR", range: [870, 874]},
        vicoo: {name: "vicoo", name1: "VklDT08=", range: [875, 879]},
        gmcc: {name: "gmcc", name1: "R01DQw==", range: [880, 884]},
        xinshiji: {name: "xinshiji", name1: "5paw5LiW57qq", range: [885, 889]},
        bendao: {name: "bendao", name1: "5pys5bKb", range: [890, 894]},
        sumsaxng: {name: "sumsaxng", name1: "5Lic5pa55LiJ5pif", range: [895, 899]},
        jinxing: {name: "jinxing", name1: "6YeR5YW0", range: [900, 904]},
        mitsein: {name: "mitsein", name1: "5byl54m55pav", range: [905, 909]},
        ek: {name: "ek", name1: "RUs=", range: [910, 914]},
        kingair: {name: "kingair", name1: "5Zu956Wl", range: [915, 919]},
        aqua: {name: "aqua", name1: "QVFVQQ==", range: [920, 924]},
        unionaire: {name: "unionaire", name1: "VW5pb24gYWlyZQ==", range: [925, 929]},
        korechi: {name: "korechi", name1: "6Z+p55S1", range: [930, 939]},
        inventor: {name: "inventor", name1: "SW52ZW50b3I=", range: [940, 944]},
        xingfeidq: {name: "xingfeidq", name1: "WElOR0ZFSURR", range: [945, 949]},
        xffh: {name: "xffh", name1: "5paw6aOe6aOe6bi/", range: [950, 954]},
        dizhi: {name: "dizhi", name1: "5bid5pm6", range: [955, 959]},
        winia: {name: "winia", name1: "V0lOSUE=", range: [960, 964]},
        pascmio1: {name: "pascmio1", name1: "5p2+55S1", range: [965, 969]},
        chuangye: {name: "chuangye", name1: "5Yib6YeO", range: [970, 974]},
        shacopu: {name: "shacopu", name1: "5aSP56eR5pmu", range: [975, 979]},
        panwosoci: {name: "panwosoci", name1: "5q2j5p2+5bed", range: [980, 984]},
        shineleaf: {name: "shineleaf", name1: "5aSP56uL", range: [985, 989]},
        panatomic: {name: "panatomic", name1: "UGFuYXRvbWlj", range: [990, 994]},
        paonoca1: {name: "paonoca1", name1: "UGFvbm9jYQ==", range: [995, 999]},
        geling: {name: "geling", name1: "5q2M6I+x", range: [1000, 1004]},
        sharbo: {name: "sharbo", name1: "5aSP5a6d", range: [1005, 1009]},
        hangtiandianqi: {name: "hangtiandianqi", name1: "6Iiq5aSp55S15Zmo", range: [1010, 1014]},
        dongbao: {name: "dongbao", name1: "5Lic5a6d", range: [1015, 1019]},
        toyo: {name: "toyo", name1: "5Lic5rSL", range: [1020, 1024]},
        shangling: {name: "shangling", name1: "5LiK6I+x", range: [1025, 1029]},
        teco: {name: "teco", name1: "VEVDTw==", range: [1030, 1034]},
        airwell: {name: "airwell", name1: "5qyn5aiB5bCU", range: [1035, 1039]},
        combine: {name: "combine", name1: "5bq35ouc5oGp", range: [1040, 1042]},
        feige: {name: "feige", name1: "6aOe5q2M", range: [1043, 1045]},
        partsoinc: {name: "partsoinc", name1: "UGFydHNvaW5j", range: [1046, 1049]},
        nikai: {name: "nikai", name1: "TmlLYWk=", range: [1050, 1052]},
        mitsubishiheavy_haier: {name: "mitsubishiheavy_haier", name1: "5LiJ6I+x6YeN5bel5rW35bCU", range: [1053, 1055]},
        voton: {name: "voton", name1: "5rKD6aG/", range: [1056, 1059]},
        tadiran: {name: "tadiran", name1: "5aGU6L+q5YWw", range: [1060, 1061]},
        lexin: {name: "lexin", name1: "5LmQ5paw", range: [1062, 1063]},
        nuolin: {name: "nuolin", name1: "6K+65p6X", range: [1064, 1066]},
        xiamenyilin: {name: "xiamenyilin", name1: "5Y6m6Zeo5Lq/5p6X", range: [1067, 1069]},
        horshron: {name: "horshron", name1: "6Jm55aOw", range: [1070, 1071]},
        levante: {name: "levante", name1: "TEVWQU5URQ==", range: [1072, 1073]},
        guanyuan: {name: "guanyuan", name1: "5Yag6L+c", range: [1074, 1075]},
        lilytech: {name: "lilytech", name1: "55m+5ZCI", range: [1076, 1078]},
        sunny: {name: "sunny", name1: "6Ziz5YWJ", range: [1079, 1080]},
        viomi: {name: "viomi", name1: "5LqR57Gz", range: [1081, 1082]},
        soyea: {name: "soyea", name1: "57Si5LyK", range: [1082, 1085]},
        serene: {name: "serene", name1: "6KW/5Ya3", range: [1086, 1088]},
        cheblo: {name: "cheblo", name1: "5qix6Iqx55S15Zmo", range: [1089, 1094]},
        smartmi: {name: "smartmi", name1: "5pm657Gz", range: [1095, 1099]},
        bosch: {name: "bosch", name1: "5Y2a5LiW", range: [1100, 1104]},
        partmusic: {name: "partmusic", name1: "5pel5p2+", range: [1105, 1109]},
        funiki1: {name: "funiki1", name1: "RlVOSUtJ", range: [1110, 1114]},
        hilaire: {name: "hilaire", name1: "6Zuq6I6x5bCU", range: [1115, 1116]},
        hkc: {name: "hkc", name1: "5oOg56eR", range: [1117, 1119]},
        bluestar1: {name: "bluestar1", name1: "Qmx1ZSBTdGFy", range: [1120, 1125]},
        teco1: {name: "teco1", name1: "5Lic5YWD", range: [1126, 1128]},
        paohanic: {name: "paohanic", name1: "5p2+5bed", range: [1129, 1131]},
        nintaus: {name: "nintaus", name1: "6YeR5q2j", range: [1132, 1136]},
        olimpiasplendid: {name: "olimpiasplendid", name1: "5qyn6I+x5a6d", range: [1137, 1139]},
        philips: {name: "philips", name1: "6aOe5Yip5rWm", range: [1140, 1145]},
        fortress: {name: "fortress", name1: "5Liw5rO9", range: [1146, 1147]},
        meilihongzuan: {name: "meilihongzuan", name1: "TUVJTElIT05HWlVBTg==", range: [1148, 1149]},
        tica1: {name: "tica1", name1: "5aSp5Yqg", range: [1150, 1154]},
        junda: {name: "junda", name1: "6aqP5a6J6L6+", range: [1155, 1159]},
        electra1: {name: "electra1", name1: "5Lul6I6x54m5", range: [1160, 1162]},
        mingyi: {name: "mingyi", name1: "5ZCN5Lq/", range: [1163, 1165]},
        ifb: {name: "ifb", name1: "SUZC", range: [1166, 1167]},
        kingsfin: {name: "kingsfin", name1: "S2luZ3NmaW4=", range: [1168, 1169]},
        onida: {name: "onida", name1: "T25pZGE=", range: [1170, 1172]},
        suittc: {name: "suittc", name1: "6ZGr5rqQ", range: [1173, 1175]},
        colmo: {name: "colmo", name1: "Q09MTU8=", range: [1176, 1177]},
        duozuanhua: {name: "duozuanhua", name1: "5aSa6ZK76Iqx", range: [1178, 1179]},
        huikang: {name: "huikang", name1: "5oOg5bq3", range: [1180, 1181]},
        gibson: {name: "gibson", name1: "5ZCJ5pmu55Sf", range: [1182, 1189]},
        first: {name: "first", name1: "RklSU1Q=", range: [1190, 1191]},
        jhs: {name: "jhs", name1: "6YeR6bi/55ub", range: [1192, 1193]},
        meiling: {name: "meiling", name1: "576O6I+x", range: [1194, 1197]},
        maxe: {name: "maxe", name1: "5LiH5aOr55uK", range: [1198, 1201]},
        skg: {name: "skg", name1: "U0tH", range: [1202, 1203]},
        acl: {name: "acl", name1: "5Zac5LqL5p2l", range: [1204, 1205]},
        tongyi: {name: "tongyi", name1: "5ZCM55uK", range: [1206, 1207]},
        tianyuan: {name: "tianyuan", name1: "5aSp5YWD", range: [1208, 1209]},
        tianhui: {name: "tianhui", name1: "5aSp5rGH6ZuG5oiQ", range: [1210, 1211]},
        tianjin: {name: "tianjin", name1: "5aSp5rSl", range: [1212, 1213]},
        tair: {name: "tair", name1: "VGFpcg==", range: [1214, 1215]},
        macro: {name: "macro", name1: "5LiH5a625LmQ", range: [1216, 1219]},
        xinle: {name: "xinle", name1: "5paw5LmQ", range: [1220, 1223]},
        xinhuabao: {name: "xinhuabao", name1: "5paw5Y2O5a6d", range: [1224, 1225]},
        xiongdi: {name: "xiongdi", name1: "5YWE5byf", range: [1226, 1227]},
        benwin: {name: "benwin", name1: "5a6+57u0", range: [1228, 1229]},
        sanshui: {name: "sanshui", name1: "5bGx5rC0", range: [1230, 1231]},
        phlgco: {name: "phlgco", name1: "6aOe5q2M5Lit5Zu9", range: [1232, 1233]},
        linkcool: {name: "linkcool", name1: "6bqf6YW3", range: [1234, 1235]},
        nec: {name: "nec", name1: "TkVD", range: [1236, 1238]},
        lanbo: {name: "lanbo", name1: "6JOd5rOi", range: [1239, 1249]},
        changling: {name: "changling", name1: "6ZW/5bKt", range: [1250, 1259]},
        jinli: {name: "jinli", name1: "6YeR56uL", range: [1260, 1261]},
        huifeng: {name: "huifeng", name1: "5rGH5Liw", range: [1262, 1265]},
        huanghe: {name: "huanghe", name1: "6buE5rKz", range: [1266, 1267]},
        hailin: {name: "hailin", name1: "5rW35p6X", range: [1268, 1269]},
        cih: {name: "cih", name1: "Q0lI", range: [1270, 1271]},
        meico: {name: "meico", name1: "576O5q2M", range: [1272, 1273]},
        museen: {name: "museen", name1: "5oWV5qOu", range: [1274, 1275]},
        millink: {name: "millink", name1: "57Gz5p6X5a6i", range: [1276, 1277]},
        mistral: {name: "mistral", name1: "5ZCN5rCP6aOO", range: [1278, 1279]},
        mljd: {name: "mljd", name1: "6bqm5YuS", range: [1280, 1281]},
        bole: {name: "bole", name1: "5rOi5LmQ", range: [1282, 1285]},
        sacon: {name: "sacon", name1: "5biF5bq3", range: [1286, 1290]},
        weili: {name: "weili", name1: "5aiB5Yqb", range: [1291, 1295]},
        sova: {name: "sova", name1: "57Si5Y2O", range: [1296, 1297]},
        zymbo: {name: "zymbo", name1: "5rex5a6d", range: [1298, 1299]},
        weiteli: {name: "weiteli", name1: "5aiB54m55Yip", range: [1300, 1301]},
        kenwood: {name: "kenwood", name1: "5YGl5LyN", range: [1302, 1304]},
        gee: {name: "gee", name1: "5byY56uL", range: [1305, 1306]},
        hneyrea: {name: "hneyrea", name1: "6Jm556uL", range: [1307, 1308]},
        langge: {name: "langge", name1: "5pyX5q2M", range: [1309, 1313]},
        oudian: {name: "oudian", name1: "5qyn5YW4", range: [1314, 1315]},
        pgtess: {name: "pgtess", name1: "5ZOB5qC854m55pav", range: [1316, 1317]},
        panwosoci1: {name: "panwosoci1", name1: "UGFud29zb2Np", range: [1318, 1319]},
        partsonic: {name: "partsonic", name1: "5rex5Zyz5p2+5LiL", range: [1320, 1321]},
        twinswan: {name: "twinswan", name1: "5Y+M5Yek", range: [1322, 1323]},
        shengsong: {name: "shengsong", name1: "5rex5p2+", range: [1324, 1325]},
        pamosautc: {name: "pamosautc", name1: "UGFtb3NhdXRj", range: [1326, 1327]},
        caixing: {name: "caixing", name1: "5b2p5pif", range: [1328, 1329]},
        cmv: {name: "cmv", name1: "Q01W", range: [1330, 1331]},
        dongxia: {name: "dongxia", name1: "5Yas5aSP", range: [1332, 1333]},
        guangda: {name: "guangda", name1: "5YWJ5aSn", range: [1334, 1335]},
        geyang: {name: "geyang", name1: "5qC86Ziz", range: [1336, 1337]},
        gchv: {name: "gchv", name1: "R0NIVg==", range: [1338, 1339]},
        huayi: {name: "huayi", name1: "5Y2O5oSP", range: [1340, 1342]},
        sunburg: {name: "sunburg", name1: "5qOu5a6d", range: [1343, 1344]},
        boerka: {name: "boerka", name1: "5rOi5bCU5Y2h", range: [1345, 1346]},
        aite: {name: "aite", name1: "54ix54m5", range: [1347, 1348]},
        aidelong: {name: "aidelong", name1: "6Im+5b636b6Z", range: [1349, 1350]},
        dajinxing: {name: "dajinxing", name1: "5aSn6YeR5pif", range: [1351, 1352]},
        dometic: {name: "dometic", name1: "5aSa576O6L6+", range: [1353, 1354]},
        museen1: {name: "museen1", name1: "5oWV5qOu", range: [1274, 1275]},
    },

    /**
     * get kfid range for a given brand. Returns [start, end] or null if brand not found.
     */
    getBrandKfidRange: (brand: string): number[] | null => {
        const brandKey = brand.toLowerCase();
        const brandData = protocolUtils.acBrandModels[brandKey as keyof typeof protocolUtils.acBrandModels];
        return brandData ? brandData.range : null;
    },

    /**
     * get kfid range for a given brand. Returns [start, end] or null if brand not found.
     * Example: brand = "gree" -> returns [0, 19]
     */
    getKfidFromOffset: (brand: string, offset: number): number | null => {
        const range = protocolUtils.getBrandKfidRange(brand);
        if (!range) {
            return null;
        }
        const [start, end] = range;
        const kfid = start + (offset - 1);
        if (kfid < start || kfid > end) {
            return null;
        }
        return kfid;
    },

    /**
     * get brand and offset from kfid. Returns {brand, offset} or null if kfid not in any brand range.
     * Example: kfid = 5 -> returns {brand: "gree", offset: 6}
     */
    getBrandFormattedEnums: (): string[] => {
        const enums: string[] = [];
        for (const [brand, data] of Object.entries(protocolUtils.acBrandModels)) {
            const [start, end] = data.range;
            //const offset1Based = (index: number): number => index - 0x0000 + 1;
            //const rangeStr = `${offset1Based(start)}-${offset1Based(end)}`;
            const decoded = Buffer.from(data.name1, "base64").toString("utf-8");
            enums.push(`${data.name}(${decoded})(${start}-${end})`);
            void brand; // to satisfy unused variable linting, as we only need the data.name for the enum display
        }
        return enums;
    },

    /**
     * AC button mapping - based on protocol table 12
     */
    acButtonMap: {
        power: {buttonId: 0x00, values: {on: 0x00, off: 0x01}},
        mode: {buttonId: 0x01, values: {auto: 0x00, cooling: 0x01, dehumidification: 0x02, air_supply: 0x03, heating: 0x04}},
        temperature: {buttonId: 0x02, baseValue: 0x00}, // 16℃ is 0x00, 17℃ is 0x01,max is 32℃ is 0x10
        wind_speed: {buttonId: 0x04, values: {auto: 0x00, low: 0x01, medium: 0x02, high: 0x03, strong: 0x04}},
        swing: {buttonId: 0x05, values: {on: 0x00, off: 0x01}},
    },
};

const fzLocal = {
    easyiot_ir_recv_command: {
        cluster: "seTunneling",
        type: ["commandTransferData"],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_ir_recv_command" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString("hex");
            logger.debug(`"easyiot_ir_recv_command" received command ${hexString}`, NS);
            return {last_received_command: hexString};
        },
    } satisfies Fz.Converter<"seTunneling", undefined, ["commandTransferData"]>,

    easyiot_tts_recv_status: {
        cluster: "seTunneling",
        type: ["commandTransferData"],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_tts_recv_status" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString("hex");
            logger.debug(`"easyiot_tts_recv_status" received status ${hexString}`, NS);
            return {last_received_status: hexString};
        },
    } satisfies Fz.Converter<"seTunneling", undefined, ["commandTransferData"]>,

    easyiot_sp1000_recv_status: {
        cluster: "seTunneling",
        type: ["commandTransferData"],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_tts_recv_status" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString("hex");
            logger.debug(`"easyiot_tts_recv_status" received status ${hexString}`, NS);
            if (msg.data.data[0] === 0x80 && msg.data.data[1] === 0) {
                const result = msg.data.data[4];
                return {last_received_status: result};
            }
        },
    } satisfies Fz.Converter<"seTunneling", undefined, ["commandTransferData"]>,

    easyiot_action: {
        cluster: "genOnOff",
        type: ["commandOn", "commandOff", "commandToggle"],
        convert: (model, msg, publish, options, meta) => {
            const lookup: KeyValueAny = {commandToggle: "single", commandOn: "double", commandOff: "long"};
            let buttonMapping: KeyValueAny = null;
            if (model.model === "ZB-WB01") {
                buttonMapping = {1: "1"};
            } else if (model.model === "ZB-WB02") {
                buttonMapping = {1: "1", 2: "2"};
            } else if (model.model === "ZB-WB03") {
                buttonMapping = {1: "1", 2: "2", 3: "3"};
            } else if (model.model === "ZB-WB08") {
                buttonMapping = {1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8"};
            }

            const button = buttonMapping ? `${buttonMapping[msg.endpoint.ID]}_` : "";
            return {action: `${button}${lookup[msg.type]}`};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff", "commandToggle"]>,
};

const tzLocal = {
    easyiot_ir_send_command: {
        key: ["send_command"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error("There is no IR code to send");
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: Buffer.from(value as string, "hex"),
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR command success.", NS);
        },
    } satisfies Tz.Converter,
    /**
     * send AC power command
     * value: "on" or "off"
     */
    easyiot_ir_ac_power: {
        key: ["ac_power"],
        convertSet: async (entity, key, value, meta) => {
            if (!["on", "off"].includes(value as string)) {
                throw new Error("ac_power must be 'on' or 'off'");
            }

            // deviceType 0x01 = AC
            const deviceType = 0x01;
            const buttonId = protocolUtils.acButtonMap.power.buttonId;
            const powerValue = value === "on" ? 0x00 : 0x01;

            const command = protocolUtils.buildCommand(0x86, deviceType, buttonId, powerValue);

            logger.debug(`Sending AC power command: ${value}`, NS);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: command,
                },
                {disableDefaultResponse: true},
            );

            return {state: {ac_power: value}};
        },
    } satisfies Tz.Converter,

    /**
     * set AC temperature
     * temperature range: 16℃ (0x00) - 32℃ (0x10)
     */
    easyiot_ir_ac_temperature: {
        key: ["ac_temperature"],
        convertSet: async (entity, key, value, meta) => {
            const temp = value as number;

            if (!Number.isInteger(temp) || temp < 16 || temp > 32) {
                throw new Error("ac_temperature must be 16-32");
            }

            const deviceType = 0x01;
            const buttonId = 0x02;
            const tempValue = temp - 16; // 16℃ is 0x00, 17℃ is 0x01

            const command = protocolUtils.buildCommand(0x86, deviceType, buttonId, tempValue);

            logger.debug(`Sending AC temperature command: ${temp}℃`, NS);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: command,
                },
                {disableDefaultResponse: true},
            );

            return {state: {ac_temperature: temp}};
        },
    } satisfies Tz.Converter,

    /**
     * set AC mode
     * mode range: auto(0x00), cooling(0x01), dehumidification(0x02), air_supply(0x03), heating(0x04)
     */
    easyiot_ir_ac_mode: {
        key: ["ac_mode"],
        convertSet: async (entity, key, value, meta) => {
            const modeMap: KeyValueAny = {
                auto: 0x00,
                cooling: 0x01,
                dehumidification: 0x02,
                air_supply: 0x03,
                heating: 0x04,
            };

            if (!((value as string) in modeMap)) {
                throw new Error(`ac_mode must be one of: ${Object.keys(modeMap).join(", ")}`);
            }

            const deviceType = 0x01;
            const buttonId = protocolUtils.acButtonMap.mode.buttonId;
            const modeValue = modeMap[value as string];

            const command = protocolUtils.buildCommand(0x86, deviceType, buttonId, modeValue);

            logger.debug(`Sending AC mode command: ${value}`, NS);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: command,
                },
                {disableDefaultResponse: true},
            );

            return {state: {ac_mode: value}};
        },
    } satisfies Tz.Converter,

    easyiot_ir_ac_wind_speed: {
        key: ["ac_wind_speed"],
        convertSet: async (entity, key, value, meta) => {
            const windMap: KeyValueAny = {
                auto: 0x00,
                low: 0x01,
                medium: 0x02,
                high: 0x03,
                strong: 0x04,
            };

            if (!((value as string) in windMap)) {
                throw new Error(`ac_wind_speed must be one of: ${Object.keys(windMap).join(", ")}`);
            }

            const deviceType = 0x01;
            const buttonId = protocolUtils.acButtonMap.wind_speed.buttonId;
            const windValue = windMap[value as string];

            const command = protocolUtils.buildCommand(0x86, deviceType, buttonId, windValue);

            logger.debug(`Sending AC wind speed command: ${value}`, NS);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: command,
                },
                {disableDefaultResponse: true},
            );

            return {state: {ac_wind_speed: value}};
        },
    } satisfies Tz.Converter,

    easyiot_ir_ac_kfid_offset: {
        key: ["ac_kfid_offset_model"],
        convertSet: async (entity, key, value, meta) => {
            const payload = value as KeyValueAny;
            const kfid = payload.ac_kfid_offset as number | undefined;
            const brandStr = payload.ac_brand as string | undefined;
            const brandMatch = brandStr.match(/^[a-zA-Z]+/);
            const brand = brandMatch[0] ? brandMatch[0].toLowerCase() : undefined;

            logger.debug(`AC brand set to ${brand} brandMatch: ${brandMatch}, kfid: ${kfid}`, NS);

            if (!Object.keys(protocolUtils.acBrandModels).includes(brand)) {
                throw new Error(`ac_brand must be one of: ${Object.keys(protocolUtils.acBrandModels).join(", ")}`);
            }
            //get the kfid range for the current brand
            const range = protocolUtils.getBrandKfidRange(brand);
            if (!range) {
                return null;
            }

            const [start, end] = range;
            logger.debug(`AC brand set to ${brand}, kfid: ${kfid}`, NS);
            if (kfid < start || kfid > end) {
                throw new Error(`ac_kfid_offset ${kfid} is out of range for brand ${brand} (valid range: ${start}-${end})`);
            }
            const deviceType = 0x01;
            const kfid_l = kfid & 0xff;
            const kfid_h = (kfid >> 8) & 0xff;

            const command = protocolUtils.buildCommand(0x80, deviceType, kfid_h, kfid_l);

            logger.debug(`Sending AC kfid offset command: ${kfid}`, NS);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: command,
                },
                {disableDefaultResponse: true},
            );

            return {state: {kfid_offset: value}};
        },
    } satisfies Tz.Converter,

    easyiot_tts_send_command: {
        key: ["send_tts"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error("There is no text to send");
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameHeader = Buffer.from([0xfd]);

            const gb2312Buffer = iconv.encode(value as string, "GB2312");
            const dataLength = gb2312Buffer.length + 2;
            const dataLengthBuffer = Buffer.alloc(2);
            dataLengthBuffer.writeUInt16BE(dataLength, 0);
            const commandByte = Buffer.from([0x01, 0x01]);
            const protocolFrame = Buffer.concat([frameHeader, dataLengthBuffer, commandByte, gb2312Buffer]);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR command success.", NS);
        },
    } satisfies Tz.Converter,
    easyiot_sp1000_play_voice: {
        key: ["play_voice"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error("There is no text to send");
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameCmd = Buffer.from([0x01, 0x00]);
            const dataLen = Buffer.from([0x02]);
            const dataType = Buffer.from([0x21]);
            const playId = Buffer.from([(value as number) & 0xff, ((value as number) >> 8) & 0xff]);

            const protocolFrame = Buffer.concat([frameCmd, dataLen, dataType, playId]);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0001,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR command success.", NS);
        },
    } satisfies Tz.Converter,
    easyiot_sp1000_set_volume: {
        key: ["set_volume"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error("There is no text to send");
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameCmd = Buffer.from([0x02, 0x00]);
            const dataLen = Buffer.from([0x01]);
            const dataType = Buffer.from([0x20]);
            const volume = Buffer.from([(value as number) & 0xff]);

            const protocolFrame = Buffer.concat([frameCmd, dataLen, dataType, volume]);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0001,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR command success.", NS);
        },
    } satisfies Tz.Converter,
    easyiot_zl01_open_door: {
        key: ["unlock_door"],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, "PIN code must be a string");
            const length = Buffer.from([value.toString().length]);
            const pincode = Buffer.from(value.toString(), "utf-8");
            const data = Buffer.concat([length, pincode]);
            await entity.command("closuresDoorLock", "unlockDoor", {pincodevalue: data}, {disableDefaultResponse: true});
        },
    } satisfies Tz.Converter,
    easyiot_zl01_open_door_with_timeout: {
        key: ["unlock_door_with_timeout"],
        convertSet: async (entity, key, value, meta) => {
            assertObject(value, "PIN code must be an object");
            const payload = value as KeyValueAny;
            logger.debug(`Sending pin code: ${payload.pin_code} with timeout: ${payload.timeout} seconds`, NS);
            const length = Buffer.from([payload.pin_code.length]);
            const pincodeBuffer = Buffer.from(payload.pin_code as string, "utf-8");
            const data = Buffer.concat([length, pincodeBuffer]);
            await entity.command<"closuresDoorLock", "unlockDoorWithTimeout", EasyiotDoorLock>(
                "closuresDoorLock",
                "unlockDoorWithTimeout",
                {
                    timeout: payload.timeout,
                    pincodevalue: data,
                },
                {disableDefaultResponse: true},
            );
        },
    } satisfies Tz.Converter,
    easyiot_zl01_add_ephemeral_pin: {
        key: ["ephemeral_pin_code"],
        convertSet: async (entity, key, value, meta) => {
            assertObject(value, "ephemeral_pin_code requires an object with start_time, end_time, userid, valid_times, and pincode");
            const payload = value as KeyValueAny;

            // Validate required parameters
            if (typeof payload.start_time !== "number") {
                throw new Error("start_time must be a number (UNIX timestamp in seconds)");
            }
            if (typeof payload.end_time !== "number") {
                throw new Error("end_time must be a number (UNIX timestamp in seconds)");
            }
            if (typeof payload.userid !== "number") {
                throw new Error("userid must be a number (0-65535)");
            }
            if (typeof payload.valid_times !== "number") {
                throw new Error("valid_times must be a number (0-255)");
            }
            if (typeof payload.pincode !== "string") {
                throw new Error("pincode must be a string");
            }

            logger.debug(
                `Adding ephemeral pin - startTime: ${payload.start_time}, endTime: ${payload.end_time}, userid: ${payload.userid}, validTimes: ${payload.valid_times}, pincode: ${payload.pincode}`,
                NS,
            );

            // Convert UNIX timestamps to Zigbee 2000-based local time seconds
            // Use UTC (offset 0) as default timezone for temporary passwords
            const startTimeZigbee = utcToDeviceLocal2000Seconds(payload.start_time, 0);
            const endTimeZigbee = utcToDeviceLocal2000Seconds(payload.end_time, 0);

            // Convert pincode string to buffer
            const pincodeBuffer = Buffer.from(payload.pincode, "utf-8");

            const commandPayload: EasyiotDoorLock["commands"]["setEphemeralPin"] = {
                startTime: startTimeZigbee,
                endTime: endTimeZigbee,
                userid: payload.userid,
                validTimes: payload.valid_times,
                pincodevalue: pincodeBuffer,
            };
            await entity.command<"closuresDoorLock", "setEphemeralPin", EasyiotDoorLock>("closuresDoorLock", "setEphemeralPin", commandPayload, {
                disableDefaultResponse: true,
            });
        },
    } satisfies Tz.Converter,
    easyiot_zl01_clear_ephemeral_pin: {
        key: ["ephemeral_clear_pin_code"],
        convertSet: async (entity, key, value, meta) => {
            assertObject(value, "ephemeral_clear_pin_code requires an object with userid");
            const payload = value as KeyValueAny;

            // Validate required parameter
            if (typeof payload.userid !== "number") {
                throw new Error("userid must be a number (0-65535)");
            }

            await entity.command<"closuresDoorLock", "clearEphemeralPin", EasyiotDoorLock>(
                "closuresDoorLock",
                "clearEphemeralPin",
                {
                    userid: payload.userid,
                },
                {
                    disableDefaultResponse: true,
                },
            );
        },
    } satisfies Tz.Converter,
    easyiot_zl01_clear_all_ephemeral_pin: {
        key: ["ephemeral_clear_all_pin_code"],
        convertSet: async (entity, key, value, meta) => {
            await entity.command<"closuresDoorLock", "clearAllEphemeralPins", EasyiotDoorLock>(
                "closuresDoorLock",
                "clearAllEphemeralPins",
                {},
                {disableDefaultResponse: true},
            );
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "ZB-IR01", manufacturerName: "easyiot"}],
        model: "ZB-IR01",
        vendor: "easyiot",
        description: "Infrared remote control equipped with local code library,",
        fromZigbee: [fzLocal.easyiot_ir_recv_command],
        toZigbee: [
            tzLocal.easyiot_ir_send_command,
            tzLocal.easyiot_ir_ac_power,
            tzLocal.easyiot_ir_ac_temperature,
            tzLocal.easyiot_ir_ac_mode,
            tzLocal.easyiot_ir_ac_wind_speed,
            tzLocal.easyiot_ir_ac_kfid_offset,
        ],
        exposes: (device, options) => {
            return [
                // recved IR command code
                e.text("last_received_command", ea.STATE).withDescription("Last received IR command code"),
                e
                    .text("send_command", ea.SET)
                    .withDescription(
                        "Send infrared control command, This is a low-level interface. You can refer to the protocol documentation to implement more features.",
                    ),
                // KFID offset for AC models that require it. The offset is based on the brand's KFID rang
                e
                    .composite("ac_kfid_offset_model", "ac_kfid_offset_model", ea.SET)
                    .withDescription(
                        "Here you can create a new air conditioner remote control. First, select the brand of your air conditioner, then enter the remote control number within the indicated range in Ac kfid offset and click Apply. Finally, try turning on the air conditioner. If it fails, try the next number until it works.",
                    )
                    .withFeature(
                        e.enum("ac_brand", ea.SET, protocolUtils.getBrandFormattedEnums()).withDescription("AC brand - choose a brand first"),
                    )
                    .withFeature(
                        e
                            .numeric("ac_kfid_offset", ea.SET)
                            .withDescription(
                                "For example, if you select the first option, Gree, you can enter any number between 0 and 19, and then click Apply.",
                            ),
                    ),
                // (Power on/off)
                e.binary("ac_power", ea.ALL, "on", "off").withDescription("AC power "),

                // (Operation mode)
                e
                    .enum("ac_mode", ea.SET, ["auto", "cooling", "dehumidification", "air_supply", "heating"])
                    .withDescription("AC mode: auto/cooling/dehumidification/air_supply/heating"),

                // (Temperature setting: 16-32°C)
                e
                    .numeric("ac_temperature", ea.SET)
                    .withValueMin(16)
                    .withValueMax(32)
                    .withValueStep(1)
                    .withUnit("°C")
                    .withDescription("AC temperature setting: 16-32°C"),

                // (Fan speed)
                e.enum("ac_wind_speed", ea.SET, ["auto", "low", "medium", "high", "strong"]).withDescription("AC fan speed"),
            ];
        },
    },
    {
        fingerprint: [{modelID: "ZB-TTS01", manufacturerName: "easyiot"}],
        model: "ZB-TTS01",
        vendor: "easyiot",
        description: "TTS Converter for Simplified Chinese GB2312 encoded text",
        fromZigbee: [fzLocal.easyiot_tts_recv_status],
        toZigbee: [tzLocal.easyiot_tts_send_command],
        exposes: [
            e.text("last_received_status", ea.STATE).withDescription("status"),
            e.text("send_tts", ea.SET).withDescription("Please enter text"),
        ],
    },
    {
        fingerprint: [{modelID: "ZB-SP1000", manufacturerName: "easyiot"}],
        model: "ZB-SP1000",
        vendor: "easyiot",
        description: "ZB-SP1000 is an MP3 player that can support 1,000 voices.",
        fromZigbee: [fzLocal.easyiot_sp1000_recv_status],
        toZigbee: [tzLocal.easyiot_sp1000_play_voice, tzLocal.easyiot_sp1000_set_volume],
        exposes: [
            e.numeric("play_voice", ea.SET).withDescription("Please enter ID(1-999)").withValueMin(1).withValueMax(999).withValueStep(1),
            e.numeric("set_volume", ea.SET).withDescription("Please enter volume(1-30)").withValueMin(1).withValueMax(30).withValueStep(1),
            e.text("last_received_status", ea.STATE).withDescription("status"),
        ],
    },
    {
        fingerprint: [{modelID: "ZB-RS485", manufacturerName: "easyiot"}],
        model: "ZB-RS485",
        vendor: "easyiot",
        description: "Zigbee to RS485 controller",
        fromZigbee: [fzLocal.easyiot_ir_recv_command],
        toZigbee: [tzLocal.easyiot_ir_send_command],
        exposes: [
            e.text("last_received_command", ea.STATE).withDescription("Received data"),
            e.text("send_command", ea.SET).withDescription("Send data"),
        ],
    },
    {
        zigbeeModel: ["ZB-PM01"],
        model: "ZB-PM01",
        vendor: "easyiot",
        description: "Smart circuit breaker with Metering",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter()],
    },
    {
        zigbeeModel: ["ZB-WC01"],
        model: "ZB-WC01",
        vendor: "easyiot",
        description: "Curtain motor",
        extend: [m.windowCovering({controls: ["lift"], configureReporting: false})],
    },
    {
        zigbeeModel: ["ZB-WB01"],
        model: "ZB-WB01",
        vendor: "easyiot",
        description: "1-button remote control",
        fromZigbee: [fzLocal.easyiot_action],
        toZigbee: [],
        exposes: [e.action(["1_single", "1_double", "1_long"]), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
        },
    },
    {
        zigbeeModel: ["ZB-WB02"],
        model: "ZB-WB02",
        vendor: "easyiot",
        description: "2-button remote control",
        fromZigbee: [fzLocal.easyiot_action],
        toZigbee: [],
        exposes: [e.action(["1_single", "1_double", "1_long", "2_single", "2_double", "2_long"]), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["ZB-WB03"],
        model: "ZB-WB03",
        vendor: "easyiot",
        description: "3-button remote control",
        fromZigbee: [fzLocal.easyiot_action],
        toZigbee: [],
        exposes: [e.action(["1_single", "1_double", "1_long", "2_single", "2_double", "2_long", "3_single", "3_double", "3_long"]), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["ZB-WB08"],
        model: "ZB-WB08",
        vendor: "easyiot",
        description: "8-button remote control",
        fromZigbee: [fzLocal.easyiot_action],
        toZigbee: [],
        exposes: [
            e.action([
                "1_single",
                "1_double",
                "1_long",
                "2_single",
                "2_double",
                "2_long",
                "3_single",
                "3_double",
                "3_long",
                "4_single",
                "4_double",
                "4_long",
                "5_single",
                "5_double",
                "5_long",
                "6_single",
                "6_double",
                "6_long",
                "7_single",
                "7_double",
                "7_long",
                "8_single",
                "8_double",
                "8_long",
            ]),
            e.battery(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(8), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        fingerprint: [{modelID: "ZB-PSW04", manufacturerName: "easyiot"}],
        model: "ZB-PSW04",
        vendor: "easyiot",
        description: "Zigbee 4-channel relay",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}),
            m.onOff({endpointNames: ["l1", "l2", "l3", "l4"], configureReporting: false, powerOnBehavior: false}),
        ],
    },
    {
        fingerprint: [{modelID: "ZB-SW08", manufacturerName: "easyiot"}],
        model: "ZB-SW08",
        vendor: "easyiot",
        description: "Zigbee 8-channel relay",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5, l6: 6, l7: 7, l8: 8}}),
            m.onOff({endpointNames: ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"], configureReporting: false, powerOnBehavior: false}),
        ],
    },

    {
        fingerprint: [{modelID: "ZB-ZL01", manufacturerName: "easyiot"}],
        model: "ZB-ZL01",
        vendor: "easyiot",
        description: "Smart door lock",
        fromZigbee: [],
        toZigbee: [
            tzLocal.easyiot_zl01_open_door,
            tzLocal.easyiot_zl01_open_door_with_timeout,
            tzLocal.easyiot_zl01_add_ephemeral_pin,
            tzLocal.easyiot_zl01_clear_ephemeral_pin,
            tzLocal.easyiot_zl01_clear_all_ephemeral_pin,
        ],
        extend: [
            m.deviceAddCustomCluster("closuresDoorLock", {
                name: "customClusterDoorLock",
                ID: 0x0101,
                attributes: {},
                commands: {
                    unlockDoorWithTimeout: {
                        ID: 0x03,
                        name: "unlockDoorWithTimeout",
                        response: 3,
                        parameters: [
                            {name: "timeout", type: Zcl.DataType.UINT32},
                            {name: "pincodevalue", type: Zcl.DataType.OCTET_STR},
                        ],
                    },
                    setEphemeralPin: {
                        ID: 0xb6,
                        name: "setEphemeralPin",
                        response: 182,
                        parameters: [
                            {name: "startTime", type: Zcl.DataType.UINT32},
                            {name: "endTime", type: Zcl.DataType.UINT32},
                            {name: "userid", type: Zcl.DataType.UINT16},
                            {name: "validTimes", type: Zcl.DataType.UINT8},
                            {name: "pincodevalue", type: Zcl.DataType.OCTET_STR},
                        ],
                    },
                    clearEphemeralPin: {
                        ID: 0xb8,
                        name: "clearEphemeralPin",
                        response: 184,
                        parameters: [{name: "userid", type: Zcl.DataType.UINT16}],
                    },
                    clearAllEphemeralPins: {
                        ID: 0xb9,
                        name: "clearAllEphemeralPins",
                        response: 185,
                        parameters: [],
                    },
                },
                commandsResponse: {
                    unlockDoorRsp: {ID: 0x01, name: "unlockDoorRsp", parameters: [{name: "status", type: Zcl.DataType.ENUM8}], required: true},
                    unlockWithTimeoutRsp: {ID: 0x03, name: "unlockWithTimeoutRsp", parameters: [{name: "status", type: Zcl.DataType.ENUM8}]},
                    setEphemeralPinRsp: {ID: 182, name: "setEphemeralPinRsp", parameters: [{name: "status", type: Zcl.DataType.UINT8}]},
                    clearEphemeralPinRsp: {ID: 184, name: "clearEphemeralPinRsp", parameters: [{name: "status", type: Zcl.DataType.UINT8}]},
                    clearAllEphemeralPinsRsp: {ID: 185, name: "clearAllEphemeralPinsRsp", parameters: [{name: "status", type: Zcl.DataType.UINT8}]},
                },
            }),
            m.battery({percentageReportingConfig: {min: 30, max: 1800, change: 1}}),
        ],
        exposes: [
            e.numeric("lock_status", ea.STATE | ea.GET).withDescription("Lock status reported by the lock, 0 means locked, 1 means unlocked"),
            e.text("unlock_door", ea.SET).withDescription("Enter password to unlock door"),
            e
                .composite("unlock_door_with_timeout", "unlock_door_with_timeout", ea.ALL)
                .withFeature(e.numeric("timeout", ea.SET).withDescription("Number of seconds the PIN code is valid, 0 means lock will be re-locked"))
                .withFeature(e.text("pin_code", ea.SET).withLabel("PIN code").withDescription("Pincode to set, set pincode to null to clear")),
            e
                .composite("ephemeral_pin_code", "ephemeral_pin_code", ea.SET)
                .withFeature(e.numeric("start_time", ea.SET).withDescription("Temporary PIN start time (UNIX timestamp in seconds)"))
                .withFeature(e.numeric("end_time", ea.SET).withDescription("Temporary PIN end time (UNIX timestamp in seconds)"))
                .withFeature(e.numeric("userid", ea.SET).withDescription("User ID for the temporary PIN (1-20)").withValueMin(1).withValueMax(20))
                .withFeature(
                    e
                        .numeric("valid_times", ea.SET)
                        .withDescription("Number of times the temporary PIN can be used (0-255, 0 means unlimited)")
                        .withValueMin(0)
                        .withValueMax(255),
                )
                .withFeature(e.text("pincode", ea.SET).withDescription("The temporary PIN code (numeric string)")),
            e
                .composite("ephemeral_clear_pin_code", "ephemeral_clear_pin_code", ea.SET)
                .withFeature(e.numeric("userid", ea.SET).withDescription("User ID for the temporary PIN (1-20)").withValueMin(1).withValueMax(20)),
            e.composite("ephemeral_clear_all_pin_code", "ephemeral_clear_all_pin_code", ea.SET),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
        },
    },
];
