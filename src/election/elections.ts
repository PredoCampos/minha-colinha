import {
  ELECTION_TYPE,
  ELECTION_ROUND,
  ELECTORAL_OFFICE,
  TERRITORIAL_SCOPE,
  type ElectionConfig,
} from "./types.ts";

export const ELECTION_2026 = {
  year: 2026,
  type: ELECTION_TYPE.GENERAL,
  locationScope: TERRITORIAL_SCOPE.STATE,
  defaultRoundId: ELECTION_ROUND.FIRST,
  rounds: [
    {
      id: ELECTION_ROUND.FIRST,
      label: "1º turno",
      date: "2026-10-04",
      offices: [
        {
          office: ELECTORAL_OFFICE.FEDERAL_DEPUTY,
          choices: 1,
          order: 1,
          scope: TERRITORIAL_SCOPE.STATE,
          requireDistinctCandidates: false,
          allowPartyVote: true,
        },
        {
          office: ELECTORAL_OFFICE.STATE_DEPUTY,
          choices: 1,
          order: 2,
          scope: TERRITORIAL_SCOPE.STATE,
          requireDistinctCandidates: false,
          allowPartyVote: true,
        },
        {
          office: ELECTORAL_OFFICE.SENATOR,
          choices: 2,
          order: 3,
          scope: TERRITORIAL_SCOPE.STATE,
          requireDistinctCandidates: true,
          allowPartyVote: false,
        },
        {
          office: ELECTORAL_OFFICE.GOVERNOR,
          choices: 1,
          order: 4,
          scope: TERRITORIAL_SCOPE.STATE,
          requireDistinctCandidates: false,
          allowPartyVote: false,
        },
        {
          office: ELECTORAL_OFFICE.PRESIDENT,
          choices: 1,
          order: 5,
          scope: TERRITORIAL_SCOPE.NATIONAL,
          requireDistinctCandidates: false,
          allowPartyVote: false,
        },
      ],
    },
    {
      id: ELECTION_ROUND.SECOND,
      label: "Eventual 2º turno",
      date: "2026-10-25",
      offices: null,
    },
  ],
  territorialExceptions: [
    {
      uf: "DF",
      replace: ELECTORAL_OFFICE.STATE_DEPUTY,
      with: ELECTORAL_OFFICE.DISTRICT_DEPUTY,
    },
  ],
  ruleSources: [
    {
      name: "Resolução TSE nº 23.751/2026",
      url: "https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-751-de-26-de-fevereiro-de-2026",
    },
    {
      name: "Resolução TSE nº 23.760/2026",
      url: "https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-760-de-2-de-marco-de-2026",
    },
  ],
} as const satisfies ElectionConfig;

export const SUPPORTED_ELECTIONS: readonly ElectionConfig[] = [ELECTION_2026];

export function electionForYear(year: number): ElectionConfig | undefined {
  return SUPPORTED_ELECTIONS.find((election) => election.year === year);
}
