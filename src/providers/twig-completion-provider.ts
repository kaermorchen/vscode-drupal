import { readFile, access, readdir } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  InitializeResult,
  InsertTextFormat,
  TextDocumentPositionParams,
  TextDocuments,
  MarkupContent,
  MarkupKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import getModuleMachineName from '../utils/get-module-machine-name';
import { URI } from 'vscode-uri';
import { join } from 'path';
import { constants } from 'fs';
import findFiles from '../utils/find-files';
import {
  Class as ASTClass,
  Function as ASTFunction,
  Identifier,
  Method,
  Namespace,
  Node,
} from 'php-parser';
import { phpParser } from '../utils/php-parser';
import DocParser from 'doc-parser';

function getName(val: string | Identifier) {
  return typeof val === 'string' ? val : val.name;
}

const docParser = new DocParser();

export default class TwigCompletionProvider {
  name = 'twig';
  connection: Connection;
  documents: TextDocuments<TextDocument>;
  apiCompletion: CompletionItem[] = [];

  constructor(connection: Connection) {
    this.connection = connection;
    this.connection.onInitialize(this.onInitialize.bind(this));
    this.connection.onInitialized(this.onInitialized.bind(this));
    this.connection.onCompletion(this.onCompletion.bind(this));

    this.documents = new TextDocuments(TextDocument);
    this.documents.listen(this.connection);
  }

  onInitialize(): InitializeResult {
    return {
      capabilities: {
        completionProvider: {
          resolveProvider: false,
        },
        workspace: {
          workspaceFolders: {
            supported: true,
          },
        },
      },
    };
  }

  onInitialized() {
    this.parseFiles();
  }

  async getWorkspacePath(): Promise<string | null> {
    const workspaceFolders =
      await this.connection.workspace.getWorkspaceFolders();

    if (workspaceFolders === null) {
      return null;
    }

    // TODO: which workspaces is current?
    return URI.parse(workspaceFolders[0].uri).path;
  }

  async parseFiles() {
    const workspacePath = await this.getWorkspacePath();

    if (!workspacePath) {
      return;
    }

    const file = join(
      workspacePath,
      'web',
      'core',
      'lib',
      'Drupal',
      'Core',
      'Template',
      'TwigExtension.php'
    );

    try {
      await access(file, constants.R_OK);

      const completions = await this.getFileCompletions(file);

      if (completions.length) {
        this.apiCompletion.push(...completions);
      }
    } catch {}
  }

  async onCompletion(
    textDocumentPosition: TextDocumentPositionParams
  ): Promise<CompletionItem[]> {
    return this.apiCompletion;
  }

  async getFileCompletions(filePath: string) {
    const completions: CompletionItem[] = [];
    const twigFunctions = new Map([
      ['renderVar', 'render_var'],
      ['getUrl', 'url'],
      ['getPath', 'path'],
      ['getLink', 'link'],
      ['getFileUrl', 'file_url'],
      ['attachLibrary', 'attach_library'],
      ['getActiveThemePath', 'active_theme_path'],
      ['getActiveTheme', 'active_theme'],
      ['createAttribute', 'create_attribute'],
    ]);
    const text = await readFile(filePath, 'utf8');
    const tree = phpParser.parseCode(text, filePath);
    const astClass = (tree.children[0] as Namespace).children.pop() as ASTClass;

    console.log(astClass);
    astClass.body.forEach((item: Node) => {
      switch (item.kind) {
        case 'method': {
          const func: Method = item as Method;
          const name = getName(func.name);
          const twigName = twigFunctions.get(name);

          if (!twigName) {
            break;
          }

          const completion: CompletionItem = {
            label: twigName,
            kind: CompletionItemKind.Function,
            detail: `Drupal twig function ${twigName}`,
            insertText: twigName,
            insertTextFormat: InsertTextFormat.Snippet,
          };

          const value = ['```twig', `{{ ${twigName} }}`, '```'];
          const lastComment = item.leadingComments?.pop();

          if (lastComment) {
            value.push(lastComment.value);
          }

          completion.documentation = {
            kind: MarkupKind.Markdown,
            value: value.join('\n'),
          };

          completions.push(completion);
          break;
        }
      }
    });

    return completions;
  }
}
