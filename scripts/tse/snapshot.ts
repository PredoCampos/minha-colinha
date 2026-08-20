import { randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  CANDIDATE_DATASET_KIND,
  type Candidate,
  type CandidateDataPartition,
  type CandidateFile,
} from "../../src/candidates/model.ts";
import { candidateOfficePathSegment } from "../../src/candidates/office-paths.ts";
import { validateCandidateFile } from "../../src/candidates/validation.ts";
import {
  ELECTORAL_OFFICE,
  FEDERATIVE_UNITS,
  TERRITORIAL_SCOPE,
  type ElectoralOffice,
} from "../../src/election/types.ts";
import { tse2026Resources } from "./config.ts";
import type { PhotoIndex, SnapshotBuild, SnapshotMetadata } from "./types.ts";

interface ExpectedFile {
  readonly partitionCode: string;
  readonly partition: CandidateDataPartition;
  readonly office: ElectoralOffice;
}

export function expectedCandidateFiles2026(): readonly ExpectedFile[] {
  return [
    {
      partitionCode: "BR",
      partition: { scope: TERRITORIAL_SCOPE.NATIONAL },
      office: ELECTORAL_OFFICE.PRESIDENT,
    },
    ...FEDERATIVE_UNITS.flatMap((uf) => [
      {
        partitionCode: uf,
        partition: { scope: TERRITORIAL_SCOPE.STATE, uf },
        office: ELECTORAL_OFFICE.FEDERAL_DEPUTY,
      } as const,
      {
        partitionCode: uf,
        partition: { scope: TERRITORIAL_SCOPE.STATE, uf },
        office: uf === "DF" ? ELECTORAL_OFFICE.DISTRICT_DEPUTY : ELECTORAL_OFFICE.STATE_DEPUTY,
      } as const,
      {
        partitionCode: uf,
        partition: { scope: TERRITORIAL_SCOPE.STATE, uf },
        office: ELECTORAL_OFFICE.SENATOR,
      } as const,
      {
        partitionCode: uf,
        partition: { scope: TERRITORIAL_SCOPE.STATE, uf },
        office: ELECTORAL_OFFICE.GOVERNOR,
      } as const,
    ]),
  ];
}

function candidatePartition(candidate: Candidate): string {
  return candidate.jurisdiction.scope === TERRITORIAL_SCOPE.NATIONAL
    ? "BR"
    : candidate.jurisdiction.uf;
}

function key(partition: string, office: ElectoralOffice): string {
  return `${partition}/${office}`;
}

export function buildCandidateFiles(
  candidates: readonly Candidate[],
): readonly CandidateFile[] {
  const grouped = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const groupKey = key(candidatePartition(candidate), candidate.office);
    const group = grouped.get(groupKey) ?? [];
    group.push(candidate);
    grouped.set(groupKey, group);
  }

  const files = expectedCandidateFiles2026().map((expected) => {
    const fileCandidates = [
      ...(grouped.get(key(expected.partitionCode, expected.office)) ?? []),
    ].sort(
      (left, right) =>
        Number(left.number) - Number(right.number) ||
        left.ballotName.localeCompare(right.ballotName, "pt-BR") ||
        left.id.localeCompare(right.id),
    );
    if (fileCandidates.length === 0) {
      throw new Error(
        `Snapshot incompleto: nenhuma candidatura para ${expected.partitionCode}/${expected.office}.`,
      );
    }
    const file: CandidateFile = {
      schemaVersion: 1,
      datasetKind: CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT,
      notice:
        "Dados normalizados do conjunto oficial Candidatos - 2026 do TSE. Projeto independente.",
      electionYear: 2026,
      office: expected.office,
      partition: expected.partition,
      candidates: [...fileCandidates],
    };
    const validation = validateCandidateFile(file);
    if (!validation.ok) {
      throw new Error(
        `Snapshot inválido em ${expected.partitionCode}/${expected.office}: ${validation.issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; ")}`,
      );
    }
    return validation.value;
  });

  if ([...grouped.keys()].some((groupKey) => !files.some((file) => key(
    file.partition.scope === TERRITORIAL_SCOPE.NATIONAL ? "BR" : file.partition.uf,
    file.office,
  ) === groupKey))) {
    throw new Error("Há candidaturas normalizadas fora das partições esperadas para 2026.");
  }
  return files;
}

