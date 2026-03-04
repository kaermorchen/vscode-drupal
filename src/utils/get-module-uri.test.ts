import assert from "assert/strict";
import { describe, it } from "mocha";
import { Uri } from "vscode";
import { getModuleUri } from "./get-module-uri";

describe("src/utils/get-module-uri", () => {
  it("should return module URI for path inside custom module", () => {
    const uri = Uri.file("/var/www/html/web/modules/custom/my_module");
    const result = getModuleUri(uri);
    assert.ok(result);
    assert.equal(result?.fsPath, "/var/www/html/web/modules/custom/my_module");
  });

  it("should return module URI for nested file inside custom module", () => {
    const uri = Uri.file(
      "/var/www/html/web/modules/custom/my_module/src/MyClass.php",
    );
    const result = getModuleUri(uri);
    assert.ok(result);
    assert.equal(result?.fsPath, "/var/www/html/web/modules/custom/my_module");
  });

  it("should return undefined for path not in custom modules", () => {
    const uri = Uri.file("/var/www/html/web/modules/contrib/some_module");
    const result = getModuleUri(uri);
    assert.equal(result, undefined);
  });

  it("should return undefined for path without web/modules/custom", () => {
    const uri = Uri.file("/var/www/html/core/lib/Drupal.php");
    const result = getModuleUri(uri);
    assert.equal(result, undefined);
  });

  it("should return undefined for path ending at custom directory", () => {
    const uri = Uri.file("/var/www/html/web/modules/custom/");
    const result = getModuleUri(uri);
    assert.equal(result, undefined);
  });
});
