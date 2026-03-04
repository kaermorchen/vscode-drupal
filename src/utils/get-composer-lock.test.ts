import assert from "assert/strict";
import { describe, it } from "mocha";
import { Uri, WorkspaceFolder, workspace } from "vscode";
import { getComposerLock } from "./get-composer-lock";

describe("src/utils/get-composer-lock", () => {
  it("should return parsed composer.lock when file exists", async () => {
    const workspaceFolder: WorkspaceFolder = workspace
      .workspaceFolders?.[0] as WorkspaceFolder;
    const result = await getComposerLock(workspaceFolder);

    assert.ok(result);
    assert.ok(Array.isArray(result?.packages));
    assert.equal(
      result?._readme?.[0],
      "This file locks the dependencies of your project to a known state",
    );
  });

  it("should return null when composer.lock does not exist", async () => {
    const workspaceFolder: WorkspaceFolder = {
      uri: Uri.file("testWorkspaces/nonexistent"),
      name: "nonexistent",
      index: 0,
    };
    const result = await getComposerLock(workspaceFolder);

    assert.equal(result, null);
  });
});
