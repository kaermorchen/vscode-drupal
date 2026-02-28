import * as assert from 'assert';
import getPackage from './get-package';

describe('src/utils/get-package', () => {
  it('should have required properties', () => {
    assert.strictEqual(getPackage(), {});
  });
});
