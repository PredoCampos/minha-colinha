import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL =
  "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application%2Fvnd.geo%2Bjson&qualidade=minima&intrarregiao=UF";

const UF_BY_IBGE_CODE = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
} as const;

interface SourceFeature {
  readonly type: "Feature";
  readonly properties: Readonly<{ codarea: string }>;
  readonly geometry: Readonly<{
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  }>;
}

interface SourceFeatureCollection {
  readonly type: "FeatureCollection";
  readonly features: readonly SourceFeature[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSourceDataset(value: unknown): asserts value is SourceFeatureCollection {
  if (
    !isRecord(value) ||
    value.type !== "FeatureCollection" ||
    !Array.isArray(value.features) ||
    value.features.length !== 27
  ) {
    throw new Error("A resposta do IBGE não contém as 27 UFs esperadas.");
  }

  const codes = new Set<string>();
  for (const feature of value.features) {
    if (
      !isRecord(feature) ||
      feature.type !== "Feature" ||
      !isRecord(feature.properties) ||
      typeof feature.properties.codarea !== "string" ||
      !isRecord(feature.geometry) ||
      !["Polygon", "MultiPolygon"].includes(String(feature.geometry.type)) ||
      !Array.isArray(feature.geometry.coordinates)
    ) {
      throw new Error("A resposta do IBGE contém uma geometria inválida.");
    }
    if (!(feature.properties.codarea in UF_BY_IBGE_CODE)) {
      throw new Error(`Código de UF desconhecido: ${feature.properties.codarea}.`);
    }
    if (codes.has(feature.properties.codarea)) {
      throw new Error(`Código de UF duplicado: ${feature.properties.codarea}.`);
    }
    codes.add(feature.properties.codarea);
  }
}

async function main(): Promise<void> {
  const response = await fetch(SOURCE_URL, {
    headers: { Accept: "application/vnd.geo+json" },
  });
  if (!response.ok) {
    throw new Error(`Falha ao obter a malha do IBGE (HTTP ${response.status}).`);
  }

  const sourceText = await response.text();
  const sourceHash = createHash("sha256").update(sourceText).digest("hex");
  const sourceData: unknown = JSON.parse(sourceText);
  assertSourceDataset(sourceData);

  const artifact = {
    schemaVersion: 1,
    level: "STATE",
    source: {
      provider: "Instituto Brasileiro de Geografia e Estatística",
      dataset: "Malhas Geográficas",
      url: SOURCE_URL,
      quality: "MINIMUM",
      retrievedAt: new Date().toISOString(),
      sha256: sourceHash,
    },
    features: sourceData.features
      .map((feature) => ({
        code:
          UF_BY_IBGE_CODE[
            feature.properties.codarea as keyof typeof UF_BY_IBGE_CODE
          ],
        geometry: feature.geometry,
      }))
      .sort((first, second) => first.code.localeCompare(second.code)),
  };

  const outputDirectory = path.resolve("public", "geography");
  const outputPath = path.join(outputDirectory, "ibge-uf-minimum.json");
  const temporaryPath = `${outputPath}.part`;
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(artifact)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
  process.stdout.write(
    `[IBGE] 27 limites estaduais gravados em ${outputPath}; fonte SHA-256 ${sourceHash}.\n`,
  );
}

await main();
