import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

function run(command: string, arguments_: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      [...arguments_],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(`Falha ao executar ${command}: ${stderr.trim() || error.message}.`, {
              cause: error,
            }),
          );
          return;
        }
        resolve(stdout);
      },
    );
  });
}

function archiveCommand(
  action: "LIST" | "EXTRACT",
  archivePath: string,
  destination?: string,
  entry?: string,
): readonly [string, readonly string[]] {
  if (process.platform === "win32") {
    return action === "LIST"
      ? ["tar.exe", ["-tf", archivePath]]
      : ["tar.exe", ["-xf", archivePath, "-C", destination ?? "", ...(entry ? [entry] : [])]];
  }
  return action === "LIST"
    ? ["unzip", ["-Z1", archivePath]]
    : ["unzip", ["-q", archivePath, ...(entry ? [entry] : []), "-d", destination ?? ""]];
}

function assertSafeEntry(entry: string): void {
  const normalized = entry.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    /^[a-z]:\//i.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Entrada insegura no ZIP do TSE: ${entry}.`);
  }
}

export async function listArchiveEntries(archivePath: string): Promise<readonly string[]> {
  const [command, arguments_] = archiveCommand("LIST", archivePath);
  const output = await run(command, arguments_);
  const entries = output.split(/\r?\n/).filter(Boolean);
  for (const entry of entries) assertSafeEntry(entry);
  return entries;
}

export async function extractArchive(
  archivePath: string,
  destination: string,
  entry?: string,
): Promise<void> {
  const entries = await listArchiveEntries(archivePath);
  if (entry && !entries.includes(entry)) {
    throw new Error(`Arquivo ${entry} não existe em ${path.basename(archivePath)}.`);
  }
  await mkdir(destination, { recursive: true });
  const [command, arguments_] = archiveCommand("EXTRACT", archivePath, destination, entry);
  await run(command, arguments_);
}

export async function findArchiveEntry(
  archivePath: string,
  expectedBaseName: string,
): Promise<string> {
  const entries = await listArchiveEntries(archivePath);
  const matches = entries.filter(
    (entry) => path.posix.basename(entry.replaceAll("\\", "/")) === expectedBaseName,
  );
  if (matches.length !== 1) {
    throw new Error(
      `Esperada uma entrada ${expectedBaseName} em ${path.basename(archivePath)}, encontradas ${matches.length}.`,
    );
  }
  return matches[0] ?? "";
}
