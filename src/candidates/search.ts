import { isCandidateSelectable } from "./availability.ts";
import type { Candidate } from "./model.ts";

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function compareCandidates(first: Candidate, second: Candidate): number {
  const numberLength = first.number.length - second.number.length;
  if (numberLength !== 0) {
    return numberLength;
  }

  const numberOrder = first.number.localeCompare(second.number);
  if (numberOrder !== 0) {
    return numberOrder;
  }

  const nameOrder = normalizeSearchText(first.ballotName).localeCompare(
    normalizeSearchText(second.ballotName),
  );
  return nameOrder !== 0 ? nameOrder : first.id.localeCompare(second.id);
}

export function searchCandidates(
  candidates: readonly Candidate[],
  query: string,
): readonly Candidate[] {
  const normalizedQuery = normalizeSearchText(query);

  return candidates
    .filter(
      (candidate) =>
        isCandidateSelectable(candidate) &&
        (normalizedQuery.length === 0 ||
          candidate.number.includes(normalizedQuery) ||
          normalizeSearchText(candidate.ballotName).includes(normalizedQuery)),
    )
    .sort(compareCandidates);
}
