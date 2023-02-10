# VSCode Drupal

> **Note**
> Work is still in progress.

This extension supports only Drupal projects which use composer template [drupal/recommended-project](https://github.com/drupal/recommended-project).

## Features
- syntax highlighting
- hook completion
- twig completion
- service completion
- global variables completion
- code checker [Drupal coding standards](https://www.drupal.org/docs/develop/standards)
- fixing coding standard violations
- searching in Drupal API Documentation
- translation autocomplete (in php files)

## Install
The code checker and the formatter use some php packages. Install them locally as dev dependencies, or configure the paths in extension settings if they are global.

```bash
composer require --dev drupal/coder squizlabs/php_codesniffer mglaman/phpstan-drupal phpstan/extension-installer phpstan/phpstan phpstan/phpstan-deprecation-rules
```

### TODO
- Drupal JavaScript snippets
- Translation autocomplete for js, yaml, twig
- Autogeneration PO files
- Drush integration
- Сompletion in yaml
- Twig local variable completion
