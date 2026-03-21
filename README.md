# VSCode Drupal

This extension supports only Drupal projects that use the Composer template [drupal/recommended-project](https://github.com/drupal/recommended-project).

## Features

- syntax highlighting
- hook completion
- twig completion
- service completion
- global variables completion
- code checking [Drupal coding standards](https://www.drupal.org/docs/develop/standards) ([phpcs](https://github.com/PHPCSStandards/PHP_CodeSniffer), [coder](https://www.drupal.org/project/coder))
- document formatting according to standards ([phpcbf](https://github.com/PHPCSStandards/PHP_CodeSniffer))
- searching in Drupal API Documentation
- translation autocomplete (php, twig, js)
- validation and autocomplete for YAML files
- PHPStan analysis ([PHPStan](https://phpstan.org/), [phpstan-drupal](https://github.com/mglaman/phpstan-drupal)) (disabled by default)

## Install

Code checking and formatting require the following packages:

```bash
composer require --dev squizlabs/php_codesniffer drupal/coder
```

PHPStan analysis requires the following packages:

```bash
composer require --dev phpstan/phpstan phpstan/extension-installer phpstan/phpstan-deprecation-rules mglaman/phpstan-drupal
```

Package paths can be specified in the extension settings.

For YAML files, the [YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) extension must be installed.

## Settings

Extension settings can be configured in VS Code settings (`settings.json`). The following `drupal.*` settings are available:

### PHP CodeSniffer (phpcs)

- `drupal.phpcs.enabled` (boolean, default: `true`) – Enables [phpcs](https://github.com/PHPCSStandards/PHP_CodeSniffer) checker.
- `drupal.phpcs.executablePath` (string) – Path to phpcs. Will use `vendor/bin/phpcs` if empty.
- `drupal.phpcs.args` (array, default: `["--standard=Drupal,DrupalPractice"]`) – Argument list of phpcs.

You can also place a `phpcs.xml` file in the project root, and phpcs will automatically read it (no need to specify `--standard` in args).

### PHP Code Beautifier and Fixer (phpcbf)

- `drupal.phpcbf.enabled` (boolean, default: `true`) – Enables [phpcbf](https://github.com/PHPCSStandards/PHP_CodeSniffer) code formatter.
- `drupal.phpcbf.executablePath` (string) – Path to phpcbf. Will use `vendor/bin/phpcbf` if empty.
- `drupal.phpcbf.args` (array, default: `["--standard=Drupal,DrupalPractice"]`) – Argument list of phpcbf.

### PHPStan

- `drupal.phpstan.enabled` (boolean, default: `false`) – Enables [phpstan](https://phpstan.org/) analyse.
- `drupal.phpstan.executablePath` (string) – Path to phpstan. Will use `vendor/bin/phpstan` if empty.
- `drupal.phpstan.args` (array, default: `[]`) – Argument list of phpstan.
  You can also place a `phpstan.neon` or `phpstan.neon.dist` file in the project root for configuration.

Example:

```json
"drupal.phpstan.args": [
  "--level=4"
],
```

## Demo

### Hook completion

![hook](https://user-images.githubusercontent.com/11972062/221161428-f869742f-1060-40a3-8ab7-483e8cf65a89.gif)

### Code checking and formatting

![phpcs](https://user-images.githubusercontent.com/11972062/221161739-cabcd4b5-800d-4d5b-8071-9324bf2bcc08.gif)

### Translation autocomplete

The extension parses \*.po files inside a module directory and autocompletes strings

#### PHP

![t](https://user-images.githubusercontent.com/11972062/232210075-e013c835-bd59-425f-bcce-1e2282f98c6d.gif)
![markup](https://user-images.githubusercontent.com/11972062/232210084-2e57b11e-dbda-4e7f-85c3-c994465ce4d9.gif)

#### Twig

![twig](https://user-images.githubusercontent.com/11972062/232210091-b00d0055-a7ff-4b5a-8b5d-774f31900105.gif)

#### JavaScript

![js](https://user-images.githubusercontent.com/11972062/232210100-9a2b3d63-5d9d-4fb7-ac58-9b1980002eaa.gif)

### Drupal Search API

![search](https://user-images.githubusercontent.com/11972062/221161916-4b470ae6-49ce-4093-a3b4-8299de2f342a.gif)
