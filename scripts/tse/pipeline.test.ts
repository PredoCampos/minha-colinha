import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runTse2026Pipeline } from "./pipeline.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("atomicidade do pipeline", () => {
  it("preserva o snapshot anterior quando um recurso oficial local está ausente", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "colinha-pipeline-test-"));
    temporaryDirectories.push(root);
    const input = path.join(root, "input");
    const dataRoot = path.join(root, "data");
    const current = path.join(dataRoot, "2026");
    await mkdir(input);
    await mkdir(current, { recursive: true });
    await writeFile(path.join(current, "marker.txt"), "snapshot válido", "utf8");

    await expect(
      runTse2026Pipeline({
        projectRoot: root,
        localArchiveDirectory: input,
        dataRoot,
      }),
    ).rejects.toThrow();

    await expect(readFile(path.join(current, "marker.txt"), "utf8")).resolves.toBe(
      "snapshot válido",
    );
  });
});
