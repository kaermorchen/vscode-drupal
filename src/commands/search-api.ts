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
    const position = editor.selection.isEmpty
      ? editor.document.getWordRangeAtPosition(editor.selection.active)
      : editor.selection;
    const selectedText = editor.document.getText(position);
    const workspaceFodler = workspace.getWorkspaceFolder(editor.document.uri);
    const drupalWorkspace = this.drupalWorkspaces.find(
      (item) => item.workspaceFolder === workspaceFodler
    );
    let version = 10;

    if (drupalWorkspace) {
      version = (await drupalWorkspace.getDrupalVersion()) ?? version;
    }

    const uri = Uri.parse(
      `https://api.drupal.org/api/drupal/${version}/search/${selectedText}`
    );

    env.openExternal(uri);
  }
}
