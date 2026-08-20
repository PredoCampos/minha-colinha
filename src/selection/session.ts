import type { Candidate } from "../candidates/model.ts";
import type { ElectionConfig, ElectoralLocation, VotingSlotId } from "../election/types.ts";
import { selectCandidate } from "../election/selections.ts";
import { generateVotingSlots } from "../election/slots.ts";
import type {
  CandidateSelections,
  SelectionError,
  VotingSlot,
} from "../election/index.ts";

export interface SelectionSession {
  readonly election: ElectionConfig;
  readonly location: ElectoralLocation;
  readonly slots: readonly VotingSlot[];
  readonly selections: CandidateSelections;
}

export type SessionSelectionResult =
  | Readonly<{ ok: true; session: SelectionSession }>
  | Readonly<{ ok: false; error: SelectionError }>;

export function startSelectionSession(
  election: ElectionConfig,
  location: ElectoralLocation,
): SelectionSession {
  return {
    election,
    location,
    slots: generateVotingSlots(election, location),
    selections: {},
  };
}

export function changeSelectionLocation(
  session: SelectionSession,
  location: ElectoralLocation,
): SelectionSession {
  return startSelectionSession(session.election, location);
}

export function selectCandidateInSession(
  session: SelectionSession,
  slotId: VotingSlotId,
  candidate: Candidate,
): SessionSelectionResult {
  const result = selectCandidate(session.slots, session.selections, slotId, {
    id: candidate.id,
    office: candidate.office,
  });

  return result.ok
    ? {
        ok: true,
        session: { ...session, selections: result.selections },
      }
    : result;
}
