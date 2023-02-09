import { env, TextEditor, Uri, workspace } from 'vscode';
import DrupalWorkspace from '../base/drupal-workspace';
import TextEditorCommand from './text-editor-command';

export default class SearchApi extends TextEditorCommand {
  static id = 'drupal.search-api';

  drupalWorkspaces: DrupalWorkspace[];

  constructor(drupalWorkspaces: DrupalWorkspace[]) {
    super();

    this.drupalWorkspaces = drupalWorkspaces;
  }

  async callback(editor: TextEditor) {
    if (editor.selection.isEmpty) {
      return;
    }

    // getWordRangeAtPosition

    let version = 10;
    const workspaceFodler = workspace.getWorkspaceFolder(editor.document.uri);
    const drupalWorkspace = this.drupalWorkspaces.find(
      (item) => item.workspaceFolder === workspaceFodler
    );

    if (drupalWorkspace) {
      version = (await drupalWorkspace.getDrupalVersion()) ?? version;
    }

    const selectedText = editor.document.getText(editor.selection);
    const uri = Uri.parse(
      `https://api.drupal.org/api/drupal/${version}/search/${selectedText}`
    );

    env.openExternal(uri);
  }
}
