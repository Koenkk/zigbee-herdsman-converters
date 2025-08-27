import {promises as fs} from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

interface CliOptions {
    root: string;
    dryRun: boolean;
    include: string[];
    exclude: string[];
    silent: boolean;
}

function parseArgs(argv: string[]): CliOptions {
    const opts: CliOptions = {
        root: process.cwd(),
        dryRun: false,
        include: ["**/*.ts", "**/*.tsx"],
        exclude: [],
        silent: false,
    };
    for (let i = 2; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--root") {
            if (i + 1 < argv.length) {
                opts.root = path.resolve(argv[i + 1]);
                i += 1;
            }
        } else if (arg === "--dry-run") {
            opts.dryRun = true;
        } else if (arg === "--include") {
            if (i + 1 < argv.length) {
                const raw = argv[i + 1].split(",");
                const arr: string[] = [];
                for (const r of raw) {
                    const t = r.trim();
                    if (t.length > 0) {
                        arr.push(t);
                    }
                }
                if (arr.length > 0) {
                    opts.include = arr;
                }
                i += 1;
            }
        } else if (arg === "--exclude") {
            if (i + 1 < argv.length) {
                const raw = argv[i + 1].split(",");
                const arr: string[] = [];
                for (const r of raw) {
                    const t = r.trim();
                    if (t.length > 0) {
                        arr.push(t);
                    }
                }
                opts.exclude = arr;
                i += 1;
            }
        } else if (arg === "--silent") {
            opts.silent = true;
        }
    }
    return opts;
}

function wildcardToRegex(p: string): RegExp {
    let out = "";
    for (let i = 0; i < p.length; i += 1) {
        const c = p[i];
        if (c === "*") {
            out += ".*";
        } else {
            if ("\\^$.+()|[]{}".includes(c)) {
                out += "\\";
            }
            out += c;
        }
    }
    return new RegExp("^" + out + "$");
}

interface Matcher {
    include: RegExp[];
    exclude: RegExp[];
}

function buildMatcher(include: string[], exclude: string[]): Matcher {
    const inc: RegExp[] = [];
    const exc: RegExp[] = [];
    for (const i of include) {
        inc.push(wildcardToRegex(i));
    }
    for (const e of exclude) {
        exc.push(wildcardToRegex(e));
    }
    return {include: inc, exclude: exc};
}

function fileMatches(rel: string, matcher: Matcher): boolean {
    const unix = rel.replace(/\\/g, "/");
    let ok = false;
    for (const r of matcher.include) {
        if (r.test(unix)) {
            ok = true;
            break;
        }
    }
    if (!ok) {
        return false;
    }
    for (const r of matcher.exclude) {
        if (r.test(unix)) {
            return false;
        }
    }
    return true;
}

async function collectFiles(root: string): Promise<string[]> {
    const out: string[] = [];
    async function walk(dir: string) {
        const entries = await fs.readdir(dir, {withFileTypes: true});
        for (const ent of entries) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                await walk(full);
            } else {
                out.push(full);
            }
        }
    }
    await walk(root);
    return out;
}

/* ----------------- Core logic ------------------ */

function isFzConverter(node: ts.TypeReferenceNode): boolean {
    if (!ts.isQualifiedName(node.typeName)) {
        return false;
    }
    const q = node.typeName;
    if (!ts.isIdentifier(q.left)) {
        return false;
    }
    if (q.left.text !== "Fz") {
        return false;
    }
    if (q.right.text !== "Converter") {
        return false;
    }
    return true;
}

function cleanWhitespaceComparable(s: string): string {
    let out = "";
    for (let i = 0; i < s.length; i += 1) {
        const c = s[i];
        if (c === " " || c === "\t" || c === "\n" || c === "\r") {
            continue;
        }
        out += c;
    }
    return out;
}

function unwrapAs(expr: ts.Expression): ts.Expression {
    let cur = expr;
    while (ts.isAsExpression(cur)) {
        cur = cur.expression;
    }
    return cur;
}

function unwrapParens(expr: ts.Expression): ts.Expression {
    let cur = expr;
    while (ts.isParenthesizedExpression(cur)) {
        cur = cur.expression;
    }
    return cur;
}

function extractTypePropertyRaw(sf: ts.SourceFile, obj: ts.ObjectLiteralExpression): string | undefined {
    for (const prop of obj.properties) {
        if (!ts.isPropertyAssignment(prop)) {
            continue;
        }
        let nameText: string | undefined;
        if (ts.isIdentifier(prop.name)) {
            nameText = prop.name.text;
        } else if (ts.isStringLiteral(prop.name)) {
            nameText = prop.name.text;
        }
        if (nameText !== "type") {
            continue;
        }
        let init = prop.initializer;
        init = unwrapAs(init);
        init = unwrapParens(init);
        if (ts.isStringLiteral(init)) {
            return init.getText(sf);
        }
        if (ts.isArrayLiteralExpression(init)) {
            let allStrings = true;
            for (const el of init.elements) {
                const unwrapped = unwrapParens(unwrapAs(el as ts.Expression));
                if (!ts.isStringLiteral(unwrapped)) {
                    allStrings = false;
                    break;
                }
            }
            if (!allStrings) {
                return undefined;
            }
            return init.getText(sf);
        }
        return undefined;
    }
    return undefined;
}

interface Insertion {
    pos: number;
    text: string;
}

