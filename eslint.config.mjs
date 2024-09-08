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
            '@typescript-eslint/ban-ts-comment': 'off', // TODO error
            '@typescript-eslint/explicit-function-return-type': 'off', // TODO error
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': 'off', // TODO error
            'array-bracket-spacing': ['error', 'never'],
            'no-return-await': 'error',
            'object-curly-spacing': ['error', 'never'],
            '@typescript-eslint/no-floating-promises': 'error',
            'no-prototype-builtins': 'off', // TODO remove (error by default)
        },
    },
    {
        ignores: ['test/', 'index.*', 'converters/', 'devices/', 'lib/', 'scripts/', '**/*.mjs'],
    },
    eslintConfigPrettier,
);
