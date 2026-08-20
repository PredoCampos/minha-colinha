import { describe, expect, it } from "vitest";

import type { Candidate } from "../candidates/model.ts";
import { CANDIDATE_STATUS } from "../candidates/model.ts";
import { ELECTION_2026 } from "../election/elections.ts";
import {
  ELECTORAL_OFFICE,
  TERRITORIAL_SCOPE,
  VOTE_CHOICE_TYPE,
} from "../election/types.ts";
import {
  changeSelectionLocation,
  selectNonCandidateInSession,
  selectCandidateInSession,
  startSelectionSession,
} from "./session.ts";

function senator(
  id: string,
  status: Candidate["status"] = CANDIDATE_STATUS.DISPLAYABLE,
): Candidate {
  return {
    id,
    electionYear: 2026,
    office: ELECTORAL_OFFICE.SENATOR,
    number: id === "senator-a" ? "100" : "200",
    ballotName: id,
    party: "EXM",
    photoPath: null,
    status,
    jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
  };
}

describe("sessão efêmera de seleção", () => {
  it("seleciona e substitui o candidato de um slot", () => {
    const session = startSelectionSession(ELECTION_2026, {
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const first = selectCandidateInSession(session, "SENATOR:1", senator("senator-a"));
    if (!first.ok) {
      throw new Error("A primeira seleção deveria ser aceita.");
    }
    const replacement = selectCandidateInSession(
      first.session,
      "SENATOR:1",
      senator("senator-b"),
    );

    expect(replacement.ok).toBe(true);
    if (replacement.ok) {
      expect(replacement.session.selections["SENATOR:1"]).toEqual({
        type: VOTE_CHOICE_TYPE.CANDIDATE,
        candidateId: "senator-b",
        office: ELECTORAL_OFFICE.SENATOR,
      });
    }
  });

  it("substitui apenas o cargo escolhido e preserva as demais escolhas", () => {
    const session = startSelectionSession(ELECTION_2026, {
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const first = selectCandidateInSession(
      session,
      "SENATOR:1",
      senator("senator-a"),
    );
    if (!first.ok) throw new Error("A primeira seleção deveria ser aceita.");
    const second = selectCandidateInSession(
      first.session,
      "SENATOR:2",
      senator("senator-b"),
    );
    if (!second.ok) throw new Error("A segunda seleção deveria ser aceita.");

    const replacement = selectNonCandidateInSession(
      second.session,
      "SENATOR:1",
      { type: VOTE_CHOICE_TYPE.BLANK },
    );

    expect(replacement).toMatchObject({
      ok: true,
      session: {
        selections: {
          "SENATOR:1": { type: VOTE_CHOICE_TYPE.BLANK },
          "SENATOR:2": {
            type: VOTE_CHOICE_TYPE.CANDIDATE,
            candidateId: "senator-b",
            office: ELECTORAL_OFFICE.SENATOR,
          },
        },
      },
    });
  });

  it("seleciona branco, nulo e legenda sem criar candidatos falsos", () => {
    const session = startSelectionSession(ELECTION_2026, {
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const blank = selectNonCandidateInSession(session, "PRESIDENT:1", {
      type: VOTE_CHOICE_TYPE.BLANK,
    });
    if (!blank.ok) throw new Error("Voto em branco deveria ser aceito.");
    const nullVote = selectNonCandidateInSession(blank.session, "GOVERNOR:1", {
      type: VOTE_CHOICE_TYPE.NULL,
    });
    if (!nullVote.ok) throw new Error("Voto nulo deveria ser aceito.");
    const party = selectNonCandidateInSession(
      nullVote.session,
      "FEDERAL_DEPUTY:1",
      {
        type: VOTE_CHOICE_TYPE.PARTY,
        party: "ABC",
        partyNumber: "13",
      },
    );

    expect(party).toMatchObject({
      ok: true,
      session: {
        selections: {
          "PRESIDENT:1": { type: VOTE_CHOICE_TYPE.BLANK },
          "GOVERNOR:1": { type: VOTE_CHOICE_TYPE.NULL },
          "FEDERAL_DEPUTY:1": {
            type: VOTE_CHOICE_TYPE.PARTY,
            party: "ABC",
            partyNumber: "13",
          },
        },
      },
    });
  });

  it("preserva a validação contra senador repetido", () => {
    const session = startSelectionSession(ELECTION_2026, {
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const first = selectCandidateInSession(session, "SENATOR:1", senator("senator-a"));
    if (!first.ok) {
      throw new Error("A primeira seleção deveria ser aceita.");
    }

    const duplicate = selectCandidateInSession(
      first.session,
      "SENATOR:2",
      senator("senator-a"),
    );

    expect(duplicate).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_CANDIDATE" },
    });
  });

  it("rejeita candidato de outro cargo", () => {
    const session = startSelectionSession(ELECTION_2026, {
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const wrongOffice = {
      ...senator("senator-a"),
      office: ELECTORAL_OFFICE.GOVERNOR,
    };

    const result = selectCandidateInSession(
      session,
      "SENATOR:1",
      wrongOffice,
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "OFFICE_MISMATCH" },
    });
  });

  it("permite candidatura pendente e rejeita candidatura não exibível", () => {
    const session = startSelectionSession(ELECTION_2026, {
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });

    expect(
      selectCandidateInSession(
        session,
        "SENATOR:1",
        senator("senator-pending", CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS),
      ).ok,
    ).toBe(true);
    expect(
      selectCandidateInSession(
        session,
        "SENATOR:1",
        senator("senator-hidden", CANDIDATE_STATUS.NOT_DISPLAYABLE),
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "CANDIDATE_NOT_SELECTABLE" },
    });
  });

  it("limpa escolhas ao trocar a UF", () => {
    const session = startSelectionSession(ELECTION_2026, {
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const selected = selectCandidateInSession(
      session,
      "SENATOR:1",
      senator("senator-a"),
    );
    if (!selected.ok) {
      throw new Error("A seleção deveria ser aceita.");
    }

    const changed = changeSelectionLocation(selected.session, {
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "DF",
    });

    expect(changed.location).toEqual({ scope: TERRITORIAL_SCOPE.STATE, uf: "DF" });
    expect(changed.selections).toEqual({});
    expect(changed.slots[1]?.office).toBe(ELECTORAL_OFFICE.DISTRICT_DEPUTY);
  });
});