function gatherInsertions(sf: ts.SourceFile): Insertion[] {
    const inserts: Insertion[] = [];

    function consider(typeRef: ts.TypeReferenceNode, obj: ts.ObjectLiteralExpression) {
        if (!isFzConverter(typeRef)) {
            return;
        }
        let argCount = 0;
        if (typeRef.typeArguments) {
            argCount = typeRef.typeArguments.length;
        }
        if (argCount === 1) {
            const typeRaw = extractTypePropertyRaw(sf, obj);
            if (typeRaw === undefined) {
                return;
            }
            const closePos = typeRef.end - 1;
            const full = sf.getFullText();
            if (full[closePos] !== ">") {
                return;
            }
            const ins: Insertion = {
                pos: closePos,
                text: ", undefined, " + typeRaw,
            };
            inserts.push(ins);
            return;
        }
        if (argCount >= 3) {
            const typeRaw = extractTypePropertyRaw(sf, obj);
            if (typeRaw === undefined) {
                return;
            }
            if (!typeRef.typeArguments) {
                return;
            }
            const second = typeRef.typeArguments[1];
            const third = typeRef.typeArguments[2];
            if (!second || !third) {
                return;
            }
            const secondTxt = cleanWhitespaceComparable(second.getText(sf));
            const thirdTxt = cleanWhitespaceComparable(third.getText(sf));
            const wantThird = cleanWhitespaceComparable(typeRaw);
            if (secondTxt === "undefined" && thirdTxt === wantThird) {
                return;
            }
            return;
        }
    }

    function handleObjectCarrier(expr: ts.Expression, typeNode: ts.TypeNode) {
        const unwrappedParens = unwrapParens(expr);
        const unwrappedAs = unwrapAs(unwrappedParens);
        if (ts.isObjectLiteralExpression(unwrappedAs) && ts.isTypeReferenceNode(typeNode)) {
            consider(typeNode as ts.TypeReferenceNode, unwrappedAs);
        }
    }

    function fromVariable(node: ts.VariableDeclaration) {
        if (node.type && node.initializer) {
            const init = node.initializer;
            if (ts.isObjectLiteralExpression(init)) {
                if (ts.isTypeReferenceNode(node.type)) {
                    consider(node.type, init);
                }
            } else if (ts.isSatisfiesExpression(init)) {
                handleObjectCarrier(init.expression, init.type);
            } else if (ts.isAsExpression(init)) {
                handleObjectCarrier(init.expression, init.type);
            }
        }
    }

    function genericFromExpression(node: ts.Node) {
        if (ts.isSatisfiesExpression(node)) {
            handleObjectCarrier(node.expression, node.type);
        } else if (ts.isAsExpression(node)) {
            handleObjectCarrier(node.expression, node.type);
        }
    }

    function walk(n: ts.Node) {
        if (ts.isVariableDeclaration(n)) {
            fromVariable(n);
        }
        genericFromExpression(n);
        ts.forEachChild(n, walk);
    }

    walk(sf);
    return inserts;
}

function applyInsertions(original: string, inserts: Insertion[]): string {
    if (inserts.length === 0) {
        return original;
    }
    for (let i = 0; i < inserts.length - 1; i += 1) {
        let maxIdx = i;
        for (let j = i + 1; j < inserts.length; j += 1) {
            if (inserts[j].pos > inserts[maxIdx].pos) {
                maxIdx = j;
            }
        }
        if (maxIdx !== i) {
            const tmp = inserts[i];
            inserts[i] = inserts[maxIdx];
            inserts[maxIdx] = tmp;
        }
    }
    let updated = original;
    for (const ins of inserts) {
        if (updated[ins.pos] !== ">") {
            continue;
        }
        updated = updated.slice(0, ins.pos) + ins.text + updated.slice(ins.pos);
    }
    return updated;
}

async function processFile(file: string): Promise<{changed: boolean; updated?: string}> {
    const content = await fs.readFile(file, "utf8");
    const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
    const inserts = gatherInsertions(sf);
    if (inserts.length === 0) {
        return {changed: false};
    }
    const updated = applyInsertions(content, inserts);
    if (updated === content) {
        return {changed: false};
    }
    return {changed: true, updated};
}

/* ----------------- Main ------------------ */

async function main() {
    const opts = parseArgs(process.argv);
    const matcher = buildMatcher(opts.include, opts.exclude);
    if (!opts.silent) {
        console.log("Root:", opts.root);
    }
    const all = await collectFiles(opts.root);
    const targets: string[] = [];
    for (const f of all) {
        const rel = path.relative(opts.root, f);
        if (!fileMatches(rel, matcher)) {
            continue;
        }
        if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) {
            continue;
        }
        targets.push(f);
    }

    let modified = 0;

    for (const file of targets) {
        const res = await processFile(file);
        if (!res.changed) {
            continue;
        }
        if (opts.dryRun) {
            if (!opts.silent) {
                console.log("[DRY] " + path.relative(opts.root, file));
            }
        } else {
            if (res.updated !== undefined) {
                await fs.writeFile(file, res.updated, "utf8");
            }
            if (!opts.silent) {
                console.log("[MOD] " + path.relative(opts.root, file));
            }
        }
        modified += 1;
    }

    if (!opts.silent) {
        if (modified === 0) {
            console.log("No modifications needed.");
        } else {
            if (opts.dryRun) {
                console.log("Would modify " + modified + " file" + (modified === 1 ? "" : "s") + ".");
            } else {
                console.log("Modified " + modified + " file" + (modified === 1 ? "" : "s") + ".");
            }
        }
    }
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
