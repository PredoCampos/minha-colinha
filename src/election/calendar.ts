import type {
  ElectionConfig,
  ElectionRoundConfig,
} from "./types.ts";

export interface ElectionCalendarEntry {
  readonly id: ElectionRoundConfig["id"];
  readonly label: string;
  readonly date: ElectionRoundConfig["date"];
  readonly dateLabel: string;
  readonly disputesConfigured: boolean;
}

export function formatElectionDate(date: ElectionRoundConfig["date"]): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Data eleitoral inválida: ${date}.`);
  }
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data eleitoral inválida: ${date}.`);
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function electionCalendar(
  election: ElectionConfig,
): readonly ElectionCalendarEntry[] {
  return election.rounds.map((round) => ({
    id: round.id,
    label: round.label,
    date: round.date,
    dateLabel: formatElectionDate(round.date),
    disputesConfigured: round.offices !== null,
  }));
}
