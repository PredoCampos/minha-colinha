import { describe, expect, it } from "vitest";
import { candidateSequenceFromPhotoEntry } from "./photos.ts";

describe("associação das fotos TSE 2026", () => {
  it("extrai SQ_CANDIDATO do nome concreto do pacote", () => {
    expect(candidateSequenceFromPhotoEntry("pasta/FDF70002531326_div.jpg", "DF")).toBe(
      "70002531326",
    );
    expect(candidateSequenceFromPhotoEntry("FBR280002552487_div.jpeg", "BR")).toBe(
      "280002552487",
    );
  });

  it("ignora artefatos não fotográficos e rejeita UF divergente", () => {
    expect(candidateSequenceFromPhotoEntry("README.txt", "SP")).toBeNull();
    expect(() => candidateSequenceFromPhotoEntry("FRJ190002500001_div.jpg", "SP")).toThrow(
      /partição RJ, não SP/,
    );
  });
});
