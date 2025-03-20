import type {TestProject} from "vitest/node";

import {buildIndex} from "../src/indexer";

export async function setup(project: TestProject) {
    await buildIndex(true);

    project.onTestsRerun(async () => {
        await buildIndex(true);
    });
}
