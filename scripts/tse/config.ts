import { FEDERATIVE_UNITS } from "../../src/election/types.ts";
import type { ResourceSpec } from "./types.ts";

export const TSE_2026 = {
  electionYear: 2026,
  datasetName: "Candidatos - 2026",
  datasetUrl: "https://dadosabertos.tse.jus.br/dataset/candidatos-2026",
  candidatesUrl:
    "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip",
  supplementUrl:
    "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand_complementar/consulta_cand_complementar_2026.zip",
  photoUrlTemplate:
    "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_{partition}_div.zip",
  candidatesCsv: "consulta_cand_2026_BRASIL.csv",
  supplementCsv: "consulta_cand_complementar_2026_BRASIL.csv",
} as const;

export const TSE_PHOTO_PARTITIONS = ["BR", ...FEDERATIVE_UNITS] as const;

export function tse2026Resources(): readonly ResourceSpec[] {
  return [
    {
      kind: "CANDIDATES",
      partition: null,
      fileName: "consulta_cand_2026.zip",
      url: TSE_2026.candidatesUrl,
    },
    {
      kind: "SUPPLEMENT",
      partition: null,
      fileName: "consulta_cand_complementar_2026.zip",
      url: TSE_2026.supplementUrl,
    },
    ...TSE_PHOTO_PARTITIONS.map((partition) => ({
      kind: "PHOTOS" as const,
      partition,
      fileName: `foto_cand2026_${partition}_div.zip`,
      url: TSE_2026.photoUrlTemplate.replace("{partition}", partition),
    })),
  ];
}
