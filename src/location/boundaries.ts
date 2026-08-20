import { FEDERATIVE_UNITS, type FederativeUnit } from "../election/types.ts";
import { publicPath } from "../shared/paths.ts";

export type GeographicPosition = readonly [longitude: number, latitude: number];
export type LinearRing = readonly GeographicPosition[];
export type PolygonCoordinates = readonly LinearRing[];
export type MultiPolygonCoordinates = readonly PolygonCoordinates[];

export type BoundaryGeometry =
  | Readonly<{ type: "Polygon"; coordinates: PolygonCoordinates }>
  | Readonly<{ type: "MultiPolygon"; coordinates: MultiPolygonCoordinates }>;

export interface StateBoundaryFeature {
  readonly code: FederativeUnit;
  readonly geometry: BoundaryGeometry;
}

export interface StateBoundaryDataset {
  readonly schemaVersion: 1;
  readonly level: "STATE";
  readonly source: Readonly<{
    provider: "Instituto Brasileiro de Geografia e Estatística";
    dataset: "Malhas Geográficas";
    url: string;
    quality: "MINIMUM";
    retrievedAt: string;
    sha256: string;
  }>;
  readonly features: readonly StateBoundaryFeature[];
}

export type BoundaryDataErrorCode =
  | "FILE_UNAVAILABLE"
  | "INVALID_JSON"
  | "INVALID_DATA";

export class BoundaryDataError extends Error {
  readonly code: BoundaryDataErrorCode;
  readonly path: string;

  constructor(code: BoundaryDataErrorCode, message: string, path: string) {
    super(message);
    this.name = "BoundaryDataError";
    this.code = code;
    this.path = path;
  }
}

interface BoundaryResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type BoundaryFetcher = (path: string) => Promise<BoundaryResponse>;

export interface LoadStateBoundariesOptions {
  readonly base?: string;
  readonly fetcher?: BoundaryFetcher;
}

const browserFetcher: BoundaryFetcher = (path) => fetch(path);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFederativeUnit(value: unknown): value is FederativeUnit {
  return FEDERATIVE_UNITS.includes(value as FederativeUnit);
}

function isPosition(value: unknown): value is GeographicPosition {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function isLinearRing(value: unknown): value is LinearRing {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) {
    return false;
  }
  const first = value[0];
  const last = value.at(-1);
  return first?.[0] === last?.[0] && first?.[1] === last?.[1];
}

function isPolygonCoordinates(value: unknown): value is PolygonCoordinates {
  return Array.isArray(value) && value.length > 0 && value.every(isLinearRing);
}

function isGeometry(value: unknown): value is BoundaryGeometry {
  if (!isRecord(value)) {
    return false;
  }
  if (value.type === "Polygon") {
    return isPolygonCoordinates(value.coordinates);
  }
  return (
    value.type === "MultiPolygon" &&
    Array.isArray(value.coordinates) &&
    value.coordinates.length > 0 &&
    value.coordinates.every(isPolygonCoordinates)
  );
}

function isOfficialSource(value: unknown): value is StateBoundaryDataset["source"] {
  if (!isRecord(value)) {
    return false;
  }
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(String(value.url));
  } catch {
    return false;
  }
  return (
    value.provider === "Instituto Brasileiro de Geografia e Estatística" &&
    value.dataset === "Malhas Geográficas" &&
    sourceUrl.protocol === "https:" &&
    sourceUrl.hostname === "servicodados.ibge.gov.br" &&
    value.quality === "MINIMUM" &&
    typeof value.retrievedAt === "string" &&
    !Number.isNaN(Date.parse(value.retrievedAt)) &&
    typeof value.sha256 === "string" &&
    /^[a-f\d]{64}$/.test(value.sha256)
  );
}

export function validateStateBoundaryDataset(
  value: unknown,
): value is StateBoundaryDataset {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.level !== "STATE" ||
    !isOfficialSource(value.source) ||
    !Array.isArray(value.features) ||
    value.features.length !== FEDERATIVE_UNITS.length
  ) {
    return false;
  }

  const codes = new Set<FederativeUnit>();
  for (const feature of value.features) {
    if (
      !isRecord(feature) ||
      !isFederativeUnit(feature.code) ||
      codes.has(feature.code) ||
      !isGeometry(feature.geometry)
    ) {
      return false;
    }
    codes.add(feature.code);
  }
  return FEDERATIVE_UNITS.every((uf) => codes.has(uf));
}

export function stateBoundaryPath(
  base: string = import.meta.env.BASE_URL,
): string {
  return publicPath("geography/ibge-uf-minimum.json", base);
}

export async function loadStateBoundaries(
  options: LoadStateBoundariesOptions = {},
): Promise<StateBoundaryDataset> {
  const path = stateBoundaryPath(options.base);
  const fetcher = options.fetcher ?? browserFetcher;
  let response: BoundaryResponse;

  try {
    response = await fetcher(path);
  } catch {
    throw new BoundaryDataError(
      "FILE_UNAVAILABLE",
      "Não foi possível carregar os limites estaduais locais.",
      path,
    );
  }
  if (!response.ok) {
    throw new BoundaryDataError(
      "FILE_UNAVAILABLE",
      `Os limites estaduais locais não estão disponíveis (HTTP ${response.status}).`,
      path,
    );
  }

  let rawData: unknown;
  try {
    rawData = await response.json();
  } catch {
    throw new BoundaryDataError(
      "INVALID_JSON",
      "O arquivo de limites estaduais não contém JSON válido.",
      path,
    );
  }
  if (!validateStateBoundaryDataset(rawData)) {
    throw new BoundaryDataError(
      "INVALID_DATA",
      "O arquivo de limites estaduais é inválido ou incompleto.",
      path,
    );
  }
  return rawData;
}
