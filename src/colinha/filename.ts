import {
  TERRITORIAL_SCOPE,
  type ElectoralLocation,
} from "../election/types.ts";

export function colinhaFileName(
  electionYear: number,
  location: ElectoralLocation,
): string {
  const locationSegment =
    location.scope === TERRITORIAL_SCOPE.NATIONAL
      ? "BR"
      : location.scope === TERRITORIAL_SCOPE.STATE
        ? location.uf
        : `${location.uf}-${location.municipalityCode}`;
  return `minha-colinha-${electionYear}-${locationSegment}.png`;
}
