import { describe, expect, it } from "vitest";
import { CANDIDATE_STATUS } from "../../src/candidates/model.ts";
import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../../src/election/types.ts";
import { normalizeTseCandidates } from "./normalize.ts";
import type {
  PhotoIndex,
  TseCandidateRow,
  TseCandidateSupplementRow,
} from "./types.ts";

function candidate(
  overrides: Partial<TseCandidateRow> & Pick<TseCandidateRow, "sequenceId">,
): TseCandidateRow {
  return {
    generatedDate: "17/08/2026",
    generatedTime: "19:31:13",
    electionYear: "2026",
    scope: "ESTADUAL",
    uf: "SP",
    electoralUnit: "SP",
    officeCode: "5",
    officeDescription: "SENADOR",
    number: "200",
    ballotName: "CANDIDATURA TESTE",
    party: "TESTE",
    candidacyStatusCode: "-3",
    candidacyStatusDescription: "#NE",
    ...overrides,
  };
}

function supplement(
  sequenceId: string,
  code = "8",
  description = "AGUARDANDO JULGAMENTO",
): TseCandidateSupplementRow {
  return {
    generatedDate: "17/08/2026",
    generatedTime: "19:31:13",
    electionYear: "2026",
    sequenceId,
    judgmentStatusCode: code,
    judgmentStatusDescription: description,
  };
}

function photoIndex(entries: readonly [string, string][]): PhotoIndex {
  const partitions = new Map<string, Map<string, { entryName: string; extractedPath: string }>>();
  for (const [partition, sequenceId] of entries) {
    const photos = partitions.get(partition) ?? new Map();
    photos.set(sequenceId, {
      entryName: `F${partition}${sequenceId}_div.jpg`,
      extractedPath: `/${partition}/${sequenceId}.jpg`,
    });
    partitions.set(partition, photos);
  }
  return partitions;
}

describe("normalização TSE → modelo interno", () => {
  it("produz Presidente nacional, Senador estadual e Deputado Distrital no DF", () => {
    const rows = [
      candidate({
        sequenceId: "280002552487",
        scope: "FEDERAL",
        uf: "BR",
        electoralUnit: "BR",
        officeCode: "1",
        officeDescription: "PRESIDENTE",
        number: "29",
      }),
      candidate({ sequenceId: "250002544673" }),
      candidate({
        sequenceId: "70002531326",
        uf: "DF",
        electoralUnit: "DF",
        officeCode: "8",
        officeDescription: "DEPUTADO DISTRITAL",
        number: "30530",
      }),
    ];
    const supplements = [
      supplement("280002552487"),
      supplement("250002544673"),
      supplement("70002531326", "2", "DEFERIDO"),
    ];
    const result = normalizeTseCandidates(
      rows,
      supplements,
      photoIndex([
        ["BR", "280002552487"],
        ["SP", "250002544673"],
        ["DF", "70002531326"],
      ]),
    );

    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.find(({ office }) => office === ELECTORAL_OFFICE.PRESIDENT)).toMatchObject({
      id: "280002552487",
      jurisdiction: { scope: TERRITORIAL_SCOPE.NATIONAL },
      photoPath: "data/2026/BR/president/photos/280002552487.jpg",
      status: CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
    });
    expect(result.candidates.find(({ office }) => office === ELECTORAL_OFFICE.SENATOR)).toMatchObject({
      jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
    });
    expect(result.candidates.find(({ office }) => office === ELECTORAL_OFFICE.DISTRICT_DEPUTY)).toMatchObject({
      jurisdiction: { scope: TERRITORIAL_SCOPE.STATE, uf: "DF" },
      status: CANDIDATE_STATUS.DISPLAYABLE,
    });
  });

  it("mantém foto ausente como null e ignora vice/suplente explicitamente", () => {
    const rows = [
      candidate({ sequenceId: "1" }),
      candidate({ sequenceId: "2", officeCode: "9", officeDescription: "1º SUPLENTE" }),
    ];
    const result = normalizeTseCandidates(
      rows,
      [supplement("1"), supplement("2")],
      new Map(),
    );

    expect(result.candidates[0]?.photoPath).toBeNull();
    expect(result.missingPhotoCount).toBe(1);
    expect(result.ignoredOfficeCounts).toEqual({ "9 1º SUPLENTE": 1 });
  });

  it("rejeita dados incompletos, situação desconhecida e cargo territorial inválido", () => {
    expect(() => normalizeTseCandidates([candidate({ sequenceId: "1" })], [], new Map())).toThrow(
      /divergem/,
    );
    expect(() =>
      normalizeTseCandidates(
        [candidate({ sequenceId: "1" })],
        [supplement("1", "999", "NOVA")],
        new Map(),
      ),
    ).toThrow(/Situação de julgamento TSE desconhecida/);
    expect(() =>
      normalizeTseCandidates(
        [
          candidate({
            sequenceId: "1",
            uf: "SP",
            electoralUnit: "SP",
            officeCode: "8",
            officeDescription: "DEPUTADO DISTRITAL",
          }),
        ],
        [supplement("1")],
        new Map(),
      ),
    ).toThrow(/fora do DF/);
  });
});
