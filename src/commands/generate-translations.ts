import {
  commands,
  env,
  RelativePattern,
  TextEditor,
  Uri,
  window,
  workspace,
  WorkspaceFolder,
} from 'vscode';
import DrupalWorkspace from '../base/drupal-workspace';
import TextEditorCommand from './text-editor-command';
import getModuleUri from '../utils/get-module-uri';
import { parse, walk } from 'twig-parser';

export default class GenerateTranslations extends TextEditorCommand {
  static id = 'drupal.generate-translations';

  drupalWorkspaces: DrupalWorkspace[];

  constructor(drupalWorkspaces: DrupalWorkspace[]) {
    super();

    this.drupalWorkspaces = drupalWorkspaces;

    window.onDidChangeActiveTextEditor(
      this.onActiveEditorChanged,
      this,
      this.disposables
    );

    this.onActiveEditorChanged();
  }

  async callback(editor: TextEditor) {
    const moduleUri = await getModuleUri(editor.document.uri);

    if (!moduleUri) {
      return;
    }

    const workspaceFodler = workspace.getWorkspaceFolder(editor.document.uri);
    const drupalWorkspace = this.getDrupalWorkspace(workspaceFodler);

    if (!drupalWorkspace) {
      return;
    }

    const pattern = new RelativePattern(moduleUri, '**/*.html.twig');
    const uris = await drupalWorkspace.findFiles(pattern);

    for (const uri of uris) {
      const buffer = await workspace.fs.readFile(uri);
      const { ast } = parse(buffer.toString());

      walk(ast, (node) => {
        let translate = '';

        if (node.type === 'TransStatement') {
          for (const item of node.body) {
            switch (item.type) {
              case 'Text':
                translate = translate.concat(item.value);
                break;
              case 'VariableStatement':
                if (item.value.type === 'Identifier') {
                  translate = translate.concat(`@${item.value.name}`);
                }
                break;
            }
          }
        }
      });
    }
  }

  getDrupalWorkspace(workspaceFodler?: WorkspaceFolder) {
    return workspaceFodler
      ? this.drupalWorkspaces.find(
          (item) => item.workspaceFolder === workspaceFodler
        )
      : undefined;
  }

  async onActiveEditorChanged() {
    let fileIsInDrupalModule = false;

    if (window.activeTextEditor) {
      fileIsInDrupalModule =
        (await getModuleUri(window.activeTextEditor.document.uri)) !==
        undefined;
    }

    commands.executeCommand(
      'setContext',
      'drupal.fileIsInDrupalModule',
      fileIsInDrupalModule
    );
  }
}
