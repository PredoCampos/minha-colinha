import { describe, expect, it } from "vitest";

import presidentFixture from "../../public/data/development-fixtures/2026/BR/president/candidates.json";
import districtDeputyFixture from "../../public/data/development-fixtures/2026/DF/district-deputy/candidates.json";
import districtFederalDeputyFixture from "../../public/data/development-fixtures/2026/DF/federal-deputy/candidates.json";
import districtGovernorFixture from "../../public/data/development-fixtures/2026/DF/governor/candidates.json";
import districtSenatorFixture from "../../public/data/development-fixtures/2026/DF/senator/candidates.json";
import federalDeputyFixture from "../../public/data/development-fixtures/2026/SP/federal-deputy/candidates.json";
import governorFixture from "../../public/data/development-fixtures/2026/SP/governor/candidates.json";
import senatorFixture from "../../public/data/development-fixtures/2026/SP/senator/candidates.json";
import stateDeputyFixture from "../../public/data/development-fixtures/2026/SP/state-deputy/candidates.json";
import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../election/types.ts";
import { CANDIDATE_STATUS, type Candidate } from "./model.ts";
import { validateCandidate, validateCandidateFile } from "./validation.ts";

const VALID_CANDIDATE = {
  id: "fixture-valid-candidate",
  electionYear: 2026,
  office: ELECTORAL_OFFICE.SENATOR,
  number: "100",
  ballotName: "PESSOA FICTÍCIA",
  party: "EXM",
  photoPath: "data/development-fixtures/photos/fictitious-candidate.svg",
  status: CANDIDATE_STATUS.DISPLAYABLE,
  jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
} as const satisfies Candidate;

describe("validação do candidato normalizado", () => {
  it("aceita um candidato válido", () => {
    expect(validateCandidate(VALID_CANDIDATE)).toEqual({
      ok: true,
      value: VALID_CANDIDATE,
    });
  });

  it("rejeita estruturas incompletas", () => {
    const result = validateCandidate({
      id: "fixture-incomplete",
      electionYear: 2026,
      office: "SENATOR",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("A estrutura incompleta deveria ser rejeitada.");
    }
    expect(result.issues.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "candidate.number",
        "candidate.ballotName",
        "candidate.party",
        "candidate.photoPath",
        "candidate.status",
        "candidate.jurisdiction",
      ]),
    );
  });

  it("rejeita campos externos e referências remotas de foto", () => {
    const result = validateCandidate({
      ...VALID_CANDIDATE,
      photoPath: "https://example.test/photo.jpg",
      NM_URNA_CANDIDATO: "COLUNA BRUTA",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("O modelo com campos externos deveria ser rejeitado.");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          path: "candidate.NM_URNA_CANDIDATO",
          message: "Campo não reconhecido pelo modelo interno.",
        },
        {
          path: "candidate.photoPath",
          message: "A foto deve usar um caminho estático local ou null.",
        },
      ]),
    );
  });

  it("valida todos os arquivos de fixture publicados", () => {
    const fixtures: readonly unknown[] = [
      presidentFixture,
      districtDeputyFixture,
      districtFederalDeputyFixture,
      districtGovernorFixture,
      districtSenatorFixture,
      federalDeputyFixture,
      governorFixture,
      senatorFixture,
      stateDeputyFixture,
    ];

    for (const fixture of fixtures) {
      expect(validateCandidateFile(fixture)).toMatchObject({ ok: true });
    }
  });
});
