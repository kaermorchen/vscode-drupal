# VSCode Drupal

This extension supports only Drupal projects which use composer template [drupal/recommended-project](https://github.com/drupal/recommended-project).

## Features
- syntax highlighting
- hook completion
- twig completion
- service completion
- global variables completion
- code checking [Drupal coding standards](https://www.drupal.org/docs/develop/standards) ([phpcs](https://github.com/squizlabs/PHP_CodeSniffer), [coder](https://www.drupal.org/project/coder))
- document formatting by standards ([phpcbf](https://github.com/squizlabs/PHP_CodeSniffer))
- searching in Drupal API Documentation
- translation autocomplete (php, twig, js)
- validation and autocomplete for YAML files

## Experimental features
- PHPStan analysis ([PHPStan](https://phpstan.org/), [phpstan-drupal](https://github.com/mglaman/phpstan-drupal))

The experimental features turned off by default. But you can turn them on in the extension settings.

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

## Demo

### Hook completion
![hook](https://user-images.githubusercontent.com/11972062/221161428-f869742f-1060-40a3-8ab7-483e8cf65a89.gif)

### Code checking and formatting
![phpcs](https://user-images.githubusercontent.com/11972062/221161739-cabcd4b5-800d-4d5b-8071-9324bf2bcc08.gif)

### Translation autocomplete
The extension parse *.po files inside a module direcory and autocomplete strings
#### PHP
![t](https://user-images.githubusercontent.com/11972062/232210075-e013c835-bd59-425f-bcce-1e2282f98c6d.gif)
![markup](https://user-images.githubusercontent.com/11972062/232210084-2e57b11e-dbda-4e7f-85c3-c994465ce4d9.gif)
#### Twig
![twig](https://user-images.githubusercontent.com/11972062/232210091-b00d0055-a7ff-4b5a-8b5d-774f31900105.gif)
#### JavaScript
![js](https://user-images.githubusercontent.com/11972062/232210100-9a2b3d63-5d9d-4fb7-ac58-9b1980002eaa.gif)

### Drupal Search API
![search](https://user-images.githubusercontent.com/11972062/221161916-4b470ae6-49ce-4093-a3b4-8299de2f342a.gif)

### TODO
- Autogeneration PO files
- Twig local variable completion
