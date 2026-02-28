import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  label: 'unitTests',
  files: 'src/**/*.test.js',
  version: '1.100.0',
  // workspaceFolder: './sampleWorkspace',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
  },
});
