import assert from "assert/strict";
import { describe, it } from "mocha";
import { getWorkspaceFolders } from "./get-workspace-folders";

describe("src/utils/get-workspace-folders", () => {
  it("should return workspace folders", () => {
    const folders = getWorkspaceFolders();
    assert.ok(Array.isArray(folders));
    // In test environment there is at least one workspace folder named "drupal-10"
    assert.ok(folders.length > 0);
    assert.equal(folders[0].name, "drupal-10");
  });
});
