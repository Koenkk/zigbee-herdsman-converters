// @ts-check

import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                project: true,
            },
        },
        rules: {
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/ban-ts-comment': 'error',
            // Not enabled for now, gives 3.6k errors which require manual fixing.
            // '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['error', {args: 'none'}],
            'array-bracket-spacing': ['error', 'never'],
            '@typescript-eslint/return-await': ['error', 'always'],
            'object-curly-spacing': ['error', 'never'],
            '@typescript-eslint/no-floating-promises': 'error',
        },
    },
    {
        ignores: ['test/', 'index.*', 'converters/', 'devices/', 'lib/', 'scripts/', '**/*.mjs', 'coverage/'],
    },
    eslintConfigPrettier,
);
