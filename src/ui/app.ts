import {
  CANDIDATE_DATASET_KIND,
  isCandidatePendingOrAmbiguous,
  isCandidateSelectable,
  loadCandidateFile,
  loadCandidateMetadata,
  loadCandidatesForSlots,
  searchCandidates,
  type Candidate,
  type CandidateDatasetKind,
  type CandidateFile,
  type CandidateSnapshotMetadata,
} from "../candidates/index.ts";
import {
  colinhaFileName,
  composeColinhaModel,
  generateColinhaPng,
} from "../colinha/index.ts";
import { electionForYear } from "../election/elections.ts";
import {
  TERRITORIAL_SCOPE,
  type ElectionConfig,
  type ElectoralLocation,
  type ElectoralOffice,
  type FederativeUnit,
  type VotingSlot,
  type VotingSlotId,
} from "../election/types.ts";
import { STATE_NAMES, STATE_OPTIONS } from "../location/states.ts";
import {
  changeSelectionLocation,
  selectCandidateInSession,
  startSelectionSession,
  type SelectionSession,
} from "../selection/session.ts";
import { publicPath } from "../shared/paths.ts";

interface ApplicationState {
  readonly election: ElectionConfig;
  readonly datasetKind: CandidateDatasetKind;
  session: SelectionSession | null;
  metadata: CandidateSnapshotMetadata | null;
  metadataStatus: "loading" | "ready" | "error" | "not-applicable";
  metadataError: string | null;
  files: ReadonlyMap<ElectoralOffice, CandidateFile>;
  errors: ReadonlyMap<ElectoralOffice, Error>;
  selectionErrors: ReadonlyMap<VotingSlotId, string>;
  editingSlots: ReadonlySet<VotingSlotId>;
  loading: boolean;
  announcement: string;
  loadVersion: number;
  exportStatus: "idle" | "generating" | "ready" | "error";
  exportUrl: string | null;
  exportError: string | null;
  exportVersion: number;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function createHeader(datasetKind: CandidateDatasetKind): HTMLElement {
  const header = element("header", "site-header");
  const inner = element("div", "site-header-inner");
  const brand = element("a", "brand", "Minha Colinha");
  brand.href = import.meta.env.BASE_URL;
  const identity = element(
    "span",
    "project-identity",
    "Projeto independente · open source",
  );
  inner.append(brand, identity);
  header.append(inner);
  if (datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE) {
    const developmentBar = element("div", "development-bar");
    developmentBar.setAttribute("role", "note");
    developmentBar.append(
      element("strong", undefined, "Modo de desenvolvimento"),
      document.createTextNode(" · dados fictícios, não oficiais"),
    );
    header.append(developmentBar);
  }
  return header;
}

function createFooter(): HTMLElement {
  return element(
    "footer",
    "site-footer",
    "Projeto independente e open source. Não é um site oficial da Justiça Eleitoral.",
  );
}

function createUnsupportedView(year: number): HTMLElement {
  const main = element("main", "page");
  main.id = "conteudo";
  const section = element("section", "intro");
  const eyebrow = element("p", "eyebrow", `Ano ${year}`);
  const title = element("h1", undefined, "Não há eleição configurada para este ano.");
  const text = element(
    "p",
    "lead",
    "A aplicação não cria cargos ou regras eleitorais automaticamente. Um pleito só aparece depois de ser configurado e validado.",
  );
  section.append(eyebrow, title, text);
  main.append(section);
  return main;
}

function selectedCandidate(
  state: ApplicationState,
  slot: VotingSlot,
): Candidate | undefined {
  const candidateId = state.session?.selections[slot.id];
  if (!candidateId) {
    return undefined;
  }
  return state.files
    .get(slot.office)
    ?.candidates.find(
      (candidate) =>
        candidate.id === candidateId && isCandidateSelectable(candidate),
    );
}

function createCandidatePhoto(candidate: Candidate): HTMLElement {
  const frame = element("div", "candidate-photo");
  if (!candidate.photoPath) {
    frame.append(element("span", undefined, "Foto não disponível"));
    return frame;
  }

  const image = element("img");
  image.src = publicPath(candidate.photoPath);
  image.alt = `Foto de ${candidate.ballotName}`;
  image.loading = "lazy";
  image.addEventListener(
    "error",
    () => {
      frame.replaceChildren(element("span", undefined, "Falha ao carregar a foto"));
    },
    { once: true },
  );
  frame.append(image);
  return frame;
}

function createCandidateDetails(candidate: Candidate): HTMLElement {
  const content = element("div", "candidate-details");
  const number = element("strong", "candidate-number", candidate.number);
  const name = element("span", "candidate-name", candidate.ballotName);
  const party = element("span", "candidate-party", candidate.party);
  content.append(number, name, party);
  if (isCandidatePendingOrAmbiguous(candidate)) {
    content.append(
      element(
        "span",
        "candidate-status",
        "Situação da candidatura ainda não definitiva",
      ),
    );
  }
  return content;
}

function searchInputId(slot: VotingSlot): string {
  return `search-${slot.id.replace(":", "-").toLowerCase()}`;
}

function focusAfterRender(id: string): void {
  requestAnimationFrame(() => {
    const target = document.getElementById(id);
    target?.focus();
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
  });
}

function createSelectedCard(
  candidate: Candidate,
  slot: VotingSlot,
  state: ApplicationState,
  render: () => void,
): HTMLElement {
  const card = element("div", "selected-candidate");
  card.setAttribute("aria-label", "Candidato selecionado");
  const isEditing = state.editingSlots.has(slot.id);
  const changeButton = element(
    "button",
    "secondary-button change-choice",
    isEditing ? "Cancelar troca" : "Trocar escolha",
  );
  changeButton.type = "button";
  changeButton.addEventListener("click", () => {
    const editingSlots = new Set(state.editingSlots);
    if (isEditing) {
      editingSlots.delete(slot.id);
    } else {
      editingSlots.add(slot.id);
    }
    state.editingSlots = editingSlots;
    render();
    focusAfterRender(isEditing ? `slot-title-${slot.order}` : searchInputId(slot));
  });
  card.append(
    createCandidatePhoto(candidate),
    createCandidateDetails(candidate),
    element("span", "selected-label", "Escolha atual"),
    changeButton,
  );
  return card;
}

function renderCandidateResults(
  container: HTMLElement,
  candidates: readonly Candidate[],
  query: string,
  slot: VotingSlot,
  state: ApplicationState,
  render: () => void,
): void {
  container.replaceChildren();
  if (query.trim().length === 0) {
    const guidance = element(
      "p",
      "search-guidance",
      "Digite um nome de urna ou número para ver candidatos.",
    );
    guidance.setAttribute("role", "status");
    container.append(guidance);
    return;
  }

  const matches = searchCandidates(candidates, query);

  if (matches.length === 0) {
    const empty = element("p", "empty-state", "Nenhum candidato encontrado.");
    empty.setAttribute("role", "status");
    container.append(empty);
    return;
  }

  const maximumVisibleResults = 20;
  const results = matches.slice(0, maximumVisibleResults);
  if (matches.length > maximumVisibleResults) {
    container.append(
      element(
        "p",
        "result-limit",
        `Mostrando 20 de ${matches.length} resultados. Refine a busca para encontrar a candidatura desejada.`,
      ),
    );
  }

  const list = element("ul", "candidate-results");
  for (const candidate of results) {
    const item = element("li");
    const card = element("article", "candidate-card");
    const button = element(
      "button",
      "select-candidate",
      state.session?.selections[slot.id] ? "Substituir" : "Selecionar",
    );
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Selecionar ${candidate.ballotName}, número ${candidate.number}`,
    );
    button.addEventListener("click", () => {
      if (!state.session) {
        return;
      }
      const result = selectCandidateInSession(state.session, slot.id, candidate);
      if (!result.ok) {
        state.selectionErrors = new Map(state.selectionErrors).set(
          slot.id,
          result.error.message,
        );
        state.announcement = result.error.message;
      } else {
        invalidateExport(state);
        state.session = result.session;
        const errors = new Map(state.selectionErrors);
        errors.delete(slot.id);
        state.selectionErrors = errors;
        const editingSlots = new Set(state.editingSlots);
        editingSlots.delete(slot.id);
        state.editingSlots = editingSlots;
        state.announcement = `${candidate.ballotName} foi selecionado para ${slot.label}.`;
      }
      render();
      focusAfterRender(`slot-title-${slot.order}`);
    });
    card.append(
      createCandidatePhoto(candidate),
      createCandidateDetails(candidate),
      button,
    );
    item.append(card);
    list.append(item);
  }
  container.append(list);
}

function createSlotSection(
  slot: VotingSlot,
  state: ApplicationState,
  render: () => void,
): HTMLElement {
  const section = element("section", "slot");
  section.dataset.office = slot.office;
  section.setAttribute("aria-labelledby", `slot-title-${slot.order}`);
  const heading = element("h2", "slot-title", slot.label);
  heading.id = `slot-title-${slot.order}`;
  heading.tabIndex = -1;
  const sequence = element("span", "slot-order", `${slot.order}ª posição`);
  heading.prepend(sequence);
  section.append(heading);

  const chosen = selectedCandidate(state, slot);
  if (chosen) {
    section.append(createSelectedCard(chosen, slot, state, render));
  }

  if (state.loading) {
    const loading = element("p", "loading-state", "Carregando candidatos…");
    loading.setAttribute("role", "status");
    section.append(loading);
    return section;
  }

  const loadError = state.errors.get(slot.office);
  if (loadError) {
    const error = element("p", "error-state", loadError.message);
    error.setAttribute("role", "alert");
    const retry = element("button", "secondary-button retry-button", "Tentar novamente");
    retry.type = "button";
    retry.addEventListener("click", () => {
      void loadCurrentCandidates(state, render, false);
    });
    section.append(error, retry);
    return section;
  }

  const file = state.files.get(slot.office);
  if (!file) {
    const unavailable = element(
      "p",
      "error-state",
      "Os dados deste cargo não estão disponíveis.",
    );
    unavailable.setAttribute("role", "alert");
    section.append(unavailable);
    return section;
  }

  if (chosen && !state.editingSlots.has(slot.id)) {
    return section;
  }

  const searchId = searchInputId(slot);
  const label = element(
    "label",
    "search-label",
    chosen ? `Trocar escolha para ${slot.label}` : `Buscar para ${slot.label}`,
  );
  label.htmlFor = searchId;
  const input = element("input", "candidate-search");
  input.id = searchId;
  input.type = "search";
  input.placeholder = "Nome de urna ou número";
  input.autocomplete = "off";
  input.enterKeyHint = "search";
  const results = element("div", "results-region");
  results.setAttribute("aria-live", "polite");
  input.addEventListener("input", () => {
    renderCandidateResults(results, file.candidates, input.value, slot, state, render);
  });
  section.append(label, input);

  const selectionError = state.selectionErrors.get(slot.id);
  if (selectionError) {
    const error = element("p", "error-state", selectionError);
    error.setAttribute("role", "alert");
    section.append(error);
  }

  renderCandidateResults(results, file.candidates, "", slot, state, render);
  section.append(results);
  return section;
}

function hasSelections(session: SelectionSession): boolean {
  return Object.keys(session.selections).length > 0;
}

function locationLabel(location: ElectoralLocation): string {
  if (location.scope === TERRITORIAL_SCOPE.NATIONAL) {
    return "Brasil";
  }
  if (location.scope === TERRITORIAL_SCOPE.MUNICIPALITY) {
    return `${location.municipalityName} (${location.uf})`;
  }
  return STATE_NAMES[location.uf];
}

function formatSnapshotDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function createDataSource(state: ApplicationState): HTMLElement {
  if (state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE) {
    return element(
      "p",
      "data-source data-source-fixture",
      "Fonte: fixtures fictícias habilitadas explicitamente para desenvolvimento.",
    );
  }

  if (state.metadataStatus === "loading") {
    const loading = element(
      "p",
      "data-source",
      "Carregando procedência dos dados eleitorais…",
    );
    loading.setAttribute("role", "status");
    return loading;
  }

  if (state.metadataStatus === "error" || !state.metadata) {
    const error = element(
      "p",
      "data-source data-source-error",
      state.metadataError ??
        "Não foi possível confirmar a procedência dos dados eleitorais.",
    );
    error.setAttribute("role", "alert");
    return error;
  }

  const source = element("p", "data-source");
  const link = element("a", undefined, state.metadata.provider);
  link.href = state.metadata.sourceUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const sourceDate = element(
    "time",
    undefined,
    formatSnapshotDate(state.metadata.sourceGeneratedAt),
  );
  sourceDate.dateTime = state.metadata.sourceGeneratedAt;
  const updateDate = element(
    "time",
    undefined,
    formatSnapshotDate(state.metadata.importedAt),
  );
  updateDate.dateTime = state.metadata.importedAt;
  source.append(
    document.createTextNode("Fonte: "),
    link,
    document.createTextNode(` · ${state.metadata.dataset} · dados gerados em `),
    sourceDate,
    document.createTextNode(" · snapshot atualizado em "),
    updateDate,
  );
  return source;
}

async function loadOfficialMetadata(
  state: ApplicationState,
  render: () => void,
): Promise<void> {
  try {
    state.metadata = await loadCandidateMetadata(state.election.year);
    state.metadataStatus = "ready";
    state.metadataError = null;
  } catch (error) {
    state.metadata = null;
    state.metadataStatus = "error";
    state.metadataError =
      error instanceof Error
        ? error.message
        : "Não foi possível confirmar a procedência dos dados eleitorais.";
  }
  render();
}

function createLocationForm(
  state: ApplicationState,
  render: () => void,
): HTMLFormElement {
  const form = element("form", "location-form");
  const label = element("label", undefined, "Onde você vota?");
  label.htmlFor = "voting-state";
  const hint = element(
    "p",
    "field-hint",
    "Em 2026, apenas a UF do seu domicílio eleitoral é necessária.",
  );
  hint.id = "voting-state-hint";
  const controls = element("div", "location-controls");
  const select = element("select");
  select.id = "voting-state";
  select.name = "uf";
  select.required = true;
  select.setAttribute("aria-describedby", hint.id);
  const placeholder = element("option", undefined, "Selecione a UF");
  placeholder.value = "";
  select.append(placeholder);

  const currentUf =
    state.session?.location.scope === TERRITORIAL_SCOPE.STATE
      ? state.session.location.uf
      : undefined;
  for (const optionData of STATE_OPTIONS) {
    const option = element(
      "option",
      undefined,
      `${optionData.name} (${optionData.uf})`,
    );
    option.value = optionData.uf;
    option.selected = optionData.uf === currentUf;
    select.append(option);
  }

  const submit = element(
    "button",
    "primary-button",
    currentUf ? "Alterar UF" : "Confirmar UF",
  );
  submit.type = "submit";
  controls.append(select, submit);
  form.append(label, hint, controls);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedState = STATE_OPTIONS.find(({ uf }) => uf === select.value);
    if (!selectedState || selectedState.uf === currentUf) {
      return;
    }

    if (
      state.session &&
      hasSelections(state.session) &&
      !window.confirm(
        "Alterar a UF apagará as escolhas atuais. Deseja continuar?",
      )
    ) {
      select.value = currentUf ?? "";
      return;
    }

    void selectState(state, selectedState.uf, render);
  });
  return form;
}

async function selectState(
  state: ApplicationState,
  uf: FederativeUnit,
  render: () => void,
): Promise<void> {
  invalidateExport(state);
  const location = { scope: TERRITORIAL_SCOPE.STATE, uf } as const;
  state.session = state.session
    ? changeSelectionLocation(state.session, location)
    : startSelectionSession(state.election, location);
  state.files = new Map();
  state.errors = new Map();
  state.selectionErrors = new Map();
  state.editingSlots = new Set();
  await loadCurrentCandidates(state, render, true);
}

async function loadCurrentCandidates(
  state: ApplicationState,
  render: () => void,
  moveFocus: boolean,
): Promise<void> {
  const session = state.session;
  if (!session) {
    return;
  }

  if (state.exportStatus !== "idle") {
    invalidateExport(state);
  }

  state.errors = new Map();
  state.loading = true;
  state.announcement = `Carregando candidatos para ${locationLabel(session.location)}.`;
  state.loadVersion += 1;
  const requestedVersion = state.loadVersion;
  render();

  const batch = await loadCandidatesForSlots(
    state.election.year,
    session.location,
    session.slots,
    (request) =>
      loadCandidateFile(request, {
        datasetKind: state.datasetKind,
      }),
  );

  if (requestedVersion !== state.loadVersion) {
    return;
  }
  state.files = batch.files;
  state.errors = batch.errors;
  state.loading = false;
  state.announcement =
    batch.errors.size === 0
      ? `Candidatos de ${locationLabel(session.location)} carregados.`
      : "Alguns dados eleitorais não puderam ser carregados.";
  render();
  if (moveFocus) {
    focusAfterRender("choices-title");
  }
}

function selectionCount(session: SelectionSession): number {
  return session.slots.filter((slot) => session.selections[slot.id]).length;
}

function resolvedSelectionCount(state: ApplicationState): number {
  return state.session?.slots.filter((slot) => selectedCandidate(state, slot)).length ?? 0;
}

function invalidateExport(state: ApplicationState): void {
  if (state.exportUrl) {
    URL.revokeObjectURL(state.exportUrl);
  }
  state.exportStatus = "idle";
  state.exportUrl = null;
  state.exportError = null;
  state.exportVersion += 1;
}

async function generateExport(
  state: ApplicationState,
  render: () => void,
): Promise<void> {
  const session = state.session;
  if (!session || resolvedSelectionCount(state) !== session.slots.length) {
    state.exportStatus = "error";
    state.exportError = "Preencha todas as posições antes de gerar a imagem.";
    render();
    return;
  }

  invalidateExport(state);
  state.exportStatus = "generating";
  state.announcement = "Gerando a imagem da colinha neste dispositivo.";
  const requestedVersion = state.exportVersion;
  render();

  const candidates = [...state.files.values()].flatMap((file) => file.candidates);
  const model = composeColinhaModel(
    session,
    candidates,
    state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE
      ? "DADOS FICTÍCIOS — DESENVOLVIMENTO — NÃO USE PARA VOTAR"
      : null,
  );

  try {
    const blob = await generateColinhaPng(model);
    if (requestedVersion !== state.exportVersion) {
      return;
    }
    state.exportUrl = URL.createObjectURL(blob);
    state.exportStatus = "ready";
    state.announcement = "Imagem PNG pronta para baixar.";
  } catch (error) {
    if (requestedVersion !== state.exportVersion) {
      return;
    }
    state.exportStatus = "error";
    state.exportError =
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a imagem PNG.";
    state.announcement = state.exportError;
  }
  render();
  focusAfterRender("export-actions");
}

function editSlotFromReview(
  slot: VotingSlot,
  state: ApplicationState,
  render: () => void,
): void {
  state.editingSlots = new Set(state.editingSlots).add(slot.id);
  render();
  focusAfterRender(searchInputId(slot));
}

function createExportActions(
  state: ApplicationState,
  render: () => void,
  complete: boolean,
): HTMLElement {
  const container = element("div", "export-actions");
  container.id = "export-actions";
  container.tabIndex = -1;
  container.setAttribute("aria-busy", String(state.exportStatus === "generating"));

  if (state.exportStatus === "ready" && state.exportUrl && state.session) {
    const download = element("a", "primary-button download-button", "Baixar PNG pronto");
    download.href = state.exportUrl;
    download.download = colinhaFileName(
      state.election.year,
      state.session.location,
    );
    download.addEventListener("click", () => {
      state.announcement = "Download da colinha iniciado.";
    });
    const regenerate = element(
      "button",
      "secondary-button regenerate-button",
      "Gerar novamente",
    );
    regenerate.type = "button";
    regenerate.addEventListener("click", () => {
      void generateExport(state, render);
    });
    container.append(
      element(
        "p",
        "export-success",
        "Imagem criada localmente e pronta para salvar.",
      ),
      download,
      regenerate,
    );
    return container;
  }

  const generate = element(
    "button",
    "primary-button generate-button",
    state.exportStatus === "generating" ? "Gerando PNG…" : "Gerar imagem PNG",
  );
  generate.type = "button";
  generate.disabled = !complete || state.exportStatus === "generating";
  generate.addEventListener("click", () => {
    void generateExport(state, render);
  });
  container.append(generate);

  if (!complete) {
    container.append(
      element(
        "p",
        "export-hint",
        "Preencha todas as posições para liberar a geração da imagem.",
      ),
    );
  }
  if (state.exportStatus === "generating") {
    const generating = element(
      "p",
      "export-generating",
      "Fotos e textos estão sendo compostos neste dispositivo…",
    );
    generating.setAttribute("role", "status");
    container.append(generating);
  }
  if (state.exportStatus === "error" && state.exportError) {
    const error = element("p", "error-state", state.exportError);
    error.setAttribute("role", "alert");
    container.append(error);
  }
  return container;
}

function createReview(
  state: ApplicationState,
  render: () => void,
): HTMLElement | null {
  const session = state.session;
  if (!session) {
    return null;
  }

  const completed = selectionCount(session);
  const complete = resolvedSelectionCount(state) === session.slots.length;
  const section = element("section", "review");
  section.setAttribute("aria-labelledby", "review-title");
  const step = element("p", "step-label", "Etapa 3");
  const title = element("h2", undefined, "Revise sua colinha");
  title.id = "review-title";
  const description = element(
    "p",
    "review-description",
    "Confira cargo, número, nome, partido e foto antes de gerar a imagem.",
  );
  const progressLabel = element(
    "label",
    "progress-label",
    `${completed} de ${session.slots.length} escolhas preenchidas`,
  );
  progressLabel.htmlFor = "selection-progress";
  const progress = element("progress", "selection-progress");
  progress.id = "selection-progress";
  progress.max = session.slots.length;
  progress.value = completed;
  section.append(step, title, description, progressLabel, progress);

  const list = element("ol", "review-list");
  for (const slot of session.slots) {
    const item = element("li", "review-item");
    const heading = element("div", "review-office");
    heading.append(
      element("span", "review-order", String(slot.order)),
      element("strong", undefined, slot.label),
    );
    const candidate = selectedCandidate(state, slot);
    const candidateId = session.selections[slot.id];

    if (candidate) {
      const choice = element("div", "review-candidate");
      choice.append(createCandidatePhoto(candidate), createCandidateDetails(candidate));
      item.append(heading, choice);
    } else {
      item.append(
        heading,
        element(
          "p",
          "review-empty",
          candidateId
            ? "A escolha está em memória, mas seus dados estão temporariamente indisponíveis."
            : "Ainda não preenchido",
        ),
      );
    }

    const action = element(
      "button",
      "text-button",
      candidateId ? "Trocar" : "Escolher",
    );
    action.type = "button";
    action.setAttribute("aria-label", `${candidateId ? "Trocar" : "Escolher"} ${slot.label}`);
    action.addEventListener("click", () => editSlotFromReview(slot, state, render));
    item.append(action);
    list.append(item);
  }
  section.append(list);

  const status = element(
    "p",
    complete ? "review-ready" : "review-pending",
    complete
      ? "Todas as posições estão preenchidas. Sua colinha está pronta para virar imagem."
      : "Você pode revisar agora e completar as posições restantes quando quiser.",
  );
  status.setAttribute("role", "status");
  section.append(status);
  if (state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE) {
    section.append(
      element(
        "p",
        "review-fixture-reminder",
        "Revisão com dados fictícios de desenvolvimento — não use estes números para votar.",
      ),
    );
  }
  section.append(createExportActions(state, render, complete));
  return section;
}

function renderConfiguredApplication(
  root: HTMLElement,
  state: ApplicationState,
): void {
  const render = () => renderConfiguredApplication(root, state);
  const main = element("main", "page");
  main.id = "conteudo";

  const intro = element("section", "intro");
  const eyebrow = element(
    "p",
    "eyebrow",
    `Eleições Gerais de ${state.election.year}`,
  );
  const title = element("h1", undefined, "Monte sua colinha eleitoral");
  const text = element(
    "p",
    "lead",
    "Organize suas escolhas na ordem da urna e revise tudo em um só lugar. Sem cadastro e sem enviar sua colinha para um servidor.",
  );
  const benefits = element("ul", "intro-benefits");
  for (const benefit of [
    "Escolhas somente na memória deste navegador",
    "Ordem oficial de votação configurada para 2026",
    "Dados oficiais normalizados e auditáveis",
  ]) {
    benefits.append(element("li", undefined, benefit));
  }
  intro.append(eyebrow, title, text, benefits, createDataSource(state));
  if (state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE) {
    const fixtureNotice = element("div", "fixture-notice");
    fixtureNotice.setAttribute("role", "note");
    fixtureNotice.append(
      element("strong", undefined, "Ambiente de desenvolvimento: "),
      document.createTextNode(
        "esta demonstração usa apenas dados fictícios. Use SP ou DF para testar o fluxo completo; as demais UFs exibem o estado de indisponibilidade.",
      ),
    );
    intro.append(fixtureNotice);
  }

  const locationSection = element("section", "location-section");
  locationSection.setAttribute("aria-labelledby", "location-title");
  const locationStep = element("p", "step-label", "Etapa 1");
  const locationTitle = element("h2", undefined, "Circunscrição eleitoral");
  locationTitle.id = "location-title";
  locationSection.append(
    locationStep,
    locationTitle,
    createLocationForm(state, render),
  );

  main.append(intro, locationSection);

  if (state.session) {
    const slotsHeader = element("div", "slots-header");
    const completed = selectionCount(state.session);
    const choicesTitle = element("h2", undefined, "Escolha seus candidatos");
    choicesTitle.id = "choices-title";
    choicesTitle.tabIndex = -1;
    slotsHeader.append(
      element("p", "step-label", "Etapa 2"),
      choicesTitle,
      element(
        "p",
        undefined,
        `${locationLabel(state.session.location)} · ${state.session.slots.length} posições na ordem de votação`,
      ),
      element(
        "p",
        "choices-count",
        `${completed} de ${state.session.slots.length} preenchidas`,
      ),
    );
    const slots = element("div", "slots");
    for (const slot of state.session.slots) {
      slots.append(createSlotSection(slot, state, render));
    }
    const review = createReview(state, render);
    main.append(slotsHeader, slots);
    if (review) {
      main.append(review);
    }
  }

  const announcement = element("p", "sr-only", state.announcement);
  announcement.setAttribute("aria-live", "polite");
  root.replaceChildren(
    createHeader(state.datasetKind),
    main,
    createFooter(),
    announcement,
  );
}

export function mountApplication(
  root: HTMLElement,
  currentYear: number = new Date().getFullYear(),
  datasetKind: CandidateDatasetKind = CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT,
): void {
  const election = electionForYear(currentYear);
  if (!election) {
    root.replaceChildren(
      createHeader(datasetKind),
      createUnsupportedView(currentYear),
      createFooter(),
    );
    return;
  }

  const state: ApplicationState = {
    election,
    datasetKind,
    session: null,
    metadata: null,
    metadataStatus:
      datasetKind === CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT
        ? "loading"
        : "not-applicable",
    metadataError: null,
    files: new Map(),
    errors: new Map(),
    selectionErrors: new Map(),
    editingSlots: new Set(),
    loading: false,
    announcement: "",
    loadVersion: 0,
    exportStatus: "idle",
    exportUrl: null,
    exportError: null,
    exportVersion: 0,
  };
  window.addEventListener(
    "beforeunload",
    () => {
      if (state.exportUrl) {
        URL.revokeObjectURL(state.exportUrl);
      }
    },
    { once: true },
  );
  const render = () => renderConfiguredApplication(root, state);
  render();
  if (datasetKind === CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT) {
    void loadOfficialMetadata(state, render);
  }
}
