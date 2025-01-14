// In the root of this repo, execute: `npx ts-node scripts/modernExtendRefactor.ts`

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

    if (sourceFile.getBaseName().includes('philips')) {
        return;
    }

    let changed = true;
    let save = false;
    while (changed) {
        changed = false;
        const definitions = sourceFile.getVariableStatementOrThrow('definitions').getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);
        let localTotalDefinitionsWithModernExtend = 0;

        for (const definition of definitions) {
            const childs = definition.getChildrenOfKind(SyntaxKind.PropertyAssignment);
            const model = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'model');
            const extend = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'extend');
            const extendArray = extend?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression);
            const exposes = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'exposes');
            const exposesArray = exposes?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression);
            const configure = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'configure');
            const fromZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'fromZigbee');
            const fromZigbeeArray = fromZigbee?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression);
            const toZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'toZigbee');

            const fzIlluminance = fromZigbeeArray?.getElements().find((el) => el.getText() === 'fz.illuminance');
            if (fzIlluminance) {
                fromZigbeeArray?.removeElement(fzIlluminance);
                const exposesIlluminance = exposesArray?.getElements().find((el) => el.getText() === 'e.illuminance()');
                if (exposesIlluminance) {
                    exposesArray?.removeElement(exposesIlluminance);
                }

                if (!extend) {
                    definition.addPropertyAssignment({
                        name: 'extend',
                        initializer: '[m.illuminance()]',
                    });
                } else {
                    extendArray?.addElement('m.illuminance()');
                }
                save = true;
            }
        }

        if (!changed) {
            totalDefinitions += definitions.length;
            totalDefinitionsWithModernExtend += localTotalDefinitionsWithModernExtend;
        }
    }

    if (save) {
        sourceFile.addImportDeclaration({
            moduleSpecifier: '../lib/modernExtend',
            namespaceImport: 'm',
        });
        sourceFile.saveSync();
    }
});

console.log(
    `${totalDefinitionsWithModernExtend} out of ${totalDefinitions} use modern extend ` +
        `(${(totalDefinitionsWithModernExtend / totalDefinitions) * 100}%)`,
);
