# Сборка VSCode расширения с помощью esbuild

Данное руководство описывает процесс настройки сборки VSCode расширения с использованием [esbuild](https://esbuild.github.io/) вместо TypeScript компилятора (tsc). Esbuild обеспечивает более быструю сборку и может создавать оптимизированные бандлы.

## Преимущества esbuild

- **Скорость**: Сборка в десятки раз быстрее tsc.
- **Минификация**: Встроенная минификация кода.
- **Tree shaking**: Удаление неиспользуемого кода.
- **Source maps**: Генерация source maps для отладки.

## Требования

- Node.js 16 или выше.
- Существующий проект VSCode расширения на TypeScript.

## Шаги настройки

### 1. Установка esbuild

Добавьте esbuild как dev-зависимость:

```bash
npm install --save-dev esbuild
```

### 2. Создание конфигурационного файла

Создайте файл `esbuild.config.js` в корне проекта:

```javascript
const esbuild = require("esbuild");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

/** @type {import('esbuild').BuildOptions} */
const baseConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  external: ["vscode"], // VSCode API предоставляется средой выполнения
  platform: "node",
  target: "node16",
  outfile: "out/extension.js",
  sourcemap: !isProduction,
  minify: isProduction,
  treeShaking: true,
  define: {
    "process.env.NODE_ENV": isProduction ? '"production"' : '"development"',
  },
};

// Конфигурация для разработки (с наблюдением)
if (process.argv.includes("--watch")) {
  esbuild
    .context({
      ...baseConfig,
      sourcemap: true,
      minify: false,
    })
    .then((ctx) => ctx.watch())
    .catch(() => process.exit(1));
} else {
  // Однократная сборка
  esbuild.build(baseConfig).catch(() => process.exit(1));
}
```

### 3. Обновление package.json

Измените скрипты в `package.json`:

```json
"scripts": {
  "vscode:prepublish": "npm run compile",
  "compile": "node esbuild.config.js",
  "watch": "node esbuild.config.js --watch",
  "compile:prod": "NODE_ENV=production node esbuild.config.js",
  "test": "rm -rf out && npm run compile && vscode-test",
  "typecheck": "tsc -p ./ --noEmit"
}
```

### 4. Настройка TypeScript для проверки типов

Esbuild не проверяет типы, поэтому оставьте `tsconfig.json` для проверки типов и поддержки IDE. Убедитесь, что `outDir` в tsconfig.json соответствует выходному каталогу esbuild (например, `"outDir": "out"`), чтобы избежать конфликтов.

Рекомендуется запускать проверку типов отдельно:

```bash
npm run typecheck
```

Или интегрировать её в процесс сборки, добавив предварительный шаг.

### 5. Обработка дополнительных ресурсов

Если ваше расширение включает статические файлы (иконки, шрифты, шаблоны), скопируйте их в выходную директорию. Добавьте скрипт копирования или используйте плагин esbuild.

Пример скрипта копирования (добавьте в `package.json`):

```json
"scripts": {
  "copy:assets": "cp -r assets/ out/ && cp -r languages/ out/",
  "compile": "node esbuild.config.js && npm run copy:assets"
}
```

### 6. Исключение файлов из пакета

Убедитесь, что файлы, не нужные в финальном пакете, перечислены в `.vscodeignore`. Обычно туда включают исходные TypeScript файлы, конфигурации сборки и т.д.

Пример `.vscodeignore`:

```
src/
esbuild.config.js
tsconfig.json
node_modules/
*.ts
```

### 7. Сборка для публикации

Для публикации расширения выполните:

```bash
npm run compile:prod
```

Затем упакуйте расширение с помощью `vsce`:

```bash
npx vsce package
```

## Пример для данного проекта (vscode-drupal)

В этом проекте уже используется TypeScript компилятор. Чтобы перейти на esbuild, выполните следующие действия:

1. Установите esbuild:

```bash
npm install --save-dev esbuild
```

2. Создайте `esbuild.config.js` как описано выше.

3. Обновите `package.json`, заменив скрипты `compile` и `watch`.

4. Убедитесь, что все зависимости правильно указаны как external или bundled. Проверьте, что `external` включает `vscode` и, возможно, другие модули, которые не должны попадать в бандл (например, `@rightcapital/phpdoc-parser` можно оставить внешним, если он устанавливается отдельно). Однако для простоты можно собрать все зависимости в один бандл, исключив только `vscode`.

5. Протестируйте сборку:

```bash
npm run compile
```

Запустите расширение в режиме отладки (F5) и убедитесь, что оно работает корректно.

## Отладка

- Если возникают ошибки модулей, проверьте правильность поля `external`.
- Используйте source maps для отладки в VSCode.
- Для анализа размера бандла можно использовать [esbuild-visualizer](https://github.com/btd/esbuild-visualizer).

## Заключение

Переход на esbuild ускоряет процесс разработки и уменьшает размер итогового расширения. Данная инструкция покрывает базовые шаги, которые можно адаптировать под конкретный проект.

Для более сложных сценариев обратитесь к [официальной документации esbuild](https://esbuild.github.io/).
