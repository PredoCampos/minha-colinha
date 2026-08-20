import { describe, expect, it, vi } from "vitest";

import boundaryArtifact from "../../public/geography/ibge-uf-minimum.json";
import {
  loadStateBoundaries,
  stateBoundaryPath,
  validateStateBoundaryDataset,
} from "./boundaries.ts";

describe("malha estadual estática", () => {
  it("valida o artefato derivado do IBGE com todas as UFs", () => {
    expect(validateStateBoundaryDataset(boundaryArtifact)).toBe(true);
  });

  it("carrega somente o arquivo local sob a base do GitHub Pages", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => boundaryArtifact,
    }));

    const dataset = await loadStateBoundaries({
      base: "/minha-colinha/",
      fetcher,
    });

    expect(dataset.features).toHaveLength(27);
    expect(fetcher).toHaveBeenCalledWith(
      "/minha-colinha/geography/ibge-uf-minimum.json",
    );
    expect(stateBoundaryPath("/minha-colinha/")).toBe(
      "/minha-colinha/geography/ibge-uf-minimum.json",
    );
  });

  it("rejeita arquivo incompleto ou vindo de origem não oficial", () => {
    expect(
      validateStateBoundaryDataset({
        ...boundaryArtifact,
        features: boundaryArtifact.features.slice(0, 26),
      }),
    ).toBe(false);
    expect(
      validateStateBoundaryDataset({
        ...boundaryArtifact,
        source: { ...boundaryArtifact.source, url: "https://example.test/map" },
      }),
    ).toBe(false);
  });

  it("distingue indisponibilidade, JSON inválido e dados inválidos", async () => {
    await expect(
      loadStateBoundaries({
        fetcher: async () => ({
          ok: false,
          status: 404,
          json: async () => ({}),
        }),
      }),
    ).rejects.toMatchObject({ code: "FILE_UNAVAILABLE" });
    await expect(
      loadStateBoundaries({
        fetcher: async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError("inválido");
          },
        }),
      }),
    ).rejects.toMatchObject({ code: "INVALID_JSON" });
    await expect(
      loadStateBoundaries({
        fetcher: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ schemaVersion: 1 }),
        }),
      }),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });
});
