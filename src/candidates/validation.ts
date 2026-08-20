import {
  ELECTORAL_OFFICE,
  FEDERATIVE_UNITS,
  TERRITORIAL_SCOPE,
  type ElectoralLocation,
  type ElectoralOffice,
  type FederativeUnit,
} from "../election/types.ts";
import {
  CANDIDATE_DATASET_KIND,
  CANDIDATE_STATUS,
  type Candidate,
  type CandidateDataPartition,
  type CandidateDatasetKind,
  type CandidateFile,
  type CandidateStatus,
} from "./model.ts";

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; issues: readonly ValidationIssue[] }>;

type UnknownRecord = Record<string, unknown>;

const CANDIDATE_KEYS = [
  "id",
  "electionYear",
  "office",
  "number",
  "ballotName",
  "party",
  "photoPath",
  "status",
  "jurisdiction",
] as const;

const CANDIDATE_FILE_KEYS = [
  "schemaVersion",
  "datasetKind",
  "notice",
  "electionYear",
  "office",
  "partition",
  "candidates",
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  value: UnknownRecord,
  allowedKeys: readonly string[],
  path: string,
  issues: ValidationIssue[],
): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push({
        path: `${path}.${key}`,
        message: "Campo não reconhecido pelo modelo interno.",
      });
    }
  }
}

function validateText(
  value: unknown,
  path: string,
  maximumLength: number,
  issues: ValidationIssue[],
): value is string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > maximumLength
  ) {
    issues.push({
      path,
      message: `Deve ser um texto não vazio com até ${maximumLength} caracteres.`,
    });
    return false;
  }

  return true;
}

function isElectoralOffice(value: unknown): value is ElectoralOffice {
  return Object.values(ELECTORAL_OFFICE).includes(value as ElectoralOffice);
}

function isCandidateStatus(value: unknown): value is CandidateStatus {
  return Object.values(CANDIDATE_STATUS).includes(value as CandidateStatus);
}

function isDatasetKind(value: unknown): value is CandidateDatasetKind {
  return Object.values(CANDIDATE_DATASET_KIND).includes(
    value as CandidateDatasetKind,
  );
}

function isFederativeUnit(value: unknown): value is FederativeUnit {
  return FEDERATIVE_UNITS.includes(value as FederativeUnit);
}

function validateJurisdiction(
  value: unknown,
  path: string,
): ValidationResult<ElectoralLocation> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path, message: "Deve ser uma circunscrição válida." }],
    };
  }

  if (value.scope === TERRITORIAL_SCOPE.NATIONAL) {
    rejectUnknownKeys(value, ["scope"], path, issues);
  } else if (value.scope === TERRITORIAL_SCOPE.STATE) {
    rejectUnknownKeys(value, ["scope", "uf"], path, issues);
    if (!isFederativeUnit(value.uf)) {
      issues.push({ path: `${path}.uf`, message: "UF inválida." });
    }
  } else if (value.scope === TERRITORIAL_SCOPE.MUNICIPALITY) {
    rejectUnknownKeys(
      value,
      ["scope", "uf", "municipalityCode", "municipalityName"],
      path,
      issues,
    );
    if (!isFederativeUnit(value.uf)) {
      issues.push({ path: `${path}.uf`, message: "UF inválida." });
    }
    validateText(value.municipalityCode, `${path}.municipalityCode`, 16, issues);
    validateText(value.municipalityName, `${path}.municipalityName`, 100, issues);
  } else {
    issues.push({ path: `${path}.scope`, message: "Escopo territorial inválido." });
  }

  return issues.length === 0
    ? { ok: true, value: value as ElectoralLocation }
    : { ok: false, issues };
}

function validatePhotoPath(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): void {
  if (value === null) {
    return;
  }

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 512 ||
    !value.startsWith("data/") ||
    value.includes("..") ||
    /^[a-z][a-z\d+.-]*:/i.test(value)
  ) {
    issues.push({
      path,
      message: "A foto deve usar um caminho estático local ou null.",
    });
  }
}

