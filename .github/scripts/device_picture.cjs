// Used by .github/workflows/device_picture.yml
// Runs in pull_request_target context: never execute or checkout PR code, the PR body is only parsed as data.

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

function getModels(title) {
    const match = title.match(/^feat\(add\):\s*(.+)$/);
    if (!match) return [];
    return match[1]
        .replace(/\s*\(#\d+\)\s*$/, "")
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m);
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
async function collect(github, pr) {
    const models = getModels(pr.title);
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

async function check({github, context, core}) {
    const pr = context.payload.pull_request;
    const results = await collect(github, pr);
    if (results.length === 0) {
        core.info("Not a `feat(add)` pull request, nothing to check");
        return;
    }

    const failed = results.filter((r) => r.error);
    const lines = [MARKER];
    if (failed.length) {
        lines.push(
            "## Device picture required",
            "",
            "This pull request adds a new device, please provide a picture for it in the pull request description so it can be shown on " +
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
    const results = await collect(github, pr);
    const uploaded = [];
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
        uploaded.push(`- \`${r.model}\`: [\`${path}\`](${data.commit.html_url})`);
    }

    if (uploaded.length) {
        await upsertComment(github, context, pr.number, [MARKER, "## Device picture", "", "Added to zigbee2mqtt.io:", "", ...uploaded].join("\n"));
    }

    const failed = results.filter((r) => r.error);
    if (failed.length) {
        core.setFailed(`Could not upload picture for: ${failed.map((r) => `${r.model} (${r.error})`).join(", ")}`);
    }
}

module.exports = {check, upload, getImageName, getModels, mapImages};
