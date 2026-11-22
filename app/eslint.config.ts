import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import { configs } from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default defineConfig(
  {
    ignores: [
      ...(includeIgnoreFile(gitignorePath).ignores || []),
      '**/*.d.ts',
      'src/tsconfig.json',
      'src/stories',
      '**/*.css',
      'node_modules/**/*',
      'out',
      'cdk.out',
      'dist',
      'app',
    ],
  },
  eslint.configs.recommended,
  ...configs.strict,
  {
    files: ['**/*.ts', '*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['tsconfig-eslint.json'],
      },
    },
    rules: {
      '@typescript-eslint/semi': ['error', 'always'],
      '@typescript-eslint/indent': ['error', 2],
      '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
      '@typescript-eslint/arrow-parens': ['error', 'always'],
      '@typescript-eslint/quotes': ['error', 'single'],
    },
  },
);