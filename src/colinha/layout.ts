export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ColinhaLayout {
  readonly width: number;
  readonly height: number;
  readonly header: Rectangle;
  readonly notice: Rectangle | null;
  readonly rows: readonly Rectangle[];
}

const CANVAS_WIDTH = 1080;
const OUTER_MARGIN = 56;
const HEADER_HEIGHT = 156;
const NOTICE_HEIGHT = 54;
const SECTION_GAP = 18;
const ROW_HEIGHT = 220;
const ROW_GAP = 16;

export function calculateColinhaLayout(
  rowCount: number,
  hasNotice: boolean,
): ColinhaLayout {
  if (!Number.isInteger(rowCount) || rowCount < 1) {
    throw new Error("A colinha precisa ter pelo menos uma posição.");
  }

  const header: Rectangle = {
    x: OUTER_MARGIN,
    y: OUTER_MARGIN,
    width: CANVAS_WIDTH - OUTER_MARGIN * 2,
    height: HEADER_HEIGHT,
  };
  const notice = hasNotice
    ? {
        x: OUTER_MARGIN,
        y: header.y + header.height + SECTION_GAP,
        width: header.width,
        height: NOTICE_HEIGHT,
      }
    : null;
  const firstRowY =
    (notice ? notice.y + notice.height : header.y + header.height) + SECTION_GAP;
  const rows = Array.from({ length: rowCount }, (_, index) => ({
    x: OUTER_MARGIN,
    y: firstRowY + index * (ROW_HEIGHT + ROW_GAP),
    width: header.width,
    height: ROW_HEIGHT,
  }));
  const lastRow = rows.at(-1);

  return {
    width: CANVAS_WIDTH,
    height: (lastRow?.y ?? firstRowY) + ROW_HEIGHT + OUTER_MARGIN,
    header,
    notice,
    rows,
  };
}
