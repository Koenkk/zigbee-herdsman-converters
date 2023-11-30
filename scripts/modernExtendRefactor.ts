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

    let changed = false;
    const definitions = sourceFile.getVariableStatementOrThrow('definitions').getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
    totalDefinitions += definitions.length;
    const type = 'light';

    for (const definition of definitions) {
        const childs = definition.getChildrenOfKind(SyntaxKind.PropertyAssignment);
        const model = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'model');
        const extend = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'extend');
        const configure = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'configure');
        const fromZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'fromZigbee');
        const toZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'toZigbee');
        const meta = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'meta');

        if (extend?.getFullText().includes('extend: extend.light_onoff_brightness()') && !meta && !fromZigbee && !toZigbee && !configure) {
            extend.replaceWithText(`extend: [${type}()]`);
            console.log(`Updated ${model?.getFullText().trim()}`);
            changed = true;
            totalDefinitionsWithModernExtend += 1;
        } else if (extend?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression)) {
            totalDefinitionsWithModernExtend += 1;
        }
    }

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

        sourceFile.saveSync();
    }
});

console.log(
    `${totalDefinitionsWithModernExtend} out of ${totalDefinitions} use modern extend (${totalDefinitionsWithModernExtend / totalDefinitions}%)`,
);
