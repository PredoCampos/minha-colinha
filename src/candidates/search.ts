import { isCandidateSelectable } from "./availability.ts";
import type { Candidate } from "./model.ts";

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function searchTokens(value: string): readonly string[] {
  return normalizeSearchText(value).match(/[a-z0-9]+/g) ?? [];
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
  const queryTokens = searchTokens(query);
  const isNumericQuery = /^\d+$/.test(normalizedQuery);

  return candidates
    .filter(
      (candidate) =>
        isCandidateSelectable(candidate) &&
        (normalizedQuery.length === 0 ||
          (isNumericQuery
            ? candidate.number.startsWith(normalizedQuery)
            : queryTokens.every((queryToken) =>
                searchTokens(candidate.ballotName).some((nameToken) =>
                  nameToken.startsWith(queryToken),
                ),
              ))),
    )
    .sort(compareCandidates);
}

export const MAX_VISIBLE_CANDIDATE_RESULTS = 20;

export interface CandidateSearchPage {
  readonly candidates: readonly Candidate[];
  readonly total: number;
}

export function visibleCandidateSearchResults(
  candidates: readonly Candidate[],
  query: string,
): CandidateSearchPage {
  const matches = searchCandidates(candidates, query);
  return {
    candidates: matches.slice(0, MAX_VISIBLE_CANDIDATE_RESULTS),
    total: matches.length,
  };
}
