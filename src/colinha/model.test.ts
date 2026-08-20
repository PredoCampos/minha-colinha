import { describe, expect, it } from "vitest";

import { CANDIDATE_STATUS, type Candidate } from "../candidates/model.ts";
import { ELECTION_2026 } from "../election/elections.ts";
import {
  ELECTORAL_OFFICE,
  TERRITORIAL_SCOPE,
  type CandidateSelections,
  type ElectoralLocation,
} from "../election/types.ts";
import { startSelectionSession, type SelectionSession } from "../selection/session.ts";
import { composeColinhaModel } from "./model.ts";

function completeSession(location: ElectoralLocation): {
  session: SelectionSession;
  candidates: readonly Candidate[];
} {
  const session = startSelectionSession(ELECTION_2026, location);
  const candidates = session.slots.map(
    (slot): Candidate => ({
      id: `fixture-${slot.id}`,
      electionYear: 2026,
      office: slot.office,
      number: String(slot.order * 10),
      ballotName: `EXEMPLO ${slot.order}`,
      party: "EXM",
      photoPath: slot.office === ELECTORAL_OFFICE.GOVERNOR ? null : "data/photo.svg",
      status: CANDIDATE_STATUS.DISPLAYABLE,
      jurisdiction:
        slot.scope === TERRITORIAL_SCOPE.NATIONAL
          ? { scope: TERRITORIAL_SCOPE.NATIONAL }
          : location,
    }),
  );
  const selections = Object.fromEntries(
    session.slots.map((slot) => [slot.id, `fixture-${slot.id}`]),
  ) as CandidateSelections;

  return { session: { ...session, selections }, candidates };
}

describe("composição do modelo da colinha", () => {
  it("preserva os seis slots de SP na ordem oficial", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const model = composeColinhaModel(
      session,
      candidates,
      "DADOS FICTÍCIOS",
    );

    expect(model.electionLabel).toBe("Eleições Gerais 2026");
    expect(model.notice).toBe("DADOS FICTÍCIOS");
    expect(model.rows.map(({ officeLabel }) => officeLabel)).toEqual([
      "Deputado Federal",
      "Deputado Estadual",
      "Senador — 1ª escolha",
      "Senador — 2ª escolha",
      "Governador",
      "Presidente da República",
    ]);
    expect(model.rows.map(({ order }) => order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("mantém os dois senadores como linhas separadas", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const model = composeColinhaModel(session, candidates);

    expect(model.rows.slice(2, 4).map(({ slotId, candidate }) => [
      slotId,
      candidate?.id,
    ])).toEqual([
      ["SENATOR:1", "fixture-SENATOR:1"],
      ["SENATOR:2", "fixture-SENATOR:2"],
    ]);
  });

  it("usa Deputado Distrital para o DF", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "DF",
    });
    const model = composeColinhaModel(session, candidates);

    expect(model.rows[1]).toMatchObject({
      slotId: "DISTRICT_DEPUTY:1",
      officeLabel: "Deputado Distrital",
    });
  });

  it("preserva photoPath null para o placeholder da exportação", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const model = composeColinhaModel(session, candidates);

    expect(model.rows[4]?.candidate?.photoPath).toBeNull();
  });

  it("representa escolha ausente ou incompatível como posição vazia", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const selections = { ...session.selections };
    delete selections["FEDERAL_DEPUTY:1"];
    const wrongOfficeCandidates = candidates.map((candidate) =>
      candidate.id === "fixture-SENATOR:1"
        ? { ...candidate, office: ELECTORAL_OFFICE.GOVERNOR }
        : candidate,
    );
    const model = composeColinhaModel(
      { ...session, selections },
      wrongOfficeCandidates,
    );

    expect(model.rows[0]?.candidate).toBeNull();
    expect(model.rows[2]?.candidate).toBeNull();
  });

  it("não compõe uma candidatura não exibível no PNG", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const unavailableCandidates = candidates.map((candidate) =>
      candidate.id === "fixture-PRESIDENT:1"
        ? { ...candidate, status: CANDIDATE_STATUS.NOT_DISPLAYABLE }
        : candidate,
    );

    const model = composeColinhaModel(session, unavailableCandidates);

    expect(model.rows[5]?.candidate).toBeNull();
  });
});
