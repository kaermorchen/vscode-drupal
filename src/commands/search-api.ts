import {
  commands,
  env,
  TextEditor,
  Uri,
  window,
  workspace,
  WorkspaceFolder,
} from "vscode";
import { DrupalWorkspace } from "../base/drupal-workspace";
import { TextEditorCommand } from "./text-editor-command";

export class SearchApi extends TextEditorCommand {
  static id = "drupal.search-api";

  drupalWorkspaces: DrupalWorkspace[];

  constructor(drupalWorkspaces: DrupalWorkspace[]) {
    super();

    this.drupalWorkspaces = drupalWorkspaces;

    window.onDidChangeActiveTextEditor(
      this.onActiveEditorChanged,
      this,
      this.disposables,
    );

    this.onActiveEditorChanged();
  }

  async callback(editor: TextEditor) {
    const position = editor.selection.isEmpty
      ? editor.document.getWordRangeAtPosition(editor.selection.active)
      : editor.selection;
    const selectedText = editor.document.getText(position);
    const workspaceFolder = workspace.getWorkspaceFolder(editor.document.uri);
    const drupalWorkspace = this.getDrupalWorkspace(workspaceFolder);
    let version = 10;

    if (drupalWorkspace) {
      version = (await drupalWorkspace.getDrupalVersion()) ?? version;
    }

    const uri = Uri.parse(
      `https://api.drupal.org/api/drupal/${version}/search/${selectedText}`,
    );

    env.openExternal(uri);
  }

  getDrupalWorkspace(workspaceFolder?: WorkspaceFolder) {
    return this.drupalWorkspaces.find(
      (item) => item.workspaceFolder === workspaceFolder,
    );
  }

  onActiveEditorChanged() {
    let fileIsInDrupalWorkspace = false;

    if (window.activeTextEditor) {
      const workspaceFolder = workspace.getWorkspaceFolder(
        window.activeTextEditor.document.uri,
      );

      fileIsInDrupalWorkspace = Boolean(
        this.getDrupalWorkspace(workspaceFolder),
      );
    }

    commands.executeCommand(
      "setContext",
      "drupal.fileIsInDrupalWorkspace",
      fileIsInDrupalWorkspace,
    );
  }
}
