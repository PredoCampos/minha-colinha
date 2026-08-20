import { describe, expect, it } from "vitest";

import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../election/types.ts";
import { CANDIDATE_STATUS, type Candidate } from "./model.ts";
import {
  MAX_VISIBLE_CANDIDATE_RESULTS,
  searchCandidates,
  visibleCandidateSearchResults,
} from "./search.ts";

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
    id: "fixture-carlos",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.PRESIDENT,
    number: "100",
    ballotName: "Carlos Mendes",
    party: "TST",
    photoPath: null,
    status: CANDIDATE_STATUS.DISPLAYABLE,
    jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL },
  },
  {
    id: "fixture-luiza",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.PRESIDENT,
    number: "101",
    ballotName: "Luíza Carvalho",
    party: "TST",
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
  {
    id: "fixture-not-displayable",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.PRESIDENT,
    number: "40",
    ballotName: "Registro não exibível",
    party: "DEV",
    photoPath: null,
    status: CANDIDATE_STATUS.NOT_DISPLAYABLE,
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
      "fixture-carlos",
      "fixture-luiza",
    ]);
  });

  it("busca apenas no início de palavras do nome", () => {
    expect(searchCandidates(candidates, "l").map(({ id }) => id)).toEqual([
      "fixture-luiza",
    ]);
    expect(searchCandidates(candidates, "los")).toEqual([]);
  });

  it("combina termos que começam palavras diferentes, sem caixa ou acento", () => {
    expect(searchCandidates(candidates, "CAR lu").map(({ id }) => id)).toEqual([
      "fixture-luiza",
    ]);
  });

  it("busca número somente pelo início", () => {
    expect(searchCandidates(candidates, "1").map(({ id }) => id)).toEqual([
      "fixture-10",
      "fixture-carlos",
      "fixture-luiza",
    ]);
    expect(searchCandidates(candidates, "00")).toEqual([]);
  });

  it("mantém ordenação numérica determinística sem termo", () => {
    expect(searchCandidates(candidates, "").map(({ number }) => number)).toEqual([
      "10",
      "20",
      "30",
      "100",
      "101",
    ]);
  });

  it("limita a apresentação depois de filtrar a coleção completa", () => {
    const manyCandidates = Array.from({ length: 24 }, (_, index): Candidate => ({
      ...candidates[0]!,
      id: `fixture-many-${index}`,
      number: String(1000 + index),
      ballotName: `Pessoa ${index}`,
    }));

    const result = visibleCandidateSearchResults(manyCandidates, "pes");

    expect(result.total).toBe(24);
    expect(result.candidates).toHaveLength(MAX_VISIBLE_CANDIDATE_RESULTS);
  });

  it("apresenta candidaturas pendentes para seleção", () => {
    expect(searchCandidates(candidates, "pendente").map(({ id }) => id)).toEqual([
      "fixture-pending",
    ]);
  });

  it("não apresenta candidaturas marcadas como não exibíveis", () => {
    expect(searchCandidates(candidates, "não exibível")).toEqual([]);
  });

  it("retorna lista vazia quando não há correspondência", () => {
    expect(searchCandidates(candidates, "inexistente")).toEqual([]);
  });
});
