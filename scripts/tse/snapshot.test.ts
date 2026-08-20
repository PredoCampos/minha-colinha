import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CANDIDATE_STATUS,
  type Candidate,
} from "../../src/candidates/model.ts";
import { TERRITORIAL_SCOPE } from "../../src/election/types.ts";
import {
  buildCandidateFiles,
  expectedCandidateFiles2026,
  publishStageAtomically,
  serializeSnapshotJson,
} from "./snapshot.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

function completeCandidateSet(): readonly Candidate[] {
  return expectedCandidateFiles2026().flatMap((expected, index) =>
    [1, 2].map((candidateIndex) => ({
      id: `${index + 1}${candidateIndex}`,
      electionYear: 2026,
      office: expected.office,
      number: String(candidateIndex === 1 ? 20 : 10),
      ballotName: `CANDIDATURA ${candidateIndex}`,
      party: "TESTE",
      photoPath: null,
      status: CANDIDATE_STATUS.DISPLAYABLE,
      jurisdiction:
        expected.partition.scope === TERRITORIAL_SCOPE.NATIONAL
          ? { scope: TERRITORIAL_SCOPE.NATIONAL }
          : { scope: TERRITORIAL_SCOPE.STATE, uf: expected.partition.uf },
    } as const)),
  );
}

describe("snapshots oficiais", () => {
  it("gera todas as partições 2026, com DF distrital, e ordem determinística", () => {
    const candidates = completeCandidateSet();
    const first = buildCandidateFiles(candidates);
    const second = buildCandidateFiles([...candidates].reverse());

    expect(first).toHaveLength(109);
    expect(
      first.find((file) => file.partition.scope === "STATE" && file.partition.uf === "DF" && file.office === "DISTRICT_DEPUTY"),
    ).toBeDefined();
    expect(
      first.find((file) => file.partition.scope === "STATE" && file.partition.uf === "DF" && file.office === "STATE_DEPUTY"),
    ).toBeUndefined();
    expect(serializeSnapshotJson(first)).toBe(serializeSnapshotJson(second));
    expect(first[0]?.candidates.map(({ number }) => number)).toEqual(["10", "20"]);
  });

  it("rejeita conjunto incompleto", () => {
    expect(() => buildCandidateFiles(completeCandidateSet().slice(0, 2))).toThrow(
      /Snapshot incompleto/,
    );
  });

  it("substitui o diretório publicado somente depois do staging pronto", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "colinha-atomic-test-"));
    temporaryDirectories.push(root);
    const target = path.join(root, "2026");
    const stage = path.join(root, ".2026-stage-test");
    await mkdir(target);
    await mkdir(stage);
    await writeFile(path.join(target, "old.txt"), "anterior", "utf8");
    await writeFile(path.join(stage, "new.txt"), "novo", "utf8");

    await publishStageAtomically(root, stage);

    await expect(readFile(path.join(target, "new.txt"), "utf8")).resolves.toBe("novo");
    await expect(readFile(path.join(target, "old.txt"), "utf8")).rejects.toThrow();
  });
});
