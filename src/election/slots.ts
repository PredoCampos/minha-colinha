import { officeLabel } from "./offices.ts";
import {
  type ElectionConfig,
  type ElectionRoundId,
  type ElectoralLocation,
  type OfficeConfig,
  TERRITORIAL_SCOPE,
  type VotingSlot,
  type VotingSlotId,
} from "./types.ts";

function assertCompatibleLocation(
  election: ElectionConfig,
  location: ElectoralLocation,
): void {
  if (location.scope !== election.locationScope) {
    throw new Error(
      `A eleição de ${election.year} exige localização com escopo ${election.locationScope}.`,
    );
  }
}

function resolveOffice(
  election: ElectionConfig,
  location: ElectoralLocation,
  config: OfficeConfig,
): OfficeConfig {
  if (location.scope === TERRITORIAL_SCOPE.NATIONAL) {
    return config;
  }

  const replacement = election.territorialExceptions.find(
    (exception) =>
      exception.uf === location.uf && exception.replace === config.office,
  );

  return replacement ? { ...config, office: replacement.with } : config;
}

function slotLabel(config: OfficeConfig, choiceNumber: number): string {
  const label = officeLabel(config.office);
  return config.choices === 1
    ? label
    : `${label} — ${choiceNumber}ª escolha`;
}

export function generateVotingSlots(
  election: ElectionConfig,
  location: ElectoralLocation,
  roundId: ElectionRoundId = election.defaultRoundId,
): readonly VotingSlot[] {
  assertCompatibleLocation(election, location);
  const round = election.rounds.find(({ id }) => id === roundId);
  if (!round) {
    throw new Error(`O turno ${roundId} não existe na eleição de ${election.year}.`);
  }
  if (!round.offices) {
    throw new Error(`As disputas de ${round.label} ainda não foram configuradas.`);
  }

  const orderedOffices = [...round.offices].sort(
    (first, second) => first.order - second.order,
  );
  const slots: VotingSlot[] = [];

  for (const configuredOffice of orderedOffices) {
    const office = resolveOffice(election, location, configuredOffice);

    for (let choiceNumber = 1; choiceNumber <= office.choices; choiceNumber += 1) {
      slots.push({
        id: `${office.office}:${choiceNumber}` as VotingSlotId,
        office: office.office,
        choiceNumber,
        order: slots.length + 1,
        scope: office.scope,
        label: slotLabel(office, choiceNumber),
        requireDistinctCandidates: office.requireDistinctCandidates,
        allowPartyVote: office.allowPartyVote,
      });
    }
  }

  return slots;
}
