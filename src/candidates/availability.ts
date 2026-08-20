import {
  CANDIDATE_STATUS,
  type Candidate,
  type CandidateStatus,
} from "./model.ts";

export interface CandidateAvailability {
  readonly selectable: boolean;
  readonly pendingOrAmbiguous: boolean;
}

const AVAILABILITY_BY_STATUS: Readonly<
  Record<CandidateStatus, CandidateAvailability>
> = {
  [CANDIDATE_STATUS.DISPLAYABLE]: {
    selectable: true,
    pendingOrAmbiguous: false,
  },
  [CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS]: {
    selectable: true,
    pendingOrAmbiguous: true,
  },
  [CANDIDATE_STATUS.NOT_DISPLAYABLE]: {
    selectable: false,
    pendingOrAmbiguous: false,
  },
};

export function candidateAvailability(
  candidate: Pick<Candidate, "status">,
): CandidateAvailability {
  return AVAILABILITY_BY_STATUS[candidate.status];
}

export function isCandidateSelectable(
  candidate: Pick<Candidate, "status">,
): boolean {
  return candidateAvailability(candidate).selectable;
}

export function isCandidatePendingOrAmbiguous(
  candidate: Pick<Candidate, "status">,
): boolean {
  return candidateAvailability(candidate).pendingOrAmbiguous;
}
