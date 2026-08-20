import { open, readdir } from "node:fs/promises";
import path from "node:path";
import type { PhotoSource } from "./types.ts";

const PHOTO_NAME = /^F([A-Z]{2})(\d+)_div\.jpe?g$/i;

export function candidateSequenceFromPhotoEntry(
  entryName: string,
  expectedPartition: string,
): string | null {
  const baseName = path.posix.basename(entryName.replaceAll("\\", "/"));
  const match = PHOTO_NAME.exec(baseName);
  if (!match) return null;
  const partition = (match[1] ?? "").toUpperCase();
  if (partition !== expectedPartition) {
    throw new Error(
      `Foto ${entryName} pertence à partição ${partition}, não ${expectedPartition}.`,
    );
  }
  return match[2] ?? null;
}

async function listFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(resolved)));
    else if (entry.isFile()) files.push(resolved);
  }
  return files;
}

async function assertJpeg(filePath: string): Promise<void> {
  const handle = await open(filePath, "r");
  try {
    const header = Buffer.alloc(3);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead !== 3 || header[0] !== 0xff || header[1] !== 0xd8 || header[2] !== 0xff) {
      throw new Error(`Foto TSE não contém um JPEG válido: ${filePath}.`);
    }
  } finally {
    await handle.close();
  }
}

export async function indexExtractedPhotos(
  directory: string,
  partition: string,
): Promise<ReadonlyMap<string, PhotoSource>> {
  const result = new Map<string, PhotoSource>();
  for (const filePath of await listFiles(directory)) {
    const sequenceId = candidateSequenceFromPhotoEntry(filePath, partition);
    if (!sequenceId) continue;
    if (result.has(sequenceId)) {
      throw new Error(`Foto duplicada para SQ_CANDIDATO ${sequenceId} em ${partition}.`);
    }
    await assertJpeg(filePath);
    result.set(sequenceId, { entryName: path.basename(filePath), extractedPath: filePath });
  }
  if (result.size === 0) {
    throw new Error(`Pacote de fotos ${partition} não contém fotos no padrão oficial.`);
  }
  return result;
}
