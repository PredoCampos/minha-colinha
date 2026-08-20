import type { FederativeUnit } from "../election/types.ts";
import {
  loadStateBoundaries,
  type StateBoundaryDataset,
} from "./boundaries.ts";
import { resolveStateFromCoordinates } from "./resolve.ts";

export type LocationDetectionErrorCode =
  | "UNSUPPORTED"
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "UNKNOWN_POSITION_ERROR"
  | "BOUNDARY_DATA_UNAVAILABLE"
  | "OUTSIDE_BRAZIL"
  | "AMBIGUOUS_BOUNDARY";

export class LocationDetectionError extends Error {
  readonly code: LocationDetectionErrorCode;

  constructor(code: LocationDetectionErrorCode, message: string) {
    super(message);
    this.name = "LocationDetectionError";
    this.code = code;
  }
}

interface PositionLike {
  readonly coords: Readonly<{ latitude: number; longitude: number }>;
}

interface PositionErrorLike {
  readonly code: number;
}

export interface GeolocationLike {
  getCurrentPosition(
    success: (position: PositionLike) => void,
    error?: (error: PositionErrorLike) => void,
    options?: PositionOptions,
  ): void;
}

export interface DetectStateOptions {
  readonly geolocation?: GeolocationLike | null;
  readonly loadBoundaries?: () => Promise<StateBoundaryDataset>;
  readonly timeoutMilliseconds?: number;
}

function positionError(error: PositionErrorLike): LocationDetectionError {
  if (error.code === 1) {
    return new LocationDetectionError(
      "PERMISSION_DENIED",
      "Permissão de localização negada. Selecione sua UF manualmente.",
    );
  }
  if (error.code === 2) {
    return new LocationDetectionError(
      "POSITION_UNAVAILABLE",
      "Sua localização está indisponível. Selecione sua UF manualmente.",
    );
  }
  if (error.code === 3) {
    return new LocationDetectionError(
      "TIMEOUT",
      "A localização demorou demais. Tente novamente ou selecione sua UF manualmente.",
    );
  }
  return new LocationDetectionError(
    "UNKNOWN_POSITION_ERROR",
    "Não foi possível obter sua localização. Selecione sua UF manualmente.",
  );
}

function requestCoordinates(
  geolocation: GeolocationLike,
  timeoutMilliseconds: number,
): Promise<Readonly<{ latitude: number; longitude: number }>> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(positionError(error)),
      {
        enableHighAccuracy: false,
        maximumAge: 300_000,
        timeout: timeoutMilliseconds,
      },
    );
  });
}

export async function detectStateFromGeolocation(
  options: DetectStateOptions = {},
): Promise<FederativeUnit> {
  const geolocation =
    options.geolocation === undefined
      ? typeof navigator === "undefined"
        ? undefined
        : navigator.geolocation
      : options.geolocation;
  if (!geolocation) {
    throw new LocationDetectionError(
      "UNSUPPORTED",
      "Este navegador não oferece geolocalização. Selecione sua UF manualmente.",
    );
  }

  const coordinates = await requestCoordinates(
    geolocation,
    options.timeoutMilliseconds ?? 10_000,
  );
  let boundaries: StateBoundaryDataset;
  try {
    boundaries = await (options.loadBoundaries ?? loadStateBoundaries)();
  } catch {
    throw new LocationDetectionError(
      "BOUNDARY_DATA_UNAVAILABLE",
      "Não foi possível carregar os limites estaduais locais. Selecione sua UF manualmente.",
    );
  }

  const resolution = resolveStateFromCoordinates(boundaries, {
    longitude: coordinates.longitude,
    latitude: coordinates.latitude,
  });
  if (resolution.status === "MATCH") {
    return resolution.uf;
  }
  if (resolution.status === "AMBIGUOUS") {
    throw new LocationDetectionError(
      "AMBIGUOUS_BOUNDARY",
      "A localização está próxima a uma divisa estadual. Confirme sua UF manualmente.",
    );
  }
  throw new LocationDetectionError(
    "OUTSIDE_BRAZIL",
    "A localização não corresponde a uma UF brasileira. Selecione sua UF manualmente.",
  );
}
