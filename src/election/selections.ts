import type {
  CandidateChoice,
  CandidateSelections,
  VotingSlot,
  VotingSlotId,
} from "./types.ts";

export type SelectionErrorCode =
  | "SLOT_NOT_FOUND"
  | "CANDIDATE_REQUIRED"
  | "OFFICE_MISMATCH"
  | "DUPLICATE_CANDIDATE";

export interface SelectionError {
  readonly code: SelectionErrorCode;
  readonly message: string;
  readonly slotId: VotingSlotId;
}

export type SelectionResult =
  | Readonly<{
      ok: true;
      selections: CandidateSelections;
    }>
  | Readonly<{
      ok: false;
      error: SelectionError;
    }>;

export function selectCandidate(
  slots: readonly VotingSlot[],
  currentSelections: CandidateSelections,
  slotId: VotingSlotId,
  candidate: CandidateChoice,
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

  if (candidate.id.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: "CANDIDATE_REQUIRED",
        message: "É necessário informar um candidato válido.",
        slotId,
      },
    };
  }

  if (candidate.office !== slot.office) {
    return {
      ok: false,
      error: {
        code: "OFFICE_MISMATCH",
        message: "O candidato não pertence ao cargo desta posição.",
        slotId,
      },
    };
  }

  const duplicateSlot = slot.requireDistinctCandidates
    ? slots.find(
        (item) =>
          item.id !== slot.id &&
          item.office === slot.office &&
          currentSelections[item.id] === candidate.id,
      )
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
      [slotId]: candidate.id,
    },
  };
}
