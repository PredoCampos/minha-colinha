import { describe, expect, it } from "vitest";

import { assertSafeEntry } from "./archive.ts";

describe("validação de entradas do ZIP oficial do TSE", () => {
  it("aceita nomes de entrada esperados do pacote oficial", () => {
    expect(() => assertSafeEntry("consulta_cand_2026_BRASIL.csv")).not.toThrow();
    expect(() => assertSafeEntry("FDF70002531326_div.jpg")).not.toThrow();
    expect(() => assertSafeEntry("fotos/FSP10002532483_div.jpg")).not.toThrow();
  });

  it("rejeita travessia de diretório", () => {
    expect(() => assertSafeEntry("../fora-do-destino.csv")).toThrow(
      /Entrada insegura/,
    );
    expect(() => assertSafeEntry("fotos/../../fora.csv")).toThrow(
      /Entrada insegura/,
    );
  });

  it("rejeita paths absolutos POSIX e Windows", () => {
    expect(() => assertSafeEntry("/etc/passwd")).toThrow(/Entrada insegura/);
    expect(() => assertSafeEntry("C:/Windows/system32")).toThrow(
      /Entrada insegura/,
    );
  });

  it("rejeita entradas que poderiam ser interpretadas como opção da CLI de extração", () => {
    expect(() => assertSafeEntry("-rf")).toThrow(/Entrada insegura/);
    expect(() => assertSafeEntry("--help")).toThrow(/Entrada insegura/);
    expect(() => assertSafeEntry("--checkpoint=1")).toThrow(/Entrada insegura/);
    expect(() => assertSafeEntry("--alguma-opcao")).toThrow(/Entrada insegura/);
  });

  it("rejeita mesmo quando o segmento suspeito não é o primeiro do path", () => {
    expect(() => assertSafeEntry("fotos/-rf")).toThrow(/Entrada insegura/);
  });
});
