import assert from "assert/strict";
import { describe, it } from "mocha";
import { getModuleMachineName } from "./get-module-machine-name";

describe("src/utils/get-module-machine-name", () => {
  it("should return machine name when info file exists", async () => {
    const filePath =
      "testWorkspaces/drupal-10/web/modules/menu_example/menu_example.module";
    const result = await getModuleMachineName(filePath);

    assert.equal(result, "menu_example");
  });

  it("should return null when info file does not exist", async () => {
    const filePath = "testWorkspaces/drupal-10/web/sites/example.sites.php";
    const result = await getModuleMachineName(filePath);

    assert.equal(result, null);
  });
});
