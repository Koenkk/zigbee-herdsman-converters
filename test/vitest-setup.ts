import type {TestProject} from "vitest/node";

import {buildIndex} from "../src/indexer";

export async function setup(project: TestProject) {
    await buildIndex(true);

    // Disable re-build as it creates and endless loop
    // project.onTestsRerun(async () => {
    //     await buildIndex(true);
    // });
}
