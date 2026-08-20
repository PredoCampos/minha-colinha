import {
  CANDIDATE_DATASET_KIND,
  isCandidatePendingOrAmbiguous,
  isCandidateSelectable,
  loadCandidateFile,
  loadCandidateMetadata,
  loadCandidatesForSlots,
  visibleCandidateSearchResults,
  type Candidate,
  type CandidateDatasetKind,
  type CandidateFile,
  type CandidateSnapshotMetadata,
} from "../candidates/index.ts";
import {
  colinhaFileName,
  composeColinhaModel,
  generateColinhaPng,
  triggerBlobDownload,
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
import { detectStateFromGeolocation } from "../location/geolocation.ts";
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
  locationDetectionStatus: "idle" | "requesting" | "suggested" | "error";
  suggestedUf: FederativeUnit | null;
  locationDetectionError: string | null;
  locationDetectionVersion: number;
  files: ReadonlyMap<ElectoralOffice, CandidateFile>;
  errors: ReadonlyMap<ElectoralOffice, Error>;
  selectionErrors: ReadonlyMap<VotingSlotId, string>;
  editingSlots: ReadonlySet<VotingSlotId>;
  loading: boolean;
  announcement: string;
  loadVersion: number;
  exportStatus: "idle" | "generating" | "fallback" | "error";
  exportUrl: string | null;
  exportError: string | null;
  exportVersion: number;
  aboutOpen: boolean;
  locationEditing: boolean;
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

function createHeader(
  datasetKind: CandidateDatasetKind,
  onAbout?: () => void,
): HTMLElement {
  const header = element("header", "site-header");
  const inner = element("div", "site-header-inner");
  const brand = element("a", "brand", "Minha Colinha");
  brand.href = import.meta.env.BASE_URL;
  const identity = element(
    "span",
    "project-identity",
    "Projeto independente · open source",
  );
  const identityGroup = element("div", "header-identity");
  identityGroup.append(brand, identity);
  inner.append(identityGroup);
  if (onAbout) {
    const about = element("button", "about-button", "Sobre");
    about.id = "about-button";
    about.type = "button";
    about.setAttribute("aria-haspopup", "dialog");
    about.addEventListener("click", onAbout);
    inner.append(about);
  }
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

function createAboutDialog(
  state: ApplicationState,
): HTMLDialogElement {
  const dialog = element("dialog", "about-dialog");
  dialog.setAttribute("aria-labelledby", "about-title");
  const content = element("div", "about-dialog-content");
  const close = element("button", "dialog-close", "Fechar");
  close.type = "button";
  close.setAttribute("aria-label", "Fechar informações sobre a Minha Colinha");
  close.addEventListener("click", () => dialog.close());
  const title = element("h2", undefined, "Sobre a Minha Colinha");
  title.id = "about-title";
  const introduction = element(
    "p",
    undefined,
    "A Minha Colinha é um projeto independente e open source. Não é um site oficial da Justiça Eleitoral.",
  );
  const data = element(
    "p",
    undefined,
    "Em produção, os candidatos vêm de dados públicos do TSE preparados previamente pela aplicação.",
  );
  const privacyTitle = element("h3", undefined, "Privacidade, de forma simples");
  const privacy = element("ul", "about-privacy");
  for (const item of [
    "Suas escolhas ficam somente na memória deste navegador.",
    "Não há cadastro, trackers ou envio da colinha para um servidor.",
    "A imagem é montada e baixada inteiramente no seu dispositivo.",
  ]) {
    privacy.append(element("li", undefined, item));
  }
  content.append(close, title, introduction, data, privacyTitle, privacy);
  dialog.append(content);
  dialog.addEventListener("close", () => {
    state.aboutOpen = false;
    requestAnimationFrame(() => document.getElementById("about-button")?.focus());
  });
  dialog.addEventListener("cancel", () => {
    state.aboutOpen = false;
  });
  return dialog;
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

  const matches = visibleCandidateSearchResults(candidates, query);

  if (matches.total === 0) {
    const empty = element("p", "empty-state", "Nenhum candidato encontrado.");
    empty.setAttribute("role", "status");
    container.append(empty);
    return;
  }

  if (matches.total > matches.candidates.length) {
    container.append(
      element(
        "p",
        "result-limit",
        `Mostrando ${matches.candidates.length} de ${matches.total} resultados. Refine a busca para encontrar a candidatura desejada.`,
      ),
    );
  }

  const list = element("ul", "candidate-results");
  for (const candidate of matches.candidates) {
    const item = element("li");
    const card = element(
      "button",
      "candidate-card",
    );
    card.type = "button";
    card.setAttribute(
      "aria-label",
      `${state.session?.selections[slot.id] ? "Substituir por" : "Selecionar"} ${candidate.ballotName}, número ${candidate.number}, partido ${candidate.party}`,
    );
    card.addEventListener("click", () => {
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
      element(
        "span",
        "candidate-card-action",
        state.session?.selections[slot.id] ? "Substituir" : "Selecionar",
      ),
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
  return `${STATE_NAMES[location.uf]} (${location.uf})`;
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

function resetLocationDetection(state: ApplicationState): void {
  state.locationDetectionVersion += 1;
  state.locationDetectionStatus = "idle";
  state.suggestedUf = null;
  state.locationDetectionError = null;
}

function canApplyStateChoice(
  state: ApplicationState,
  uf: FederativeUnit,
): boolean {
  const currentUf =
    state.session?.location.scope === TERRITORIAL_SCOPE.STATE
      ? state.session.location.uf
      : undefined;
  return (
    currentUf === uf ||
    !state.session ||
    !hasSelections(state.session) ||
    window.confirm("Alterar a UF apagará as escolhas atuais. Deseja continuar?")
  );
}

async function requestLocationSuggestion(
  state: ApplicationState,
  render: () => void,
): Promise<void> {
  state.locationDetectionVersion += 1;
  const requestVersion = state.locationDetectionVersion;
  state.locationDetectionStatus = "requesting";
  state.suggestedUf = null;
  state.locationDetectionError = null;
  state.announcement = "Solicitando sua localização ao navegador.";
  render();

  try {
    const uf = await detectStateFromGeolocation();
    if (requestVersion !== state.locationDetectionVersion) {
      return;
    }
    state.locationDetectionStatus = "suggested";
    state.suggestedUf = uf;
    state.announcement = `${STATE_NAMES[uf]} foi sugerido. Confirme antes de aplicar.`;
  } catch (error) {
    if (requestVersion !== state.locationDetectionVersion) {
      return;
    }
    state.locationDetectionStatus = "error";
    state.suggestedUf = null;
    state.locationDetectionError =
      error instanceof Error
        ? error.message
        : "Não foi possível determinar sua UF. Selecione-a manualmente.";
    state.announcement = state.locationDetectionError;
  }
  render();
  focusAfterRender("location-assistance");
}

function createGeolocationOption(
  state: ApplicationState,
  render: () => void,
): HTMLElement {
  const section = element("div", "geolocation-option");
  section.id = "location-assistance";
  section.tabIndex = -1;
  section.setAttribute("aria-live", "polite");
  section.append(
    element("p", "optional-label", "Opcional"),
    element(
      "p",
      "geolocation-description",
      "Se preferir, o navegador pode sugerir sua UF. A seleção manual acima continua disponível.",
    ),
  );

  const privacy = element(
    "p",
    "geolocation-privacy",
    "As coordenadas são comparadas localmente com limites do IBGE, não são enviadas a serviços externos e não são armazenadas.",
  );
  privacy.id = "geolocation-privacy";
  const locate = element(
    "button",
    "secondary-button geolocation-button",
    state.locationDetectionStatus === "requesting"
      ? "Obtendo localização…"
      : "Usar minha localização",
  );
  locate.type = "button";
  locate.disabled = state.locationDetectionStatus === "requesting";
  locate.setAttribute("aria-describedby", privacy.id);
  locate.addEventListener("click", () => {
    void requestLocationSuggestion(state, render);
  });
  section.append(locate, privacy);

  if (state.locationDetectionStatus === "suggested" && state.suggestedUf) {
    const suggestion = element("div", "location-suggestion");
    const title = element(
      "strong",
      undefined,
      `UF sugerida: ${STATE_NAMES[state.suggestedUf]} (${state.suggestedUf})`,
    );
    const explanation = element(
      "p",
      undefined,
      "Confirme apenas se esta for a UF do seu domicílio eleitoral.",
    );
    const actions = element("div", "location-suggestion-actions");
    const confirm = element(
      "button",
      "primary-button",
      `Confirmar ${state.suggestedUf}`,
    );
    confirm.type = "button";
    confirm.addEventListener("click", () => {
      const suggestedUf = state.suggestedUf;
      if (!suggestedUf || !canApplyStateChoice(state, suggestedUf)) {
        return;
      }
      const currentUf =
        state.session?.location.scope === TERRITORIAL_SCOPE.STATE
          ? state.session.location.uf
          : undefined;
      resetLocationDetection(state);
      if (currentUf === suggestedUf) {
        state.locationEditing = false;
        state.announcement = `${STATE_NAMES[suggestedUf]} já é a UF selecionada.`;
        render();
        return;
      }
      void selectState(state, suggestedUf, render);
    });
    const reject = element(
      "button",
      "text-button",
      "Escolher outra UF manualmente",
    );
    reject.type = "button";
    reject.addEventListener("click", () => {
      resetLocationDetection(state);
      state.announcement = "Sugestão descartada. Escolha sua UF manualmente.";
      render();
      focusAfterRender("voting-state");
    });
    actions.append(confirm, reject);
    suggestion.append(title, explanation, actions);
    section.append(suggestion);
  }

  if (state.locationDetectionStatus === "error" && state.locationDetectionError) {
    const error = element(
      "p",
      "geolocation-error",
      state.locationDetectionError,
    );
    error.setAttribute("role", "alert");
    section.append(error);
  }
  return section;
}

function createLocationForm(
  state: ApplicationState,
  render: () => void,
): HTMLFormElement {
  const form = element("form", "location-form");
  const label = element("label", undefined, "Selecione sua UF");
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
  form.append(label, hint, controls, createGeolocationOption(state, render));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedState = STATE_OPTIONS.find(({ uf }) => uf === select.value);
    if (!selectedState) {
      return;
    }
    if (selectedState.uf === currentUf) {
      resetLocationDetection(state);
      state.locationEditing = false;
      render();
      return;
    }

    if (!canApplyStateChoice(state, selectedState.uf)) {
      select.value = currentUf ?? "";
      return;
    }

    resetLocationDetection(state);
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
  state.locationEditing = false;
  await loadCurrentCandidates(state, render, true);
}

function createLocationSection(
  state: ApplicationState,
  render: () => void,
): HTMLElement {
  const section = element("section", "location-section");
  section.setAttribute("aria-labelledby", "location-title");
  const title = element("h2", undefined, "Onde você vota?");
  title.id = "location-title";
  section.append(title);

  if (state.session && !state.locationEditing) {
    const summary = element("div", "location-summary");
    const location = element(
      "strong",
      "location-summary-value",
      locationLabel(state.session.location),
    );
    const change = element("button", "text-button location-change", "Alterar");
    change.type = "button";
    change.addEventListener("click", () => {
      state.locationEditing = true;
      state.announcement = "Seleção de UF aberta para alteração.";
      render();
      focusAfterRender("voting-state");
    });
    summary.append(location, change);
    section.append(summary);
  } else {
    section.append(createLocationForm(state, render));
  }
  return section;
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
  if (!session || resolvedSelectionCount(state) === 0) {
    state.exportStatus = "error";
    state.exportError = "Faça pelo menos uma escolha antes de baixar a colinha.";
    render();
    return;
  }
  if (
    state.datasetKind === CANDIDATE_DATASET_KIND.OFFICIAL_SNAPSHOT &&
    !state.metadata
  ) {
    state.exportStatus = "error";
    state.exportError =
      "Aguarde a confirmação da data do snapshot oficial antes de baixar.";
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
    {
      notice:
        state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE
          ? "DADOS FICTÍCIOS — DESENVOLVIMENTO — NÃO USE PARA VOTAR"
          : null,
      snapshotImportedAt: state.metadata?.importedAt ?? null,
    },
  );

  try {
    const blob = await generateColinhaPng(model);
    if (requestedVersion !== state.exportVersion) {
      return;
    }
    const download = triggerBlobDownload(
      blob,
      colinhaFileName(state.election.year, session.location),
    );
    if (download.started) {
      state.exportStatus = "idle";
      state.announcement = "Download da colinha iniciado.";
    } else {
      state.exportUrl = download.fallbackUrl;
      state.exportStatus = "fallback";
      state.announcement =
        "O download automático não começou. Use o link manual disponível.";
    }
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
  hasResolvedSelection: boolean,
): HTMLElement {
  const container = element("div", "export-actions");
  container.id = "export-actions";
  container.tabIndex = -1;
  container.setAttribute("aria-busy", String(state.exportStatus === "generating"));

  if (state.exportStatus === "fallback" && state.exportUrl && state.session) {
    const fallbackUrl = state.exportUrl;
    const download = element(
      "a",
      "secondary-button download-button",
      "O download não começou? Baixar manualmente",
    );
    download.href = state.exportUrl;
    download.download = colinhaFileName(
      state.election.year,
      state.session.location,
    );
    download.addEventListener("click", () => {
      state.announcement = "Download da colinha iniciado.";
      window.setTimeout(() => {
        if (state.exportUrl === fallbackUrl) {
          URL.revokeObjectURL(fallbackUrl);
          state.exportUrl = null;
          state.exportStatus = "idle";
          render();
        }
      }, 1_000);
    });
    container.append(
      element(
        "p",
        "export-hint",
        "Seu navegador bloqueou o início automático do download.",
      ),
      download,
    );
    return container;
  }

  const generate = element(
    "button",
    "primary-button generate-button",
    state.exportStatus === "generating"
      ? "Gerando sua colinha…"
      : "Baixar minha colinha",
  );
  generate.type = "button";
  const metadataReady =
    state.datasetKind === CANDIDATE_DATASET_KIND.DEVELOPMENT_FIXTURE ||
    state.metadata !== null;
  generate.disabled =
    !hasResolvedSelection ||
    !metadataReady ||
    state.exportStatus === "generating";
  generate.addEventListener("click", () => {
    void generateExport(state, render);
  });
  container.append(generate);

  if (!hasResolvedSelection) {
    container.append(
      element(
        "p",
        "export-hint",
        "Faça pelo menos uma escolha para liberar o download.",
      ),
    );
  } else if (!metadataReady) {
    container.append(
      element(
        "p",
        "export-hint",
        "Aguardando a confirmação da data dos dados oficiais.",
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

  const complete = resolvedSelectionCount(state) === session.slots.length;
  const hasResolvedSelection = resolvedSelectionCount(state) > 0;
  const section = element("section", "review");
  section.setAttribute("aria-labelledby", "review-title");
  const title = element("h2", undefined, "Revise sua colinha");
  title.id = "review-title";
  const description = element(
    "p",
    "review-description",
    "Confira cargo, número, nome, partido e foto antes de gerar a imagem.",
  );
  section.append(title, description);

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
      : hasResolvedSelection
        ? "Você já pode baixar a colinha. As posições restantes aparecerão como “Não preenchido”."
        : "Faça pelo menos uma escolha para baixar a colinha.",
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
  section.append(createExportActions(state, render, hasResolvedSelection));
  return section;
}

function renderConfiguredApplication(
  root: HTMLElement,
  state: ApplicationState,
): void {
  const render = () => renderConfiguredApplication(root, state);
  const main = element("main", "page");
  main.id = "conteudo";

  const intro = element("section", "intro app-context");
  const title = element(
    "h1",
    undefined,
    `Sua colinha para as Eleições ${state.election.year}`,
  );
  const text = element(
    "p",
    "lead",
    "Escolha sua UF e organize candidatos na ordem oficial de votação.",
  );
  intro.append(title, text, createDataSource(state));
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

  main.append(intro, createLocationSection(state, render));

  if (state.session) {
    const slotsHeader = element("div", "slots-header");
    const completed = selectionCount(state.session);
    const choicesTitle = element("h2", undefined, "Escolha seus candidatos");
    choicesTitle.id = "choices-title";
    choicesTitle.tabIndex = -1;
    slotsHeader.append(
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
    const progress = element("progress", "selection-progress compact-progress");
    progress.max = state.session.slots.length;
    progress.value = completed;
    progress.setAttribute(
      "aria-label",
      `${completed} de ${state.session.slots.length} escolhas preenchidas`,
    );
    slotsHeader.append(progress);
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
  const dialog = createAboutDialog(state);
  root.replaceChildren(
    createHeader(state.datasetKind, () => {
      state.aboutOpen = true;
      render();
    }),
    main,
    createFooter(),
    announcement,
    dialog,
  );
  if (state.aboutOpen && !dialog.open) {
    dialog.showModal();
  }
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
    locationDetectionStatus: "idle",
    suggestedUf: null,
    locationDetectionError: null,
    locationDetectionVersion: 0,
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
    aboutOpen: true,
    locationEditing: true,
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
