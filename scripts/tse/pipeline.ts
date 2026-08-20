import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseCandidateCsv, parseCandidateSupplementCsv } from "./csv.ts";
import { findArchiveEntry, extractArchive } from "./archive.ts";
import { acquireResources } from "./download.ts";
import { TSE_2026, TSE_PHOTO_PARTITIONS, tse2026Resources } from "./config.ts";
import { normalizeTseCandidates } from "./normalize.ts";
import { indexExtractedPhotos } from "./photos.ts";
import {
  buildSnapshotMetadata,
  publishStageAtomically,
  writeAndValidateStage,
} from "./snapshot.ts";
import type {
  AcquiredResource,
  PhotoIndex,
  SnapshotMetadata,
} from "./types.ts";

export interface PipelineOptions {
  readonly projectRoot: string;
  readonly localArchiveDirectory?: string;
  readonly dataRoot?: string;
  readonly importedAt?: Date;
  readonly pipelineVersion?: string;
  readonly publish?: boolean;
  readonly onProgress?: (message: string) => void;
}

export interface PipelineReport {
  readonly published: boolean;
  readonly target: string;
  readonly candidateCount: number;
  readonly missingPhotoCount: number;
  readonly sourceGeneratedAt: string;
}

function oneResource(
  resources: readonly AcquiredResource[],
  kind: AcquiredResource["kind"],
  partition: string | null = null,
): AcquiredResource {
  const match = resources.filter(
    (resource) => resource.kind === kind && resource.partition === partition,
  );
  if (match.length !== 1) {
    throw new Error(`Recurso ${kind}/${partition ?? "-"} ausente ou duplicado.`);
  }
  return match[0] as AcquiredResource;
}

async function extractCsv(
  resource: AcquiredResource,
  expectedBaseName: string,
  directory: string,
): Promise<Uint8Array> {
  const entry = await findArchiveEntry(resource.archivePath, expectedBaseName);
  await extractArchive(resource.archivePath, directory, entry);
  return readFile(path.join(directory, entry));
}

async function extractPhotos(
  resources: readonly AcquiredResource[],
  directory: string,
  progress: (message: string) => void,
): Promise<PhotoIndex> {
  const result = new Map<string, ReadonlyMap<string, { entryName: string; extractedPath: string }>>();
  for (const partition of TSE_PHOTO_PARTITIONS) {
    progress(`Interpretando fotos ${partition}...`);
    const resource = oneResource(resources, "PHOTOS", partition);
    const destination = path.join(directory, partition);
    await extractArchive(resource.archivePath, destination);
    result.set(partition, await indexExtractedPhotos(destination, partition));
  }
  return result;
}

function metadataFor(
  resources: readonly AcquiredResource[],
  normalized: ReturnType<typeof normalizeTseCandidates>,
  options: PipelineOptions,
): SnapshotMetadata {
  const importedAt = options.importedAt ?? new Date();
  if (Number.isNaN(importedAt.getTime())) throw new Error("Data de importação inválida.");
  return {
    schemaVersion: 1,
    year: 2026,
    provider: "Tribunal Superior Eleitoral",
    dataset: "Candidatos - 2026",
    sourceUrl: TSE_2026.datasetUrl,
    sourceGeneratedAt: normalized.sourceGeneratedAt,
    importedAt: importedAt.toISOString(),
    pipelineVersion: options.pipelineVersion ?? process.env.GITHUB_SHA ?? "tse-pipeline-v1",
    retrievalMode: options.localArchiveDirectory
      ? "LOCAL_OFFICIAL_ARCHIVES"
      : "OFFICIAL_DOWNLOAD",
    resources: resources.map((resource) => ({
      kind: resource.kind,
      partition: resource.partition,
      fileName: resource.fileName,
      url: resource.url,
      sha256: resource.sha256,
      bytes: resource.bytes,
      lastModified: resource.lastModified,
    })),
    counts: {
      rawCandidates: normalized.rawCandidateCount,
      publishedCandidates: normalized.candidates.length,
      missingPhotos: normalized.missingPhotoCount,
      bySourceStatus: normalized.sourceStatusCounts,
      byInternalStatus: normalized.internalStatusCounts,
      ignoredOffices: normalized.ignoredOfficeCounts,
    },
  };
}

export async function runTse2026Pipeline(
  options: PipelineOptions,
): Promise<PipelineReport> {
  const progress = options.onProgress ?? (() => undefined);
  const dataRoot = path.resolve(options.dataRoot ?? path.join(options.projectRoot, "public", "data"));
  await mkdir(dataRoot, { recursive: true });
  const workDirectory = await mkdtemp(path.join(os.tmpdir(), "minha-colinha-tse-"));
  let stage: string | null = null;

  try {
    const resources = await acquireResources(
      tse2026Resources(),
      workDirectory,
      options.localArchiveDirectory ? path.resolve(options.localArchiveDirectory) : null,
      progress,
    );
    progress("Interpretando CSVs ISO-8859-1 delimitados por ponto e vírgula...");
    const csvDirectory = path.join(workDirectory, "csv");
    const candidateBytes = await extractCsv(
      oneResource(resources, "CANDIDATES"),
      TSE_2026.candidatesCsv,
      path.join(csvDirectory, "candidates"),
    );
    const supplementBytes = await extractCsv(
      oneResource(resources, "SUPPLEMENT"),
      TSE_2026.supplementCsv,
      path.join(csvDirectory, "supplement"),
    );
    const candidateRows = parseCandidateCsv(candidateBytes);
    const supplementRows = parseCandidateSupplementCsv(supplementBytes);
    const photos = await extractPhotos(resources, path.join(workDirectory, "photos"), progress);

    progress("Normalizando e validando integralmente o contrato interno...");
    const normalized = normalizeTseCandidates(candidateRows, supplementRows, photos);
    const metadata = metadataFor(resources, normalized, options);
    const build = buildSnapshotMetadata(metadata, normalized.candidates);
    const completedStage = await writeAndValidateStage(dataRoot, build, photos);
    stage = completedStage;

    const publish = options.publish ?? true;
    if (publish) {
      progress("Publicando snapshot de forma atômica...");
      await publishStageAtomically(dataRoot, completedStage);
      stage = null;
    }
    return {
      published: publish,
      target: publish ? path.join(dataRoot, "2026") : completedStage,
      candidateCount: normalized.candidates.length,
      missingPhotoCount: normalized.missingPhotoCount,
      sourceGeneratedAt: normalized.sourceGeneratedAt,
    };
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
    await rm(workDirectory, { recursive: true, force: true });
  }
}
