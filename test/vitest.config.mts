import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        clearMocks: true,
        env: {
            VITEST_ZHC_TEST: 'true',
        },
        exclude: [
            './node_modules/**', // TODO: why is this being included?
        ],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean | void {
            return false;
        },
        coverage: {
            enabled: false,
            provider: 'v8',
            include: ['src/lib/**'], // TODO: coverage (currently test:coverage does not enable coverage)
            extension: ['.ts', '.js'], // TODO: convert all to TS
            clean: true,
            cleanOnRerun: true,
            reportsDirectory: 'coverage',
            reporter: ['text', 'html'],
            reportOnFailure: false,
            thresholds: {
                100: true,
            },
        },
    },
});
