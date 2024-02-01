import {Project, QuoteKind, SyntaxKind} from 'ts-morph';

const project = new Project({
    manipulationSettings: {
        quoteKind: QuoteKind.Single,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
    },
});
project.addSourceFilesAtPaths('src/devices/*.ts');

let totalDefinitions = 0;
let totalDefinitionsWithModernExtend = 0;

project.getSourceFiles().forEach((sourceFile) => {
    if (sourceFile.getBaseName() === 'index.ts') return;
    console.log(`Handling ${sourceFile.getBaseName()}`);

    let changed = true;
    let save = false;
    const type = 'mullerLichtLight';
    while (changed) {
        changed = false;
        const definitions = sourceFile.getVariableStatementOrThrow('definitions').getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
        let localTotalDefinitionsWithModernExtend = 0;

        for (const definition of definitions) {
            const childs = definition.getChildrenOfKind(SyntaxKind.PropertyAssignment);
            const model = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'model');
            const extend = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'extend');
            // const exposes = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'exposes');
            // const configure = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'configure');
            const fromZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'fromZigbee');
            const toZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'toZigbee');
            // const meta = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'meta');
            // const endpoint = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'endpoint');

            // const ota = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'ota');

            if (extend?.getFullText().includes('extend.light_onoff') && !fromZigbee && toZigbee?.getFullText().includes('tint_scene')) {
                console.log(`Handling ${model?.getFullText().trim()}`);
                toZigbee?.remove();
                const newOpts: {[s: string]: unknown} = {}; // {endpoints: eval(`(${endpoint.getFullText().split('return ')[1].split(';')[0]})`)};
                // configure?.remove();
                // endpoint?.remove();
                const extendFeatures = extend.getFullText().split('(')[0].split('_');
                if (extendFeatures.includes('colortemp')) {
                    newOpts.colorTemp = {range: null};
                }
                if (extendFeatures.includes('color')) {
                    newOpts.color = true;
                }
                if (extendFeatures.includes('gradient')) {
                    newOpts.gradient = true;
                }
                let opts = extend?.getFullText().split('(')[1].slice(0, -1).trim();
                if (opts) {
                    if (opts[opts.length - 1] === ',') {
                        opts = opts.substring(0, opts.length - 1);
                    }
                    const evalOpts = Object.entries(eval(`(${opts})`));
                    for (const [key, value] of evalOpts) {
                        if (key === 'colorTempRange') {
                            // @ts-expect-error
                            newOpts.colorTemp = {...newOpts.colorTemp, range: value};
                        } else if (key === 'disableColorTempStartup') {
                            // @ts-expect-error
                            newOpts.colorTemp = {...newOpts.colorTemp, startup: !value};
                        } else if (key === 'disablePowerOnBehavior') {
                            newOpts.powerOnBehavior = !value;
                        } else if (key === 'disableEffect') {
                            newOpts.effect = !value;
                        } else if (key === 'disableHueEffects') {
                            newOpts.hueEffect = !value;
                        } else if (key === 'supportsHueAndSaturation' || key === 'preferHueAndSaturation') {
                            // @ts-expect-error
                            newOpts.color = {...newOpts.color, modes: evalOpts.preferHueAndSaturation ? ['hs', 'xy'] : ['xy', 'hs']};
                        } else if (key === 'extraEffects') {
                            // @ts-expect-error
                            newOpts.gradient = {...newOpts.gradient, extraEffects: value};
                        } else if (key === 'noConfigure') {
                            // ignore
                        } else {
                            throw new Error(`Unsupported ${key} - ${value}`);
                        }
                    }
                }
                // if (meta) {
                //     for (const [key, value] of Object.entries(eval(`(${meta?.getFullText().replace('meta: ', '')})`))) {
                //         if (key === 'turnsOffAtBrightness1') {
                //             newOpts.turnsOffAtBrightness1 = value;
                //         } else if (key === 'applyRedFix') {
                //             // @ts-expect-error
                //             newOpts.color = {...newOpts.color, applyRedFix: value};
                //         } else if (key === 'supportsEnhancedHue') {
                //             // @ts-expect-error
                //             newOpts.color = {...newOpts.color, enhancedHue: value};
                //         } else if (key === 'multiEndpoint' || key === 'disableDefaultResponse') {
                //             // ignore
                //         } else {
                //             throw new Error(`Unsupported ${key} - ${value}`);
                //         }
                //     }
                //     // meta.remove();
                // }
                // if (ota) {
                //     ota.remove();
                // }

                localTotalDefinitionsWithModernExtend += 1;
                extend.replaceWithText(`extend: [${type}(${JSON.stringify(newOpts).split(`"`).join('')
                    .replace(`range:null`, `range:undefined`).replace(`xy`, `'xy'`).replace(`hs`, `'hs'`).replace(`({})`, `()`)})]`);
                changed = true;
                save = true;
                break;
            } else if (extend?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression)) {
                localTotalDefinitionsWithModernExtend += 1;
            }
        }

        if (!changed) {
            totalDefinitions += definitions.length;
            totalDefinitionsWithModernExtend += localTotalDefinitionsWithModernExtend;
        }
    }

    if (save) {
        const modernExtendImport = sourceFile.getImportDeclarations()
            .find((d) => d.getModuleSpecifierSourceFile()?.getBaseName() === 'modernExtend.ts');
        if (!modernExtendImport) {
            sourceFile.addImportDeclaration({moduleSpecifier: '../lib/modernExtend', namedImports: [type]});
        } else {
            if (!modernExtendImport.getNamedImports().find((i) => i.getName() === type)) {
                modernExtendImport.addNamedImport(type);
            }
        }

        const extendImport = sourceFile.getImportDeclarations()
            .find((d) => d.getModuleSpecifierSourceFile()?.getBaseName() === 'extend.ts');
        if (!sourceFile.getFullText().includes('extend.') && extendImport) {
            extendImport.remove();
        }

        sourceFile.saveSync();
    }
});

console.log(
    `${totalDefinitionsWithModernExtend} out of ${totalDefinitions} use modern extend ` +
    `(${(totalDefinitionsWithModernExtend / totalDefinitions) * 100}%)`,
);
