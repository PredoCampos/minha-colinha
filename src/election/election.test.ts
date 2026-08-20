import { describe, expect, it } from "vitest";

import { ELECTION_2026, electionForYear } from "./elections.ts";
import { electionCalendar } from "./calendar.ts";
import { generateVotingSlots } from "./slots.ts";
import {
  ELECTORAL_OFFICE,
  TERRITORIAL_SCOPE,
  ELECTION_ROUND,
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

const firstRound = ELECTION_2026.rounds[0];

describe("configuração eleitoral de 2026", () => {
  it("é selecionada por registro explícito, sem inferir anos não configurados", () => {
    expect(electionForYear(2026)).toBe(ELECTION_2026);
    expect(electionForYear(2025)).toBeUndefined();
    expect(electionForYear(2030)).toBeUndefined();
  });

  it("declara os cargos corretos", () => {
    expect(firstRound?.offices?.map(({ office }) => office)).toEqual([
      ELECTORAL_OFFICE.FEDERAL_DEPUTY,
      ELECTORAL_OFFICE.STATE_DEPUTY,
      ELECTORAL_OFFICE.SENATOR,
      ELECTORAL_OFFICE.GOVERNOR,
      ELECTORAL_OFFICE.PRESIDENT,
    ]);
  });

  it("exige somente escopo estadual do usuário", () => {
    expect(ELECTION_2026.locationScope).toBe(TERRITORIAL_SCOPE.STATE);
    expect(firstRound?.offices?.map(({ scope }) => scope)).toEqual([
      TERRITORIAL_SCOPE.STATE,
      TERRITORIAL_SCOPE.STATE,
      TERRITORIAL_SCOPE.STATE,
      TERRITORIAL_SCOPE.STATE,
      TERRITORIAL_SCOPE.NATIONAL,
    ]);
  });

  it("declara as duas rodadas e o calendário oficial sem antecipar disputas", () => {
    expect(ELECTION_2026.defaultRoundId).toBe(ELECTION_ROUND.FIRST);
    expect(electionCalendar(ELECTION_2026)).toEqual([
      {
        id: ELECTION_ROUND.FIRST,
        label: "1º turno",
        date: "2026-10-04",
        dateLabel: "4 de outubro de 2026",
        disputesConfigured: true,
      },
      {
        id: ELECTION_ROUND.SECOND,
        label: "Eventual 2º turno",
        date: "2026-10-25",
        dateLabel: "25 de outubro de 2026",
        disputesConfigured: false,
      },
    ]);
    expect(() =>
      generateVotingSlots(ELECTION_2026, SP_LOCATION, ELECTION_ROUND.SECOND),
    ).toThrow("ainda não foram configuradas");
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
    const senatorConfig = firstRound?.offices?.find(
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

  it("permite legenda somente nos cargos proporcionais de 2026", () => {
    const slots = generateVotingSlots(ELECTION_2026, SP_LOCATION);
    expect(
      slots.filter(({ allowPartyVote }) => allowPartyVote).map(({ office }) => office),
    ).toEqual([
      ELECTORAL_OFFICE.FEDERAL_DEPUTY,
      ELECTORAL_OFFICE.STATE_DEPUTY,
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
