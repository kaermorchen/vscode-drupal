import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    label: 'unitTests',
    files: 'out/**/*.test.js',
    version: '1.100.0',
    workspaceFolder: './testWorkspaces/drupal-10',
    mocha: {
      ui: 'tdd',
      timeout: 20000,
    },
  },
]);
