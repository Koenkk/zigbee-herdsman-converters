// Used by .github/workflows/pr.yaml
// Runs in pull_request_target context: never execute or checkout PR code, the PR body is only parsed as data.

const zlib = require("node:zlib");

const DOCS_REPO = {owner: "Koenkk", repo: "zigbee2mqtt.io"};
const DOCS_BRANCH = "master";
const IMAGE_DIR = "public/images/devices";
const IMAGE_SIZE = 512;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MARKER = "<!-- device-picture -->";
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Only accept images uploaded to GitHub (drag and drop into the PR description)
const ALLOWED_URL = /^https:\/\/(github\.com\/user-attachments\/assets\/|(private-)?user-images\.githubusercontent\.com\/)/;
const IMAGE_REGEXES = [/!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)/g, /<img\b[^>]*>/gi];

// Same as getImageName() in zigbee2mqtt.io docgen/utils.ts
function getImageName(model) {
    return `${model.replace(/[/:' ]/g, "-")}.png`;
}

function stripPrNumber(value) {
    return value.replace(/\s*\(#\d+\)\s*$/, "").trim();
}

function getModels(title) {
    const match = title.match(/^feat\(add\):\s*(.+)$/);
    if (!match) return [];
    return stripPrNumber(match[1])
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m);
}

/** Returns `VENDOR MODEL` from `fix(detect): Detect `ID` as VENDOR MODEL` */
function getDetectTarget(title) {
    const match = title.match(/^fix\(detect\):.*\sas\s+(.+)$/);
    return match ? stripPrNumber(match[1]).replace(/`/g, "") : undefined;
}

/**
 * Determine the model from `VENDOR MODEL`, both may contain spaces (e.g. `Schneider Electric EER53000`).
 * Picks the longest suffix that occurs as a string literal in the changed files (e.g. `model: "X"` or
 * `tuya.whitelabel("Vendor", "X", ...)`), falls back to the last word.
 */
function resolveDetectModel(target, contents) {
    const words = target.split(/\s+/);
    const candidates = words.length === 1 ? words : words.slice(1).map((_, i) => words.slice(i + 1).join(" "));
    return candidates.find((c) => contents.some((content) => content.includes(`"${c}"`) || content.includes(`'${c}'`))) ?? words.at(-1);
}

/** Fetches the full content of the files changed by the PR (at the PR head, as data only) */
async function getChangedFileContents(github, context, pr) {
    const files = await github.paginate(github.rest.pulls.listFiles, {...context.repo, pull_number: pr.number, per_page: 100});
    const repo = pr.head.repo ? {owner: pr.head.repo.owner.login, repo: pr.head.repo.name} : context.repo;
    const contents = [];
    for (const file of files.filter((f) => f.status !== "removed" && f.filename.startsWith("src/devices/"))) {
        try {
            const {data} = await github.rest.repos.getContent({...repo, path: file.filename, ref: pr.head.sha});
            contents.push(Buffer.from(data.content, data.encoding).toString("utf8"));
        } catch {
            // Fall back to the patch when the content cannot be fetched (e.g. too large)
            if (file.patch) contents.push(file.patch);
        }
    }
    return contents;
}

/** Models that need a picture: the added models for `feat(add)`, the detected model for `fix(detect)` */
async function getTargetModels(github, context, pr) {
    const models = getModels(pr.title);
    if (models.length) return models;
    const target = getDetectTarget(pr.title);
    if (!target) return [];
    return [resolveDetectModel(target, await getChangedFileContents(github, context, pr))];
}

function extractImages(text) {
    const images = [];
    for (const match of text.matchAll(IMAGE_REGEXES[0])) {
        images.push({alt: match[1].trim(), url: match[2]});
    }
    for (const match of text.matchAll(IMAGE_REGEXES[1])) {
        const src = match[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        const alt = match[0].match(/\balt\s*=\s*["']([^"']*)["']/i);
        if (src) images.push({alt: alt ? alt[1].trim() : "", url: src[1]});
    }
    return images.filter((i) => ALLOWED_URL.test(i.url));
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Map every model to an image from the PR body, in order of preference:
 * 1. an image on the same line as the model, e.g. `- TS0601_switch: <img ...>`
 * 2. an image whose alt text (GitHub sets it to the file name) matches the model or its image name
 * 3. a single model with a single image
 */
function mapImages(models, body) {
    const result = {};
    const lines = body.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
    const allImages = extractImages(lines.join("\n"));

    for (const model of models) {
        const modelRegex = new RegExp(`(?<![\\w.-])${escapeRegex(model)}(?![\\w.-])`);
        for (const line of lines) {
            const images = extractImages(line);
            const withoutImages = IMAGE_REGEXES.reduce((acc, r) => acc.replace(r, ""), line);
            if (images.length && modelRegex.test(withoutImages)) {
                result[model] = images[0].url;
                break;
            }
        }

        if (!result[model]) {
            const names = [model, getImageName(model).replace(/\.png$/, "")].map((n) => n.toLowerCase());
            const image = allImages.find((i) => names.includes(i.alt.replace(/\.png$/i, "").toLowerCase()));
            if (image) result[model] = image.url;
        }
    }

    if (models.length === 1 && !result[models[0]] && allImages.length === 1) {
        result[models[0]] = allImages[0].url;
    }

    return result;
}

const PNG_CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4};
const PNG_BIT_DEPTHS = {0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16]};
// [x offset, y offset, x step, y step] per Adam7 pass
const ADAM7 = [
    [0, 0, 8, 8],
    [4, 0, 8, 8],
    [0, 4, 4, 8],
    [2, 0, 4, 4],
    [0, 2, 2, 4],
    [1, 0, 2, 2],
    [0, 1, 1, 2],
];

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** Decodes a PNG and returns the alpha (0-255) of every pixel, row by row */
function decodeAlpha(buffer) {
    let offset = 8;
    let ihdr;
    let trns;
    const idat = [];
    while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString("ascii", offset + 4, offset + 8);
        const data = buffer.subarray(offset + 8, offset + 8 + length);
        if (type === "IHDR") {
            ihdr = {width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], interlace: data[12]};
        } else if (type === "tRNS") {
            trns = data;
        } else if (type === "IDAT") {
            idat.push(data);
        } else if (type === "IEND") {
            break;
        }
        offset += 12 + length;
    }

    const {width, height, bitDepth, colorType, interlace} = ihdr;
    if (!PNG_BIT_DEPTHS[colorType]?.includes(bitDepth) || interlace > 1) throw new Error("invalid PNG");
    const channels = PNG_CHANNELS[colorType];
    const bitsPerPixel = channels * bitDepth;
    const bytesPerPixel = Math.max(1, bitsPerPixel >> 3);
    const passes = (interlace ? ADAM7 : [[0, 0, 1, 1]])
        .map(([x0, y0, dx, dy]) => ({x0, y0, dx, dy, w: Math.ceil((width - x0) / dx), h: Math.ceil((height - y0) / dy)}))
        .filter((p) => p.w > 0 && p.h > 0)
        .map((p) => ({...p, stride: Math.ceil((p.w * bitsPerPixel) / 8)}));
    const expectedLength = passes.reduce((acc, p) => acc + p.h * (1 + p.stride), 0);
    // Limit the output size to protect against decompression bombs
    const raw = zlib.inflateSync(Buffer.concat(idat), {maxOutputLength: expectedLength});
    if (raw.length < expectedLength) throw new Error("invalid PNG");

    const sample = (row, x, channel) => {
        const bit = (x * channels + channel) * bitDepth;
        if (bitDepth === 16) return row.readUInt16BE(bit >> 3);
        if (bitDepth === 8) return row[bit >> 3];
        return (row[bit >> 3] >> (8 - bitDepth - (bit & 7))) & ((1 << bitDepth) - 1);
    };
    const pixelAlpha = (row, x) => {
        if (colorType === 4 || colorType === 6) return bitDepth === 16 ? sample(row, x, channels - 1) >> 8 : sample(row, x, channels - 1);
        if (colorType === 3) {
            const index = sample(row, x, 0);
            return trns && index < trns.length ? trns[index] : 255;
        }
        // Grayscale/truecolor: transparent when matching the single tRNS color
        if (trns?.length >= channels * 2) {
            for (let c = 0; c < channels; c++) if (sample(row, x, c) !== trns.readUInt16BE(c * 2)) return 255;
            return 0;
        }
        return 255;
    };

    const alpha = new Uint8Array(width * height);
    let pos = 0;
    for (const {x0, y0, dx, dy, w, h, stride} of passes) {
        let prev = Buffer.alloc(stride);
        for (let y = 0; y < h; y++) {
            const filter = raw[pos];
            const row = Buffer.from(raw.subarray(pos + 1, pos + 1 + stride));
            pos += 1 + stride;
            if (filter > 4) throw new Error("invalid PNG");
            for (let i = 0; i < stride; i++) {
                const a = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
                const b = prev[i];
                const c = i >= bytesPerPixel ? prev[i - bytesPerPixel] : 0;
                row[i] = (row[i] + [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter]) & 0xff;
            }
            for (let x = 0; x < w; x++) alpha[(y0 + y * dy) * width + x0 + x * dx] = pixelAlpha(row, x);
            prev = row;
        }
    }
    return alpha;
}

/**
 * A transparent background is detected by checking the corners: requiring all four to be opaque before failing allows
 * devices that touch some of the corners (e.g. a square wall switch) while catching white/colored backgrounds.
 */
function hasTransparentBackground(buffer, width, height) {
    let alpha;
    try {
        alpha = decodeAlpha(buffer);
    } catch {
        throw new Error("image is not a valid PNG");
    }
    return [0, width - 1, (height - 1) * width, height * width - 1].some((i) => alpha[i] < 128);
}

async function downloadAndValidate(url) {
    const response = await fetch(url, {redirect: "follow"});
    if (!response.ok) throw new Error(`failed to download (HTTP ${response.status})`);
    const length = Number(response.headers.get("content-length"));
    if (length > MAX_IMAGE_BYTES) throw new Error(`image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) throw new Error(`image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB)`);
    if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE) || buffer.toString("ascii", 12, 16) !== "IHDR") {
        throw new Error("image is not a PNG");
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width !== IMAGE_SIZE || height !== IMAGE_SIZE) {
        throw new Error(`image is ${width}x${height}, expected ${IMAGE_SIZE}x${IMAGE_SIZE}`);
    }
    if (!hasTransparentBackground(buffer, width, height)) {
        throw new Error("image background is not transparent");
    }
    return buffer;
}

