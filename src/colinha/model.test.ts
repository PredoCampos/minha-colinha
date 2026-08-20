import { describe, expect, it } from "vitest";

import { CANDIDATE_STATUS, type Candidate } from "../candidates/model.ts";
import { ELECTION_2026 } from "../election/elections.ts";
import {
  ELECTORAL_OFFICE,
  TERRITORIAL_SCOPE,
  VOTE_CHOICE_TYPE,
  type VoteSelections,
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
    session.slots.map((slot) => [
      slot.id,
      {
        type: VOTE_CHOICE_TYPE.CANDIDATE,
        candidateId: `fixture-${slot.id}`,
        office: slot.office,
      },
    ]),
  ) as VoteSelections;

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
      {
        notice: "DADOS FICTÍCIOS",
        snapshotImportedAt: "2026-08-20T15:00:00.000Z",
      },
    );

    expect(model.electionLocationLabel).toBe(
      "Eleições Gerais 2026 · São Paulo (SP)",
    );
    expect(model.notice).toBe("DADOS FICTÍCIOS");
    expect(model.dataUpdatedLabel).toBe(
      "Dados do TSE atualizados em 20/08/2026",
    );
    expect(model.rows.map(({ officeLabel }) => officeLabel)).toEqual([
      "Deputado Federal",
      "Deputado Estadual",
      "Senador — 1ª escolha",
      "Senador — 2ª escolha",
      "Governador",
      "Presidente",
    ]);
    expect(model.rows.map(({ order }) => order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("mantém os dois senadores como linhas separadas", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const model = composeColinhaModel(session, candidates);

    expect(model.rows.slice(2, 4).map(({ slotId, choice }) => [
      slotId,
      choice?.type === VOTE_CHOICE_TYPE.CANDIDATE ? choice.id : undefined,
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

    const choice = model.rows[4]?.choice;
    expect(choice?.type).toBe(VOTE_CHOICE_TYPE.CANDIDATE);
    if (choice?.type === VOTE_CHOICE_TYPE.CANDIDATE) {
      expect(choice.photoPath).toBeNull();
    }
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

    expect(model.rows[0]?.choice).toBeNull();
    expect(model.rows[2]?.choice).toBeNull();
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

    expect(model.rows[5]?.choice).toBeNull();
  });

  it("sinaliza candidatura pendente e mantém posições não preenchidas", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "MA",
    });
    const pendingCandidates = candidates.map((candidate) =>
      candidate.id === "fixture-SENATOR:1"
        ? {
            ...candidate,
            status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
          }
        : candidate,
    );
    const model = composeColinhaModel(
      {
        ...session,
        selections: {
          "SENATOR:1": {
            type: VOTE_CHOICE_TYPE.CANDIDATE,
            candidateId: "fixture-SENATOR:1",
            office: ELECTORAL_OFFICE.SENATOR,
          },
        },
      },
      pendingCandidates,
    );

    expect(model.electionLocationLabel).toContain("Maranhão (MA)");
    const pendingChoice = model.rows[2]?.choice;
    expect(
      pendingChoice?.type === VOTE_CHOICE_TYPE.CANDIDATE &&
        pendingChoice.pendingOrAmbiguous,
    ).toBe(true);
    expect(model.rows.filter(({ choice }) => choice === null)).toHaveLength(5);
  });

  it("omite posições não preenchidas somente quando solicitado para o PNG", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const partialSession = {
      ...session,
      selections: {
        "PRESIDENT:1": session.selections["PRESIDENT:1"]!,
      },
    };

    const completeLayout = composeColinhaModel(partialSession, candidates);
    const filledOnly = composeColinhaModel(partialSession, candidates, {
      omitEmptyRows: true,
    });

    expect(completeLayout.rows).toHaveLength(6);
    expect(filledOnly.rows).toHaveLength(1);
    expect(filledOnly.rows[0]).toMatchObject({
      slotId: "PRESIDENT:1",
      order: 6,
      choice: { type: VOTE_CHOICE_TYPE.CANDIDATE },
    });
  });

  it("compõe candidato, legenda, branco e nulo como escolhas distintas", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const model = composeColinhaModel(
      {
        ...session,
        selections: {
          "FEDERAL_DEPUTY:1": {
            type: VOTE_CHOICE_TYPE.PARTY,
            party: "ABC",
            partyNumber: "13",
          },
          "STATE_DEPUTY:1": { type: VOTE_CHOICE_TYPE.BLANK },
          "GOVERNOR:1": { type: VOTE_CHOICE_TYPE.NULL },
          "PRESIDENT:1": {
            type: VOTE_CHOICE_TYPE.CANDIDATE,
            candidateId: "fixture-PRESIDENT:1",
            office: ELECTORAL_OFFICE.PRESIDENT,
          },
        },
      },
      candidates,
    );

    expect(model.rows[0]?.choice).toEqual({
      type: VOTE_CHOICE_TYPE.PARTY,
      party: "ABC",
      partyNumber: "13",
    });
    expect(model.rows[1]?.choice).toEqual({ type: VOTE_CHOICE_TYPE.BLANK });
    expect(model.rows[4]?.choice).toEqual({ type: VOTE_CHOICE_TYPE.NULL });
    expect(model.rows[5]?.choice?.type).toBe(VOTE_CHOICE_TYPE.CANDIDATE);
  });

  it("não aceita legenda forjada em cargo majoritário", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });
    const model = composeColinhaModel(
      {
        ...session,
        selections: {
          "PRESIDENT:1": {
            type: VOTE_CHOICE_TYPE.PARTY,
            party: "ABC",
            partyNumber: "13",
          },
        },
      },
      candidates,
    );

    expect(model.rows[5]?.choice).toBeNull();
  });

  it("rejeita data inválida de atualização", () => {
    const { session, candidates } = completeSession({
      scope: TERRITORIAL_SCOPE.STATE,
      uf: "SP",
    });

    expect(() =>
      composeColinhaModel(session, candidates, {
        snapshotImportedAt: "data-inválida",
      }),
    ).toThrow("data de atualização");
  });
});
