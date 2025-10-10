import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        clearMocks: true,
        env: {
            VITEST_ZHC_TEST: "true",
        },
        onConsoleLog(log: string, type: "stdout" | "stderr"): boolean | undefined {
            return false;
        },
        globalSetup: ["./test/vitest-setup.ts"],
        coverage: {
            enabled: false,
            provider: "v8",
            include: [
                // TODO: and add `--coverage` in package.json `test:coverage`
                // 'src/index.ts',
                // 'src/lib/**',
            ],
            extension: [".ts", ".js"], // TODO: convert all to TS
            clean: true,
            cleanOnRerun: true,
            reportsDirectory: "coverage",
            reporter: ["text", "html"],
            reportOnFailure: false,
            thresholds: {
                100: true,
            },
        },
    },
});
