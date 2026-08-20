export { ELECTION_2026, SUPPORTED_ELECTIONS, electionForYear } from "./elections.ts";
export { electionCalendar, formatElectionDate } from "./calendar.ts";
export type { ElectionCalendarEntry } from "./calendar.ts";
export { OFFICE_LABELS, officeLabel } from "./offices.ts";
export { selectVoteChoice } from "./selections.ts";
export type {
  SelectionError,
  SelectionErrorCode,
  SelectionResult,
} from "./selections.ts";
export { generateVotingSlots } from "./slots.ts";
export {
  ELECTION_TYPE,
  ELECTION_ROUND,
  ELECTORAL_OFFICE,
  FEDERATIVE_UNITS,
  TERRITORIAL_SCOPE,
  VOTE_CHOICE_TYPE,
} from "./types.ts";
export type {
  BlankChoice,
  CandidateId,
  CandidateChoice,
  ElectionConfig,
  ElectionRoundConfig,
  ElectionRoundId,
  ElectionRuleSource,
  ElectionType,
  ElectoralLocation,
  ElectoralOffice,
  FederativeUnit,
  NonCandidateVoteChoice,
  NullChoice,
  OfficeConfig,
  PartyChoice,
  TerritorialOfficeReplacement,
  TerritorialScope,
  VoteChoice,
  VoteChoiceType,
  VoteSelections,
  VotingSlot,
  VotingSlotId,
} from "./types.ts";
