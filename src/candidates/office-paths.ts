import { ELECTORAL_OFFICE, type ElectoralOffice } from "../election/types.ts";

const OFFICE_PATHS: Readonly<Record<ElectoralOffice, string>> = {
  [ELECTORAL_OFFICE.FEDERAL_DEPUTY]: "federal-deputy",
  [ELECTORAL_OFFICE.STATE_DEPUTY]: "state-deputy",
  [ELECTORAL_OFFICE.DISTRICT_DEPUTY]: "district-deputy",
  [ELECTORAL_OFFICE.SENATOR]: "senator",
  [ELECTORAL_OFFICE.GOVERNOR]: "governor",
  [ELECTORAL_OFFICE.PRESIDENT]: "president",
  [ELECTORAL_OFFICE.COUNCILOR]: "councilor",
  [ELECTORAL_OFFICE.MAYOR]: "mayor",
};

export function candidateOfficePathSegment(office: ElectoralOffice): string {
  return OFFICE_PATHS[office];
}
