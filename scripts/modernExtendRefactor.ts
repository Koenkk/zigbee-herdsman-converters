import {Project, PropertyAssignment, QuoteKind, SyntaxKind} from 'ts-morph';

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

    let changed = false;
    const definitions = sourceFile.getVariableStatementOrThrow('definitions').getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
    totalDefinitions += definitions.length;
    const type = 'light';
    const toRemove: PropertyAssignment[] = [];

    for (const definition of definitions) {
        const childs = definition.getChildrenOfKind(SyntaxKind.PropertyAssignment);
        const model = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'model');
        const extend = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'extend');
        const configure = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'configure');
        const fromZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'fromZigbee');
        const toZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'toZigbee');
        const meta = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'meta');

        if (extend?.getFullText().includes('extend: extend.light_onoff_brightness_colortemp(') &&
            !fromZigbee && !toZigbee && !configure) {
            if (meta) continue;

            const newOpts: {[s: string]: unknown} = {};
            const opts = `(${extend?.getFullText().split('(')[1].slice(0, -1)})`;
            console.log(opts);
            for (const [key, value] of Object.entries(eval(opts))) {
                if (key === 'colorTempRange') {
                    // @ts-expect-error
                    newOpts.colorTemp = {range: value, ...newOpts.colorTemp};
                // } else if (key === 'disableColorTempStartup') {
                //     // @ts-expect-error
                //     newOpts.colorTemp = {startup: value, ...newOpts.colorTemp};
                } else {
                    console.warn(key);
                    continue;
                }
            }
            console.log(`Updated ${model?.getFullText().trim()}`);
            totalDefinitionsWithModernExtend += 1;
            extend.replaceWithText(`extend: [${type}(${newOpts})]`);
            changed = true;
        } else if (extend?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression)) {
            totalDefinitionsWithModernExtend += 1;
        }
    }

    toRemove.forEach((e) => e.remove());

    if (changed) {
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
