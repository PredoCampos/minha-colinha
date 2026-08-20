import type { Candidate, CandidateFile } from "../../src/candidates/model.ts";

export interface TseCandidateRow {
  readonly generatedDate: string;
  readonly generatedTime: string;
  readonly electionYear: string;
  readonly scope: string;
  readonly uf: string;
  readonly electoralUnit: string;
  readonly officeCode: string;
  readonly officeDescription: string;
  readonly sequenceId: string;
  readonly number: string;
  readonly ballotName: string;
  readonly party: string;
  readonly candidacyStatusCode: string;
  readonly candidacyStatusDescription: string;
}

export interface TseCandidateSupplementRow {
  readonly generatedDate: string;
  readonly generatedTime: string;
  readonly electionYear: string;
  readonly sequenceId: string;
  readonly judgmentStatusCode: string;
  readonly judgmentStatusDescription: string;
}

export interface ResourceSpec {
  readonly kind: "CANDIDATES" | "SUPPLEMENT" | "PHOTOS";
  readonly partition: string | null;
  readonly fileName: string;
  readonly url: string;
}

export interface AcquiredResource extends ResourceSpec {
  readonly archivePath: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly lastModified: string | null;
}

export interface PhotoSource {
  readonly entryName: string;
  readonly extractedPath: string;
}

export type PhotoIndex = ReadonlyMap<string, ReadonlyMap<string, PhotoSource>>;

export interface NormalizationResult {
  readonly candidates: readonly Candidate[];
  readonly sourceGeneratedAt: string;
  readonly candidateGeneratedAt: string;
  readonly supplementGeneratedAt: string;
  readonly supplementOnlyCount: number;
  readonly rawCandidateCount: number;
  readonly ignoredOfficeCounts: Readonly<Record<string, number>>;
  readonly sourceStatusCounts: Readonly<Record<string, number>>;
  readonly internalStatusCounts: Readonly<Record<string, number>>;
  readonly missingPhotoCount: number;
}

export interface SnapshotMetadata {
  readonly schemaVersion: 1;
  readonly year: 2026;
  readonly provider: "Tribunal Superior Eleitoral";
  readonly dataset: "Candidatos - 2026";
  readonly sourceUrl: string;
  readonly sourceGeneratedAt: string;
  readonly importedAt: string;
  readonly pipelineVersion: string;
  readonly retrievalMode: "OFFICIAL_DOWNLOAD" | "LOCAL_OFFICIAL_ARCHIVES";
  readonly resources: readonly Readonly<{
    kind: ResourceSpec["kind"];
    partition: string | null;
    fileName: string;
    url: string;
    sha256: string;
    bytes: number;
    lastModified: string | null;
  }>[];
  readonly counts: Readonly<{
    rawCandidates: number;
    publishedCandidates: number;
    missingPhotos: number;
    bySourceStatus: Readonly<Record<string, number>>;
    byInternalStatus: Readonly<Record<string, number>>;
    ignoredOffices: Readonly<Record<string, number>>;
  }>;
}

export interface SnapshotBuild {
  readonly files: readonly CandidateFile[];
  readonly metadata: SnapshotMetadata;
}
