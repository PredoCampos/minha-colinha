export { ELECTION_2026, SUPPORTED_ELECTIONS, electionForYear } from "./elections.ts";
export { OFFICE_LABELS, officeLabel } from "./offices.ts";
export { selectCandidate } from "./selections.ts";
export type {
  SelectionError,
  SelectionErrorCode,
  SelectionResult,
} from "./selections.ts";
export { generateVotingSlots } from "./slots.ts";
export {
  ELECTION_TYPE,
  ELECTORAL_OFFICE,
  FEDERATIVE_UNITS,
  TERRITORIAL_SCOPE,
} from "./types.ts";
export type {
  CandidateId,
  CandidateChoice,
  CandidateSelections,
  ElectionConfig,
  ElectionRuleSource,
  ElectionType,
  ElectoralLocation,
  ElectoralOffice,
  FederativeUnit,
  OfficeConfig,
  TerritorialOfficeReplacement,
  TerritorialScope,
  VotingSlot,
  VotingSlotId,
} from "./types.ts";
