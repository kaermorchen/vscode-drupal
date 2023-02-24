# VSCode Drupal

This extension supports only Drupal projects which use composer template [drupal/recommended-project](https://github.com/drupal/recommended-project).

## Features
- syntax highlighting
- hook completion
- twig completion
- service completion
- global variables completion
- code checking [Drupal coding standards](https://www.drupal.org/docs/develop/standards) (used [phpcs](https://github.com/squizlabs/PHP_CodeSniffer), [coder](https://www.drupal.org/project/coder))
- document formatting by standards (used [phpcbf](https://github.com/squizlabs/PHP_CodeSniffer))
- searching in Drupal API Documentation
- translation autocomplete (in php files for now)
- validation and autocomplete for YAML files

## Experimental features
- PHPStan analysis (used [PHPStan](https://phpstan.org/), [phpstan-drupal](https://github.com/mglaman/phpstan-drupal))

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

### TODO
- Drupal JavaScript snippets
- Translation autocomplete for js, yaml, twig
- Autogeneration PO files
- Drush integration
- Twig local variable completion
