/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@figma/figma-plugins', '@typescript-eslint', 'react-hooks'],
  extends: [
    'plugin:@figma/figma-plugins/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  ignorePatterns: [
    'src/**/*.d.css.ts',
    'src/**/*.css.d.ts',
    'src/__tests__/**/__snapshots__/**',
  ],
  overrides: [
    {
      // Test files are excluded from tsconfig.json — disable type-aware rules
      files: ['src/__tests__/**/*.ts', 'src/__tests__/**/*.tsx'],
      parserOptions: { project: null },
      rules: {
        '@figma/figma-plugins/dynamic-page-find-method-advice': 'off',
        '@figma/figma-plugins/await-requires-async': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
}
