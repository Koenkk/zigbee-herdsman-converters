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
        gree: {name: "格力(Gree)", range: [0, 19]},
        haier: {name: "海尔(Haier)", range: [20, 39]},
        midea: {name: "美的(Midea)", range: [40, 59]},
        changhong: {name: "长虹(Changhong)", range: [60, 79]},
        chigo: {name: "志高(Chigo)", range: [80, 99]},
        aux: {name: "奥克斯(AUX)", range: [100, 119]},
        tcl: {name: "TCL(TCL)", range: [120, 139]},
        hisense: {name: "海信(Hisense)", range: [140, 159]},
        kelon: {name: "科龙(Kelon)", range: [160, 179]},
        xiaomi: {name: "小米(Xiaomi)", range: [180, 189]},
        hitachi: {name: "日立(Hitachi)", range: [190, 209]},
        natpanasonic: {name: "松下(NATPANASONIC)", range: [210, 235]},
        toshiba: {name: "东芝(Toshiba)", range: [236, 245]},
        galanz: {name: "格兰仕(Galanz)", range: [246, 259]},
        mitsubishi_heavy: {name: "三菱重工(MITSUBISHI_HEAVY)", range: [260, 279]},
        mitsubishi_electric: {name: "三菱电机(MITSUBISHI_ELECTRIC)", range: [280, 299]},
        samsung: {name: "三星(Samsung)", range: [300, 319]},
        lg: {name: "LG(LG)", range: [320, 329]},
        whirlpool: {name: "惠而浦(Whirlpool)", range: [330, 339]},
        electrolux: {name: "伊莱克斯(Electrolux)", range: [340, 349]},
        konka: {name: "康佳(Konka)", range: [350, 359]},
        daikin: {name: "大金(Daikin)", range: [360, 389]},
        sharp: {name: "夏普(Sharp)", range: [390, 409]},
        trane: {name: "特灵(TRANE)", range: [410, 419]},
        skyworth: {name: "创维(Skyworth)", range: [420, 429]},
        york: {name: "约克(York)", range: [430, 443]},
        fujitsu: {name: "富士通(Fujitsu)", range: [444, 459]},
        shinco: {name: "新科(Shinco)", range: [460, 469]},
        yangzi: {name: "扬子(Yangzi)", range: [470, 479]},
        mbo: {name: "美博(MBO)", range: [480, 489]},
        mcquay: {name: "麦克维尔(McQuay)", range: [490, 499]},
        frestech: {name: "新飞(Frestech)", range: [500, 506]},
        xiaoya: {name: "小鸭(Xiaoya)", range: [507, 509]},
        tica: {name: "TICA(TICA)", range: [510, 515]},
        sast: {name: "先科(SAST)", range: [516, 519]},
        littleswan: {name: "小天鹅(Littleswan)", range: [520, 529]},
        sanyo: {name: "三洋(Sanyo)", range: [530, 559]},
        royalsta: {name: "荣事达(Royalsta)", range: [560, 565]},
        rca: {name: "RCA(RCA)", range: [566, 569]},
        lejn: {name: "乐京(Lejn)", range: [570, 573]},
        rowa: {name: "乐华(Rowa)", range: [574, 589]},
        casarte: {name: "卡萨帝(Casarte)", range: [590, 595]},
        carrier: {name: "开利(Carrier)", range: [596, 619]},
        giwee: {name: "积微(Giwee)", range: [620, 622]},
        jensany: {name: "金三洋(Jensany)", range: [623, 629]},
        hualing: {name: "华凌(Hualing)", range: [630, 639]},
        gome: {name: "国美(GOME)", range: [640, 644]},
        gelin: {name: "歌林(Gelin)", range: [645, 655]},
        chunlan: {name: "春兰(Chunlan)", range: [656, 666]},
        aoli: {name: "奥力(Aoli)", range: [667, 669]},
        aucma: {name: "澳柯玛(Aucma)", range: [670, 675]},
        shuanglu: {name: "双鹿(Shuanglu)", range: [676, 679]},
        jiwu: {name: "苏宁极物(JIWU)", range: [680, 683]},
        leader: {name: "统帅(Leader)", range: [684, 688]},
        tomsen: {name: "汤姆森(TOMSEN)", range: [689, 693]},
        hyundai: {name: "现代(Hyundai)", range: [694, 699]},
        panda: {name: "熊猫(Panda)", range: [700, 704]},
        xyingyan: {name: "新迎燕(Xyingyan)", range: [705, 709]},
        shenhua: {name: "申花(Shenhua)", range: [710, 712]},
        pascmio: {name: "中松(Pascmio)", range: [713, 714]},
        yuetu: {name: "月兔(Yuetu)", range: [715, 719]},
        fzm: {name: "方米(FZM)", range: [720, 721]},
        xft: {name: "雪菲特(XFT)", range: [722, 723]},
        boyin: {name: "波音(Boyin)", range: [724, 725]},
        huabao: {name: "华宝(Huabao)", range: [726, 729]},
        daewoo: {name: "大宇(Daewoo)", range: [730, 735]},
        conrowa: {name: "高路华(Conrowa)", range: [736, 739]},
        guqiao: {name: "古桥(Guqiao)", range: [740, 745]},
        huake: {name: "华科(Huake)", range: [746, 749]},
        huamei: {name: "华美(Huamei)", range: [750, 754]},
        jinsong: {name: "金松(Jinsong)", range: [755, 759]},
        risuo: {name: "日索(Risuo)", range: [760, 764]},
        shenbao: {name: "绅宝(Shenbao)", range: [765, 769]},
        wanbao: {name: "万宝(Wanbao)", range: [770, 774]},
        neitian: {name: "内田(Neitian)", range: [775, 779]},
        electra: {name: "凉宇(Electra)", range: [780, 784]},
        bluestar: {name: "BlueStar(BlueStar)", range: [785, 789]},
        voltas: {name: "Voltas(Voltas)", range: [790, 794]},
        akira: {name: "爱家乐(Akira)", range: [795, 799]},
        panlisen: {name: "Panlisen(Panlisen)", range: [800, 801]},
        rasonic: {name: "乐信(Rasonic)", range: [802, 809]},
        palcsicons: {name: "赢松(Palcsicons)", range: [810, 811]},
        itan: {name: "盈田(ITAN)", range: [812, 814]},
        whircipol: {name: "WhirciPol(WhirciPol)", range: [815, 819]},
        changgu: {name: "长谷(Changgu)", range: [820, 824]},
        funiki: {name: "Funiki(funiki)", range: [825, 829]},
        yiruite: {name: "亿瑞特(Yiruite)", range: [830, 834]},
        sanzuan: {name: "三钻(Sanzuan)", range: [835, 839]},
        deroxi: {name: "德澳西(Deroxi)", range: [840, 844]},
        fedders: {name: "飞达仕(Fedders)", range: [845, 849]},
        paonoca: {name: "韩亚(Paonoca)", range: [850, 854]},
        wuq: {name: "五强(WUQ)", range: [855, 859]},
        sinro: {name: "新菱(Sinro)", range: [860, 864]},
        insignia: {name: "影雅(Insignia)", range: [865, 869]},
        elco: {name: "宜科(Elco)", range: [870, 874]},
        vicoo: {name: "VICOO(VICOO)", range: [875, 879]},
        gmcc: {name: "GMCC(GMCC)", range: [880, 884]},
        xinshiji: {name: "新世纪(Xinshiji)", range: [885, 889]},
        bendao: {name: "本岛(BENDAO)", range: [890, 894]},
        sumsaxng: {name: "东方三星(SUMSAXNG)", range: [895, 899]},
        jinxing: {name: "金兴(JINXING)", range: [900, 904]},
        mitsein: {name: "弥特斯(MITSEIN)", range: [905, 909]},
        ek: {name: "EK(EK)", range: [910, 914]},
        kingair: {name: "国祥(KingAir)", range: [915, 919]},
        aqua: {name: "AQUA(AQUA)", range: [920, 924]},
        union_aire: {name: "Union aire(Union_aire)", range: [925, 929]},
        korechi: {name: "韩电(Korechi)", range: [930, 939]},
        inventor: {name: "Inventor(Inventor)", range: [940, 944]},
        xin_gfeidq: {name: "XINGFEIDQ(XIN_GFEIDQ)", range: [945, 949]},
        xffh: {name: "新飞飞鸿(XFFH)", range: [950, 954]},
        dizhi: {name: "帝智(DIZHI)", range: [955, 959]},
        winia: {name: "WINIA(WINIA)", range: [960, 964]},
        pascmio1: {name: "松电(Pascmio1)", range: [965, 969]},
        chuangye: {name: "创野(Chuangye)", range: [970, 974]},
        shacopu: {name: "夏科普(Shacopu)", range: [975, 979]},
        panwosoci: {name: "正松川(Panwosoci)", range: [980, 984]},
        shineleaf: {name: "夏立(SHINELEAF)", range: [985, 989]},
        panatomic: {name: "Panatomic(Panatomic)", range: [990, 994]},
        paonoca1: {name: "Paonoca(Paonoca1)", range: [995, 999]},
        geling: {name: "歌菱(Geling)", range: [1000, 1004]},
        sharbo: {name: "夏宝(Sharbo)", range: [1005, 1009]},
        hangtiandianqi: {name: "航天电器(Hangtiandianqi)", range: [1010, 1014]},
        dongbao: {name: "东宝(Dongbao)", range: [1015, 1019]},
        toyo: {name: "东洋(Toyo)", range: [1020, 1024]},
        shangling: {name: "上菱(Shangling)", range: [1025, 1029]},
        teco: {name: "TECO(TECO)", range: [1030, 1034]},
        airwell: {name: "欧威尔(Airwell)", range: [1035, 1039]},
        combine: {name: "康拜恩(Combine)", range: [1040, 1042]},
        feige: {name: "飞歌(Feige)", range: [1043, 1045]},
        partsoinc: {name: "Partsoinc(Partsoinc)", range: [1046, 1049]},
        nikai: {name: "NiKai(Nikai)", range: [1050, 1052]},
        mitsubishiheavy_haier: {name: "三菱重工海尔(MITSUBISHIHEAVY_Haier)", range: [1053, 1055]},
        voton: {name: "沃顿(Voton)", range: [1056, 1059]},
        tadiran: {name: "塔迪兰(Tadiran)", range: [1060, 1061]},
        lexin: {name: "乐新(Lexin)", range: [1062, 1063]},
        nuolin: {name: "诺林(Nuolin)", range: [1064, 1066]},
        xiamenyilin: {name: "厦门亿林(Xiamenyilin)", range: [1067, 1069]},
        horshron: {name: "虹声(Horshron)", range: [1070, 1071]},
        levante: {name: "LEVANTE(LEVANTE)", range: [1072, 1073]},
        guanyuan: {name: "冠远(GuanYuan)", range: [1074, 1075]},
        lilytech: {name: "百合(LilyTech)", range: [1076, 1078]},
        sunny: {name: "阳光(Sunny)", range: [1079, 1080]},
        viomi: {name: "云米(VIOMI)", range: [1081, 1082]},
        soyea: {name: "索伊(Soyea)", range: [1082, 1085]},
        serene: {name: "西冷(Serene)", range: [1086, 1088]},
        cheblo: {name: "樱花电器(Cheblo)", range: [1089, 1094]},
        smartmi: {name: "智米(SmartMi)", range: [1095, 1099]},
        bosch: {name: "博世(BOSCH)", range: [1100, 1104]},
        partmusic: {name: "日松(Partmusic)", range: [1105, 1109]},
        funiki1: {name: "FUNIKI(funiki1)", range: [1110, 1114]},
        hilaire: {name: "雪莱尔(Hilaire)", range: [1115, 1116]},
        hkc: {name: "惠科(HKC)", range: [1117, 1119]},
        blue_star: {name: "Blue Star(Blue_Star)", range: [1120, 1125]},
        teco1: {name: "东元(TECO1)", range: [1126, 1128]},
        paohanic: {name: "松川(Paohanic)", range: [1129, 1131]},
        nintaus: {name: "金正(Nintaus)", range: [1132, 1136]},
        olimpiasplendid: {name: "欧菱宝(OlimpiaSplendid)", range: [1137, 1139]},
        philips: {name: "飞利浦(Philips)", range: [1140, 1145]},
        fortress: {name: "丰泽(Fortress)", range: [1146, 1147]},
        meilihongzuan: {name: "MEILIHONGZUAN(MEILIHONGZUAN)", range: [1148, 1149]},
        tica1: {name: "天加(TICA1)", range: [1150, 1154]},
        junda: {name: "骏安达(Junda)", range: [1155, 1159]},
        electra1: {name: "以莱特(Electra1)", range: [1160, 1162]},
        mingyi: {name: "名亿(Mingyi)", range: [1163, 1165]},
        ifb: {name: "IFB(IFB)", range: [1166, 1167]},
        kingsfin: {name: "Kingsfin(Kingsfin)", range: [1168, 1169]},
        onida: {name: "Onida(Onida)", range: [1170, 1172]},
        suittc: {name: "鑫源(SUITTC)", range: [1173, 1175]},
        colmo: {name: "COLMO(COLMO)", range: [1176, 1177]},
        duozuanhua: {name: "多钻花(DuoZuanHua)", range: [1178, 1179]},
        huikang: {name: "惠康(Huikang)", range: [1180, 1181]},
        gibson: {name: "吉普生(Gibson)", range: [1182, 1189]},
        first: {name: "FIRST(FIRST)", range: [1190, 1191]},
        jhs: {name: "金鸿盛(JHS)", range: [1192, 1193]},
        meiling: {name: "美菱(Meiling)", range: [1194, 1197]},
        maxe: {name: "万士益(Maxe)", range: [1198, 1201]},
        skg: {name: "SKG(SKG)", range: [1202, 1203]},
        acl: {name: "喜事来(ACL)", range: [1204, 1205]},
        tongyi: {name: "同益(Tongyi)", range: [1206, 1207]},
        tianyuan: {name: "天元(Tianyuan)", range: [1208, 1209]},
        tianhui: {name: "天汇集成(TianHui)", range: [1210, 1211]},
        tianjin: {name: "天津(Tianjin)", range: [1212, 1213]},
        tair: {name: "Tair(Tair)", range: [1214, 1215]},
        macro: {name: "万家乐(Macro)", range: [1216, 1219]},
        xinle: {name: "新乐(Xinle)", range: [1220, 1223]},
        xinhuabao: {name: "新华宝(Xinhuabao)", range: [1224, 1225]},
        xiongdi: {name: "兄弟(Xiongdi)", range: [1226, 1227]},
        benwin: {name: "宾维(BENWIN)", range: [1228, 1229]},
        sanshui: {name: "山水(Sanshui)", range: [1230, 1231]},
        phlgco: {name: "飞歌中国(Phlgco)", range: [1232, 1233]},
        linkcool: {name: "麟酷(LinkCool)", range: [1234, 1235]},
        nec: {name: "NEC(NEC)", range: [1236, 1238]},
        lanbo: {name: "蓝波(Lanbo)", range: [1239, 1249]},
        changling: {name: "长岭(Changling)", range: [1250, 1259]},
        jinli: {name: "金立(JinLi)", range: [1260, 1261]},
        huifeng: {name: "汇丰(Huifeng)", range: [1262, 1265]},
        huanghe: {name: "黄河(Huanghe)", range: [1266, 1267]},
        hailin: {name: "海林(HaiLin)", range: [1268, 1269]},
        cih: {name: "CIH(CIH)", range: [1270, 1271]},
        meico: {name: "美歌(Meico)", range: [1272, 1273]},
        museen: {name: "慕森(MUSEEN)", range: [1274, 1275]},
        millink: {name: "米林客(Millink)", range: [1276, 1277]},
        mistral: {name: "名氏风(Mistral)", range: [1278, 1279]},
        mljd: {name: "麦勒(MLJD)", range: [1280, 1281]},
        bole: {name: "波乐(Bole)", range: [1282, 1285]},
        sacon: {name: "帅康(Sacon)", range: [1286, 1290]},
        weili: {name: "威力(Weili)", range: [1291, 1295]},
        sova: {name: "索华(Sova)", range: [1296, 1297]},
        zymbo: {name: "深宝(ZYMBO)", range: [1298, 1299]},
        weiteli: {name: "威特利(Weiteli)", range: [1300, 1301]},
        kenwood: {name: "健伍(Kenwood)", range: [1302, 1304]},
        gee: {name: "弘立(GEE)", range: [1305, 1306]},
        hneyrea: {name: "虹立(Hneyrea)", range: [1307, 1308]},
        langge: {name: "朗歌(Langge)", range: [1309, 1313]},
        oudian: {name: "欧典(Oudian)", range: [1314, 1315]},
        pgtess: {name: "品格特斯(PGTESS)", range: [1316, 1317]},
        panwosoci1: {name: "Panwosoci(Panwosoci1)", range: [1318, 1319]},
        partsonic: {name: "深圳松下(Partsonic)", range: [1320, 1321]},
        twinswan: {name: "双凤(TwinSwan)", range: [1322, 1323]},
        shengsong: {name: "深松(Shengsong)", range: [1324, 1325]},
        pamosautc: {name: "Pamosautc(Pamosautc)", range: [1326, 1327]},
        caixing: {name: "彩星(Caixing)", range: [1328, 1329]},
        cmv: {name: "CMV(CMV)", range: [1330, 1331]},
        dongxia: {name: "冬夏(Dongxia)", range: [1332, 1333]},
        guangda: {name: "光大(Guangda)", range: [1334, 1335]},
        geyang: {name: "格阳(Geyang)", range: [1336, 1337]},
        gchv: {name: "GCHV(GCHV)", range: [1338, 1339]},
        huayi: {name: "华意(HuaYi)", range: [1340, 1342]},
        sunburg: {name: "森宝(Sunburg)", range: [1343, 1344]},
        boerka: {name: "波尔卡(Boerka)", range: [1345, 1346]},
        aite: {name: "爱特(Aite)", range: [1347, 1348]},
        aidelong: {name: "艾德龙(Aidelong)", range: [1349, 1350]},
        dajinxing: {name: "大金星(Dajinxing)", range: [1351, 1352]},
        dometic: {name: "多美达(DOMETIC)", range: [1353, 1354]},
        museen1: {name: "慕森(MUSEEN1)", range: [1274, 1275]},
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
            enums.push(`${data.name}(${start}-${end})`);
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

            // 设备类型 0x01 = 空调
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
            const brandMatch = brandStr.match(/^[^(]+\(([^)]+)\)/);
            const brand = brandMatch[1] ? brandMatch[1].toLowerCase() : undefined;

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
