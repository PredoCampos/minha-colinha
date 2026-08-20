import { describe, expect, it, vi } from "vitest";

import senatorFixture from "../../public/data/development-fixtures/2026/SP/senator/candidates.json";
import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../election/types.ts";
import { loadCandidateFile } from "./load.ts";
import { CANDIDATE_DATASET_KIND } from "./model.ts";

const REQUEST = {
  electionYear: 2026,
  office: ELECTORAL_OFFICE.SENATOR,
  jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
} as const;

describe("carregamento local de candidatos", () => {
  it("carrega e valida um arquivo estático", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => senatorFixture,
    }));

    const file = await loadCandidateFile(REQUEST, {
      datasetKind: CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE,
      base: "/minha-colinha/",
      fetcher,
    });

    expect(file.candidates).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledWith(
      "/minha-colinha/data/development-fixtures/2026/SP/senator/candidates.json",
    );
  });

  it("distingue arquivo ausente", async () => {
    const promise = loadCandidateFile(REQUEST, {
      base: "/minha-colinha/",
      fetcher: async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
      }),
    });

    await expect(promise).rejects.toMatchObject({
      code: "FILE_UNAVAILABLE",
      path: "/minha-colinha/data/2026/SP/senator/candidates.json",
    });
  });

  it("distingue arquivo estruturalmente inválido", async () => {
    const promise = loadCandidateFile(REQUEST, {
      base: "/minha-colinha/",
      fetcher: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [] }),
      }),
    });

    await expect(promise).rejects.toMatchObject({
      code: "INVALID_DATA",
      path: "/minha-colinha/data/2026/SP/senator/candidates.json",
    });
  });

  it("distingue JSON ilegível", async () => {
    const promise = loadCandidateFile(REQUEST, {
      base: "/minha-colinha/",
      fetcher: async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("JSON inválido");
        },
      }),
    });

    await expect(promise).rejects.toMatchObject({
      code: "INVALID_JSON",
    });
  });
});
