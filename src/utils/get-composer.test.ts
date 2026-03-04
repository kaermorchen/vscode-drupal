import assert from "assert/strict";
import { describe, it } from "mocha";
import { Uri, WorkspaceFolder, workspace } from "vscode";
import { getComposer } from "./get-composer";

describe("src/utils/get-composer", () => {
  it("should return parsed composer.json when file exists", async () => {
    const workspaceFolder: WorkspaceFolder = workspace
      .workspaceFolders?.[0] as WorkspaceFolder;
    const result = await getComposer(workspaceFolder);

    assert.ok(result);
    assert.equal(result?.name, "drupal/recommended-project");
    assert.equal(result?.type, "project");
    assert.ok(Array.isArray(result?.repositories));
  });

  it("should return null when composer.json does not exist", async () => {
    const workspaceFolder: WorkspaceFolder = {
      uri: Uri.file("testWorkspaces/nonexistent"),
      name: "nonexistent",
      index: 0,
    };
    const result = await getComposer(workspaceFolder);

    assert.equal(result, null);
  });
});
