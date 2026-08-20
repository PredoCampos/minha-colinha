import type { TseCandidateRow, TseCandidateSupplementRow } from "./types.ts";

type CsvRecord = Readonly<Record<string, string>>;

const CANDIDATE_COLUMNS = [
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
] as const;

const SUPPLEMENT_COLUMNS = [
  "DT_GERACAO",
  "HH_GERACAO",
  "ANO_ELEICAO",
  "SQ_CANDIDATO",
  "CD_SITUACAO_JULGAMENTO",
  "DS_SITUACAO_JULGAMENTO",
] as const;

function parseDelimited(text: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
        if (character === "\n") line += 1;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ";") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      if (!(row.length === 1 && row[0] === "")) rows.push(row);
      row = [];
      field = "";
      line += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error(`CSV TSE inválido: aspas não fechadas na linha ${line}.`);
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }

  return rows;
}

export function decodeTseCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder("iso-8859-1", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error("CSV TSE não pôde ser decodificado como ISO-8859-1.", {
      cause: error,
    });
  }
}

export function parseTseCsv(
  bytes: Uint8Array,
  requiredColumns: readonly string[],
): readonly CsvRecord[] {
  const rows = parseDelimited(decodeTseCsv(bytes));
  const header = rows[0];
  if (!header) throw new Error("CSV TSE vazio.");

  const duplicateHeaders = header.filter(
    (column, index) => header.indexOf(column) !== index,
  );
  if (duplicateHeaders.length > 0) {
    throw new Error(`CSV TSE contém colunas duplicadas: ${duplicateHeaders.join(", ")}.`);
  }

  const missingColumns = requiredColumns.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`CSV TSE não contém colunas obrigatórias: ${missingColumns.join(", ")}.`);
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== header.length) {
      throw new Error(
        `CSV TSE inválido na linha ${index + 2}: esperado ${header.length} campos, encontrado ${values.length}.`,
      );
    }

    return Object.fromEntries(header.map((column, columnIndex) => [column, values[columnIndex] ?? ""]));
  });
}

export function parseCandidateCsv(bytes: Uint8Array): readonly TseCandidateRow[] {
  return parseTseCsv(bytes, CANDIDATE_COLUMNS).map((row) => ({
    generatedDate: row.DT_GERACAO ?? "",
    generatedTime: row.HH_GERACAO ?? "",
    electionYear: row.ANO_ELEICAO ?? "",
    scope: row.TP_ABRANGENCIA ?? "",
    uf: row.SG_UF ?? "",
    electoralUnit: row.SG_UE ?? "",
    officeCode: row.CD_CARGO ?? "",
    officeDescription: row.DS_CARGO ?? "",
    sequenceId: row.SQ_CANDIDATO ?? "",
    number: row.NR_CANDIDATO ?? "",
    ballotName: row.NM_URNA_CANDIDATO ?? "",
    party: row.SG_PARTIDO ?? "",
    candidacyStatusCode: row.CD_SITUACAO_CANDIDATURA ?? "",
    candidacyStatusDescription: row.DS_SITUACAO_CANDIDATURA ?? "",
  }));
}

export function parseCandidateSupplementCsv(
  bytes: Uint8Array,
): readonly TseCandidateSupplementRow[] {
  return parseTseCsv(bytes, SUPPLEMENT_COLUMNS).map((row) => ({
    generatedDate: row.DT_GERACAO ?? "",
    generatedTime: row.HH_GERACAO ?? "",
    electionYear: row.ANO_ELEICAO ?? "",
    sequenceId: row.SQ_CANDIDATO ?? "",
    judgmentStatusCode: row.CD_SITUACAO_JULGAMENTO ?? "",
    judgmentStatusDescription: row.DS_SITUACAO_JULGAMENTO ?? "",
  }));
}
