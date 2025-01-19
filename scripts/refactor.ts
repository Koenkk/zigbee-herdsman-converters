// In the root of this repo, execute: `npx ts-node scripts/refactor.ts`

import {assert} from 'console';

import {ArrayLiteralExpression, Project, QuoteKind, SyntaxKind} from 'ts-morph';

const project = new Project({
    manipulationSettings: {
        quoteKind: QuoteKind.Single,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
    },
});
project.addSourceFilesAtPaths('src/devices/*.ts');

//#region Refactor modernExtend temperature() to m.temperature()
project.getSourceFiles().forEach((sourceFile) => {
    if (sourceFile.getBaseName() === 'index.ts') return;
    console.log(`Handling ${sourceFile.getBaseName()}`);

    let save = false;

    const definitions = sourceFile
        .getVariableStatementOrThrow('definitions')
        .getDeclarations()[0]
        .getInitializerOrThrow()
        .asKindOrThrow(SyntaxKind.ArrayLiteralExpression);

    for (const definition of definitions.getElements()) {
        const childs = definition.getChildrenOfKind(SyntaxKind.PropertyAssignment);
        const fingerprint = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'fingerprint');
        const fingerprintArray = fingerprint?.getFirstChildByKind(SyntaxKind.ArrayLiteralExpression);
        if (fingerprintArray) {
            const lookup = {};
            let match = true;
            for (const f of fingerprintArray.getElements()) {
                let modelID: string | undefined;
                let manufacturerName: string | undefined;
                for (const p of f.getChildrenOfKind(SyntaxKind.PropertyAssignment)) {
                    if (p.getName() === 'modelID') {
                        modelID = p.getInitializer()?.getText();
                    } else if (p.getName() === 'manufacturerName') {
                        manufacturerName = p.getInitializer()?.getText();
                    } else {
                        match = false;
                    }
                }

                if (modelID && manufacturerName) {
                    if (!(modelID in lookup)) lookup[modelID] = new Set();
                    lookup[modelID].add(manufacturerName);
                } else {
                    match = false;
                }
            }

            if (match) {
                fingerprintArray.replaceWithText(`tuya.fingerprint(${props.modelID[0]}, [${props.manufacturerName}])`);
                save = true;
            }
        }
    }

    if (save) {
        const modernExtendImport = sourceFile.getImportDeclarations().filter((d) => d.getModuleSpecifierSourceFile()?.getBaseName() === 'tuya.ts');
        let match = false;
        for (const i of modernExtendImport) {
            match = true;
            i.remove();
        }

        sourceFile.addImportDeclaration({
            moduleSpecifier: '../lib/tuya',
            namespaceImport: 'tuya',
        });
        sourceFile.saveSync();
    }
});

//#region Refactor modernExtend temperature() to m.temperature()
// project.getSourceFiles().forEach((sourceFile) => {
//     if (sourceFile.getBaseName() === 'index.ts') return;
//     console.log(`Handling ${sourceFile.getBaseName()}`);

//     let save = false;

//     const modernExtendImport = sourceFile
//         .getImportDeclarations()
//         .filter((d) => d.getModuleSpecifierSourceFile()?.getBaseName() === 'modernExtend.ts');

//     for (const i of modernExtendImport) {
//         for (const n of i.getNamedImports()) {
//             const references = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier).filter((identifier) => identifier.getText() === n.getText());
//             references.forEach((reference) => {
//                 if (reference.getParent().getKind() == SyntaxKind.CallExpression) {
//                     reference.replaceWithText(`m.${reference.getText()}`);
//                 }
//             });
//         }
//     }

//     save = true;

//     if (save) {
// const modernExtendImport = sourceFile
//     .getImportDeclarations()
//     .filter((d) => d.getModuleSpecifierSourceFile()?.getBaseName() === 'modernExtend.ts');
// let match = false;
// for (const i of modernExtendImport) {
//     match = true;
//     i.remove();
// }

// if (match) {
//     sourceFile.addImportDeclaration({
//         moduleSpecifier: '../lib/modernExtend',
//         namespaceImport: 'm',
//     });
// }

//         sourceFile.saveSync();
//     }
// });
