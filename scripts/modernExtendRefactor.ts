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
    const type = 'light';
    while (changed) {
        changed = false;
        const definitions = sourceFile.getVariableStatementOrThrow('definitions').getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
        let localTotalDefinitionsWithModernExtend = 0;

        for (const definition of definitions) {
            const childs = definition.getChildrenOfKind(SyntaxKind.PropertyAssignment);
            const model = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'model');
            const extend = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'extend');
            const exposes = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'exposes');
            const configure = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'configure');
            const fromZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'fromZigbee');
            const toZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'toZigbee');
            const meta = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'meta');

            if ((extend?.getFullText().includes('extend: extend.light_onoff_brightness_colortemp(') ||
                extend?.getFullText().includes('extend: extend.light_onoff_brightness_colortemp_color(') ||
                extend?.getFullText().includes('extend: extend.light_onoff_brightness_color(')) &&
                !fromZigbee && !toZigbee && !configure && !exposes) {
                console.log(`Handling ${model?.getFullText().trim()}`);
                const newOpts: {[s: string]: unknown} = {};
                if (extend.getFullText().includes('_colortemp(')) {
                    newOpts.colorTemp = {range: null};
                }
                if (extend.getFullText().includes('_color(')) {
                    newOpts.color = true;
                }
                let opts = extend?.getFullText().split('(')[1].slice(0, -1).trim();
                if (opts) {
                    if (opts[opts.length - 1] === ',') {
                        opts = opts.substring(0, opts.length - 1);
                    }
                    for (const [key, value] of Object.entries(eval(`(${opts})`))) {
                        if (key === 'colorTempRange') {
                            // @ts-expect-error
                            newOpts.colorTemp = {...newOpts.colorTemp, range: value};
                        } else if (key === 'disableColorTempStartup') {
                            // @ts-expect-error
                            newOpts.colorTemp = {...newOpts.colorTemp, startup: !value};
                        } else if (key === 'disablePowerOnBehavior') {
                            newOpts.powerOnBehaviour = !value;
                        } else if (key === 'disableEffect') {
                            newOpts.effect = !value;
                        } else if (key === 'supportsHueAndSaturation') {
                            // @ts-expect-error
                            newOpts.color = {...newOpts.color, modes: ['xy', 'hs']};
                        } else {
                            throw new Error(`Unsupported ${key} - ${value}`);
                        }
                    }
                }
                if (meta) {
                    for (const [key, value] of Object.entries(eval(`(${meta?.getFullText().replace('meta: ', '')})`))) {
                        if (key === 'turnsOffAtBrightness1') {
                            newOpts.turnsOffAtBrightness1 = value;
                        } else if (key === 'applyRedFix') {
                            // @ts-expect-error
                            newOpts.color = {...newOpts.color, applyRedFix: value};
                        } else if (key === 'supportsEnhancedHue') {
                            // @ts-expect-error
                            newOpts.color = {...newOpts.color, enhancedHue: value};
                        } else {
                            throw new Error(`Unsupported ${key} - ${value}`);
                        }
                    }
                    meta.remove();
                }

                localTotalDefinitionsWithModernExtend += 1;
                extend.replaceWithText(`extend: [${type}(${JSON.stringify(newOpts).split(`"`).join('')
                    .replace(`range:null`, `range:undefined`).replace(`xy`, `'xy'`).replace(`hs`, `'hs'`)})]`);
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
