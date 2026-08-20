import { describe, expect, it } from "vitest";

import type { Candidate } from "../candidates/model.ts";
import { CANDIDATE_STATUS } from "../candidates/model.ts";
import { ELECTION_2026 } from "../election/elections.ts";
import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../election/types.ts";
import {
  changeSelectionLocation,
  selectCandidateInSession,
  startSelectionSession,
} from "./session.ts";

function senator(id: string): Candidate {
  return {
    id,
    electionYear: 2026,
    office: ELECTORAL_OFFICE.SENATOR,
    number: id === "senator-a" ? "100" : "200",
    ballotName: id,
    party: "EXM",
    photoPath: null,
    status: CANDIDATE_STATUS.DISPLAYABLE,
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
      expect(replacement.session.selections["SENATOR:1"]).toBe("senator-b");
    }
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
