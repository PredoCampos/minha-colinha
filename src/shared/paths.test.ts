import { describe, expect, it } from "vitest";

import { publicPath } from "./paths.ts";

describe("publicPath", () => {
  it("mantém arquivos sob a base do GitHub Pages", () => {
    expect(publicPath("data/2026/election.json", "/minha-colinha/")).toBe(
      "/minha-colinha/data/2026/election.json",
    );
  });

  it("normaliza barras na base e no caminho", () => {
    expect(publicPath("/images/photo.webp", "minha-colinha")).toBe(
      "/minha-colinha/images/photo.webp",
    );
  });

  it("suporta publicação na raiz", () => {
    expect(publicPath("data/election.json", "/")).toBe(
      "/data/election.json",
    );
  });
});
