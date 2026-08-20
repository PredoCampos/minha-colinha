import type { Candidate } from "../candidates/model.ts";
import {
  isCandidatePendingOrAmbiguous,
  isCandidateSelectable,
} from "../candidates/availability.ts";
import { ELECTION_TYPE, TERRITORIAL_SCOPE } from "../election/types.ts";
import { STATE_NAMES } from "../location/states.ts";
import type { SelectionSession } from "../selection/session.ts";

export interface ColinhaCandidate {
  readonly id: string;
  readonly number: string;
  readonly ballotName: string;
  readonly party: string;
  readonly photoPath: string | null;
  readonly pendingOrAmbiguous: boolean;
}

export interface ColinhaRow {
  readonly slotId: string;
  readonly order: number;
  readonly officeLabel: string;
  readonly candidate: ColinhaCandidate | null;
}

export interface ColinhaModel {
  readonly title: "Minha Colinha";
  readonly electionLocationLabel: string;
  readonly notice: string | null;
  readonly dataUpdatedLabel: string | null;
  readonly rows: readonly ColinhaRow[];
}

export interface ComposeColinhaOptions {
  readonly notice?: string | null;
  readonly snapshotImportedAt?: string | null;
}

function electionLocationLabel(session: SelectionSession): string {
  const electionName =
    session.election.type === ELECTION_TYPE.GENERAL
      ? "Eleições Gerais"
      : session.election.type === ELECTION_TYPE.MUNICIPAL
        ? "Eleições Municipais"
        : "Eleição";
  const location =
    session.location.scope === TERRITORIAL_SCOPE.NATIONAL
      ? "Brasil"
      : session.location.scope === TERRITORIAL_SCOPE.STATE
        ? `${STATE_NAMES[session.location.uf]} (${session.location.uf})`
        : `${session.location.municipalityName} (${session.location.uf})`;
  return `${electionName} ${session.election.year} · ${location}`;
}

function dataUpdatedLabel(importedAt: string | null | undefined): string | null {
  if (!importedAt) {
    return null;
  }
  const importedDate = new Date(importedAt);
  if (Number.isNaN(importedDate.getTime())) {
    throw new Error("A data de atualização do snapshot é inválida.");
  }
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(importedDate);
  return `Dados do TSE atualizados em ${formattedDate}`;
}

export function composeColinhaModel(
  session: SelectionSession,
  candidates: readonly Candidate[],
  options: ComposeColinhaOptions = {},
): ColinhaModel {
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );

  return {
    title: "Minha Colinha",
    electionLocationLabel: electionLocationLabel(session),
    notice: options.notice ?? null,
    dataUpdatedLabel: dataUpdatedLabel(options.snapshotImportedAt),
    rows: session.slots.map((slot) => {
      const candidateId = session.selections[slot.id];
      const candidate = candidateId ? candidatesById.get(candidateId) : undefined;
      const validCandidate =
        candidate?.office === slot.office && isCandidateSelectable(candidate)
          ? candidate
          : undefined;

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
              pendingOrAmbiguous:
                isCandidatePendingOrAmbiguous(validCandidate),
            }
          : null,
      };
    }),
  };
}
