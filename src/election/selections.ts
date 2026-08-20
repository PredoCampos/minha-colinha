import type {
  VoteChoice,
  VoteSelections,
  VotingSlot,
  VotingSlotId,
} from "./types.ts";
import { VOTE_CHOICE_TYPE } from "./types.ts";

export type SelectionErrorCode =
  | "SLOT_NOT_FOUND"
  | "CANDIDATE_REQUIRED"
  | "OFFICE_MISMATCH"
  | "DUPLICATE_CANDIDATE"
  | "PARTY_NOT_ALLOWED"
  | "PARTY_REQUIRED";

export interface SelectionError {
  readonly code: SelectionErrorCode;
  readonly message: string;
  readonly slotId: VotingSlotId;
}

export type SelectionResult =
  | Readonly<{
      ok: true;
      selections: VoteSelections;
    }>
  | Readonly<{
      ok: false;
      error: SelectionError;
    }>;

export function selectVoteChoice(
  slots: readonly VotingSlot[],
  currentSelections: VoteSelections,
  slotId: VotingSlotId,
  choice: VoteChoice,
): SelectionResult {
  const slot = slots.find((item) => item.id === slotId);

  if (!slot) {
    return {
      ok: false,
      error: {
        code: "SLOT_NOT_FOUND",
        message: "A posição de votação informada não existe nesta eleição.",
        slotId,
      },
    };
  }

  if (
    choice.type === VOTE_CHOICE_TYPE.CANDIDATE &&
    choice.candidateId.trim().length === 0
  ) {
    return {
      ok: false,
      error: {
        code: "CANDIDATE_REQUIRED",
        message: "É necessário informar um candidato válido.",
        slotId,
      },
    };
  }

  if (
    choice.type === VOTE_CHOICE_TYPE.CANDIDATE &&
    choice.office !== slot.office
  ) {
    return {
      ok: false,
      error: {
        code: "OFFICE_MISMATCH",
        message: "O candidato não pertence ao cargo desta posição.",
        slotId,
      },
    };
  }

  if (choice.type === VOTE_CHOICE_TYPE.PARTY && !slot.allowPartyVote) {
    return {
      ok: false,
      error: {
        code: "PARTY_NOT_ALLOWED",
        message: "Voto de legenda não é permitido para este cargo.",
        slotId,
      },
    };
  }

  if (
    choice.type === VOTE_CHOICE_TYPE.PARTY &&
    (choice.party.trim().length === 0 || !/^\d{2}$/.test(choice.partyNumber))
  ) {
    return {
      ok: false,
      error: {
        code: "PARTY_REQUIRED",
        message: "É necessário informar partido e número válidos.",
        slotId,
      },
    };
  }

  const duplicateSlot =
    slot.requireDistinctCandidates && choice.type === VOTE_CHOICE_TYPE.CANDIDATE
    ? slots.find((item) => {
        const existing = currentSelections[item.id];
        return (
          item.id !== slot.id &&
          item.office === slot.office &&
          existing?.type === VOTE_CHOICE_TYPE.CANDIDATE &&
          existing.candidateId === choice.candidateId
        );
      })
    : undefined;

  if (duplicateSlot) {
    return {
      ok: false,
      error: {
        code: "DUPLICATE_CANDIDATE",
        message: "O mesmo candidato não pode ocupar as duas escolhas deste cargo.",
        slotId,
      },
    };
  }

  return {
    ok: true,
    selections: {
      ...currentSelections,
      [slotId]: choice,
    },
  };
}
