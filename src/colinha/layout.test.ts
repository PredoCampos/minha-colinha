import { describe, expect, it } from "vitest";

import { calculateColinhaLayout } from "./layout.ts";

describe("layout do PNG", () => {
  it("gera uma composição de alta resolução para seis posições", () => {
    const layout = calculateColinhaLayout(6, true);

    expect(layout.width).toBe(1080);
    expect(layout.height).toBe(1758);
    expect(layout.rows).toHaveLength(6);
    expect(layout.rows[0]).toMatchObject({ y: 302, height: 220 });
    expect(layout.rows[5]).toMatchObject({ y: 1482, height: 220 });
  });

  it("remove o espaço do aviso quando não há fixture", () => {
    const withNotice = calculateColinhaLayout(6, true);
    const withoutNotice = calculateColinhaLayout(6, false);

    expect(withNotice.notice).not.toBeNull();
    expect(withoutNotice.notice).toBeNull();
    expect(withNotice.height - withoutNotice.height).toBe(72);
  });

  it("rejeita composição sem posições", () => {
    expect(() => calculateColinhaLayout(0, true)).toThrow(
      "pelo menos uma posição",
    );
  });
});
