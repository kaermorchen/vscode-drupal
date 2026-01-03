import {
  ConstExprParser,
  Lexer,
  PhpDocParser,
  PhpDocTextNode,
  TokenIterator,
  TypeParser,
} from '@rightcapital/phpdoc-parser';

// basic setup

const lexer = new Lexer();
const constExprParser = new ConstExprParser();
const typeParser = new TypeParser(constExprParser);
const phpDocParser = new PhpDocParser(typeParser, constExprParser);

export function parsePHPDoc(doc: string) {
  const tokens = new TokenIterator(lexer.tokenize(doc));

  return phpDocParser.parse(tokens);
}

export function parsePHPDocSummary(doc: string): string | undefined {
  const ast = parsePHPDoc(doc);

  // TODO: support multiline summary
  return ast.children[0] instanceof PhpDocTextNode
    ? ast.children[0].toString().trim()
    : undefined;
}
