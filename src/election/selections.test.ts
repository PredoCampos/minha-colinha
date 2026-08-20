import { describe, expect, it } from "vitest";

import { ELECTION_2026 } from "./elections.ts";
import { selectVoteChoice } from "./selections.ts";
import { generateVotingSlots } from "./slots.ts";
import {
  ELECTORAL_OFFICE,
  TERRITORIAL_SCOPE,
  VOTE_CHOICE_TYPE,
} from "./types.ts";

const slots = generateVotingSlots(ELECTION_2026, {
  scope: TERRITORIAL_SCOPE.STATE,
  uf: "MA",
});

describe("seleção para os dois slots de senador", () => {
  it("aceita candidatos diferentes", () => {
    const first = selectVoteChoice(slots, {}, "SENATOR:1", {
      type: VOTE_CHOICE_TYPE.CANDIDATE,
      candidateId: "senador-100",
      office: "SENATOR",
    });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      throw new Error("A primeira escolha deveria ser válida.");
    }

    const second = selectVoteChoice(
      slots,
      first.selections,
      "SENATOR:2",
      {
        type: VOTE_CHOICE_TYPE.CANDIDATE,
        candidateId: "senador-200",
        office: ELECTORAL_OFFICE.SENATOR,
      },
    );

    expect(second).toEqual({
      ok: true,
      selections: {
        "SENATOR:1": {
          type: VOTE_CHOICE_TYPE.CANDIDATE,
          candidateId: "senador-100",
          office: ELECTORAL_OFFICE.SENATOR,
        },
        "SENATOR:2": {
          type: VOTE_CHOICE_TYPE.CANDIDATE,
          candidateId: "senador-200",
          office: ELECTORAL_OFFICE.SENATOR,
        },
      },
    });
  });

  it("impede repetir o mesmo candidato", () => {
    const first = selectVoteChoice(slots, {}, "SENATOR:1", {
      type: VOTE_CHOICE_TYPE.CANDIDATE,
      candidateId: "senador-100",
      office: "SENATOR",
    });

    if (!first.ok) {
      throw new Error("A primeira escolha deveria ser válida.");
    }

    const repeated = selectVoteChoice(
      slots,
      first.selections,
      "SENATOR:2",
      {
        type: VOTE_CHOICE_TYPE.CANDIDATE,
        candidateId: "senador-100",
        office: ELECTORAL_OFFICE.SENATOR,
      },
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

  it("aceita branco e nulo como escolhas explícitas", () => {
    expect(
      selectVoteChoice(slots, {}, "PRESIDENT:1", {
        type: VOTE_CHOICE_TYPE.BLANK,
      }),
    ).toMatchObject({ ok: true });
    expect(
      selectVoteChoice(slots, {}, "GOVERNOR:1", {
        type: VOTE_CHOICE_TYPE.NULL,
      }),
    ).toMatchObject({ ok: true });
  });

  it("aceita legenda em deputado e bloqueia em cargo majoritário", () => {
    const partyChoice = {
      type: VOTE_CHOICE_TYPE.PARTY,
      party: "ABC",
      partyNumber: "13",
    } as const;

    expect(
      selectVoteChoice(slots, {}, "FEDERAL_DEPUTY:1", partyChoice),
    ).toMatchObject({ ok: true });
    expect(selectVoteChoice(slots, {}, "PRESIDENT:1", partyChoice)).toMatchObject({
      ok: false,
      error: { code: "PARTY_NOT_ALLOWED" },
    });
  });
});
