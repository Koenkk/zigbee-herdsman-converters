// EXEC: tsx scripts/zap.ts
import {promises as fs} from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.resolve(ROOT_DIR, "src");
const INDENT_UNIT = "    ";

const SPECIAL_TYPE_MAP: Record<string, TypeClassification> = {
    CLUSTER_ID: {category: "unsigned", bits: 16},
    ATTR_ID: {category: "unsigned", bits: 16},
    UTC: {category: "unsigned", bits: 32},
};

type TypeCategory = "unsigned" | "signed";

type TypeClassification = {
    category: TypeCategory;
    bits: number;
};

type PendingInsertion = {
    pos: number;
    text: string;
};

type CommandsKey = "commands" | "commandsResponse";

void (async () => {
    try {
        const files = await collectTsFiles(SRC_DIR);
        let totalInsertions = 0;
        const changedFiles: string[] = [];

        for (const file of files) {
            const changes = await processFile(file);
            if (changes.insertions > 0) {
                totalInsertions += changes.insertions;
                changedFiles.push(path.relative(ROOT_DIR, file));
            }
        }

        if (changedFiles.length === 0) {
            console.log("No changes were necessary.");
        } else {
            console.log(`Updated ${changedFiles.length} files with ${totalInsertions} insertions.`);
            changedFiles.forEach((file) => {
                console.log(`  • ${file}`);
            });
        }
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
})();

async function collectTsFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, {withFileTypes: true});
    const files: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectTsFiles(entryPath)));
        } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
            files.push(entryPath);
        }
    }

    return files;
}

async function processFile(filePath: string): Promise<{insertions: number}> {
    const sourceText = await fs.readFile(filePath, "utf8");
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const pendingInsertions: PendingInsertion[] = [];

    const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && isDeviceAddCustomCluster(node)) {
            const clusterDef = node.arguments[1];
            if (clusterDef && ts.isObjectLiteralExpression(clusterDef)) {
                handleClusterDefinition(clusterDef, sourceFile, sourceText, pendingInsertions);
            }
        }

        node.forEachChild(visit);
    };

    visit(sourceFile);

    if (pendingInsertions.length === 0) {
        return {insertions: 0};
    }

    const updatedText = applyInsertions(sourceText, pendingInsertions);
    await fs.writeFile(filePath, updatedText);

    return {insertions: pendingInsertions.length};
}

function isDeviceAddCustomCluster(node: ts.CallExpression): boolean {
    const expression = node.expression;

    if (ts.isIdentifier(expression)) {
        return expression.text === "deviceAddCustomCluster";
    }

    return ts.isPropertyAccessExpression(expression) && expression.name.text === "deviceAddCustomCluster";
}

function handleClusterDefinition(
    clusterDef: ts.ObjectLiteralExpression,
    sourceFile: ts.SourceFile,
    sourceText: string,
    pendingInsertions: PendingInsertion[],
): void {
    const attributes = getPropertyAssignment(clusterDef, "attributes");
    if (attributes && ts.isObjectLiteralExpression(attributes.initializer)) {
        for (const attribute of attributes.initializer.properties) {
            if (!ts.isPropertyAssignment(attribute) || !ts.isObjectLiteralExpression(attribute.initializer)) continue;
            const additions = buildAttributeAdditions(attribute.initializer, sourceFile);
            enqueueInsertion(additions, attribute.initializer, sourceFile, sourceText, pendingInsertions);
        }
    }

    for (const commandsKey of ["commands", "commandsResponse"] as CommandsKey[]) {
        const commandsProp = getPropertyAssignment(clusterDef, commandsKey);
        if (!commandsProp || !ts.isObjectLiteralExpression(commandsProp.initializer)) continue;

        for (const command of commandsProp.initializer.properties) {
            if (!ts.isPropertyAssignment(command) || !ts.isObjectLiteralExpression(command.initializer)) continue;
            const parametersProp = getPropertyAssignment(command.initializer, "parameters");
            if (!parametersProp || !ts.isArrayLiteralExpression(parametersProp.initializer)) continue;

            for (const parameter of parametersProp.initializer.elements) {
                if (!ts.isObjectLiteralExpression(parameter)) continue;
                const additions = buildParameterAdditions(parameter, sourceFile);
                enqueueInsertion(additions, parameter, sourceFile, sourceText, pendingInsertions);
            }
        }
    }
}

function buildAttributeAdditions(obj: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): string[] {
    const additions: string[] = [];
    if (!hasProperty(obj, "write")) {
        additions.push("write: true");
    }

    const classification = getTypeClassification(obj, sourceFile);
    if (!classification) {
        return additions;
    }

    if (classification.category === "unsigned" && !hasProperty(obj, "max")) {
        additions.push(`max: ${createHexLiteral(classification.bits)}`);
    } else if (classification.category === "signed" && !hasProperty(obj, "min")) {
        additions.push(`min: ${createSignedMinLiteral(classification.bits)}`);
    }

    return additions;
}

