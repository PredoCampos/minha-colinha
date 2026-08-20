// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import presidentFixture from "../../public/data/development-fixtures/2026/BR/president/candidates.json";
import federalDeputyFixture from "../../public/data/development-fixtures/2026/SP/federal-deputy/candidates.json";
import governorFixture from "../../public/data/development-fixtures/2026/SP/governor/candidates.json";
import senatorFixture from "../../public/data/development-fixtures/2026/SP/senator/candidates.json";
import stateDeputyFixture from "../../public/data/development-fixtures/2026/SP/state-deputy/candidates.json";
import { CANDIDATE_DATASET_KIND } from "../candidates/index.ts";
import { mountApplication } from "./app.ts";

// Esta suíte cobre apenas a fiação UI -> domínio -> DOM. As regras de negócio
// (senadores, legenda, branco/nulo, busca, etc.) já têm testes unitários próprios.

interface FakeFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

const NOT_FOUND: FakeFetchResponse = { ok: false, status: 404, json: async () => ({}) };

function fixtureResponse(body: unknown): FakeFetchResponse {
  return { ok: true, status: 200, json: async () => body };
}

function stubFixtureFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      const path = String(input);
      if (path.includes("SP/federal-deputy/candidates.json")) {
        return fixtureResponse(federalDeputyFixture);
      }
      if (path.includes("SP/state-deputy/candidates.json")) {
        return fixtureResponse(stateDeputyFixture);
      }
      if (path.includes("SP/senator/candidates.json")) {
        return fixtureResponse(senatorFixture);
      }
      if (path.includes("SP/governor/candidates.json")) {
        return fixtureResponse(governorFixture);
      }
      if (path.includes("BR/president/candidates.json")) {
        return fixtureResponse(presidentFixture);
      }
      return NOT_FOUND;
    }),
  );
}

// happy-dom cobre a maior parte do DOM usado por app.ts; estes três pontos não
// são implementados por padrão e não são o que este teste avalia (foco visual,
// media query real e o agendamento de frame), então um shim inofensivo basta.
function ensureBrowserShims(): void {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
  }
  if (typeof Element.prototype.scrollIntoView !== "function") {
    Element.prototype.scrollIntoView = () => undefined;
  }
  if (typeof window.requestAnimationFrame !== "function") {
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      window.setTimeout(() => callback(Date.now()), 0) as unknown as number;
  }
}

function findSlotSection(container: HTMLElement, slotLabel: string): HTMLElement {
  const heading = [...container.querySelectorAll<HTMLHeadingElement>(".slot-title")].find(
    (element) => element.textContent === slotLabel,
  );
  const section = heading?.closest(".slot");
  if (!section) {
    throw new Error(`Posição "${slotLabel}" não encontrada na colinha.`);
  }
  return section as HTMLElement;
}

function selectCandidate(container: HTMLElement, slotId: string, ballotName: string): void {
  const input = container.querySelector<HTMLInputElement>(`#search-${slotId}`);
  const results = container.querySelector<HTMLElement>(`#results-${slotId}`);
  if (!input || !results) {
    throw new Error(`Busca não encontrada para o slot ${slotId}.`);
  }
  input.dispatchEvent(new Event("focus"));
  const card = [...results.querySelectorAll<HTMLButtonElement>(".candidate-card")].find(
    (button) => button.textContent?.includes(ballotName),
  );
  if (!card) {
    throw new Error(`Candidato "${ballotName}" não encontrado no slot ${slotId}.`);
  }
  card.click();
}

async function mountSpSession(): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  mountApplication(container, 2026, CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE);

  // O modal "Sobre" abre automaticamente ao montar; fechá-lo aqui mantém os
  // demais testes focados no fluxo avaliado (o modal em si é o teste 3.5).
  container.querySelector<HTMLDialogElement>(".about-dialog")?.close();

  const select = container.querySelector<HTMLSelectElement>("#voting-state");
  if (!select) {
    throw new Error("Seletor de UF não encontrado.");
  }
  select.value = "SP";
  select
    .closest("form")
    ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

  await vi.waitFor(() => {
    if (!container.querySelector("#search-federal_deputy-1")) {
      throw new Error("Candidatos de SP ainda não carregados.");
    }
  });

  return container;
}

