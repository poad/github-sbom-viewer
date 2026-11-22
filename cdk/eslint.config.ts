import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { configs, parser } from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  {
    ignores: [
      '**/*.d.ts',
      'out',
      'cdk.out',
      '**/generated/**',
      '**/*.js',
    ],
  },
  js.configs.recommended,
  ...configs.strict,
  ...configs.stylistic,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser,
      globals: {},
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.ts', 'vite.config.ts'],
        },
        tsconfigRootDir: __dirname,
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