export function serializeSnapshotJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function countTotal(value: unknown, field: string): number {
  if (!isRecord(value)) throw new Error(`Metadado inválido: ${field}.`);
  let total = 0;
  for (const count of Object.values(value)) {
    if (!Number.isInteger(count) || Number(count) < 0) {
      throw new Error(`Metadado inválido: ${field} contém uma contagem inválida.`);
    }
    total += Number(count);
  }
  return total;
}

export function validateSnapshotMetadata(value: unknown): asserts value is SnapshotMetadata {
  if (!isRecord(value)) throw new Error("Metadados do snapshot devem ser um objeto.");
  if (
    value.schemaVersion !== 1 ||
    value.year !== 2026 ||
    value.provider !== "Tribunal Superior Eleitoral" ||
    value.dataset !== "Candidatos - 2026" ||
    typeof value.sourceUrl !== "string" ||
    typeof value.pipelineVersion !== "string" ||
    value.pipelineVersion.length === 0 ||
    !["OFFICIAL_DOWNLOAD", "LOCAL_OFFICIAL_ARCHIVES"].includes(
      String(value.retrievalMode),
    )
  ) {
    throw new Error("Identidade dos metadados do snapshot é inválida.");
  }
  for (const dateField of ["sourceGeneratedAt", "importedAt"] as const) {
    if (
      typeof value[dateField] !== "string" ||
      Number.isNaN(Date.parse(value[dateField]))
    ) {
      throw new Error(`Metadado inválido: ${dateField}.`);
    }
  }

  if (!Array.isArray(value.resources)) throw new Error("Lista de recursos inválida.");
  const expectedResources = tse2026Resources();
  if (value.resources.length !== expectedResources.length) {
    throw new Error("Quantidade de recursos de origem inválida.");
  }
  for (const expected of expectedResources) {
    const matches = value.resources.filter(
      (resource) =>
        isRecord(resource) &&
        resource.kind === expected.kind &&
        resource.partition === expected.partition &&
        resource.fileName === expected.fileName &&
        resource.url === expected.url &&
        typeof resource.sha256 === "string" &&
        /^[a-f\d]{64}$/.test(resource.sha256) &&
        Number.isInteger(resource.bytes) &&
        Number(resource.bytes) > 0 &&
        (resource.lastModified === null || typeof resource.lastModified === "string"),
    );
    if (matches.length !== 1) {
      throw new Error(`Recurso de origem inválido: ${expected.fileName}.`);
    }
  }

  if (!isRecord(value.counts)) throw new Error("Contagens do snapshot são inválidas.");
  const raw = value.counts.rawCandidates;
  const published = value.counts.publishedCandidates;
  const missingPhotos = value.counts.missingPhotos;
  if (
    !Number.isInteger(raw) ||
    !Number.isInteger(published) ||
    !Number.isInteger(missingPhotos) ||
    Number(raw) <= 0 ||
    Number(published) <= 0 ||
    Number(missingPhotos) < 0 ||
    Number(missingPhotos) > Number(published)
  ) {
    throw new Error("Totais do snapshot são inválidos.");
  }
  const sourceStatuses = countTotal(value.counts.bySourceStatus, "bySourceStatus");
  const internalStatuses = countTotal(
    value.counts.byInternalStatus,
    "byInternalStatus",
  );
  const ignoredOffices = countTotal(value.counts.ignoredOffices, "ignoredOffices");
  if (
    sourceStatuses !== Number(published) ||
    internalStatuses !== Number(published) ||
    Number(raw) !== Number(published) + ignoredOffices
  ) {
    throw new Error("As contagens detalhadas do snapshot não fecham.");
  }
}

function relativeCandidateFile(file: CandidateFile): string {
  const partition = file.partition.scope === TERRITORIAL_SCOPE.NATIONAL ? "BR" : file.partition.uf;
  return path.join(partition, candidateOfficePathSegment(file.office), "candidates.json");
}

