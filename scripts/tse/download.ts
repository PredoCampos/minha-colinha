import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AcquiredResource, ResourceSpec } from "./types.ts";

const USER_AGENT =
  "Minha-Colinha/0.1 (projeto independente open-source; dados oficiais TSE)";

async function checksum(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function assertZip(filePath: string): Promise<void> {
  const bytes = await readFile(filePath);
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error(`Recurso baixado não é um ZIP válido: ${path.basename(filePath)}.`);
  }
}

async function download(spec: ResourceSpec, destination: string): Promise<string | null> {
  let finalError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(spec.url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/zip" },
        redirect: "follow",
        signal: AbortSignal.timeout(300_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const temporary = `${destination}.${randomUUID()}.part`;
      await writeFile(temporary, Buffer.from(await response.arrayBuffer()));
      await rename(temporary, destination);
      return response.headers.get("last-modified");
    } catch (error) {
      finalError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw new Error(`Falha ao baixar ${spec.url} após 3 tentativas.`, { cause: finalError });
}

export async function acquireResources(
  specs: readonly ResourceSpec[],
  workDirectory: string,
  localArchiveDirectory: string | null,
  onProgress: (message: string) => void,
): Promise<readonly AcquiredResource[]> {
  const downloadDirectory = path.join(workDirectory, "downloads");
  await mkdir(downloadDirectory, { recursive: true });
  const acquired: AcquiredResource[] = [];

  for (const spec of specs) {
    onProgress(`${localArchiveDirectory ? "Lendo" : "Baixando"} ${spec.fileName}...`);
    const destination = path.join(downloadDirectory, spec.fileName);
    let lastModified: string | null = null;
    if (localArchiveDirectory) {
      const source = path.resolve(localArchiveDirectory, spec.fileName);
      await copyFile(source, destination);
    } else {
      lastModified = await download(spec, destination);
    }
    await assertZip(destination);
    const details = await stat(destination);
    acquired.push({
      ...spec,
      archivePath: destination,
      sha256: await checksum(destination),
      bytes: details.size,
      lastModified,
    });
  }
  return acquired;
}
