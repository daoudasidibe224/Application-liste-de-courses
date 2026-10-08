import tseslint from './frontend/node_modules/typescript-eslint/dist/index.js';
export default tseslint.config({ ignores: ['**/node_modules/**', '**/dist/**', 'backend/test/**'] }, ...tseslint.configs.recommended, { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } });
