import {
  TERRITORIAL_SCOPE,
  type ElectoralLocation,
  type ElectoralOffice,
  type VotingSlot,
} from "../election/types.ts";
import type { CandidateFile } from "./model.ts";
import type { CandidateFileRequest } from "./paths.ts";

export type CandidateFileLoader = (
  request: CandidateFileRequest,
) => Promise<CandidateFile>;

export interface CandidateBatch {
  readonly files: ReadonlyMap<ElectoralOffice, CandidateFile>;
  readonly errors: ReadonlyMap<ElectoralOffice, Error>;
}

function jurisdictionForSlot(
  slot: VotingSlot,
  userLocation: ElectoralLocation,
): ElectoralLocation {
  if (slot.scope === TERRITORIAL_SCOPE.NATIONAL) {
    return { scope: TERRITORIAL_SCOPE.NATIONAL };
  }

  if (userLocation.scope === TERRITORIAL_SCOPE.NATIONAL) {
    throw new Error("O cargo exige uma circunscrição mais específica.");
  }

  if (slot.scope === TERRITORIAL_SCOPE.STATE) {
    return { scope: TERRITORIAL_SCOPE.STATE, uf: userLocation.uf };
  }

  if (userLocation.scope !== TERRITORIAL_SCOPE.MUNICIPALITY) {
    throw new Error("O cargo exige uma circunscrição municipal.");
  }

  return userLocation;
}

export function candidateRequestsForSlots(
  electionYear: number,
  userLocation: ElectoralLocation,
  slots: readonly VotingSlot[],
): readonly CandidateFileRequest[] {
  const requests = new Map<ElectoralOffice, CandidateFileRequest>();

  for (const slot of slots) {
    if (!requests.has(slot.office)) {
      requests.set(slot.office, {
        electionYear,
        office: slot.office,
        jurisdiction: jurisdictionForSlot(slot, userLocation),
      });
    }
  }

  return [...requests.values()];
}

export async function loadCandidatesForSlots(
  electionYear: number,
  userLocation: ElectoralLocation,
  slots: readonly VotingSlot[],
  loader: CandidateFileLoader,
): Promise<CandidateBatch> {
  const files = new Map<ElectoralOffice, CandidateFile>();
  const errors = new Map<ElectoralOffice, Error>();
  const requests = candidateRequestsForSlots(electionYear, userLocation, slots);

  await Promise.all(
    requests.map(async (request) => {
      try {
        files.set(request.office, await loader(request));
      } catch (error) {
        errors.set(
          request.office,
          error instanceof Error
            ? error
            : new Error("Falha desconhecida ao carregar candidatos."),
        );
      }
    }),
  );

  return { files, errors };
}
