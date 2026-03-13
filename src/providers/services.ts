import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  languages,
  Position,
  TextDocument,
  Uri,
  workspace,
} from "vscode";
import { parse } from "yaml";
import { DrupalWorkspaceProviderWithWatcher } from "../base/drupal-workspace-provider-with-watcher";
import { DrupalWorkspaceProviderParam } from "../base/drupal-workspace-provider";

const prefixes = [
  /Drupal::service\(['"]/,
  /\$container->get\(['"]/,
  /\$container->getDefinition\(['"]/,
];

const serviceRE = /^[a-z0-9_.]+$/;

export class ServicesCompletionProvider
  extends DrupalWorkspaceProviderWithWatcher
  implements CompletionItemProvider
{
  static language = "php";

  completions: CompletionItem[] | undefined;
  completionApiFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(arg: DrupalWorkspaceProviderParam) {
    super({
      drupalWorkspace: arg.drupalWorkspace,
      include:
        "web/{core,core/modules/*,modules/contrib/*,modules/custom/*}/*.services.yml",
    });

    this.watcher.onDidChange(this.clearCache, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: ServicesCompletionProvider.language,
          scheme: "file",
          pattern: this.drupalWorkspace.getRelativePattern("**"),
        },
        this,
        '"',
        "'",
      ),
    );
  }

  async clearCache(uri: Uri) {
    this.completionApiFileCache.delete(uri.fsPath);
    this.completions = undefined;

    await this.parseFile(uri);
  }

  async parseFiles() {
    const uris = await this.drupalWorkspace.findFiles(this.pattern);

    for (const uri of uris) {
      await this.parseFile(uri);
    }
  }

  async parseFile(uri: Uri) {
    const completions: CompletionItem[] = [];
    const buffer = await workspace.fs.readFile(uri);
    const yaml = parse(buffer.toString());

    if ("services" in yaml) {
      for (const name in yaml.services) {
        if (name !== "_defaults" && serviceRE.test(name)) {
          completions.push({
            label: `${name}`,
            kind: CompletionItemKind.Class,
          });
        }
      }
    }

    this.completionApiFileCache.set(uri.fsPath, completions);
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    const line = document
      .lineAt(position)
      .text.substring(0, position.character);

    if (!prefixes.some((prefix) => prefix.test(line))) {
      return [];
    }

    if (this.completionApiFileCache.size === 0) {
      await this.parseFiles();
    }

    if (this.completions === undefined) {
      this.completions = [];

      for (const item of this.completionApiFileCache.values()) {
        this.completions.push(...item);
      }
    }

    return this.completions;
  }
}