async function getExistingSha(github, imageName) {
    try {
        const {data} = await github.rest.repos.getContent({...DOCS_REPO, path: `${IMAGE_DIR}/${imageName}`, ref: DOCS_BRANCH});
        return data.sha;
    } catch (error) {
        if (error.status === 404) return undefined;
        throw error;
    }
}

/** Returns a result per model: {model, imageName, url, buffer, exists, error} */
async function collect(github, context, pr) {
    const models = await getTargetModels(github, context, pr);
    const urls = mapImages(models, pr.body ?? "");
    const results = [];
    for (const model of models) {
        const imageName = getImageName(model);
        const result = {model, imageName, url: urls[model], exists: (await getExistingSha(github, imageName)) !== undefined};
        if (result.url) {
            try {
                result.buffer = await downloadAndValidate(result.url);
            } catch (error) {
                result.error = error.message;
            }
        } else if (!result.exists) {
            result.error = "no picture found in the pull request description";
        }
        results.push(result);
    }
    return results;
}

async function upsertComment(github, context, prNumber, body) {
    const comments = await github.paginate(github.rest.issues.listComments, {...context.repo, issue_number: prNumber, per_page: 100});
    const existing = comments.find((c) => c.body?.includes(MARKER));
    if (existing) {
        if (existing.body !== body) await github.rest.issues.updateComment({...context.repo, comment_id: existing.id, body});
    } else {
        await github.rest.issues.createComment({...context.repo, issue_number: prNumber, body});
    }
}

