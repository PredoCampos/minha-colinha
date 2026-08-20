import { describe, expect, it } from "vitest";
import { parseCandidateCsv, parseCandidateSupplementCsv, parseTseCsv } from "./csv.ts";

function latin1(value: string): Uint8Array {
  return Uint8Array.from([...value].map((character) => {
    const code = character.codePointAt(0) ?? 0;
    if (code > 0xff) throw new Error(`Caractere fora de ISO-8859-1: ${character}`);
    return code;
  }));
}

const CANDIDATE_HEADER = [
  "DT_GERACAO",
  "HH_GERACAO",
  "ANO_ELEICAO",
  "TP_ABRANGENCIA",
  "SG_UF",
  "SG_UE",
  "CD_CARGO",
  "DS_CARGO",
  "SQ_CANDIDATO",
  "NR_CANDIDATO",
  "NM_URNA_CANDIDATO",
  "SG_PARTIDO",
  "CD_SITUACAO_CANDIDATURA",
  "DS_SITUACAO_CANDIDATURA",
].map((column) => `"${column}"`).join(";");

describe("parser do CSV real do TSE 2026", () => {
  it("lê ISO-8859-1, ponto e vírgula, aspas e campos numéricos não citados", () => {
    const input = `${CANDIDATE_HEADER}\r\n"17/08/2026";"19:31:13";2026;"ESTADUAL";"DF";"DF";8;"DEPUTADO DISTRITAL";70002531326;30530;"FERNANDA FRANÇA";"NOVO";-3;"#NE"\r\n`;
    const rows = parseCandidateCsv(latin1(input));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      electionYear: "2026",
      officeCode: "8",
      officeDescription: "DEPUTADO DISTRITAL",
      sequenceId: "70002531326",
      ballotName: "FERNANDA FRANÇA",
      uf: "DF",
    });
  });

  it("lê a situação de julgamento do arquivo complementar", () => {
    const header = [
      "DT_GERACAO",
      "HH_GERACAO",
      "ANO_ELEICAO",
      "SQ_CANDIDATO",
      "CD_SITUACAO_JULGAMENTO",
      "DS_SITUACAO_JULGAMENTO",
    ].map((column) => `"${column}"`).join(";");
    const input = `${header}\r\n"17/08/2026";"19:31:13";2026;70002531326;2;"DEFERIDO"\r\n`;

    expect(parseCandidateSupplementCsv(latin1(input))[0]).toMatchObject({
      sequenceId: "70002531326",
      judgmentStatusCode: "2",
      judgmentStatusDescription: "DEFERIDO",
    });
  });

  it("rejeita estrutura incompleta e quantidade divergente de campos", () => {
    expect(() => parseTseCsv(latin1('"A";"B"\r\n"1"\r\n'), ["A", "B"])).toThrow(
      /esperado 2 campos/,
    );
    expect(() => parseTseCsv(latin1('"A"\r\n"1"\r\n'), ["A", "B"])).toThrow(
      /colunas obrigatórias: B/,
    );
  });
});
