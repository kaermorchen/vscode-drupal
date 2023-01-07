import { readFile, access } from 'fs/promises';
import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  InitializeResult,
  InsertTextFormat,
  TextDocumentPositionParams,
  TextDocuments,
  MarkupKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { join } from 'path';
import { constants } from 'fs';
import {
  Class as ASTClass,
  Identifier,
  Method,
  Namespace,
  Node,
} from 'php-parser';
import phpParser from '../utils/php-parser';
import docParser from '../utils/doc-parser';

const astFileCache = new Map<string, ASTClass>();

function getName(val: string | Identifier) {
  return typeof val === 'string' ? val : val.name;
}

const twigFunctions = [
  {
    label: 'render_var',
    insertText: 'render_var(${1:any})',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::renderVar`,
  },
  {
    label: 'file_url',
    insertText: 'file_url(${1:path})',
    callback: `\\Drupal\\Core\\Template\\TwigExtension::getFileUrl`,
  },
];

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
    const completions = [];

    if (!workspacePath) {
      return;
    }

    for (const item of twigFunctions) {
      const [namespace, fnName] = item.callback.split('::');
      const parts = namespace.split('\\');
      const file = `${join(workspacePath, 'web', 'core', 'lib', ...parts)}.php`;

      try {
        await access(file, constants.R_OK);

        const completion: CompletionItem = {
          label: item.label,
          kind: CompletionItemKind.Function,
          detail: `Drupal twig function ${item.label}`,
          insertText: item.insertText,
          insertTextFormat: InsertTextFormat.Snippet,
        };

        const docblock = await this.getDocblock(file, fnName);

        if (docblock) {
          completion.documentation = docblock;
        }

        this.apiCompletion.push(completion);
      } catch {}
    }
  }

  async onCompletion(
    textDocumentPosition: TextDocumentPositionParams
  ): Promise<CompletionItem[]> {
    const uri = textDocumentPosition.textDocument.uri.toString();
    const document = this.documents.get(uri);

    if (typeof document === 'undefined' || document.languageId !== 'twig') {
      return [];
    }

    return this.apiCompletion;
  }

  async getDocblock(
    filePath: string,
    fnName: string
  ): Promise<string | undefined> {
    let astClass = astFileCache.get(filePath);

    if (!astClass) {
      const text = await readFile(filePath, 'utf8');
      const tree = phpParser.parseCode(text, filePath);

      astClass = (tree.children[0] as Namespace).children.pop() as ASTClass;
      astFileCache.set(filePath, astClass);
    }

    for (const item of astClass.body) {
      switch (item.kind) {
        case 'method': {
          const func: Method = item as Method;
          const name = getName(func.name);

          if (name !== fnName) {
            break;
          }

          const lastComment = item.leadingComments?.pop();

          if (lastComment) {
            const ast = docParser.parse(lastComment.value);

            return ast.summary;
          }

          return;
        }
      }
    }
  }

  // async getFileCompletions(filePath: string) {
  //   const completions: CompletionItem[] = [];

  //   const text = await readFile(filePath, 'utf8');
  //   const tree = phpParser.parseCode(text, filePath);
  //   const astClass = (tree.children[0] as Namespace).children.pop() as ASTClass;

  //   astClass.body.forEach((item: Node) => {
  //     switch (item.kind) {
  //       case 'method': {
  //         const func: Method = item as Method;
  //         const name = getName(func.name);
  //         const twigName = twigFunctions.get(name);

  //         if (!twigName) {
  //           break;
  //         }

  //         const completion: CompletionItem = {
  //           label: twigName,
  //           kind: CompletionItemKind.Function,
  //           detail: `Drupal twig function ${twigName}`,
  //           insertText: twigName,
  //           insertTextFormat: InsertTextFormat.Snippet,
  //         };

  //         const value = ['```twig', `{{ ${twigName} }}`, '```'];
  //         const lastComment = item.leadingComments?.pop();

  //         if (lastComment) {
  //           const ast = docParser.parse(lastComment.value);
  //           value.push(ast.summary);
  //         }

  //         completion.documentation = {
  //           kind: MarkupKind.Markdown,
  //           value: value.join('\n'),
  //         };

  //         completions.push(completion);
  //         break;
  //       }
  //     }
  //   });

  //   return completions;
  // }
}
