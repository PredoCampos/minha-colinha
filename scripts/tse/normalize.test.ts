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
  overrides: Partial<TseCandidateSupplementRow> = {},
): TseCandidateSupplementRow {
  return {
    generatedDate: "17/08/2026",
    generatedTime: "19:31:13",
    electionYear: "2026",
    sequenceId,
    judgmentStatusCode: code,
    judgmentStatusDescription: description,
    ...overrides,
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
    expect(result.supplementOnlyCount).toBe(0);
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
    expect(() =>
      normalizeTseCandidates(
        [candidate({ sequenceId: "1" })],
        [supplement("2")],
        new Map(),
      ),
    ).toThrow(/Não há registro complementar para SQ_CANDIDATO 1/);
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
    expect(() =>
      normalizeTseCandidates(
        [
          candidate({
            sequenceId: "1",
            candidacyStatusCode: "99",
            candidacyStatusDescription: "NOVA SITUAÇÃO",
          }),
        ],
        [supplement("1", "2", "DEFERIDO")],
        new Map(),
      ),
    ).toThrow(/Situação geral de candidatura TSE desconhecida/);
  });

  it("preserva as transições de julgamento observadas em 2026", () => {
    const result = normalizeTseCandidates(
      [
        candidate({ sequenceId: "1" }),
        candidate({ sequenceId: "2" }),
        candidate({ sequenceId: "3" }),
      ],
      [
        supplement("1", "16", "DEFERIDO EM PRAZO RECURSAL OU COM RECURSO"),
        supplement("2", "4", "INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO"),
        supplement("3", "6", "RENÚNCIA"),
      ],
      new Map(),
    );

    expect(result.candidates.map(({ status }) => status)).toEqual([
      CANDIDATE_STATUS.DISPLAYABLE,
      CANDIDATE_STATUS.PENDING_OR_AMBIGUOUS,
      CANDIDATE_STATUS.NOT_DISPLAYABLE,
    ]);
  });

  it("aceita complemento como superset, ignora extras e mantém o principal autoritativo", () => {
    const result = normalizeTseCandidates(
      [candidate({ sequenceId: "1" }), candidate({ sequenceId: "2" })],
      [supplement("1"), supplement("2"), supplement("3")],
      new Map(),
    );

    expect(result.rawCandidateCount).toBe(2);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map(({ id }) => id)).toEqual(["1", "2"]);
    expect(result.supplementOnlyCount).toBe(1);
  });

  it("aceita gerações distintas entre recursos e usa a mais antiga no snapshot", () => {
    const result = normalizeTseCandidates(
      [candidate({ sequenceId: "1" })],
      [
        supplement("1", "8", "AGUARDANDO JULGAMENTO", {
          generatedDate: "18/08/2026",
          generatedTime: "08:15:00",
        }),
      ],
      new Map(),
    );

    expect(result.candidateGeneratedAt).toBe("2026-08-17T22:31:13.000Z");
    expect(result.supplementGeneratedAt).toBe("2026-08-18T11:15:00.000Z");
    expect(result.sourceGeneratedAt).toBe("2026-08-17T22:31:13.000Z");
  });

  it("rejeita gerações misturadas dentro de qualquer arquivo individual", () => {
    expect(() =>
      normalizeTseCandidates(
        [
          candidate({ sequenceId: "1" }),
          candidate({ sequenceId: "2", generatedTime: "19:31:14" }),
        ],
        [supplement("1"), supplement("2")],
        new Map(),
      ),
    ).toThrow(/arquivo principal mistura extrações/);

    expect(() =>
      normalizeTseCandidates(
        [candidate({ sequenceId: "1" }), candidate({ sequenceId: "2" })],
        [
          supplement("1"),
          supplement("2", "8", "AGUARDANDO JULGAMENTO", {
            generatedTime: "19:31:14",
          }),
        ],
        new Map(),
      ),
    ).toThrow(/arquivo complementar mistura extrações/);
  });

  it("continua rejeitando SQ_CANDIDATO duplicado no complementar", () => {
    expect(() =>
      normalizeTseCandidates(
        [candidate({ sequenceId: "1" })],
        [supplement("1"), supplement("1")],
        new Map(),
      ),
    ).toThrow(/SQ_CANDIDATO duplicado no arquivo complementar/);
  });
});
