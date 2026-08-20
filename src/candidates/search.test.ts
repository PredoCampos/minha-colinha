import { describe, expect, it } from "vitest";

import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../election/types.ts";
import { CANDIDATE_STATUS, type Candidate } from "./model.ts";
import { searchCandidates } from "./search.ts";

const candidates: readonly Candidate[] = [
  {
    id: "fixture-20",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.PRESIDENT,
    number: "20",
    ballotName: "Árvore Exemplo",
    party: "EXM",
    photoPath: null,
    status: CANDIDATE_STATUS.DISPLAYABLE,
    jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL },
  },
  {
    id: "fixture-10",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.PRESIDENT,
    number: "10",
    ballotName: "Pessoa Fictícia",
    party: "TST",
    photoPath: null,
    status: CANDIDATE_STATUS.DISPLAYABLE,
    jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL },
  },
  {
    id: "fixture-pending",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.PRESIDENT,
    number: "30",
    ballotName: "Registro Pendente",
    party: "DEV",
    photoPath: null,
    status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
    jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL },
  },
];

describe("busca local de candidatos", () => {
  it("busca nome sem diferenciar caixa ou acentos", () => {
    expect(searchCandidates(candidates, "ARVORE").map(({ id }) => id)).toEqual([
      "fixture-20",
    ]);
  });

  it("busca pelo número", () => {
    expect(searchCandidates(candidates, "10").map(({ id }) => id)).toEqual([
      "fixture-10",
    ]);
  });

  it("mantém ordenação numérica determinística sem termo", () => {
    expect(searchCandidates(candidates, "").map(({ number }) => number)).toEqual([
      "10",
      "20",
    ]);
  });

  it("não apresenta candidaturas que não são exibíveis", () => {
    expect(searchCandidates(candidates, "pendente")).toEqual([]);
  });

  it("retorna lista vazia quando não há correspondência", () => {
    expect(searchCandidates(candidates, "inexistente")).toEqual([]);
  });
});
