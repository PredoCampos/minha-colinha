import { describe, expect, it, vi } from "vitest";

import type {
  BoundaryGeometry,
  StateBoundaryDataset,
} from "./boundaries.ts";
import {
  detectStateFromGeolocation,
  type GeolocationLike,
} from "./geolocation.ts";

const SQUARE: BoundaryGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [-50, -25],
      [-40, -25],
      [-40, -15],
      [-50, -15],
      [-50, -25],
    ],
  ],
};

const BOUNDARIES = {
  schemaVersion: 1,
  level: "STATE",
  source: {
    provider: "Instituto Brasileiro de Geografia e Estatística",
    dataset: "Malhas Geográficas",
    url: "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR",
    quality: "MINIMUM",
    retrievedAt: "2026-08-20T00:00:00.000Z",
    sha256: "a".repeat(64),
  },
  features: [{ code: "SP", geometry: SQUARE }],
} as unknown as StateBoundaryDataset;

function successfulGeolocation(): GeolocationLike {
  return {
    getCurrentPosition(success, _error, options) {
      expect(options).toEqual({
        enableHighAccuracy: false,
        maximumAge: 300_000,
        timeout: 10_000,
      });
      success({ coords: { longitude: -46.63, latitude: -23.55 } });
    },
  };
}

function failingGeolocation(code: number): GeolocationLike {
  return {
    getCurrentPosition(_success, error) {
      error?.({ code });
    },
  };
}

describe("geolocalização opcional", () => {
  it("retorna somente a UF após resolver coordenadas localmente", async () => {
    await expect(
      detectStateFromGeolocation({
        geolocation: successfulGeolocation(),
        loadBoundaries: async () => BOUNDARIES,
      }),
    ).resolves.toBe("SP");
  });

  it.each([
    [1, "PERMISSION_DENIED"],
    [2, "POSITION_UNAVAILABLE"],
    [3, "TIMEOUT"],
    [99, "UNKNOWN_POSITION_ERROR"],
  ] as const)("mapeia o erro %s", async (browserCode, expectedCode) => {
    const loadBoundaries = vi.fn(async () => BOUNDARIES);
    await expect(
      detectStateFromGeolocation({
        geolocation: failingGeolocation(browserCode),
        loadBoundaries,
      }),
    ).rejects.toMatchObject({ code: expectedCode });
    expect(loadBoundaries).not.toHaveBeenCalled();
  });

  it("trata navegador sem suporte", async () => {
    await expect(
      detectStateFromGeolocation({ geolocation: null }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED" });
  });

  it("trata malha indisponível e coordenadas fora do Brasil", async () => {
    await expect(
      detectStateFromGeolocation({
        geolocation: successfulGeolocation(),
        loadBoundaries: async () => {
          throw new Error("indisponível");
        },
      }),
    ).rejects.toMatchObject({ code: "BOUNDARY_DATA_UNAVAILABLE" });

    await expect(
      detectStateFromGeolocation({
        geolocation: {
          getCurrentPosition(success) {
            success({ coords: { longitude: 0, latitude: 0 } });
          },
        },
        loadBoundaries: async () => BOUNDARIES,
      }),
    ).rejects.toMatchObject({ code: "OUTSIDE_BRAZIL" });
  });
});
