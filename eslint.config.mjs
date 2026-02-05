import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
    { ignores: ['node_modules/**', 'dist/**', 'build/**', 'vite.config.js'] },
    {
        files: ['**/*.js', '**/*.jsx'],
        plugins: { react, 'react-hooks': reactHooks, import: importPlugin },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
            globals: { ...globals.browser, React: 'readonly', Intl: 'readonly' },
        },
        settings: {
            react: { version: 'detect' },
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            // Deshabilitamos las reglas que causan el conflicto de alias @/
            'import/no-unresolved': 'off',
            'import/named': 'off',
            'import/namespace': 'off',
            'import/default': 'off',
            'import/no-named-as-default': 'off',
            'import/no-named-as-default-member': 'off',
            
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            'react/react-in-jsx-scope': 'off',
            'no-undef': 'error',
            'no-unused-vars': 'warn',
        },
    },
    { files: ['tools/**/*.js', 'tailwind.config.js'], languageOptions: { globals: globals.node } },
];