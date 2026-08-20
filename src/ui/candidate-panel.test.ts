import { describe, expect, it } from "vitest";

import {
  CANDIDATE_PANEL_ACTION,
  initialCandidatePanelState,
  updateCandidatePanelState,
} from "./candidate-panel.ts";

describe("painel flutuante de candidatos", () => {
  it("inicia fechado, abre sob ação explícita e fecha por Escape ou clique externo", () => {
    const initial = initialCandidatePanelState(20);
    const open = updateCandidatePanelState(
      initial,
      CANDIDATE_PANEL_ACTION.OPEN,
      20,
    );
    const escaped = updateCandidatePanelState(
      open,
      CANDIDATE_PANEL_ACTION.CLOSE,
      20,
    );
    const reopened = updateCandidatePanelState(
      escaped,
      CANDIDATE_PANEL_ACTION.OPEN,
      20,
    );
    const outsideClick = updateCandidatePanelState(
      reopened,
      CANDIDATE_PANEL_ACTION.CLOSE,
      20,
    );

    expect(initial).toEqual({ open: false, visibleLimit: 20 });
    expect(open.open).toBe(true);
    expect(escaped.open).toBe(false);
    expect(outsideClick.open).toBe(false);
  });

  it("reabre ao filtrar, reinicia em 20 e mostra mais em blocos de 20", () => {
    const initial = initialCandidatePanelState(20);
    const forty = updateCandidatePanelState(
      initial,
      CANDIDATE_PANEL_ACTION.SHOW_MORE,
      20,
    );
    const closed = updateCandidatePanelState(
      forty,
      CANDIDATE_PANEL_ACTION.CLOSE,
      20,
    );
    const filtered = updateCandidatePanelState(
      closed,
      CANDIDATE_PANEL_ACTION.FILTER,
      20,
    );

    expect(forty).toEqual({ open: true, visibleLimit: 40 });
    expect(closed).toEqual({ open: false, visibleLimit: 20 });
    expect(filtered).toEqual({ open: true, visibleLimit: 20 });
  });
});