beforeEach(() => {
  ensureBrowserShims();
  stubFixtureFetch();
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("integração da UI (app.ts)", () => {
  it("painel de candidatos: fechado por padrão, abre ao focar, fecha ao selecionar e reabre fechado após Trocar", async () => {
    const container = await mountSpSession();
    const input = container.querySelector<HTMLInputElement>("#search-federal_deputy-1");
    const results = container.querySelector<HTMLElement>("#results-federal_deputy-1");
    if (!input || !results) {
      throw new Error("Busca de Deputado Federal não encontrada.");
    }

    expect(results.hidden).toBe(true);
    input.dispatchEvent(new Event("focus"));
    expect(results.hidden).toBe(false);

    selectCandidate(container, "federal_deputy-1", "EXEMPLO FEDERAL A");

    expect(container.querySelector("#results-federal_deputy-1")).toBeNull();
    expect(container.querySelector('[data-office="FEDERAL_DEPUTY"] .selected-candidate')).not.toBeNull();

    container
      .querySelector<HTMLButtonElement>('[data-office="FEDERAL_DEPUTY"] .change-choice')
      ?.click();

    const reopenedResults = container.querySelector<HTMLElement>("#results-federal_deputy-1");
    if (!reopenedResults) {
      throw new Error("O painel não reabriu com o seletor original após Trocar.");
    }
    expect(reopenedResults.hidden).toBe(true);

    container
      .querySelector<HTMLInputElement>("#search-federal_deputy-1")
      ?.dispatchEvent(new Event("focus"));
    expect(reopenedResults.hidden).toBe(false);

    container
      .querySelector('[data-office="FEDERAL_DEPUTY"] .candidate-picker')
      ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(reopenedResults.hidden).toBe(true);
  });

  it("trocar candidato: volta direto ao seletor original e preserva as demais escolhas", async () => {
    const container = await mountSpSession();

    selectCandidate(container, "federal_deputy-1", "EXEMPLO FEDERAL A");
    selectCandidate(container, "governor-1", "EXEMPLO GOVERNO");

    container
      .querySelector<HTMLButtonElement>('[data-office="FEDERAL_DEPUTY"] .change-choice')
      ?.click();

    expect(container.querySelector("#search-federal_deputy-1")).not.toBeNull();
    expect(
      container.querySelector('[data-office="GOVERNOR"] .selected-candidate')?.textContent,
    ).toContain("EXEMPLO GOVERNO");

    selectCandidate(container, "federal_deputy-1", "EXEMPLO FEDERAL B");

    const selectedCard = container.querySelector('[data-office="FEDERAL_DEPUTY"] .selected-candidate');
    expect(selectedCard?.textContent).toContain("2020");
    expect(selectedCard?.textContent).not.toContain("1010");
    expect(
      container.querySelector('[data-office="GOVERNOR"] .selected-candidate')?.textContent,
    ).toContain("EXEMPLO GOVERNO");
  });

  it("dois senadores: impede repetir o mesmo candidato na segunda escolha", async () => {
    const container = await mountSpSession();

    selectCandidate(container, "senator-1", "EXEMPLO SENADO A");
    selectCandidate(container, "senator-2", "EXEMPLO SENADO A");

    const secondChoice = findSlotSection(container, "Senador — 2ª escolha");
    expect(secondChoice.querySelector(".error-state")?.textContent).toContain(
      "não pode ocupar as duas escolhas",
    );
    expect(secondChoice.querySelector(".selected-candidate")).toBeNull();

    const firstChoice = findSlotSection(container, "Senador — 1ª escolha");
    expect(firstChoice.querySelector(".selected-candidate")?.textContent).toContain(
      "EXEMPLO SENADO A",
    );
  });

  it("alterar UF: exige confirmação destrutiva e só limpa a colinha quando confirmada", async () => {
    const container = await mountSpSession();
    selectCandidate(container, "governor-1", "EXEMPLO GOVERNO");
    expect(container.querySelector('[data-office="GOVERNOR"] .selected-candidate')).not.toBeNull();

    // happy-dom não implementa window.confirm; um mock explícito é necessário
    // para simular a confirmação destrutiva (permitido pela tarefa).
    const confirmMock = vi.fn();
    vi.stubGlobal("confirm", confirmMock);

    function attemptChangeTo(uf: string): void {
      container.querySelector<HTMLButtonElement>(".location-change")?.click();
      const select = container.querySelector<HTMLSelectElement>("#voting-state");
      if (!select) {
        throw new Error("Seletor de UF não encontrado.");
      }
      select.value = uf;
      select
        .closest("form")
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }

    confirmMock.mockReturnValueOnce(false);
    attemptChangeTo("RJ");

    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining("apagará as escolhas atuais"),
    );
    expect(container.querySelector('[data-office="GOVERNOR"] .selected-candidate')).not.toBeNull();

    confirmMock.mockReturnValueOnce(true);
    attemptChangeTo("RJ");

    await vi.waitFor(() => {
      if (!container.querySelector(".location-summary-value")?.textContent?.includes("RJ")) {
        throw new Error("A UF ainda não foi trocada para RJ.");
      }
    });
    expect(container.querySelector('[data-office="GOVERNOR"] .selected-candidate')).toBeNull();
  });

  it("modal Sobre: abre com o scroll de fundo bloqueado e restaura ao fechar", () => {
    const container = document.createElement("div");
    document.body.append(container);
    mountApplication(container, 2026, CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE);

    const dialog = container.querySelector<HTMLDialogElement>(".about-dialog");
    if (!dialog) {
      throw new Error("Modal Sobre não encontrado.");
    }

    expect(dialog.open).toBe(true);
    expect(document.documentElement.style.overflow).toBe("hidden");

    dialog.querySelector<HTMLButtonElement>(".dialog-close")?.click();

    expect(dialog.open).toBe(false);
    expect(document.documentElement.style.overflow).not.toBe("hidden");
  });

  it("exportação: fica disponível assim que a colinha tem ao menos uma escolha preenchida", async () => {
    const container = await mountSpSession();
    const generateButton = container.querySelector<HTMLButtonElement>(".generate-button");
    if (!generateButton) {
      throw new Error("Botão de exportação não encontrado.");
    }
    expect(generateButton.disabled).toBe(true);

    selectCandidate(container, "governor-1", "EXEMPLO GOVERNO");

    expect(
      container.querySelector<HTMLButtonElement>(".generate-button")?.disabled,
    ).toBe(false);
  });
});