function buildParameterAdditions(obj: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): string[] {
    const classification = getTypeClassification(obj, sourceFile);
    if (!classification) {
        return [];
    }

    if (classification.category === "unsigned" && !hasProperty(obj, "max")) {
        return [`max: ${createHexLiteral(classification.bits)}`];
    }

    if (classification.category === "signed" && !hasProperty(obj, "min")) {
        return [`min: ${createSignedMinLiteral(classification.bits)}`];
    }

    return [];
}

function getTypeClassification(obj: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): TypeClassification | undefined {
    const typeProp = getPropertyAssignment(obj, "type");
    if (!typeProp) return undefined;

    const typeName = extractTypeName(typeProp.initializer, sourceFile);
    if (!typeName) return undefined;

    return classify(typeName.toUpperCase());
}

function classify(typeName: string): TypeClassification | undefined {
    if (typeName in SPECIAL_TYPE_MAP) {
        return SPECIAL_TYPE_MAP[typeName];
    }

    const unsignedMatch = /^(UINT|ENUM)(\d+)$/.exec(typeName);
    if (unsignedMatch) {
        return {category: "unsigned", bits: Number(unsignedMatch[2])};
    }

    const signedMatch = /^INT(\d+)$/.exec(typeName);
    if (signedMatch) {
        return {category: "signed", bits: Number(signedMatch[1])};
    }

    return undefined;
}

function extractTypeName(expression: ts.Expression, sourceFile: ts.SourceFile): string | undefined {
    if (ts.isPropertyAccessExpression(expression)) {
        return expression.name.getText(sourceFile);
    }

    if (ts.isElementAccessExpression(expression)) {
        const argument = expression.argumentExpression;
        if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) {
            return argument.text;
        }
    }

    if (ts.isIdentifier(expression)) {
        return expression.getText(sourceFile);
    }

    return undefined;
}

function hasProperty(obj: ts.ObjectLiteralExpression, propertyName: string): boolean {
    return obj.properties.some((property) => ts.isPropertyAssignment(property) && getPropertyName(property.name) === propertyName);
}

function getPropertyAssignment(obj: ts.ObjectLiteralExpression, propertyName: string): ts.PropertyAssignment | undefined {
    return obj.properties.find(
        (property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property) && getPropertyName(property.name) === propertyName,
    );
}

function getPropertyName(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
        return name.text;
    }

    return undefined;
}

function enqueueInsertion(
    additions: string[],
    target: ts.ObjectLiteralExpression,
    sourceFile: ts.SourceFile,
    sourceText: string,
    pendingInsertions: PendingInsertion[],
): void {
    if (additions.length === 0) return;

    const closingBrace = target.getLastToken(sourceFile);
    if (!closingBrace) return;

    const insertPos = closingBrace.getStart(sourceFile);
    const inline = !sourceText.slice(target.getStart(sourceFile), insertPos).includes("\n");
    const indent = inline ? "" : getLineIndent(sourceText, insertPos);
    const text = formatInsertion(additions, {inline, indent});
    pendingInsertions.push({pos: insertPos, text});
}

function formatInsertion(additions: string[], context: {inline: boolean; indent: string}): string {
    if (context.inline) {
        return additions.map((addition) => `, ${addition}`).join("");
    }

    const propertyIndent = `${context.indent}${INDENT_UNIT}`;
    return additions.map((addition) => `\n${propertyIndent}${addition},`).join("");
}

function getLineIndent(text: string, pos: number): string {
    let lineStart = text.lastIndexOf("\n", pos - 1);
    if (lineStart === -1) {
        lineStart = 0;
    } else {
        lineStart += 1;
    }

    let indent = "";
    for (let i = lineStart; i < text.length; i += 1) {
        const char = text[i];
        if (char === " " || char === "\t") {
            indent += char;
        } else {
            break;
        }
    }

    return indent;
}

function createHexLiteral(bits: number): string {
    if (bits <= 0) {
        return "0x0";
    }

    const value = (1n << BigInt(bits)) - 1n;
    return `0x${value.toString(16)}`;
}

function createSignedMinLiteral(bits: number): string {
    if (bits <= 0) {
        return "0";
    }

    const value = -(1n << BigInt(bits - 1));
    return value.toString();
}

function applyInsertions(text: string, insertions: PendingInsertion[]): string {
    const sorted = [...insertions].sort((a, b) => b.pos - a.pos);
    let updated = text;

    for (const insertion of sorted) {
        updated = `${updated.slice(0, insertion.pos)}${insertion.text}${updated.slice(insertion.pos)}`;
    }

    return updated;
}
