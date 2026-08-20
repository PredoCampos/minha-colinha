import { rm } from "node:fs/promises";
import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  let outputDirectory = "";

  return {
    base: "/minha-colinha/",
    build: {
      target: "es2022",
    },
    plugins: [
      {
        name: "development-csp",
        transformIndexHtml(html) {
          return command === "serve"
            ? html.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
            : html;
        },
      },
      {
        name: "exclude-development-fixtures-from-production",
        apply: "build",
        configResolved(config) {
          outputDirectory = resolve(config.root, config.build.outDir);
        },
        async closeBundle() {
          await rm(resolve(outputDirectory, "data", "development-fixtures"), {
            recursive: true,
            force: true,
          });
        },
      },
    ],
  };
});
