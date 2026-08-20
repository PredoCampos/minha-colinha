import { describe, expect, it } from "vitest";

import { ELECTION_2026 } from "./elections.ts";
import { selectCandidate } from "./selections.ts";
import { generateVotingSlots } from "./slots.ts";
import { TERRITORIAL_SCOPE } from "./types.ts";

const slots = generateVotingSlots(ELECTION_2026, {
  scope: TERRITORIAL_SCOPE.STATE,
  uf: "MA",
});

describe("seleção para os dois slots de senador", () => {
  it("aceita candidatos diferentes", () => {
    const first = selectCandidate(slots, {}, "SENATOR:1", {
      id: "senador-100",
      office: "SENATOR",
    });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error("A primeira escolha deveria ser válida.");
    }

    const second = selectCandidate(
      slots,
      first.selections,
      "SENATOR:2",
      { id: "senador-200", office: "SENATOR" },
    );

    expect(second).toEqual({
      ok: true,
      selections: {
        "SENATOR:1": "senador-100",
        "SENATOR:2": "senador-200",
      },
    });
  });

  it("impede repetir o mesmo candidato", () => {
    const first = selectCandidate(slots, {}, "SENATOR:1", {
      id: "senador-100",
      office: "SENATOR",
    });

    if (!first.ok) {
      throw new Error("A primeira escolha deveria ser válida.");
    }

    const repeated = selectCandidate(
      slots,
      first.selections,
      "SENATOR:2",
      { id: "senador-100", office: "SENATOR" },
    );

    expect(repeated).toEqual({
      ok: false,
      error: {
        code: "DUPLICATE_CANDIDATE",
        message: "O mesmo candidato não pode ocupar as duas escolhas deste cargo.",
        slotId: "SENATOR:2",
      },
    });
  });
});
