import { describe, expect, it } from "vitest";

import { TERRITORIAL_SCOPE } from "../election/types.ts";
import { colinhaFileName } from "./filename.ts";

describe("nome do arquivo exportado", () => {
  it("inclui ano e UF sem dados de candidatos", () => {
    expect(
      colinhaFileName(2026, {
        scope: TERRITORIAL_SCOPE.STATE,
        uf: "SP",
      }),
    ).toBe("minha-colinha-2026-sp.png");
  });

  it("suporta circunscrição municipal futura", () => {
    expect(
      colinhaFileName(2028, {
        scope: TERRITORIAL_SCOPE.MUNICIPALITY,
        uf: "MA",
        municipalityCode: "2111300",
        municipalityName: "São Luís",
      }),
    ).toBe("minha-colinha-2028-ma-2111300.png");
  });
});
