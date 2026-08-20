import type { Candidate } from "../candidates/model.ts";
import { ELECTION_TYPE } from "../election/types.ts";
import type { SelectionSession } from "../selection/session.ts";

export interface ColinhaCandidate {
  readonly id: string;
  readonly number: string;
  readonly ballotName: string;
  readonly party: string;
  readonly photoPath: string | null;
}

export interface ColinhaRow {
  readonly slotId: string;
  readonly order: number;
  readonly officeLabel: string;
  readonly candidate: ColinhaCandidate | null;
}

export interface ColinhaModel {
  readonly title: "Minha Colinha";
  readonly electionLabel: string;
  readonly notice: string | null;
  readonly rows: readonly ColinhaRow[];
}

function electionLabel(session: SelectionSession): string {
  const electionName =
    session.election.type === ELECTION_TYPE.GENERAL
      ? "Eleições Gerais"
      : session.election.type === ELECTION_TYPE.MUNICIPAL
        ? "Eleições Municipais"
        : "Eleição";
  return `${electionName} ${session.election.year}`;
}

export function composeColinhaModel(
  session: SelectionSession,
  candidates: readonly Candidate[],
  notice: string | null = null,
): ColinhaModel {
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );

  return {
    title: "Minha Colinha",
    electionLabel: electionLabel(session),
    notice,
    rows: session.slots.map((slot) => {
      const candidateId = session.selections[slot.id];
      const candidate = candidateId ? candidatesById.get(candidateId) : undefined;
      const validCandidate =
        candidate?.office === slot.office ? candidate : undefined;

      return {
        slotId: slot.id,
        order: slot.order,
        officeLabel: slot.label,
        candidate: validCandidate
          ? {
              id: validCandidate.id,
              number: validCandidate.number,
              ballotName: validCandidate.ballotName,
              party: validCandidate.party,
              photoPath: validCandidate.photoPath,
            }
          : null,
      };
    }),
  };
}
