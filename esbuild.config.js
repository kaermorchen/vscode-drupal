const esbuild = require("esbuild");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";

/** @type {import('esbuild').BuildOptions} */
const baseConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  external: ["vscode"], // VSCode API предоставляется средой выполнения
  platform: "node",
  target: "node22",
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
