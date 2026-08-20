import { describe, expect, it } from "vitest";

import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../election/types.ts";
import { filterCandidates } from "./filter.ts";
import { CANDIDATE_STATUS, type Candidate } from "./model.ts";

const CANDIDATES: readonly Candidate[] = [
  {
    id: "fixture-senator-sp",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.SENATOR,
    number: "100",
    ballotName: "SENADO SP",
    party: "EXM",
    photoPath: null,
    status: CANDIDATE_STATUS.DISPLAYABLE,
    jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
  },
  {
    id: "fixture-senator-rj",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.SENATOR,
    number: "200",
    ballotName: "SENADO RJ",
    party: "TST",
    photoPath: null,
    status: CANDIDATE_STATUS.DISPLAYABLE,
    jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "RJ" },
  },
  {
    id: "fixture-governor-sp",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.GOVERNOR,
    number: "10",
    ballotName: "GOVERNO SP",
    party: "EXM",
    photoPath: null,
    status: CANDIDATE_STATUS.DISPLAYABLE,
    jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
  },
  {
    id: "fixture-president-br",
    electionYear: 2026,
    office: ELECTORAL_OFFICE.PRESIDENT,
    number: "20",
    ballotName: "PRESIDÊNCIA BR",
    party: "TST",
    photoPath: null,
    status: CANDIDATE_STATUS.DISPLAYABLE,
    jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL },
  },
];

describe("filtragem de candidatos", () => {
  it("filtra por cargo", () => {
    const candidates = filterCandidates(CANDIDATES, {
      electionYear: 2026,
      office: ELECTORAL_OFFICE.GOVERNOR,
      location: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
    });

    expect(candidates.map(({ id }) => id)).toEqual(["fixture-governor-sp"]);
  });

  it("filtra candidaturas estaduais pela UF", () => {
    const candidates = filterCandidates(CANDIDATES, {
      electionYear: 2026,
      office: ELECTORAL_OFFICE.SENATOR,
      location: { scope: TERRITORIAL_SCOPE.STATE, uf: "RJ" },
    });

    expect(candidates.map(({ id }) => id)).toEqual(["fixture-senator-rj"]);
  });

  it("aplica candidatura nacional à localização estadual", () => {
    const candidates = filterCandidates(CANDIDATES, {
      electionYear: 2026,
      office: ELECTORAL_OFFICE.PRESIDENT,
      location: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
    });

    expect(candidates.map(({ id }) => id)).toEqual(["fixture-president-br"]);
  });
});
