import { describe, expect, it } from "vitest";

import { ELECTION_2026 } from "../election/elections.ts";
import { generateVotingSlots } from "../election/slots.ts";
import { ELECTORAL_OFFICE, TERRITORIAL_SCOPE } from "../election/types.ts";
import {
  candidateRequestsForSlots,
  loadCandidatesForSlots,
} from "./batch.ts";
import {
  CANDIDATE_DATASET_KIND,
  type CandidateFile,
} from "./model.ts";

describe("requisições derivadas dos slots", () => {
  it("carrega uma vez por cargo e usa BR apenas para Presidente", () => {
    const location = { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" } as const;
    const slots = generateVotingSlots(ELECTION_2026, location);
    const requests = candidateRequestsForSlots(2026, location, slots);

    expect(requests).toHaveLength(5);
    expect(
      requests.find(({ office }) => office === ELECTORAL_OFFICE.SENATOR)
        ?.jurisdiction,
    ).toEqual({ scope: TERRITORIAL_SCOPE.STATE, uf: "SP" });
    expect(
      requests.find(({ office }) => office === ELECTORAL_OFFICE.PRESIDENT)
        ?.jurisdiction,
    ).toEqual({ scope: TERRITORIAL_SCOPE.NATIONAL });
  });

  it("solicita Deputado Distrital, e não Estadual, para o DF", () => {
    const location = { scope: TERRITORIAL_SCOPE.STATE, uf: "DF" } as const;
    const requests = candidateRequestsForSlots(
      2026,
      location,
      generateVotingSlots(ELECTION_2026, location),
    );
    const offices = requests.map(({ office }) => office);

    expect(requests).toHaveLength(5);
    expect(offices).toContain(ELECTORAL_OFFICE.DISTRICT_DEPUTY);
    expect(offices).not.toContain(ELECTORAL_OFFICE.STATE_DEPUTY);
  });

  it("mantém arquivos válidos quando outro cargo falha", async () => {
    const location = { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" } as const;
    const slots = generateVotingSlots(ELECTION_2026, location).slice(0, 2);
    const batch = await loadCandidatesForSlots(
      2026,
      location,
      slots,
      async (request): Promise<CandidateFile> => {
        if (request.office === ELECTORAL_OFFICE.STATE_DEPUTY) {
          throw new Error("Fixture ausente");
        }
        return {
          schemaVersion: 1,
          datasetKind: CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE,
          notice: "Fixture de teste",
          electionYear: 2026,
          office: request.office,
          partition: { scope: TERRITORIAL_SCOPE.STATE, uf: "SP" },
          candidates: [],
        };
      },
    );

    expect(batch.files.has(ELECTORAL_OFFICE.FEDERAL_DEPUTY)).toBe(true);
    expect(batch.errors.get(ELECTORAL_OFFICE.STATE_DEPUTY)?.message).toBe(
      "Fixture ausente",
    );
  });
});
