import { publicPath } from "../shared/paths.ts";
import { calculateColinhaLayout, type Rectangle } from "./layout.ts";
import type { ColinhaModel, ColinhaRow } from "./model.ts";

type LoadedPhoto = HTMLImageElement | null;

function roundedRectangle(
  context: CanvasRenderingContext2D,
  rectangle: Rectangle,
  radius: number,
): void {
  const { x, y, width, height } = rectangle;
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.lineTo(x + width - corner, y);
  context.quadraticCurveTo(x + width, y, x + width, y + corner);
  context.lineTo(x + width, y + height - corner);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - corner,
    y + height,
  );
  context.lineTo(x + corner, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - corner);
  context.lineTo(x, y + corner);
  context.quadraticCurveTo(x, y, x + corner, y);
  context.closePath();
}

function fillRoundedRectangle(
  context: CanvasRenderingContext2D,
  rectangle: Rectangle,
  radius: number,
  color: string,
): void {
  roundedRectangle(context, rectangle, radius);
  context.fillStyle = color;
  context.fill();
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maximumWidth: number,
): string {
  if (context.measureText(text).width <= maximumWidth) {
    return text;
  }

  let result = text;
  while (
    result.length > 1 &&
    context.measureText(`${result}…`).width > maximumWidth
  ) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}…`;
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rectangle: Rectangle,
): void {
  const scale = Math.max(
    rectangle.width / image.naturalWidth,
    rectangle.height / image.naturalHeight,
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = rectangle.x + (rectangle.width - width) / 2;
  const y = rectangle.y + (rectangle.height - height) / 2;

  context.save();
  roundedRectangle(context, rectangle, 12);
  context.clip();
  context.drawImage(image, x, y, width, height);
  context.restore();
}

function drawMissingPhoto(
  context: CanvasRenderingContext2D,
  rectangle: Rectangle,
): void {
  fillRoundedRectangle(context, rectangle, 12, "#e5e3da");
  context.fillStyle = "#a3b0a7";
  context.beginPath();
  context.arc(
    rectangle.x + rectangle.width / 2,
    rectangle.y + 48,
    25,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.beginPath();
  context.ellipse(
    rectangle.x + rectangle.width / 2,
    rectangle.y + 112,
    42,
    48,
    0,
    Math.PI,
    Math.PI * 2,
  );
  context.fill();
  context.fillStyle = "#536057";
  context.font = "700 16px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(
    "Sem foto",
    rectangle.x + rectangle.width / 2,
    rectangle.y + rectangle.height - 12,
  );
  context.textAlign = "start";
}

function drawHeader(
  context: CanvasRenderingContext2D,
  rectangle: Rectangle,
  model: ColinhaModel,
): void {
  fillRoundedRectangle(context, rectangle, 24, "#173f2d");
  context.fillStyle = "#fffdf7";
  context.font = "800 50px system-ui, sans-serif";
  context.fillText(model.title, rectangle.x + 36, rectangle.y + 68);
  context.fillStyle = "#dbe9df";
  context.font = "600 28px system-ui, sans-serif";
  context.fillText(model.electionLabel, rectangle.x + 36, rectangle.y + 108);
  context.font = "500 21px system-ui, sans-serif";
  context.fillText(
    "Ordem oficial de votação",
    rectangle.x + 36,
    rectangle.y + 137,
  );
}

function drawNotice(
  context: CanvasRenderingContext2D,
  rectangle: Rectangle,
  notice: string,
): void {
  fillRoundedRectangle(context, rectangle, 14, "#ffe3ad");
  context.fillStyle = "#4c321c";
  context.font = "800 23px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(
    fitText(context, notice, rectangle.width - 36),
    rectangle.x + rectangle.width / 2,
    rectangle.y + 35,
  );
  context.textAlign = "start";
}

function drawRow(
  context: CanvasRenderingContext2D,
  rectangle: Rectangle,
  row: ColinhaRow,
  photo: LoadedPhoto,
): void {
  fillRoundedRectangle(context, rectangle, 20, "#fffef9");
  context.strokeStyle = "#cbd2cb";
  context.lineWidth = 2;
  roundedRectangle(context, rectangle, 20);
  context.stroke();

  context.fillStyle = "#dbe9df";
  context.beginPath();
  context.arc(rectangle.x + 38, rectangle.y + 38, 22, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#173f2d";
  context.font = "800 22px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(String(row.order), rectangle.x + 38, rectangle.y + 46);
  context.textAlign = "start";

  context.fillStyle = "#26352d";
  context.font = "800 27px system-ui, sans-serif";
  context.fillText(
    fitText(context, row.officeLabel, rectangle.width - 116),
    rectangle.x + 76,
    rectangle.y + 47,
  );

  if (!row.candidate) {
    context.fillStyle = "#69736d";
    context.font = "600 32px system-ui, sans-serif";
    context.fillText("Não preenchido", rectangle.x + 78, rectangle.y + 137);
    return;
  }

  const photoRectangle = {
    x: rectangle.x + 28,
    y: rectangle.y + 68,
    width: 120,
    height: 132,
  };
  if (photo) {
    drawCoverImage(context, photo, photoRectangle);
  } else {
    drawMissingPhoto(context, photoRectangle);
  }

  const textX = rectangle.x + 176;
  context.fillStyle = "#123b27";
  context.font = "900 76px system-ui, sans-serif";
  context.fillText(row.candidate.number, textX, rectangle.y + 133);
  context.fillStyle = "#18231d";
  context.font = "800 31px system-ui, sans-serif";
  context.fillText(
    fitText(context, row.candidate.ballotName, rectangle.width - 210),
    textX,
    rectangle.y + 174,
  );
  context.fillStyle = "#536057";
  context.font = "600 24px system-ui, sans-serif";
  context.fillText(row.candidate.party, textX, rectangle.y + 204);
}

function loadPhoto(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("Foto indisponível")), {
      once: true,
    });
    image.src = publicPath(path);
  });
}

async function loadPhotos(model: ColinhaModel): Promise<readonly LoadedPhoto[]> {
  return Promise.all(
    model.rows.map(async (row) => {
      const path = row.candidate?.photoPath;
      if (!path) {
        return null;
      }
      try {
        return await loadPhoto(path);
      } catch {
        return null;
      }
    }),
  );
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("O navegador não conseguiu codificar a imagem PNG."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function generateColinhaPng(model: ColinhaModel): Promise<Blob> {
  await document.fonts.ready;
  const layout = calculateColinhaLayout(model.rows.length, model.notice !== null);
  const photos = await loadPhotos(model);
  const canvas = document.createElement("canvas");
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("O navegador não oferece suporte à geração da imagem.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#f4f3ed";
  context.fillRect(0, 0, layout.width, layout.height);
  drawHeader(context, layout.header, model);
  if (layout.notice && model.notice) {
    drawNotice(context, layout.notice, model.notice);
  }
  model.rows.forEach((row, index) => {
    const rectangle = layout.rows[index];
    if (rectangle) {
      drawRow(context, rectangle, row, photos[index] ?? null);
    }
  });

  const blob = await canvasToPng(canvas);
  canvas.width = 1;
  canvas.height = 1;
  return blob;
}
