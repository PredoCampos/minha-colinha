import { describe, expect, it } from "vitest";
import { CANDIDATE_STATUS } from "../../src/candidates/model.ts";
import { ELECTORAL_OFFICE } from "../../src/election/types.ts";
import {
  mapTseJudgmentStatus,
  mapTseOffice,
  validateObservedCandidacyStatus,
} from "./mappings.ts";

describe("mapeamentos explícitos do TSE 2026", () => {
  it("mapeia apenas os seis cargos da aplicação e ignora companheiros de chapa", () => {
    expect(mapTseOffice("1", "PRESIDENTE")).toBe(ELECTORAL_OFFICE.PRESIDENT);
    expect(mapTseOffice("5", "SENADOR")).toBe(ELECTORAL_OFFICE.SENATOR);
    expect(mapTseOffice("7", "DEPUTADO ESTADUAL")).toBe(ELECTORAL_OFFICE.STATE_DEPUTY);
    expect(mapTseOffice("8", "DEPUTADO DISTRITAL")).toBe(ELECTORAL_OFFICE.DISTRICT_DEPUTY);
    expect(mapTseOffice("2", "VICE-PRESIDENTE")).toBeNull();
    expect(mapTseOffice("9", "1º SUPLENTE")).toBeNull();
    expect(() => mapTseOffice("99", "CARGO NOVO")).toThrow(/Cargo TSE desconhecido/);
  });

  it("mapeia todas as situações observadas sem fallback silencioso", () => {
    expect(mapTseJudgmentStatus("2", "DEFERIDO")).toBe(CANDIDATE_STATUS.DISPLAYABLE);
    expect(
      mapTseJudgmentStatus("16", "DEFERIDO EM PRAZO RECURSAL OU COM RECURSO"),
    ).toBe(CANDIDATE_STATUS.DISPLAYABLE);
    expect(mapTseJudgmentStatus("8", "AGUARDANDO JULGAMENTO")).toBe(
      CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
    );
    expect(
      mapTseJudgmentStatus("4", "INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO"),
    ).toBe(CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS);
    expect(mapTseJudgmentStatus("6", "RENÚNCIA")).toBe(
      CANDIDATE_STATUS.NOT_DISPLAYABLE,
    );
    expect(mapTseJudgmentStatus("13", "PEDIDO NÃO CONHECIDO")).toBe(
      CANDIDATE_STATUS.NOT_DISPLAYABLE,
    );
    expect(mapTseJudgmentStatus("14", "INDEFERIDO")).toBe(
      CANDIDATE_STATUS.NOT_DISPLAYABLE,
    );
    expect(() => mapTseJudgmentStatus("999", "NOVA SITUAÇÃO")).toThrow(
      /Situação de julgamento TSE desconhecida/,
    );
  });

  it("aceita apenas a situação geral concretamente observada", () => {
    expect(() => validateObservedCandidacyStatus("-3", "#NE")).not.toThrow();
    expect(() => validateObservedCandidacyStatus("12", "APTO")).toThrow(
      /ainda não mapeada/,
    );
  });
});
