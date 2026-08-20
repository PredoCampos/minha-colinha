import { describe, expect, it } from "vitest";

import boundaryArtifact from "../../public/geography/ibge-uf-minimum.json";
import {
  validateStateBoundaryDataset,
  type BoundaryGeometry,
  type StateBoundaryDataset,
} from "./boundaries.ts";
import {
  pointInBoundaryGeometry,
  resolveStateFromCoordinates,
} from "./resolve.ts";

function officialDataset() {
  const value: unknown = boundaryArtifact;
  if (!validateStateBoundaryDataset(value)) {
    throw new Error("A malha oficial de teste deveria ser válida.");
  }
  return value;
}

describe("resolução territorial local", () => {
  it.each([
    ["AC", -67.81, -9.97],
    ["AL", -35.735, -9.665],
    ["AP", -51.066, -0.034],
    ["AM", -60.0217, -3.119],
    ["BA", -38.501, -12.973],
    ["CE", -38.526, -3.731],
    ["DF", -47.8825, -15.7942],
    ["ES", -40.3128, -20.3155],
    ["GO", -49.2643, -16.6869],
    ["MA", -44.3028, -2.5307],
    ["MT", -56.0974, -15.6014],
    ["MS", -54.6201, -20.4697],
    ["MG", -43.9378, -19.9167],
    ["PA", -48.4902, -1.4558],
    ["PB", -34.845, -7.1195],
    ["PR", -49.2733, -25.4284],
    ["PE", -34.877, -8.0476],
    ["PI", -42.8019, -5.0919],
    ["RJ", -43.1729, -22.9068],
    ["RN", -35.2094, -5.7945],
    ["RS", -51.23, -30.0346],
    ["RO", -63.9039, -8.7608],
    ["RR", -60.6753, 2.8235],
    ["SC", -48.5482, -27.5954],
    ["SP", -46.6333, -23.5505],
    ["SE", -37.0731, -10.9472],
    ["TO", -48.3336, -10.184],
  ] as const)("resolve a capital de %s", (uf, longitude, latitude) => {
    expect(
      resolveStateFromCoordinates(officialDataset(), { longitude, latitude }),
    ).toEqual({ status: "MATCH", uf });
  });

  it("retorna fora do Brasil para ponto no oceano ou coordenada inválida", () => {
    expect(
      resolveStateFromCoordinates(officialDataset(), {
        longitude: 0,
        latitude: 0,
      }),
    ).toEqual({ status: "OUTSIDE" });
    expect(
      resolveStateFromCoordinates(officialDataset(), {
        longitude: Number.NaN,
        latitude: -23,
      }),
    ).toEqual({ status: "OUTSIDE" });
  });

  it("marca uma coordenada de divisa como ambígua", () => {
    const square = (minimumLongitude: number, maximumLongitude: number) =>
      ({
        type: "Polygon",
        coordinates: [
          [
            [minimumLongitude, 0],
            [maximumLongitude, 0],
            [maximumLongitude, 10],
            [minimumLongitude, 10],
            [minimumLongitude, 0],
          ],
        ],
      }) as const satisfies BoundaryGeometry;
    const dataset = {
      features: [
        { code: "SP", geometry: square(0, 5) },
        { code: "RJ", geometry: square(5, 10) },
      ],
    } as unknown as StateBoundaryDataset;

    expect(
      resolveStateFromCoordinates(dataset, { longitude: 5, latitude: 5 }),
    ).toEqual({ status: "AMBIGUOUS", candidates: ["SP", "RJ"] });
  });

  it("suporta polígonos com ilhas e buracos para futura reutilização", () => {
    const geometry: BoundaryGeometry = {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          [
            [4, 4],
            [6, 4],
            [6, 6],
            [4, 6],
            [4, 4],
          ],
        ],
        [
          [
            [20, 20],
            [21, 20],
            [21, 21],
            [20, 21],
            [20, 20],
          ],
        ],
      ],
    };

    expect(pointInBoundaryGeometry({ longitude: 2, latitude: 2 }, geometry)).toBe(
      true,
    );
    expect(pointInBoundaryGeometry({ longitude: 5, latitude: 5 }, geometry)).toBe(
      false,
    );
    expect(
      pointInBoundaryGeometry({ longitude: 20.5, latitude: 20.5 }, geometry),
    ).toBe(true);
  });
});
