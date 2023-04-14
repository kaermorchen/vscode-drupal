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
import { TwigLexer, TwigParser } from 'twig-parser';

export default class GenerateTranslations extends TextEditorCommand {
  static id = 'drupal.generate-translations';

  twigLexer = new TwigLexer();
  twigParser = new TwigParser();

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
    console.log(uris);
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
