import type {
  ElectoralLocation,
  ElectoralOffice,
} from "../election/types.ts";

export const CANDIDATE_STATUS = {
  DISPLAYABLE: "DISPLAYABLE",
  NOT_DISPLAYABLE: "NOT_DISPLAYABLE",
  PENDING_OR_AMBIGUOUS: "PENDING_OR_AMBIGUOUS",
} as const;

export type CandidateStatus =
  (typeof CANDIDATE_STATUS)[keyof typeof CANDIDATE_STATUS];

export interface Candidate {
  readonly id: string;
  readonly electionYear: number;
  readonly office: ElectoralOffice;
  readonly number: string;
  readonly ballotName: string;
  readonly party: string;
  readonly photoPath: string | null;
  readonly status: CandidateStatus;
  readonly jurisdiction: ElectoralLocation;
}

export const CANDIDATE_DATASET_KIND = {
  OFFICIAL_SNAPSHOT: "OFFICIAL_SNAPSHOT",
  DEVELOPMENT_FIXTURE: "DEVELOPMENT_FIXTURE",
} as const;

export type CandidateDatasetKind =
  (typeof CANDIDATE_DATASET_KIND)[keyof typeof CANDIDATE_DATASET_KIND];

export type CandidateDataPartition = Extract<
  ElectoralLocation,
  { readonly scope: "NATIONAL" | "STATE" }
>;

export interface CandidateFile {
  readonly schemaVersion: 1;
  readonly datasetKind: CandidateDatasetKind;
  readonly notice: string;
  readonly electionYear: number;
  readonly office: ElectoralOffice;
  readonly partition: CandidateDataPartition;
  readonly candidates: readonly Candidate[];
}
