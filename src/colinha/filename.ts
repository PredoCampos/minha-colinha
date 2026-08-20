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
      ? "br"
      : location.scope === TERRITORIAL_SCOPE.STATE
        ? location.uf.toLocaleLowerCase("pt-BR")
        : `${location.uf.toLocaleLowerCase("pt-BR")}-${location.municipalityCode}`;
  return `minha-colinha-${electionYear}-${locationSegment}.png`;
}
