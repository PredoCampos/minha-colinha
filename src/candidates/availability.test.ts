import { describe, expect, it } from "vitest";

import {
  candidateAvailability,
  isCandidatePendingOrAmbiguous,
  isCandidateSelectable,
} from "./availability.ts";
import { CANDIDATE_STATUS } from "./model.ts";

describe("política de disponibilidade de candidaturas", () => {
  it.each([
    [CANDIDATE_STATUS.DISPLAYABLE, true, false],
    [CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS, true, true],
    [CANDIDATE_STATUS.NOT_DISPLAYABLE, false, false],
  ] as const)(
    "aplica a política de %s",
    (status, selectable, pendingOrAmbiguous) => {
      expect(candidateAvailability({ status })).toEqual({
        selectable,
        pendingOrAmbiguous,
      });
      expect(isCandidateSelectable({ status })).toBe(selectable);
      expect(isCandidatePendingOrAmbiguous({ status })).toBe(
        pendingOrAmbiguous,
      );
    },
  );
});
