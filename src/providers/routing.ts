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
import { basename } from "path";
import { parse } from "yaml";
import { DrupalWorkspaceProviderWithWatcher } from "../base/drupal-workspace-provider-with-watcher";

const prefixes = [
  /Link::createFromRoute\(['"].*['"], ['"]$/,
  /Url::fromRoute\(['"]$/,
  /new Url\(['"]$/,
];

export class RoutingCompletionProvider
  extends DrupalWorkspaceProviderWithWatcher
  implements CompletionItemProvider
{
  static language = "php";

  completions: CompletionItem[] | undefined;
  completionApiFileCache: Map<string, CompletionItem[]> = new Map();

  constructor(
    arg: ConstructorParameters<typeof DrupalWorkspaceProviderWithWatcher>[0],
  ) {
    super(arg);

    this.watcher.onDidChange(this.clearCache, this, this.disposables);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: RoutingCompletionProvider.language,
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
    const moduleName = basename(uri.path, ".routing.yml");
    const yaml = parse(buffer.toString());

    for (const name in yaml) {
      completions.push({
        label: name,
        kind: CompletionItemKind.Keyword,
        detail: `Route ${moduleName}`,
      });
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
