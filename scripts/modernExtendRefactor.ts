// In the root of this repo, execute: `npx ts-node scripts/modernExtendRefactor.ts`

import {ArrayLiteralExpression, Project, QuoteKind, SyntaxKind} from 'ts-morph';

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

    let save = false;

    const modernExtendImport = sourceFile
        .getImportDeclarations()
        .filter((d) => d.getModuleSpecifierSourceFile()?.getBaseName() === 'modernExtend.ts');

    for (const i of modernExtendImport) {
        for (const n of i.getNamedImports()) {
            const references = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).filter((identifier) => identifier.getText() === n.getText());
            references.forEach((reference) => {
                if (reference.getParent().getKind() == SyntaxKind.CallExpression) {
                    reference.replaceWithText(`m.${reference.getText()}`);
                }
            });
        }
    }

    save = true;

    if (save) {
        const modernExtendImport = sourceFile
            .getImportDeclarations()
            .filter((d) => d.getModuleSpecifierSourceFile()?.getBaseName() === 'modernExtend.ts');
        let match = false;
        for (const i of modernExtendImport) {
            match = true;
            i.remove();
        }

        if (match) {
            sourceFile.addImportDeclaration({
                moduleSpecifier: '../lib/modernExtend',
                namespaceImport: 'm',
            });
        }

        sourceFile.saveSync();
    }
});

console.log(
    `${totalDefinitionsWithModernExtend} out of ${totalDefinitions} use modern extend ` +
        `(${(totalDefinitionsWithModernExtend / totalDefinitions) * 100}%)`,
);
