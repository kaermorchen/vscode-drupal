import assert from "assert/strict";
import { describe, it } from "mocha";
import { findInfoFile } from "./find-info-file";

describe("src/utils/find-info-file", () => {
  it("should return info file path when info file exists", async () => {
    const filePath =
      "testWorkspaces/drupal-10/web/modules/menu_example/menu_example.module";
    const result = await findInfoFile(filePath);

    assert.ok(result);
    assert.equal(
      result,
      "testWorkspaces/drupal-10/web/modules/menu_example/menu_example.info.yml",
    );
  });

  it("should return null when info file does not exist", async () => {
    const filePath = "testWorkspaces/drupal-10/web/sites/example.sites.php";
    const result = await findInfoFile(filePath);

    assert.equal(result, null);
  });
});
