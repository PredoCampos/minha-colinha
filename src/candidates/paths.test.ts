import { describe, expect, it } from "vitest";

import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../election/types.ts";
import { CANDIDATE_DATASET_KIND } from "./model.ts";
import { candidateFilePath } from "./paths.ts";

describe("caminhos dos arquivos eleitorais", () => {
  it("constrói o caminho oficial sob a base do GitHub Pages", () => {
    expect(
      candidateFilePath(
        {
          electionYear: 2026,
          office: ELECTORAL_OFFICE.SENATOR,
          jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
        },
        CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT,
        "/minha-colinha/",
      ),
    ).toBe("/minha-colinha/data/2026/SP/senator/candidates.json");
  });

  it("mantém fixtures em uma árvore explicitamente separada", () => {
    expect(
      candidateFilePath(
        {
          electionYear: 2026,
          office: ELECTORAL_OFFICE.PRESIDENT,
          jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL },
        },
        CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE,
        "/minha-colinha/",
      ),
    ).toBe(
      "/minha-colinha/data/development-fixtures/2026/BR/president/candidates.json",
    );
  });

  it("particiona dados municipais por UF, sem município no path", () => {
    const path = candidateFilePath(
      {
        electionYear: 2028,
        office: ELECTORAL_OFFICE.MAYOR,
        jurisdiction: {
          scope: TERRITORIAL_SCOPE.MUNICIPALITY,
          uf: "SP",
          municipalityCode: "3550308",
          municipalityName: "São Paulo",
        },
      },
      CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT,
      "/minha-colinha/",
    );

    expect(path).toBe("/minha-colinha/data/2028/SP/mayor/candidates.json");
    expect(path).not.toContain("3550308");
  });
});
