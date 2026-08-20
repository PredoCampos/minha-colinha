import { publicPath } from "../shared/paths.ts";

export interface CandidateSnapshotMetadata {
  readonly schemaVersion: 1;
  readonly year: number;
  readonly provider: string;
  readonly dataset: string;
  readonly sourceUrl: string;
  readonly sourceGeneratedAt: string;
  readonly importedAt: string;
  readonly pipelineVersion: string;
}

export type CandidateMetadataErrorCode =
  | "FILE_UNAVAILABLE"
  | "INVALID_JSON"
  | "INVALID_DATA";

export class CandidateMetadataError extends Error {
  readonly code: CandidateMetadataErrorCode;
  readonly path: string;

  constructor(
    code: CandidateMetadataErrorCode,
    message: string,
    path: string,
  ) {
    super(message);
    this.name = "CandidateMetadataError";
    this.code = code;
    this.path = path;
  }
}

interface MetadataResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type CandidateMetadataFetcher = (
  path: string,
) => Promise<MetadataResponse>;

export interface LoadCandidateMetadataOptions {
  readonly base?: string;
  readonly fetcher?: CandidateMetadataFetcher;
}

const browserFetcher: CandidateMetadataFetcher = (path) => fetch(path);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value: unknown): value is string {
  return isNonEmptyText(value) && !Number.isNaN(Date.parse(value));
}

function isSafeSourceUrl(value: unknown): value is string {
  if (!isNonEmptyText(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && url.hostname === "dadosabertos.tse.jus.br"
    );
  } catch {
    return false;
  }
}

export function candidateMetadataPath(
  electionYear: number,
  base: string = import.meta.env.BASE_URL,
): string {
  return publicPath(`data/${electionYear}/metadata.json`, base);
}

export function validateCandidateSnapshotMetadata(
  value: unknown,
  electionYear: number,
): value is CandidateSnapshotMetadata {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    value.year === electionYear &&
    value.provider === "Tribunal Superior Eleitoral" &&
    value.dataset === `Candidatos - ${electionYear}` &&
    isSafeSourceUrl(value.sourceUrl) &&
    isValidDate(value.sourceGeneratedAt) &&
    isValidDate(value.importedAt) &&
    isNonEmptyText(value.pipelineVersion)
  );
}

export async function loadCandidateMetadata(
  electionYear: number,
  options: LoadCandidateMetadataOptions = {},
): Promise<CandidateSnapshotMetadata> {
  const path = candidateMetadataPath(electionYear, options.base);
  const fetcher = options.fetcher ?? browserFetcher;
  let response: MetadataResponse;

  try {
    response = await fetcher(path);
  } catch {
    throw new CandidateMetadataError(
      "FILE_UNAVAILABLE",
      "Não foi possível carregar a procedência dos dados eleitorais.",
      path,
    );
  }

  if (!response.ok) {
    throw new CandidateMetadataError(
      "FILE_UNAVAILABLE",
      `Os metadados eleitorais não estão disponíveis (HTTP ${response.status}).`,
      path,
    );
  }

  let rawData: unknown;
  try {
    rawData = await response.json();
  } catch {
    throw new CandidateMetadataError(
      "INVALID_JSON",
      "Os metadados eleitorais não contêm JSON válido.",
      path,
    );
  }

  if (!validateCandidateSnapshotMetadata(rawData, electionYear)) {
    throw new CandidateMetadataError(
      "INVALID_DATA",
      "Os metadados eleitorais não correspondem ao snapshot esperado.",
      path,
    );
  }

  return rawData;
}
