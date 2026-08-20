import { describe, expect, it, vi } from "vitest";

import {
  shareColinhaPng,
  type ColinhaShareEnvironment,
} from "./share.ts";

function environment(
  overrides: Partial<ColinhaShareEnvironment> = {},
): ColinhaShareEnvironment {
  return {
    canShare: () => true,
    share: vi.fn(async () => undefined),
    createFile: (_blob, fileName) =>
      ({ name: fileName, type: "image/png" }) as File,
    ...overrides,
  };
}

describe("compartilhamento local da colinha", () => {
  it("compartilha o mesmo PNG como arquivo quando há suporte", async () => {
    const share = vi.fn(async () => undefined);
    const operation = shareColinhaPng(
      new Blob(["png"], { type: "image/png" }),
      "minha-colinha-2026-SP.png",
      environment({ share }),
    );

    // navigator.share precisa ser chamado ainda na ativação do clique.
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Minha Colinha",
        files: [
          expect.objectContaining({ name: "minha-colinha-2026-SP.png" }),
        ],
      }),
    );
    await expect(operation).resolves.toEqual({ status: "shared" });
  });

  it("informa ausência de Web Share com arquivos sem tentar compartilhar", async () => {
    const createFile = vi.fn(
      (_blob: Blob, fileName: string) => ({ name: fileName }) as File,
    );
    const result = await shareColinhaPng(
      new Blob(["png"]),
      "colinha.png",
      { createFile },
    );

    expect(result).toEqual({ status: "unsupported" });
    expect(createFile).not.toHaveBeenCalled();
  });

  it("trata cancelamento do menu nativo sem erro", async () => {
    const cancellation = { name: "AbortError", message: "cancelado" };
    const result = await shareColinhaPng(
      new Blob(["png"]),
      "colinha.png",
      environment({
        share: vi.fn(async () => Promise.reject(cancellation)),
      }),
    );

    expect(result).toEqual({ status: "cancelled" });
  });
});
