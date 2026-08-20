import { describe, expect, it } from "vitest";
import { CANDIDATE_STATUS } from "../../src/candidates/model.ts";
import { ELECTORAL_OFFICE } from "../../src/election/types.ts";
import {
  mapTseCandidacyStatus,
  mapTseJudgmentStatus,
  mapTseOffice,
  resolveTseCandidateStatus,
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

  it("não trata o único valor geral observado em 2026 como situação eleitoral", () => {
    expect(mapTseCandidacyStatus("-3", "#NE")).toBeNull();
    expect(() => mapTseCandidacyStatus("12", "APTO")).toThrow(
      /Situação geral de candidatura TSE desconhecida/,
    );
    expect(() => mapTseCandidacyStatus("99", "NOVA")).toThrow(
      /Situação geral de candidatura TSE desconhecida/,
    );
  });

  it("resolve o ciclo 2026 a partir do julgamento complementar", () => {
    expect(resolveTseCandidateStatus("-3", "#NE", "2", "DEFERIDO")).toBe(
      CANDIDATE_STATUS.DISPLAYABLE,
    );
    expect(
      resolveTseCandidateStatus(
        "-3",
        "#NE",
        "4",
        "INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO",
      ),
    ).toBe(CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS);
    expect(resolveTseCandidateStatus("-3", "#NE", "6", "RENÚNCIA")).toBe(
      CANDIDATE_STATUS.NOT_DISPLAYABLE,
    );
  });
});