async function check({github, context, core, prNumber}) {
    // Fetch the PR instead of using the event payload: the PR title workflow may have changed the title in the meantime
    const pr = (await github.rest.pulls.get({...context.repo, pull_number: prNumber})).data;
    const results = await collect(github, context, pr);
    if (results.length === 0) {
        core.info("Not a `feat(add)` or `fix(detect)` pull request, nothing to check");
        return;
    }

    const failed = results.filter((r) => r.error);
    const lines = [MARKER];
    if (failed.length) {
        lines.push(
            "## Device picture required",
            "",
            "This pull request adds a new device or detection, please provide a picture for it in the pull request description so it can be shown on " +
                "[zigbee2mqtt.io](https://www.zigbee2mqtt.io/supported-devices/) and in the frontend. Requirements:",
            "",
            "- Format: `PNG`",
            `- Resolution: \`${IMAGE_SIZE}x${IMAGE_SIZE}\``,
            "- Background: transparent (if necessary, use the [Adobe Express background remover](https://new.express.adobe.com/tools/remove-background))",
            "",
            "Edit the pull request description and drag and drop the picture after the model, e.g.:",
            "",
            "```",
            ...results.map((r) => `- ${r.model}: <drop picture here>`),
            "```",
            "",
            "Upon merge, the picture is automatically added to the zigbee2mqtt.io documentation.",
            "",
        );
    } else {
        lines.push("## Device picture", "");
    }
    for (const r of results) {
        if (r.error) {
            lines.push(`- :x: \`${r.model}\`: ${r.error}`);
        } else if (r.buffer) {
            lines.push(
                `- :white_check_mark: \`${r.model}\`: will be added as \`${IMAGE_DIR}/${r.imageName}\`${r.exists ? " (replaces existing)" : ""}`,
            );
        } else {
            lines.push(`- :white_check_mark: \`${r.model}\`: picture already exists (\`${IMAGE_DIR}/${r.imageName}\`)`);
        }
    }

    // Only comment once something is missing, afterwards keep the comment up to date
    const comments = await github.paginate(github.rest.issues.listComments, {...context.repo, issue_number: pr.number, per_page: 100});
    if (failed.length || comments.some((c) => c.body?.includes(MARKER))) {
        await upsertComment(github, context, pr.number, lines.join("\n"));
    }

    if (failed.length) {
        core.setFailed(failed.map((r) => `${r.model}: ${r.error}`).join("\n"));
    }
}

async function upload({github, context, core, docsGithub}) {
    const pr = context.payload.pull_request;
    const results = await collect(github, context, pr);
    for (const r of results.filter((r) => r.buffer)) {
        const path = `${IMAGE_DIR}/${r.imageName}`;
        const {data} = await docsGithub.rest.repos.createOrUpdateFileContents({
            ...DOCS_REPO,
            branch: DOCS_BRANCH,
            path,
            message: `feat: add device picture for ${r.model} (${context.repo.owner}/${context.repo.repo}#${pr.number})`,
            content: r.buffer.toString("base64"),
            sha: await getExistingSha(docsGithub, r.imageName),
        });
        core.info(`Uploaded '${path}': ${data.commit.html_url}`);
    }

    const failed = results.filter((r) => r.error);
    if (failed.length) {
        core.setFailed(`Could not upload picture for: ${failed.map((r) => `${r.model} (${r.error})`).join(", ")}`);
    }
}

module.exports = {check, upload, getImageName, getModels, getDetectTarget, resolveDetectModel, mapImages, hasTransparentBackground};
