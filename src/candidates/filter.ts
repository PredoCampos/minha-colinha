import {
  TERRITORIAL_SCOPE,
  type ElectoralLocation,
  type ElectoralOffice,
} from "../election/types.ts";
import type { Candidate } from "./model.ts";

export interface CandidateFilter {
  readonly electionYear: number;
  readonly office: ElectoralOffice;
  readonly location: ElectoralLocation;
}

function appliesToLocation(
  candidateLocation: ElectoralLocation,
  userLocation: ElectoralLocation,
): boolean {
  if (candidateLocation.scope === TERRITORIAL_SCOPE.NATIONAL) {
    return true;
  }
  if (userLocation.scope === TERRITORIAL_SCOPE.NATIONAL) {
    return false;
  }
  if (candidateLocation.uf !== userLocation.uf) {
    return false;
  }
  if (candidateLocation.scope === TERRITORIAL_SCOPE.STATE) {
    return true;
  }
  return (
    userLocation.scope === TERRITORIAL_SCOPE.MUNICIPALITY &&
    candidateLocation.municipalityCode === userLocation.municipalityCode
  );
}

export function filterCandidates(
  candidates: readonly Candidate[],
  filter: CandidateFilter,
): readonly Candidate[] {
  return candidates.filter(
    (candidate) =>
      candidate.electionYear === filter.electionYear &&
      candidate.office === filter.office &&
      appliesToLocation(candidate.jurisdiction, filter.location),
  );
}
