/**
 * Replaces types in src/lib/types.ts to:
type DefinitionMatcher = {zigbeeModel: string[]; fingerprint?: Fingerprint[]} | {zigbeeModel?: string[]; fingerprint: Fingerprint[]};

type DefinitionBase = {
    model: string;
    vendor: string;
    description: string;
    whiteLabel?: WhiteLabel[];
};

type DefinitionConfig = {
    endpoint?: (device: Zh.Device) => {[s: string]: number};
    configure?: Configure;
    options?: Option[];
    meta?: DefinitionMeta;
    onEvent?: OnEvent;
    ota?: true | Ota.ExtraMetas;
    generated?: true;
    externalConverterName?: string;
};

type DefinitionFeatures = {
    fromZigbee: Fz.Converter[];
    toZigbee: Tz.Converter[];
    exposes: DefinitionExposes;
};

export type Definition = DefinitionMatcher & DefinitionBase & {definition: () => DefinitionConfig & DefinitionFeatures};

export type DefinitionWithExtend = DefinitionMatcher &
    DefinitionBase & {definition: () => DefinitionConfig & (({extend: ModernExtend[]} & Partial<DefinitionFeatures>) | DefinitionFeatures)};
 */

import {exec} from 'child_process';
import {createReadStream, readdirSync, writeFileSync} from 'fs';
import path from 'path';
import {createInterface} from 'readline';

const DIR = path.join('src', 'devices');
const IMPORT_TYPE = /^import .*DefinitionWithExtend.*/;
const START = /^export const definitions.* = \[$/;
const CONVERTER_START = `    {`;
const CONVERTER_END = `    },`;
const DEFINITION_START = `        description: `;
const DEFINITION_START2 = `        whiteLabel: `;
const DEFINITION_START2_END = `        ],`;
const LAMBDA_START = `resolve: () => ({`;
const LAMBDA_END = `}),`;

async function execute(command) {
    return await new Promise((resolve, reject) => {
        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

async function processLineByLine(filePath) {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    let output = '';
    let ignore = true;
    let previousLineStart = undefined;
    let waitingStart2End = false;

    for await (const line of rl) {
        // skip lines before definitions start
        if (line.match(START)) {
            ignore = false;
            output += `export const definitions: IndexedDefinition[] = [\n`;
            continue;
        }

        if (!ignore) {
            if (previousLineStart) {
                // object never ends with `description` or `whiteLabel` prop, so this is fine
                if (line.startsWith(DEFINITION_START2)) {
                    output += previousLineStart + '\n';

                    if (line.endsWith(DEFINITION_START2_END.trim())) {
                        output += line + LAMBDA_START + '\n';
                    } else {
                        output += line + '\n';
                        waitingStart2End = true;
                    }
                } else {
                    output += previousLineStart + LAMBDA_START + '\n';
                    output += line + '\n';
                }

                // reset
                previousLineStart = undefined;
            } else if (waitingStart2End) {
                if (line.startsWith(DEFINITION_START2_END)) {
                    output += line + LAMBDA_START + '\n';
                    waitingStart2End = false;
                } else {
                    output += line + '\n';
                }
            } else {
                // reset
                previousLineStart = undefined;

                if (line.startsWith(DEFINITION_START)) {
                    previousLineStart = line;
                } else if (line.startsWith(CONVERTER_END)) {
                    output += LAMBDA_END + line + '\n';
                } else {
                    output += line + '\n';
                }
            }
        } else {
            if (line.match(IMPORT_TYPE)) {
                output += line.replace('DefinitionWithExtend', 'IndexedDefinition') + '\n';
            } else {
                output += line + '\n';
            }
        }
    }

    rl.close();
    fileStream.close();
    writeFileSync(filePath, output, 'utf8');

    if (process.env.TEST) {
        await execute(`prettier --write ${filePath}`);
    }
}

for (const module of process.env.TEST ? ['awox.ts', 'datek.ts', 'weten.ts'] : readdirSync(DIR)) {
    if (module === 'index.ts' || !module.endsWith('.ts')) {
        continue;
    }

    const filePath = path.join(DIR, module);
    console.log(`Processing ${filePath}`);

    await processLineByLine(filePath);
}

if (!process.env.TEST) {
    await execute(`prettier --write ${DIR.replaceAll('\\', '/')}`);
}
