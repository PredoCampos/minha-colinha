import { validateCandidate } from "../../src/candidates/validation.ts";
import { candidateOfficePathSegment } from "../../src/candidates/office-paths.ts";
import {
  ELECTORAL_OFFICE,
  FEDERATIVE_UNITS,
  TERRITORIAL_SCOPE,
  type ElectoralLocation,
  type ElectoralOffice,
  type FederativeUnit,
} from "../../src/election/types.ts";
import { TSE_2026 } from "./config.ts";
import {
  mapTseOffice,
  resolveTseCandidateStatus,
} from "./mappings.ts";
import type {
  NormalizationResult,
  PhotoIndex,
  TseCandidateRow,
  TseCandidateSupplementRow,
} from "./types.ts";

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function requiredDigits(value: string, field: string): string {
  if (!/^\d+$/.test(value)) throw new Error(`${field} inválido: ${value || "<vazio>"}.`);
  return value;
}

function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) throw new Error(`${field} está vazio.`);
  return normalized;
}

function sourceGeneratedAt(date: string, time: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(
    `${date} ${time}`,
  );
  if (!match) throw new Error(`Data de geração TSE inválida: ${date} ${time}.`);

  const [, day, month, year, hour, minute, second] = match;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) + 3,
    Number(minute),
    Number(second),
  );
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data de geração TSE inválida: ${date} ${time}.`);
  }
  return parsed.toISOString();
}

function assertGeneration(
  expected: string,
  row: Pick<TseCandidateRow, "generatedDate" | "generatedTime">,
): void {
  const current = sourceGeneratedAt(row.generatedDate, row.generatedTime);
  if (current !== expected) {
    throw new Error(`O pacote mistura extrações TSE (${expected} e ${current}).`);
  }
}

function isFederativeUnit(value: string): value is FederativeUnit {
  return FEDERATIVE_UNITS.includes(value as FederativeUnit);
}

function jurisdictionFor(
  office: ElectoralOffice,
  row: TseCandidateRow,
): { readonly jurisdiction: ElectoralLocation; readonly partition: string } {
  if (office === ELECTORAL_OFFICE.PRESIDENT) {
    if (row.scope !== "FEDERAL" || row.uf !== "BR" || row.electoralUnit !== "BR") {
      throw new Error(`Presidente ${row.sequenceId} não possui circunscrição nacional BR.`);
    }
    return { jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL }, partition: "BR" };
  }

  if (
    row.scope !== "ESTADUAL" ||
    !isFederativeUnit(row.uf) ||
    row.electoralUnit !== row.uf
  ) {
    throw new Error(`Candidatura estadual ${row.sequenceId} possui circunscrição inválida.`);
  }
  if (office === ELECTORAL_OFFICE.DISTRICT_DEPUTY && row.uf !== "DF") {
    throw new Error(`Deputado distrital ${row.sequenceId} está fora do DF.`);
  }
  if (office === ELECTORAL_OFFICE.STATE_DEPUTY && row.uf === "DF") {
    throw new Error(`O DF não pode produzir Deputado Estadual (${row.sequenceId}).`);
  }

  return {
    jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: row.uf },
    partition: row.uf,
  };
}

function indexSupplements(
  rows: readonly TseCandidateSupplementRow[],
): ReadonlyMap<string, TseCandidateSupplementRow> {
  const bySequence = new Map<string, TseCandidateSupplementRow>();
  for (const row of rows) {
    requiredDigits(row.sequenceId, "SQ_CANDIDATO complementar");
    if (bySequence.has(row.sequenceId)) {
      throw new Error(`SQ_CANDIDATO duplicado no arquivo complementar: ${row.sequenceId}.`);
    }
    bySequence.set(row.sequenceId, row);
  }
  return bySequence;
}

export function normalizeTseCandidates(
  candidateRows: readonly TseCandidateRow[],
  supplementRows: readonly TseCandidateSupplementRow[],
  photos: PhotoIndex,
): NormalizationResult {
  if (candidateRows.length === 0) throw new Error("O CSV de candidaturas está vazio.");
  if (candidateRows.length !== supplementRows.length) {
    throw new Error(
      `Arquivos principal e complementar divergem: ${candidateRows.length} / ${supplementRows.length} linhas.`,
    );
  }

  const supplements = indexSupplements(supplementRows);
  const seen = new Set<string>();
  const candidates = [];
  const ignoredOfficeCounts: Record<string, number> = {};
  const sourceStatusCounts: Record<string, number> = {};
  const internalStatusCounts: Record<string, number> = {};
  let missingPhotoCount = 0;
  const generatedAt = sourceGeneratedAt(
    candidateRows[0]?.generatedDate ?? "",
    candidateRows[0]?.generatedTime ?? "",
  );

  for (const row of candidateRows) {
    assertGeneration(generatedAt, row);
    if (row.electionYear !== String(TSE_2026.electionYear)) {
      throw new Error(`Ano eleitoral inesperado em ${row.sequenceId}: ${row.electionYear}.`);
    }
    requiredDigits(row.sequenceId, "SQ_CANDIDATO");
    if (seen.has(row.sequenceId)) {
      throw new Error(`SQ_CANDIDATO duplicado: ${row.sequenceId}.`);
    }
    seen.add(row.sequenceId);

    const supplement = supplements.get(row.sequenceId);
    if (!supplement) {
      throw new Error(`Não há registro complementar para SQ_CANDIDATO ${row.sequenceId}.`);
    }
    assertGeneration(generatedAt, supplement);
    if (supplement.electionYear !== row.electionYear) {
      throw new Error(`Ano divergente no registro complementar ${row.sequenceId}.`);
    }

    const status = resolveTseCandidateStatus(
      row.candidacyStatusCode,
      row.candidacyStatusDescription,
      supplement.judgmentStatusCode,
      supplement.judgmentStatusDescription,
    );
    const office = mapTseOffice(row.officeCode, row.officeDescription);
    if (!office) {
      increment(ignoredOfficeCounts, `${row.officeCode} ${row.officeDescription}`);
      continue;
    }

    increment(
      sourceStatusCounts,
      `${supplement.judgmentStatusCode} ${supplement.judgmentStatusDescription}`,
    );
    increment(internalStatusCounts, status);

    const { jurisdiction, partition } = jurisdictionFor(office, row);
    const photo = photos.get(partition)?.get(row.sequenceId);
    if (!photo) missingPhotoCount += 1;

    const candidate = {
      id: row.sequenceId,
      electionYear: TSE_2026.electionYear,
      office,
      number: requiredDigits(row.number, `NR_CANDIDATO ${row.sequenceId}`),
      ballotName: requiredText(row.ballotName, `NM_URNA_CANDIDATO ${row.sequenceId}`),
      party: requiredText(row.party, `SG_PARTIDO ${row.sequenceId}`),
      photoPath: photo
        ? `data/2026/${partition}/${candidateOfficePathSegment(office)}/photos/${row.sequenceId}.jpg`
        : null,
      status,
      jurisdiction,
    } as const;
    const validation = validateCandidate(candidate);
    if (!validation.ok) {
      throw new Error(
        `Candidato normalizado inválido (${row.sequenceId}): ${validation.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; ")}`,
      );
    }
    candidates.push(validation.value);
  }

  for (const sequenceId of supplements.keys()) {
    if (!seen.has(sequenceId)) {
      throw new Error(`Registro complementar sem candidatura principal: ${sequenceId}.`);
    }
  }

  candidates.sort((left, right) => {
    const partitionLeft = left.jurisdiction.scope === "NATIONAL" ? "BR" : left.jurisdiction.uf;
    const partitionRight = right.jurisdiction.scope === "NATIONAL" ? "BR" : right.jurisdiction.uf;
    return (
      partitionLeft.localeCompare(partitionRight, "pt-BR") ||
      left.office.localeCompare(right.office, "pt-BR") ||
      Number(left.number) - Number(right.number) ||
      left.ballotName.localeCompare(right.ballotName, "pt-BR") ||
      left.id.localeCompare(right.id)
    );
  });

  return {
    candidates,
    sourceGeneratedAt: generatedAt,
    rawCandidateCount: candidateRows.length,
    ignoredOfficeCounts,
    sourceStatusCounts,
    internalStatusCounts,
    missingPhotoCount,
  };
}
