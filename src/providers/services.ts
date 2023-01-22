import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  ExtensionContext,
  Position,
  TextDocument,
  Uri,
  workspace,
} from 'vscode';
import { basename, join } from 'path';
import { constants } from 'fs';
import Provider from './provider';
import { parse } from 'yaml';

export default class ServicesCompletionProvider extends Provider {
  static language = 'php';

  contribServices: CompletionItem[] = [];
  customServices: CompletionItem[] = [];

  constructor(context: ExtensionContext) {
    super(context);

    this.parseApiFiles();
  }

  async parseApiFiles() {
    const workspacePath = await this.getWorkspacePath();

    if (!workspacePath) {
      return;
    }

    const contribServices = [
      Uri.file(join(workspacePath, 'web/core/core.services.yml')),
      ...(await workspace.findFiles('web/core/modules/*/*.services.yml')),
      ...(await workspace.findFiles('web/modules/contrib/*/*.services.yml')),
    ];

    for (const file of contribServices) {
      try {
        await access(file.fsPath, constants.R_OK);
        const completions = await this.getFileCompletions(file);

        if (completions.length) {
          this.contribServices.push(...completions);
        }
      } catch (e) {
        console.error(e);
      }
    }

    const customServices = [
      ...(await workspace.findFiles('web/modules/custom/*/*.services.yml')),
    ];

    for (const file of customServices) {
      try {
        await access(file.fsPath, constants.R_OK);
        const completions = await this.getFileCompletions(file);

        if (completions.length) {
          this.customServices.push(...completions);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    if (
      typeof document === 'undefined' ||
      document.languageId !== ServicesCompletionProvider.language
    ) {
      return [];
    }

    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character - 1);

    if (!linePrefix.endsWith('::service(') && !linePrefix.endsWith('$container->get(')) {
      return [];
    }

    if (this.customServices.length) {
      return this.contribServices.concat(this.customServices);
    } else {
      return this.contribServices;
    }
  }

  async getFileCompletions(filePath: Uri): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];
    const text = await readFile(filePath.fsPath, 'utf8');
    const moduleName = basename(filePath.path, '.services.yml');
    const yaml = parse(text);

    if ('services' in yaml) {
      for (const name in yaml.services) {
        const completion: CompletionItem = {
          label: `${moduleName}.${name}`,
          kind: CompletionItemKind.Class,
          detail: `Services`,
        };

        completions.push(completion);
      }
    }

    return completions;
  }
}
