import * as inovelli from './inovelli';
import * as ledvance from './ledvance';
import * as salus from './salus';
import * as lixee from './lixee';
import * as securifi from './securifi';
import * as tradfri from './tradfri';
import * as ubisys from './ubisys';
import * as common from './common';
import * as zigbeeOTA from './zigbeeOTA';
import * as jethome from './jethome';
import * as gmmts from './gmmts';
import {Ota} from '../types';

const {setDataDir} = common;

export {
    inovelli,
    ledvance,
    salus,
    lixee,
    securifi,
    tradfri,
    ubisys,
    zigbeeOTA,
    jethome,
    gmmts,
    setDataDir,
};

export type ImageInfo = Ota.ImageInfo;
