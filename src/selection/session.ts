import type { Candidate } from "../candidates/model.ts";
import { isCandidateSelectable } from "../candidates/availability.ts";
import type {
  ElectionConfig,
  ElectionRoundConfig,
  ElectionRoundId,
  ElectoralLocation,
  NonCandidateVoteChoice,
  VotingSlotId,
} from "../election/types.ts";
import { VOTE_CHOICE_TYPE } from "../election/types.ts";
import { selectVoteChoice } from "../election/selections.ts";
import { generateVotingSlots } from "../election/slots.ts";
import type {
  SelectionError,
  VoteSelections,
  VotingSlot,
} from "../election/index.ts";

export interface SelectionSession {
  readonly election: ElectionConfig;
  readonly round: ElectionRoundConfig;
  readonly location: ElectoralLocation;
  readonly slots: readonly VotingSlot[];
  readonly selections: VoteSelections;
}

export type SessionSelectionResult =
  | Readonly<{ ok: true; session: SelectionSession }>
  | Readonly<{
      ok: false;
      error:
        | SelectionError
        | Readonly<{
            code: "CANDIDATE_NOT_SELECTABLE";
            message: string;
            slotId: VotingSlotId;
          }>;
    }>;

export function startSelectionSession(
  election: ElectionConfig,
  location: ElectoralLocation,
  roundId: ElectionRoundId = election.defaultRoundId,
): SelectionSession {
  const round = election.rounds.find(({ id }) => id === roundId);
  if (!round) {
    throw new Error(`O turno ${roundId} não existe na eleição de ${election.year}.`);
  }
  return {
    election,
    round,
    location,
    slots: generateVotingSlots(election, location, roundId),
    selections: {},
  };
}

export function changeSelectionLocation(
  session: SelectionSession,
  location: ElectoralLocation,
): SelectionSession {
  return startSelectionSession(session.election, location, session.round.id);
}

export function selectCandidateInSession(
  session: SelectionSession,
  slotId: VotingSlotId,
  candidate: Candidate,
): SessionSelectionResult {
  if (!isCandidateSelectable(candidate)) {
    return {
      ok: false,
      error: {
        code: "CANDIDATE_NOT_SELECTABLE",
        message: "Esta candidatura não está disponível para seleção.",
        slotId,
      },
    };
  }

  const result = selectVoteChoice(session.slots, session.selections, slotId, {
    type: VOTE_CHOICE_TYPE.CANDIDATE,
    candidateId: candidate.id,
    office: candidate.office,
  });

  return result.ok
    ? {
        ok: true,
        session: { ...session, selections: result.selections },
      }
    : result;
}

export function selectNonCandidateInSession(
  session: SelectionSession,
  slotId: VotingSlotId,
  choice: NonCandidateVoteChoice,
): SessionSelectionResult {
  const result = selectVoteChoice(
    session.slots,
    session.selections,
    slotId,
    choice,
  );
  return result.ok
    ? { ok: true, session: { ...session, selections: result.selections } }
    : result;
}
