import path from "node:path";
import process from "node:process";
import { runTse2026Pipeline } from "./pipeline.ts";

interface Arguments {
  readonly inputDirectory?: string;
  readonly outputDirectory?: string;
  readonly publish: boolean;
}

function usage(): string {
  return [
    "Uso: npm run data:tse -- [opções]",
    "",
    "  --input-dir <diretório>  usa ZIPs oficiais já baixados",
    "  --output-root <diretório> altera a raiz public/data",
    "  --no-publish             valida e descarta o staging",
    "  --help                   mostra esta ajuda",
  ].join("\n");
}

function parseArguments(values: readonly string[]): Arguments {
  let inputDirectory: string | undefined;
  let outputDirectory: string | undefined;
  let publish = true;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--help") {
      console.log(usage());
      process.exit(0);
    } else if (value === "--no-publish") {
      publish = false;
    } else if (value === "--input-dir" || value === "--output-root") {
      const next = values[index + 1];
      if (!next) throw new Error(`${value} exige um diretório.`);
      if (value === "--input-dir") inputDirectory = next;
      else outputDirectory = next;
      index += 1;
    } else {
      throw new Error(`Opção desconhecida: ${value}.\n${usage()}`);
    }
  }
  return {
    ...(inputDirectory ? { inputDirectory } : {}),
    ...(outputDirectory ? { outputDirectory } : {}),
    publish,
  };
}

function errorChain(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }
  if (current !== undefined) messages.push(String(current));
  return messages.join("\nCausado por: ");
}

try {
  const arguments_ = parseArguments(process.argv.slice(2));
  const projectRoot = process.cwd();
  const report = await runTse2026Pipeline({
    projectRoot,
    ...(arguments_.inputDirectory
      ? { localArchiveDirectory: path.resolve(arguments_.inputDirectory) }
      : {}),
    ...(arguments_.outputDirectory
      ? { dataRoot: path.resolve(arguments_.outputDirectory) }
      : {}),
    publish: arguments_.publish,
    onProgress: (message) => console.log(`[TSE 2026] ${message}`),
  });
  console.log(
    `[TSE 2026] ${report.published ? "Publicado" : "Validado"}: ${report.candidateCount} candidaturas, ${report.missingPhotoCount} sem foto, geração ${report.sourceGeneratedAt}.`,
  );
} catch (error) {
  console.error("[TSE 2026] Pipeline abortado; o último snapshot válido foi preservado.");
  console.error(errorChain(error));
  process.exitCode = 1;
}
