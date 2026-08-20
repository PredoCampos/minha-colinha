export const ELECTION_TYPE = {
  GENERAL: "GENERAL",
  MUNICIPAL: "MUNICIPAL",
  OTHER: "OTHER",
} as const;

export type ElectionType = (typeof ELECTION_TYPE)[keyof typeof ELECTION_TYPE];

export const TERRITORIAL_SCOPE = {
  NATIONAL: "NATIONAL",
  STATE: "STATE",
  MUNICIPALITY: "MUNICIPALITY",
} as const;

export type TerritorialScope =
  (typeof TERRITORIAL_SCOPE)[keyof typeof TERRITORIAL_SCOPE];

export const ELECTORAL_OFFICE = {
  FEDERAL_DEPUTY: "FEDERAL_DEPUTY",
  STATE_DEPUTY: "STATE_DEPUTY",
  DISTRICT_DEPUTY: "DISTRICT_DEPUTY",
  SENATOR: "SENATOR",
  GOVERNOR: "GOVERNOR",
  PRESIDENT: "PRESIDENT",
  COUNCILOR: "COUNCILOR",
  MAYOR: "MAYOR",
} as const;

export type ElectoralOffice =
  (typeof ELECTORAL_OFFICE)[keyof typeof ELECTORAL_OFFICE];

export const ELECTION_ROUND = {
  FIRST: "FIRST",
  SECOND: "SECOND",
} as const;

export type ElectionRoundId =
  (typeof ELECTION_ROUND)[keyof typeof ELECTION_ROUND];

export const VOTE_CHOICE_TYPE = {
  CANDIDATE: "CANDIDATE",
  PARTY: "PARTY",
  BLANK: "BLANK",
  NULL: "NULL",
} as const;

export type VoteChoiceType =
  (typeof VOTE_CHOICE_TYPE)[keyof typeof VOTE_CHOICE_TYPE];

export const FEDERATIVE_UNITS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export type FederativeUnit = (typeof FEDERATIVE_UNITS)[number];

export type ElectoralLocation =
  | Readonly<{
      scope: typeof TERRITORIAL_SCOPE.NATIONAL;
    }>
  | Readonly<{
      scope: typeof TERRITORIAL_SCOPE.STATE;
      uf: FederativeUnit;
    }>
  | Readonly<{
      scope: typeof TERRITORIAL_SCOPE.MUNICIPALITY;
      uf: FederativeUnit;
      municipalityCode: string;
      municipalityName: string;
    }>;

export interface OfficeConfig {
  readonly office: ElectoralOffice;
  readonly choices: number;
  readonly order: number;
  readonly scope: TerritorialScope;
  readonly requireDistinctCandidates: boolean;
  readonly allowPartyVote: boolean;
}

export interface TerritorialOfficeReplacement {
  readonly uf: FederativeUnit;
  readonly replace: ElectoralOffice;
  readonly with: ElectoralOffice;
}

export interface ElectionRuleSource {
  readonly name: string;
  readonly url: string;
}

export interface ElectionRoundConfig {
  readonly id: ElectionRoundId;
  readonly label: string;
  readonly date: `${number}-${number}-${number}`;
  readonly offices: readonly OfficeConfig[] | null;
}

export interface ElectionConfig {
  readonly year: number;
  readonly type: ElectionType;
  readonly locationScope: TerritorialScope;
  readonly defaultRoundId: ElectionRoundId;
  readonly rounds: readonly ElectionRoundConfig[];
  readonly territorialExceptions: readonly TerritorialOfficeReplacement[];
  readonly ruleSources: readonly ElectionRuleSource[];
}

export type VotingSlotId = `${ElectoralOffice}:${number}`;

export interface VotingSlot {
  readonly id: VotingSlotId;
  readonly office: ElectoralOffice;
  readonly choiceNumber: number;
  readonly order: number;
  readonly scope: TerritorialScope;
  readonly label: string;
  readonly requireDistinctCandidates: boolean;
  readonly allowPartyVote: boolean;
}

export type CandidateId = string;

export interface CandidateChoice {
  readonly type: typeof VOTE_CHOICE_TYPE.CANDIDATE;
  readonly candidateId: CandidateId;
  readonly office: ElectoralOffice;
}

export interface PartyChoice {
  readonly type: typeof VOTE_CHOICE_TYPE.PARTY;
  readonly party: string;
  readonly partyNumber: string;
}

export interface BlankChoice {
  readonly type: typeof VOTE_CHOICE_TYPE.BLANK;
}

export interface NullChoice {
  readonly type: typeof VOTE_CHOICE_TYPE.NULL;
}

export type NonCandidateVoteChoice = PartyChoice | BlankChoice | NullChoice;
export type VoteChoice = CandidateChoice | NonCandidateVoteChoice;

export type VoteSelections = Readonly<
  Partial<Record<VotingSlotId, VoteChoice>>
>;
