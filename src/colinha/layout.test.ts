import { describe, expect, it } from "vitest";

import { calculateColinhaLayout } from "./layout.ts";

describe("layout do PNG", () => {
  it("gera uma composição de alta resolução para seis posições", () => {
    const layout = calculateColinhaLayout(6, true, true);

    expect(layout.width).toBe(1080);
    expect(layout.height).toBe(1996);
    expect(layout.rows).toHaveLength(6);
    expect(layout.rows[0]).toMatchObject({ y: 316, height: 244 });
    expect(layout.rows[5]).toMatchObject({ y: 1616, height: 244 });
    expect(layout.footer).toMatchObject({ y: 1878, height: 62 });
  });

  it("só reserva o rodapé quando há metadata oficial", () => {
    const withFooter = calculateColinhaLayout(6, false, true);
    const withoutFooter = calculateColinhaLayout(6, false, false);

    expect(withFooter.footer).not.toBeNull();
    expect(withoutFooter.footer).toBeNull();
    expect(withFooter.height - withoutFooter.height).toBe(80);
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
