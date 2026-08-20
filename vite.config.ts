import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
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
  ],
}));
