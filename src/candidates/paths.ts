import {
  TERRITORIAL_SCOPE,
  type ElectoralLocation,
  type ElectoralOffice,
} from "../election/types.ts";
import { publicPath } from "../shared/paths.ts";
import {
  CANDIDATE_DATASET_KIND,
  type CandidateDataPartition,
  type CandidateDatasetKind,
} from "./model.ts";
import { candidateOfficePathSegment } from "./office-paths.ts";

export interface CandidateFileRequest {
  readonly electionYear: number;
  readonly office: ElectoralOffice;
  readonly jurisdiction: ElectoralLocation;
}

export function candidateDataPartition(
  jurisdiction: ElectoralLocation,
): CandidateDataPartition {
  if (jurisdiction.scope === TERRITORIAL_SCOPE.NATIONAL) {
    return { scope: TERRITORIAL_SCOPE.NATIONAL };
  }

  // Pacotes municipais permanecem divididos por UF para não revelar o município no path.
  return { scope: TERRITORIAL_SCOPE.STATE, uf: jurisdiction.uf };
}

function territorialPackage(jurisdiction: ElectoralLocation): string {
  const partition = candidateDataPartition(jurisdiction);
  return partition.scope === TERRITORIAL_SCOPE.NATIONAL ? "BR" : partition.uf;
}

export function candidateFilePath(
  request: CandidateFileRequest,
  datasetKind: CandidateDatasetKind = CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT,
  base: string = import.meta.env.BASE_URL,
): string {
  const dataRoot =
    datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE
      ? "data/development-fixtures"
      : "data";

  return publicPath(
    `${dataRoot}/${request.electionYear}/${territorialPackage(request.jurisdiction)}/${candidateOfficePathSegment(request.office)}/candidates.json`,
    base,
  );
}