function assertWithin(parent: string, target: string): void {
  const relative = path.relative(path.resolve(parent), path.resolve(target));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Caminho fora do diretório de snapshots: ${target}.`);
  }
}

async function writePhotos(
  yearStage: string,
  files: readonly CandidateFile[],
  photos: PhotoIndex,
): Promise<void> {
  const copied = new Set<string>();
  for (const file of files) {
    const partition = file.partition.scope === TERRITORIAL_SCOPE.NATIONAL ? "BR" : file.partition.uf;
    for (const candidate of file.candidates) {
      if (!candidate.photoPath || copied.has(candidate.photoPath)) continue;
      const source = photos.get(partition)?.get(candidate.id);
      if (!source) {
        throw new Error(`Foto associada a ${candidate.id} desapareceu antes da publicação.`);
      }
      const expectedPrefix = "data/2026/";
      if (!candidate.photoPath.startsWith(expectedPrefix)) {
        throw new Error(`Caminho de foto inesperado: ${candidate.photoPath}.`);
      }
      const destination = path.join(yearStage, candidate.photoPath.slice(expectedPrefix.length));
      assertWithin(yearStage, destination);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source.extractedPath, destination);
      copied.add(candidate.photoPath);
    }
  }
}

export async function writeAndValidateStage(
  dataRoot: string,
  build: SnapshotBuild,
  photos: PhotoIndex,
): Promise<string> {
  validateSnapshotMetadata(build.metadata);
  const absoluteRoot = path.resolve(dataRoot);
  await mkdir(absoluteRoot, { recursive: true });
  const stage = path.join(absoluteRoot, `.2026-stage-${randomUUID()}`);
  assertWithin(absoluteRoot, stage);
  await mkdir(stage);

  try {
    for (const file of build.files) {
      const destination = path.join(stage, relativeCandidateFile(file));
      assertWithin(stage, destination);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, serializeSnapshotJson(file), "utf8");

      const raw = JSON.parse(await readFile(destination, "utf8")) as unknown;
      const validation = validateCandidateFile(raw);
      if (!validation.ok) {
        throw new Error(`Validação pós-escrita falhou em ${destination}.`);
      }
    }
    await writePhotos(stage, build.files, photos);
    await writeFile(
      path.join(stage, "metadata.json"),
      serializeSnapshotJson(build.metadata),
      "utf8",
    );
    validateSnapshotMetadata(
      JSON.parse(await readFile(path.join(stage, "metadata.json"), "utf8")) as unknown,
    );

    for (const file of build.files) {
      for (const candidate of file.candidates) {
        if (!candidate.photoPath) continue;
        const photo = path.join(stage, candidate.photoPath.slice("data/2026/".length));
        const details = await stat(photo);
        if (!details.isFile() || details.size === 0) {
          throw new Error(`Foto publicada inválida: ${candidate.photoPath}.`);
        }
      }
    }
    return stage;
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

export async function publishStageAtomically(
  dataRoot: string,
  stage: string,
): Promise<void> {
  const absoluteRoot = path.resolve(dataRoot);
  const target = path.join(absoluteRoot, "2026");
  const backup = path.join(absoluteRoot, `.2026-backup-${randomUUID()}`);
  assertWithin(absoluteRoot, stage);
  assertWithin(absoluteRoot, target);
  assertWithin(absoluteRoot, backup);

  const hadPrevious = await stat(target).then(
    () => true,
    () => false,
  );

  if (hadPrevious) await rename(target, backup);
  try {
    await rename(stage, target);
  } catch (error) {
    if (hadPrevious) await rename(backup, target);
    throw new Error("Falha ao publicar snapshot; a versão anterior foi restaurada.", {
      cause: error,
    });
  }
  if (hadPrevious) await rm(backup, { recursive: true, force: true });
}

export function buildSnapshotMetadata(
  metadata: SnapshotMetadata,
  candidates: readonly Candidate[],
): SnapshotBuild {
  return { files: buildCandidateFiles(candidates), metadata };
}
