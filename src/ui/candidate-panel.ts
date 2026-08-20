export const CANDIDATE_PANEL_ACTION = {
  OPEN: "OPEN",
  CLOSE: "CLOSE",
  FILTER: "FILTER",
  SHOW_MORE: "SHOW_MORE",
} as const;

export type CandidatePanelAction =
  (typeof CANDIDATE_PANEL_ACTION)[keyof typeof CANDIDATE_PANEL_ACTION];

export interface CandidatePanelState {
  readonly open: boolean;
  readonly visibleLimit: number;
}

export function initialCandidatePanelState(pageSize: number): CandidatePanelState {
  return { open: false, visibleLimit: pageSize };
}

export function updateCandidatePanelState(
  state: CandidatePanelState,
  action: CandidatePanelAction,
  pageSize: number,
): CandidatePanelState {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("O tamanho da página deve ser um inteiro positivo.");
  }

  switch (action) {
    case CANDIDATE_PANEL_ACTION.OPEN:
      return { ...state, open: true };
    case CANDIDATE_PANEL_ACTION.CLOSE:
      return { open: false, visibleLimit: pageSize };
    case CANDIDATE_PANEL_ACTION.FILTER:
      return { open: true, visibleLimit: pageSize };
    case CANDIDATE_PANEL_ACTION.SHOW_MORE:
      return {
        open: true,
        visibleLimit: state.visibleLimit + pageSize,
      };
  }
}
