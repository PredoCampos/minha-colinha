import { describe, expect, it, vi } from "vitest";

import {
  candidateMetadataPath,
  loadCandidateMetadata,
  validateCandidateSnapshotMetadata,
} from "./metadata.ts";

const METADATA = {
  schemaVersion: 1,
  year: 2026,
  provider: "Tribunal Superior Eleitoral",
  dataset: "Candidatos - 2026",
  sourceUrl: "https://dadosabertos.tse.jus.br/dataset/candidatos-2026",
  sourceGeneratedAt: "2026-08-19T22:31:08.000Z",
  importedAt: "2026-08-20T15:51:38.722Z",
  pipelineVersion: "tse-pipeline-v1",
} as const;

describe("metadados do snapshot oficial", () => {
  it("constrói o caminho respeitando a base do GitHub Pages", () => {
    expect(candidateMetadataPath(2026, "/minha-colinha/")).toBe(
      "/minha-colinha/data/2026/metadata.json",
    );
  });

  it("carrega e valida os metadados necessários para a aplicação", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ...METADATA, resources: [], counts: {} }),
    }));

    await expect(
      loadCandidateMetadata(2026, { base: "/minha-colinha/", fetcher }),
    ).resolves.toMatchObject(METADATA);
    expect(fetcher).toHaveBeenCalledWith(
      "/minha-colinha/data/2026/metadata.json",
    );
  });

  it("rejeita ano, datas e origem incompatíveis", () => {
    expect(validateCandidateSnapshotMetadata(METADATA, 2026)).toBe(true);
    expect(
      validateCandidateSnapshotMetadata({ ...METADATA, year: 2028 }, 2026),
    ).toBe(false);
    expect(
      validateCandidateSnapshotMetadata(
        { ...METADATA, sourceGeneratedAt: "data inválida" },
        2026,
      ),
    ).toBe(false);
    expect(
      validateCandidateSnapshotMetadata(
        { ...METADATA, sourceUrl: "https://example.test/candidatos-2026" },
        2026,
      ),
    ).toBe(false);
  });

  it("distingue metadados ausentes e estruturalmente inválidos", async () => {
    await expect(
      loadCandidateMetadata(2026, {
        fetcher: async () => ({
          ok: false,
          status: 404,
          json: async () => ({}),
        }),
      }),
    ).rejects.toMatchObject({ code: "FILE_UNAVAILABLE" });

    await expect(
      loadCandidateMetadata(2026, {
        fetcher: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ schemaVersion: 1, year: 2026 }),
        }),
      }),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });

    await expect(
      loadCandidateMetadata(2026, {
        fetcher: async () => ({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError("JSON inválido");
          },
        }),
      }),
    ).rejects.toMatchObject({ code: "INVALID_JSON" });
  });
});
