import { describe, expect, it } from "vitest";

import { ELECTION_2026, electionForYear } from "./elections.ts";
import { generateVotingSlots } from "./slots.ts";
import {
  ELECTORAL_OFFICE,
  TERRITORIAL_SCOPE,
  type ElectoralLocation,
} from "./types.ts";

const SP_LOCATION = {
  scope: TERRITORIAL_SCOPE.STATE,
  uf: "SP",
} as const satisfies ElectoralLocation;

const DF_LOCATION = {
  scope: TERRITORIAL_SCOPE.STATE,
  uf: "DF",
} as const satisfies ElectoralLocation;

describe("configuração eleitoral de 2026", () => {
  it("é selecionada por registro explícito, sem inferir anos não configurados", () => {
    expect(electionForYear(2026)).toBe(ELECTION_2026);
    expect(electionForYear(2025)).toBeUndefined();
    expect(electionForYear(2030)).toBeUndefined();
  });

  it("declara os cargos corretos", () => {
    expect(ELECTION_2026.offices.map(({ office }) => office)).toEqual([
      ELECTORAL_OFFICE.FEDERAL_DEPUTY,
      ELECTORAL_OFFICE.STATE_DEPUTY,
      ELECTORAL_OFFICE.SENATOR,
      ELECTORAL_OFFICE.GOVERNOR,
      ELECTORAL_OFFICE.PRESIDENT,
    ]);
  });

  it("exige somente escopo estadual do usuário", () => {
    expect(ELECTION_2026.locationScope).toBe(TERRITORIAL_SCOPE.STATE);
    expect(ELECTION_2026.offices.map(({ scope }) => scope)).toEqual([
      TERRITORIAL_SCOPE.STATE,
      TERRITORIAL_SCOPE.STATE,
      TERRITORIAL_SCOPE.STATE,
      TERRITORIAL_SCOPE.STATE,
      TERRITORIAL_SCOPE.NATIONAL,
    ]);
  });
});

describe("slots de votação de 2026", () => {
  it("gera seis slots na ordem oficial", () => {
    const slots = generateVotingSlots(ELECTION_2026, SP_LOCATION);

    expect(slots).toHaveLength(6);
    expect(slots.map(({ office }) => office)).toEqual([
      ELECTORAL_OFFICE.FEDERAL_DEPUTY,
      ELECTORAL_OFFICE.STATE_DEPUTY,
      ELECTORAL_OFFICE.SENATOR,
      ELECTORAL_OFFICE.SENATOR,
      ELECTORAL_OFFICE.GOVERNOR,
      ELECTORAL_OFFICE.PRESIDENT,
    ]);
    expect(slots.map(({ order }) => order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("gera dois slots distintos a partir do único cargo Senador", () => {
    const senatorConfig = ELECTION_2026.offices.find(
      ({ office }) => office === ELECTORAL_OFFICE.SENATOR,
    );
    const senatorSlots = generateVotingSlots(ELECTION_2026, SP_LOCATION).filter(
      ({ office }) => office === ELECTORAL_OFFICE.SENATOR,
    );

    expect(senatorConfig?.choices).toBe(2);
    expect(senatorSlots.map(({ id }) => id)).toEqual([
      "SENATOR:1",
      "SENATOR:2",
    ]);
    expect(senatorSlots.map(({ label }) => label)).toEqual([
      "Senador — 1ª escolha",
      "Senador — 2ª escolha",
    ]);
  });

  it("substitui Deputado Estadual por Deputado Distrital no DF", () => {
    const offices = generateVotingSlots(ELECTION_2026, DF_LOCATION).map(
      ({ office }) => office,
    );

    expect(offices).toContain(ELECTORAL_OFFICE.DISTRICT_DEPUTY);
    expect(offices).not.toContain(ELECTORAL_OFFICE.STATE_DEPUTY);
  });

  it("mantém Deputado Estadual nas demais UFs", () => {
    const offices = generateVotingSlots(ELECTION_2026, SP_LOCATION).map(
      ({ office }) => office,
    );

    expect(offices).toContain(ELECTORAL_OFFICE.STATE_DEPUTY);
    expect(offices).not.toContain(ELECTORAL_OFFICE.DISTRICT_DEPUTY);
  });

  it("rejeita localização com escopo incompatível", () => {
    expect(() =>
      generateVotingSlots(ELECTION_2026, {
        scope: TERRITORIAL_SCOPE.NATIONAL,
      }),
    ).toThrow("exige localização com escopo STATE");
  });
});
