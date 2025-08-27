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
                const cleaned: string[] = [];
                for (const r of raw) {
                    const t = r.trim();
                    if (t.length > 0) {
                        cleaned.push(t);
                    }
                }
                if (cleaned.length > 0) {
                    opts.include = cleaned;
                }
                i += 1;
            }
        } else if (arg === "--exclude") {
            if (i + 1 < argv.length) {
                const raw = argv[i + 1].split(",");
                const cleaned: string[] = [];
                for (const r of raw) {
                    const t = r.trim();
                    if (t.length > 0) {
                        cleaned.push(t);
                    }
                }
                opts.exclude = cleaned;
                i += 1;
            }
        } else if (arg === "--silent") {
            opts.silent = true;
        }
    }
    return opts;
}

function wildcardToRegex(pattern: string): RegExp {
    let out = "";
    for (let i = 0; i < pattern.length; i += 1) {
        const c = pattern[i];
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
    let incOk = false;
    for (const r of matcher.include) {
        if (r.test(unix)) {
            incOk = true;
            break;
        }
    }
    if (!incOk) {
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
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(full);
            } else {
                out.push(full);
            }
        }
    }
    await walk(root);
    return out;
}

/* ---------- Detection helpers ---------- */

function isBareFzConverter(typeNode: ts.TypeNode): typeNode is ts.TypeReferenceNode {
    if (!ts.isTypeReferenceNode(typeNode)) {
        return false;
    }
    if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        return false;
    }
    if (!ts.isQualifiedName(typeNode.typeName)) {
        return false;
    }
    const q = typeNode.typeName;
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

interface ClusterLiteral {
    raw: string; // Raw text exactly as in source (includes quotes for strings)
    kind: "string" | "number";
}

function extractClusterLiteral(sf: ts.SourceFile, obj: ts.ObjectLiteralExpression): ClusterLiteral | undefined {
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
        if (nameText !== "cluster") {
            continue;
        }
        const init = prop.initializer;
        if (ts.isStringLiteral(init)) {
            return {raw: init.getText(sf), kind: "string"};
        }
        if (ts.isNumericLiteral(init)) {
            // Preserve original literal (numericLiteral.text loses hex/underscores),
            // so slice raw text from source.
            return {raw: init.getText(sf), kind: "number"};
        }
        return undefined;
    }
    return undefined;
}

interface Insertion {
    pos: number;
    text: string;
}

/**
 * Walk the file and find all places to insert generics after Fz.Converter.
 * Handles:
 *  - Variable annotated type with object initializer
 *  - SatisfiesExpression (anywhere)
 *  - AsExpression (anywhere)
 */
function gatherInsertions(sf: ts.SourceFile): Insertion[] {
    const inserts: Insertion[] = [];

    function enqueue(typeNode: ts.TypeNode, obj: ts.ObjectLiteralExpression) {
        if (!isBareFzConverter(typeNode)) {
            return;
        }
        const cluster = extractClusterLiteral(sf, obj);
        if (cluster === undefined) {
            return;
        }
        const ins: Insertion = {
            pos: typeNode.end,
            text: "<" + cluster.raw + ">",
        };
        inserts.push(ins);
    }

    function checkNode(node: ts.Node) {
        if (ts.isVariableDeclaration(node)) {
            if (node.type && node.initializer) {
                if (ts.isObjectLiteralExpression(node.initializer)) {
                    enqueue(node.type, node.initializer);
                }
            }
            if (node.initializer) {
                const init = node.initializer;
                if (ts.isSatisfiesExpression(init)) {
                    if (ts.isObjectLiteralExpression(init.expression)) {
                        enqueue(init.type, init.expression);
                    }
                } else if (ts.isAsExpression(init)) {
                    if (ts.isObjectLiteralExpression(init.expression)) {
                        enqueue(init.type, init.expression);
                    }
                }
            }
        } else if (ts.isSatisfiesExpression(node)) {
            if (ts.isObjectLiteralExpression(node.expression)) {
                enqueue(node.type, node.expression);
            }
        } else if (ts.isAsExpression(node)) {
            if (ts.isObjectLiteralExpression(node.expression)) {
                enqueue(node.type, node.expression);
            }
        }
    }

    function walk(n: ts.Node) {
        checkNode(n);
        ts.forEachChild(n, walk);
    }

    walk(sf);
    return inserts;
}

/* ---------- Text insertion (preserve formatting) ---------- */

function applyInsertions(original: string, inserts: Insertion[]): string {
    if (inserts.length === 0) {
        return original;
    }
    // Sort descending by position (selection sort).
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
        if (updated[ins.pos] === "<") {
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

/* ---------- Main ---------- */

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
