import assert from 'assert/strict';
import { describe, it } from 'mocha';
import { getPackage } from './get-package';

describe('src/utils/get-package', () => {
  it('should get package.json of the extension', () => {
    const packageJson = getPackage();

    assert.equal(packageJson.name, 'vscode-drupal');
    assert.ok(Array.isArray(packageJson.contributes.languages));
  });
});
