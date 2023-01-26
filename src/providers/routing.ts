import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  ExtensionContext,
  Uri,
  workspace,
} from 'vscode';
import { basename } from 'path';
import { constants } from 'fs';
import Provider from './provider';
import { parse } from 'yaml';

export default class RoutingCompletionProvider extends Provider {
  static language = 'php';

  contribRouting: CompletionItem[] = [];
  customRouting: CompletionItem[] = [];

  constructor(context: ExtensionContext) {
    super();

    this.parseApiFiles();
  }

  async parseApiFiles() {
    const workspacePath = await this.getWorkspacePath();

    if (!workspacePath) {
      return;
    }

    const contribRouting = [
      ...(await workspace.findFiles('web/core/modules/*/*.routing.yml')),
      ...(await workspace.findFiles('web/modules/contrib/*/*.routing.yml')),
    ];
    const customRouting = await workspace.findFiles('web/modules/custom/*/*.routing.yml');

    this.contribRouting = await this.parseCompletions(contribRouting);
    this.customRouting = await this.parseCompletions(customRouting);
  }

  async parseCompletions(uris: Uri[]): Promise<CompletionItem[]> {
    const result = [];

    for (const file of uris) {
      try {
        await access(file.fsPath, constants.R_OK);
        const completions = await this.getFileCompletions(file);

        if (completions.length) {
          result.push(...completions);
        }
      } catch (e) {
        console.error(e);
      }
    }

    return result;
  }

  async provideCompletionItems() {
    if (this.customRouting.length) {
      return this.contribRouting.concat(this.customRouting);
    } else {
      return this.contribRouting;
    }
  }

  async getFileCompletions(filePath: Uri): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];
    const text = await readFile(filePath.fsPath, 'utf8');
    const moduleName = basename(filePath.path, '.routing.yml');
    const yaml = parse(text);

    for (const name in yaml) {
      const completion: CompletionItem = {
        label: name,
        kind: CompletionItemKind.Keyword,
        detail: `Route ${moduleName}`,
      };

      completions.push(completion);
    }

    return completions;
  }
}
