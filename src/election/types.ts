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

export interface ElectionConfig {
  readonly year: number;
  readonly type: ElectionType;
  readonly locationScope: TerritorialScope;
  readonly offices: readonly OfficeConfig[];
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
}

export type CandidateId = string;

export interface CandidateChoice {
  readonly id: CandidateId;
  readonly office: ElectoralOffice;
}

export type CandidateSelections = Readonly<
  Partial<Record<VotingSlotId, CandidateId>>
>;
