import {Ota} from '../types';
import * as common from './common';
import * as gmmts from './gmmts';
import * as inovelli from './inovelli';
import * as jethome from './jethome';
import * as ledvance from './ledvance';
import * as salus from './salus';
import * as securifi from './securifi';
import * as tradfri from './tradfri';
import * as ubisys from './ubisys';
import * as zigbeeOTA from './zigbeeOTA';

const {setDataDir} = common;

export {inovelli, ledvance, salus, securifi, tradfri, ubisys, zigbeeOTA, jethome, gmmts, setDataDir};

export type ImageInfo = Ota.ImageInfo;
