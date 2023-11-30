import {Project, SyntaxKind} from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths('src/devices/innr.ts');

project.getSourceFiles().forEach((sourceFile) => {
    const definitions = sourceFile.getVariableStatementOrThrow('definitions').getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);

    for (const definition of definitions) {
        const childs = definition.getChildrenOfKind(SyntaxKind.PropertyAssignment);
        const model = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'model');
        const extend = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'extend');
        const configure = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'configure');
        const fromZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'fromZigbee');
        const toZigbee = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'toZigbee');
        const meta = childs.find((c) => c.getFirstChildByKind(SyntaxKind.Identifier)?.getText() === 'meta');

        console.log(extend?.getFullText());
    }
});
