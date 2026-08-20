import { ELECTORAL_OFFICE, type ElectoralOffice } from "./types.ts";

export const OFFICE_LABELS: Readonly<Record<ElectoralOffice, string>> = {
  [ELECTORAL_OFFICE.FEDERAL_DEPUTY]: "Deputado Federal",
  [ELECTORAL_OFFICE.STATE_DEPUTY]: "Deputado Estadual",
  [ELECTORAL_OFFICE.DISTRICT_DEPUTY]: "Deputado Distrital",
  [ELECTORAL_OFFICE.SENATOR]: "Senador",
  [ELECTORAL_OFFICE.GOVERNOR]: "Governador",
  [ELECTORAL_OFFICE.PRESIDENT]: "Presidente",
  [ELECTORAL_OFFICE.COUNCILOR]: "Vereador",
  [ELECTORAL_OFFICE.MAYOR]: "Prefeito",
};

export function officeLabel(office: ElectoralOffice): string {
  return OFFICE_LABELS[office];
}
