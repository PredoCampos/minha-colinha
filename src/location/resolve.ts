import type { FederativeUnit } from "../election/types.ts";
import type {
  BoundaryGeometry,
  GeographicPosition,
  LinearRing,
  PolygonCoordinates,
  StateBoundaryDataset,
} from "./boundaries.ts";

export interface GeographicCoordinates {
  readonly longitude: number;
  readonly latitude: number;
}

export type StateResolution =
  | Readonly<{ status: "MATCH"; uf: FederativeUnit }>
  | Readonly<{ status: "OUTSIDE" }>
  | Readonly<{
      status: "AMBIGUOUS";
      candidates: readonly FederativeUnit[];
    }>;

function isValidCoordinates(coordinates: GeographicCoordinates): boolean {
  return (
    Number.isFinite(coordinates.longitude) &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180 &&
    Number.isFinite(coordinates.latitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90
  );
}

function isPointOnSegment(
  [longitude, latitude]: GeographicPosition,
  [startLongitude, startLatitude]: GeographicPosition,
  [endLongitude, endLatitude]: GeographicPosition,
): boolean {
  const cross =
    (longitude - startLongitude) * (endLatitude - startLatitude) -
    (latitude - startLatitude) * (endLongitude - startLongitude);
  if (Math.abs(cross) > 1e-10) {
    return false;
  }
  const dot =
    (longitude - startLongitude) * (longitude - endLongitude) +
    (latitude - startLatitude) * (latitude - endLatitude);
  return dot <= 1e-10;
}

function pointInRing(point: GeographicPosition, ring: LinearRing): boolean {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const currentPoint = ring[current];
    const previousPoint = ring[previous];
    if (!currentPoint || !previousPoint) {
      continue;
    }
    if (isPointOnSegment(point, previousPoint, currentPoint)) {
      return true;
    }
    const crossesRay =
      currentPoint[1] > point[1] !== previousPoint[1] > point[1] &&
      point[0] <
        ((previousPoint[0] - currentPoint[0]) *
          (point[1] - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0];
    if (crossesRay) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(
  point: GeographicPosition,
  polygon: PolygonCoordinates,
): boolean {
  const outerRing = polygon[0];
  if (!outerRing || !pointInRing(point, outerRing)) {
    return false;
  }
  return polygon.slice(1).every((hole) => !pointInRing(point, hole));
}

export function pointInBoundaryGeometry(
  coordinates: GeographicCoordinates,
  geometry: BoundaryGeometry,
): boolean {
  if (!isValidCoordinates(coordinates)) {
    return false;
  }
  const point: GeographicPosition = [
    coordinates.longitude,
    coordinates.latitude,
  ];
  return geometry.type === "Polygon"
    ? pointInPolygon(point, geometry.coordinates)
    : geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
}

export function resolveStateFromCoordinates(
  dataset: StateBoundaryDataset,
  coordinates: GeographicCoordinates,
): StateResolution {
  if (!isValidCoordinates(coordinates)) {
    return { status: "OUTSIDE" };
  }
  const candidates = dataset.features
    .filter(({ geometry }) => pointInBoundaryGeometry(coordinates, geometry))
    .map(({ code }) => code);

  if (candidates.length === 0) {
    return { status: "OUTSIDE" };
  }
  if (candidates.length > 1) {
    return { status: "AMBIGUOUS", candidates };
  }
  const uf = candidates[0];
  return uf ? { status: "MATCH", uf } : { status: "OUTSIDE" };
}
