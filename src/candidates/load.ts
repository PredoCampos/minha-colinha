import type { CandidateFile, CandidateDatasetKind } from "./model.ts";
import {
  CANDIDATE_DATASET_KIND,
} from "./model.ts";
import {
  candidateDataPartition,
  candidateFilePath,
  type CandidateFileRequest,
} from "./paths.ts";
import { validateCandidateFile, type ValidationIssue } from "./validation.ts";

export type CandidateDataErrorCode =
  | "FILE_UNAVAILABLE"
  | "INVALID_JSON"
  | "INVALID_DATA";

export class CandidateDataError extends Error {
  readonly code: CandidateDataErrorCode;
  readonly path: string;
  readonly issues: readonly ValidationIssue[];

  constructor(
    code: CandidateDataErrorCode,
    message: string,
    path: string,
    issues: readonly ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "CandidateDataError";
    this.code = code;
    this.path = path;
    this.issues = issues;
  }
}

interface CandidateResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type CandidateFetcher = (path: string) => Promise<CandidateResponse>;

export interface LoadCandidateFileOptions {
  readonly datasetKind?: CandidateDatasetKind;
  readonly base?: string;
  readonly fetcher?: CandidateFetcher;
}

const browserFetcher: CandidateFetcher = (path) => fetch(path);

function samePartition(
  first: CandidateFile["partition"],
  second: CandidateFile["partition"],
): boolean {
  if (first.scope !== second.scope) {
    return false;
  }
  return first.scope === "NATIONAL" ||
    second.scope === "NATIONAL"
    ? true
    : first.uf === second.uf;
}

export async function loadCandidateFile(
  request: CandidateFileRequest,
  options: LoadCandidateFileOptions = {},
): Promise<CandidateFile> {
  const datasetKind =
    options.datasetKind ?? CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT;
  const path = candidateFilePath(request, datasetKind, options.base);
  const fetcher = options.fetcher ?? browserFetcher;

  let response: CandidateResponse;
  try {
    response = await fetcher(path);
  } catch {
    throw new CandidateDataError(
      "FILE_UNAVAILABLE",
      "Não foi possível carregar os dados eleitorais desta circunscrição.",
      path,
    );
  }

  if (!response.ok) {
    throw new CandidateDataError(
      "FILE_UNAVAILABLE",
      `O arquivo eleitoral não está disponível (HTTP ${response.status}).`,
      path,
    );
  }

  let rawData: unknown;
  try {
    rawData = await response.json();
  } catch {
    throw new CandidateDataError(
      "INVALID_JSON",
      "O arquivo eleitoral não contém JSON válido.",
      path,
    );
  }

  const validation = validateCandidateFile(rawData);
  if (!validation.ok) {
    throw new CandidateDataError(
      "INVALID_DATA",
      "O arquivo eleitoral não corresponde ao modelo interno esperado.",
      path,
      validation.issues,
    );
  }

  if (
    validation.value.datasetKind !== datasetKind ||
    validation.value.electionYear !== request.electionYear ||
    validation.value.office !== request.office ||
    !samePartition(
      validation.value.partition,
      candidateDataPartition(request.jurisdiction),
    )
  ) {
    throw new CandidateDataError(
      "INVALID_DATA",
      "O arquivo eleitoral não corresponde ao conjunto solicitado.",
      path,
    );
  }

  return validation.value;
}