export function validateCandidate(value: unknown): ValidationResult<Candidate> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "candidate", message: "Deve ser um objeto." }],
    };
  }

  rejectUnknownKeys(value, CANDIDATE_KEYS, "candidate", issues);
  validateText(value.id, "candidate.id", 128, issues);

  if (!Number.isInteger(value.electionYear) || Number(value.electionYear) < 1900) {
    issues.push({
      path: "candidate.electionYear",
      message: "Ano eleitoral inválido.",
    });
  }

  if (!isElectoralOffice(value.office)) {
    issues.push({ path: "candidate.office", message: "Cargo inválido." });
  }

  if (typeof value.number !== "string" || !/^\d{1,10}$/.test(value.number)) {
    issues.push({
      path: "candidate.number",
      message: "Número deve conter somente de 1 a 10 dígitos.",
    });
  }

  validateText(value.ballotName, "candidate.ballotName", 100, issues);
  validateText(value.party, "candidate.party", 30, issues);
  validatePhotoPath(value.photoPath, "candidate.photoPath", issues);

  if (!isCandidateStatus(value.status)) {
    issues.push({ path: "candidate.status", message: "Situação inválida." });
  }

  const jurisdiction = validateJurisdiction(
    value.jurisdiction,
    "candidate.jurisdiction",
  );
  if (!jurisdiction.ok) {
    issues.push(...jurisdiction.issues);
  }

  return issues.length === 0
    ? { ok: true, value: value as unknown as Candidate }
    : { ok: false, issues };
}

function belongsToPartition(
  jurisdiction: ElectoralLocation,
  partition: CandidateDataPartition,
): boolean {
  return partition.scope === TERRITORIAL_SCOPE.NATIONAL
    ? jurisdiction.scope === TERRITORIAL_SCOPE.NATIONAL
    : jurisdiction.scope !== TERRITORIAL_SCOPE.NATIONAL &&
        jurisdiction.uf === partition.uf;
}

export function validateCandidateFile(
  value: unknown,
): ValidationResult<CandidateFile> {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ path: "file", message: "Deve ser um objeto." }],
    };
  }

  rejectUnknownKeys(value, CANDIDATE_FILE_KEYS, "file", issues);

  if (value.schemaVersion !== 1) {
    issues.push({ path: "file.schemaVersion", message: "Schema não suportado." });
  }
  if (!isDatasetKind(value.datasetKind)) {
    issues.push({ path: "file.datasetKind", message: "Tipo de conjunto inválido." });
  }
  validateText(value.notice, "file.notice", 300, issues);
  if (!Number.isInteger(value.electionYear) || Number(value.electionYear) < 1900) {
    issues.push({ path: "file.electionYear", message: "Ano eleitoral inválido." });
  }
  if (!isElectoralOffice(value.office)) {
    issues.push({ path: "file.office", message: "Cargo inválido." });
  }

  const partition = validateJurisdiction(value.partition, "file.partition");
  if (!partition.ok) {
    issues.push(...partition.issues);
  } else if (partition.value.scope === TERRITORIAL_SCOPE.MUNICIPALITY) {
    issues.push({
      path: "file.partition.scope",
      message: "Arquivos devem ser particionados no máximo por UF.",
    });
  }

  if (!Array.isArray(value.candidates)) {
    issues.push({ path: "file.candidates", message: "Deve ser uma lista." });
  } else {
    value.candidates.forEach((candidateValue, index) => {
      const candidate = validateCandidate(candidateValue);
      if (!candidate.ok) {
        issues.push(
          ...candidate.issues.map((issue) => ({
            path: issue.path.replace("candidate", `file.candidates[${index}]`),
            message: issue.message,
          })),
        );
        return;
      }

      if (candidate.value.electionYear !== value.electionYear) {
        issues.push({
          path: `file.candidates[${index}].electionYear`,
          message: "Ano diferente do declarado no arquivo.",
        });
      }
      if (candidate.value.office !== value.office) {
        issues.push({
          path: `file.candidates[${index}].office`,
          message: "Cargo diferente do declarado no arquivo.",
        });
      }
      if (
        partition.ok &&
        partition.value.scope !== TERRITORIAL_SCOPE.MUNICIPALITY &&
        !belongsToPartition(candidate.value.jurisdiction, partition.value)
      ) {
        issues.push({
          path: `file.candidates[${index}].jurisdiction`,
          message: "Circunscrição incompatível com a partição do arquivo.",
        });
      }
    });
  }

  return issues.length === 0
    ? { ok: true, value: value as unknown as CandidateFile }
    : { ok: false, issues };
}
