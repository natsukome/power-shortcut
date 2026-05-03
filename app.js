const GRID_SIZE = 10;
const CARD_LAYER_OFFSET = 50000;
const MIN_CARD_WIDTH_UNITS = 8;
const MIN_CARD_HEIGHT_UNITS = 6;
const DEFAULT_CARD_WIDTH_UNITS = 24;
const DEFAULT_CARD_HEIGHT_UNITS = 14;
const PLACEMENT_GAP_UNITS = 1;
const PLACEMENT_SEARCH_RADIUS_UNITS = 240;
const STORAGE_KEY = "utilpage.dashboard.v1";
const VALID_CARD_TYPES = new Set(["text", "board"]);

const dashboard = document.querySelector("#dashboard");
const gridLayer = document.querySelector("#gridLayer");
const cardLayer = document.querySelector("#cardLayer");
const cardConfigModal = document.querySelector("#cardConfigModal");
const addCardButton = document.querySelector("#addCardButton");
const closeConfigButton = document.querySelector("#closeConfigButton");
const cancelConfigButton = document.querySelector("#cancelConfigButton");
const saveConfigButton = document.querySelector("#saveConfigButton");
const cardList = document.querySelector("#cardList");
const cardCount = document.querySelector("#cardCount");
const configCardMeta = document.querySelector("#configCardMeta");
const typeInput = document.querySelector("#typeInput");
const typeField = typeInput.closest("label");
const titleInput = document.querySelector("#titleInput");
const contentInput = document.querySelector("#contentInput");
const contentField = contentInput.closest("label");
const widthInput = document.querySelector("#widthInput");
const heightInput = document.querySelector("#heightInput");

const state = {
  cards: [],
  selectedId: null,
  collapsedBoardIds: new Set(),
  configMode: null,
  draft: null,
  pan: {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  },
};

let activeInteraction = null;

function loadStoredState() {
  const rawState = localStorage.getItem(STORAGE_KEY);
  if (!rawState) return;

  try {
    const storedState = JSON.parse(rawState);
    const cards = Array.isArray(storedState.cards) ? storedState.cards : [];
    const selectedId = cards.some((card) => card.id === storedState.selectedId) ? storedState.selectedId : null;
    const pan = storedState.pan ?? {};

    state.cards = cards
      .filter((card) => typeof card.id === "string")
      .map((card) => ({
        id: card.id,
        parentId: typeof card.parentId === "string" ? card.parentId : null,
        type: VALID_CARD_TYPES.has(card.type) ? card.type : "text",
        title: typeof card.title === "string" ? card.title : "Untitled",
        content: typeof card.content === "string" ? card.content : "",
        x: Number.isFinite(Number(card.x)) ? Number(card.x) : 0,
        y: Number.isFinite(Number(card.y)) ? Number(card.y) : 0,
        width: Math.max(MIN_CARD_WIDTH_UNITS, Number(card.width) || DEFAULT_CARD_WIDTH_UNITS),
        height: Math.max(MIN_CARD_HEIGHT_UNITS, Number(card.height) || DEFAULT_CARD_HEIGHT_UNITS),
      }));
    const restoredIds = new Set(state.cards.map((card) => card.id));
    state.cards = state.cards.map((card) => ({
      ...card,
      parentId: restoredIds.has(card.parentId) ? card.parentId : null,
    }));
    state.selectedId = selectedId;
    state.pan = {
      x: Number.isFinite(Number(pan.x)) ? Number(pan.x) : state.pan.x,
      y: Number.isFinite(Number(pan.y)) ? Number(pan.y) : state.pan.y,
    };
    state.collapsedBoardIds = new Set(
      Array.isArray(storedState.collapsedBoardIds)
        ? storedState.collapsedBoardIds.filter((id) => restoredIds.has(id))
        : [],
    );
  } catch (error) {
    console.warn("Failed to restore UtilPage state.", error);
  }
}

function saveStoredState() {
  const storedState = {
    cards: state.cards,
    selectedId: state.selectedId,
    collapsedBoardIds: [...state.collapsedBoardIds],
    pan: state.pan,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState));
}

function selectedCard() {
  return state.cards.find((card) => card.id === state.selectedId) ?? null;
}

function defaultDraft() {
  const index = state.cards.length + 1;
  return {
    type: "text",
    title: `Card ${index}`,
    content: "",
    width: DEFAULT_CARD_WIDTH_UNITS,
    height: DEFAULT_CARD_HEIGHT_UNITS,
  };
}

function normalizeDraft() {
  const type = VALID_CARD_TYPES.has(typeInput.value) ? typeInput.value : "text";
  return {
    type,
    title: titleInput.value.trim() || "Untitled",
    content: type === "board" ? "" : contentInput.value,
    width: Math.max(MIN_CARD_WIDTH_UNITS, Number(widthInput.value) || DEFAULT_CARD_WIDTH_UNITS),
    height: Math.max(MIN_CARD_HEIGHT_UNITS, Number(heightInput.value) || DEFAULT_CARD_HEIGHT_UNITS),
  };
}

function syncDraftFromInputs() {
  if (!state.draft) return;
  state.draft = normalizeDraft();
}

function rectanglesOverlap(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function hasCardOverlap(candidate, parentId = null, excludedIds = new Set()) {
  return state.cards.some((card) =>
    card.parentId === parentId &&
    !excludedIds.has(card.id) &&
    rectanglesOverlap(candidate, {
      x: card.x - PLACEMENT_GAP_UNITS,
      y: card.y - PLACEMENT_GAP_UNITS,
      width: card.width + PLACEMENT_GAP_UNITS * 2,
      height: card.height + PLACEMENT_GAP_UNITS * 2,
    }),
  );
}

function findEmptyCardPosition(width, height, parentId = null, preferredPosition = null, excludedIds = new Set()) {
  const preferred =
    preferredPosition ?? {
      x: Math.round((window.innerWidth / 2 - state.pan.x) / GRID_SIZE - width / 2),
      y: Math.round((window.innerHeight / 2 - state.pan.y) / GRID_SIZE - height / 2),
    };

  for (let radius = 0; radius <= PLACEMENT_SEARCH_RADIUS_UNITS; radius += 1) {
    for (let y = preferred.y - radius; y <= preferred.y + radius; y += 1) {
      for (let x = preferred.x - radius; x <= preferred.x + radius; x += 1) {
        const isEdge =
          x === preferred.x - radius ||
          x === preferred.x + radius ||
          y === preferred.y - radius ||
          y === preferred.y + radius;
        if (!isEdge) continue;

        const candidate = { x, y, width, height };
        if (!hasCardOverlap(candidate, parentId, excludedIds)) return { x, y };
      }
    }
  }

  return preferred;
}

function openCreateConfig() {
  state.configMode = "create";
  state.draft = defaultDraft();
  render();
  titleInput.focus();
  titleInput.select();
}

function openEditConfig(cardId) {
  const card = state.cards.find((item) => item.id === cardId);
  if (!card) return;

  state.selectedId = card.id;
  state.configMode = "edit";
  state.draft = {
    type: card.type,
    title: card.title,
    content: card.content,
    width: card.width,
    height: card.height,
  };
  render();
  titleInput.focus();
  titleInput.select();
}

function closeConfig() {
  state.configMode = null;
  state.draft = null;
  render();
}

function saveConfig() {
  if (!state.configMode) return;

  const draft = normalizeDraft();

  if (state.configMode === "create") {
    const position = findEmptyCardPosition(draft.width, draft.height);
    const card = {
      id: crypto.randomUUID(),
      parentId: null,
      ...draft,
      x: position.x,
      y: position.y,
    };
    state.cards.push(card);
    state.selectedId = card.id;
    saveStoredState();
  }

  if (state.configMode === "edit") {
    const card = selectedCard();
    if (!card) return;
    Object.assign(card, draft);
    saveStoredState();
  }

  closeConfig();
}

function removeCard(cardId) {
  const selectedIndex = state.cards.findIndex((card) => card.id === cardId);
  if (selectedIndex === -1) return;
  const removedIds = descendantIds(cardId);
  removedIds.add(cardId);

  state.cards = state.cards.filter((card) => !removedIds.has(card.id));

  if (removedIds.has(state.selectedId)) {
    state.selectedId = state.cards[Math.max(0, selectedIndex - 1)]?.id ?? null;
  }

  saveStoredState();

  if (state.configMode === "edit" && state.selectedId !== cardId) {
    closeConfig();
    return;
  }

  render();
}

function descendantIds(cardId) {
  const ids = new Set();
  const queue = [cardId];

  while (queue.length > 0) {
    const parentId = queue.shift();
    state.cards
      .filter((card) => card.parentId === parentId)
      .forEach((card) => {
        ids.add(card.id);
        queue.push(card.id);
      });
  }

  return ids;
}

function snap(value) {
  return Math.round(value / GRID_SIZE);
}

function applyPan() {
  gridLayer.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px)`;
}

function render() {
  applyPan();
  renderCards();
  renderCardList();
  renderConfigModal();
}

function renderCards() {
  cardLayer.replaceChildren(...state.cards.filter((card) => card.parentId === null).map((card) => createCardElement(card, true)));
}

function createCardElement(card, isDashboardCard = false) {
  const element = document.createElement("article");
  const isActiveCard =
    activeInteraction?.cardId === card.id &&
    (activeInteraction.type === "move" || activeInteraction.type === "resize");
  element.className = `card card--${card.type}${card.id === state.selectedId ? " is-selected" : ""}${
    isActiveCard ? " is-dragging" : ""
  }`;
  element.dataset.cardId = card.id;
  element.style.left = `${(isDashboardCard ? CARD_LAYER_OFFSET : 0) + card.x * GRID_SIZE}px`;
  element.style.top = `${(isDashboardCard ? CARD_LAYER_OFFSET : 0) + card.y * GRID_SIZE}px`;
  element.style.width = `${card.width * GRID_SIZE}px`;
  element.style.height = `${card.height * GRID_SIZE}px`;

  const header = document.createElement("header");
  header.className = "card__header";
  header.dataset.action = "move";

  const heading = document.createElement("div");
  heading.className = "card__heading";

  const title = document.createElement("div");
  title.className = "card__title";
  title.textContent = card.title || "Untitled";

  const type = document.createElement("div");
  type.className = "card__type";
  type.textContent = card.type;

  const actions = document.createElement("div");
  actions.className = "card__actions";

  const editButton = document.createElement("button");
  editButton.className = "card__action";
  editButton.type = "button";
  editButton.dataset.action = "edit";
  editButton.textContent = "Edit";

  const removeButton = document.createElement("button");
  removeButton.className = "card__action card__action--danger";
  removeButton.type = "button";
  removeButton.dataset.action = "remove";
  removeButton.textContent = "Remove";

  const body = document.createElement("div");
  body.className = card.type === "board" ? "card__body card__body--board" : "card__body";

  if (card.type === "board") {
    const boardLayer = document.createElement("div");
    boardLayer.className = "board-layer";
    boardLayer.dataset.boardId = card.id;
    boardLayer.append(...state.cards.filter((child) => child.parentId === card.id).map((child) => createCardElement(child)));
    body.append(boardLayer);
  } else {
    body.textContent = card.content;
  }

  const resizeHandle = document.createElement("div");
  resizeHandle.className = "card__resize";
  resizeHandle.dataset.action = "resize";
  resizeHandle.setAttribute("aria-hidden", "true");

  heading.append(title, type);
  actions.append(editButton, removeButton);
  header.append(heading, actions);
  element.append(header, body, resizeHandle);
  return element;
}

function renderCardList() {
  cardCount.textContent = `${state.cards.length} ${state.cards.length === 1 ? "card" : "cards"}`;

  if (state.cards.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card-list__meta";
    empty.textContent = "No cards yet.";
    cardList.replaceChildren(empty);
    return;
  }

  cardList.replaceChildren(...state.cards.filter((card) => card.parentId === null).flatMap((card) => createCardListRows(card)));
}

function createCardListRows(card, depth = 0) {
  const item = document.createElement("button");
  const children = state.cards.filter((child) => child.parentId === card.id);
  const canCollapse = card.type === "board" && children.length > 0;
  const isCollapsed = state.collapsedBoardIds.has(card.id);
  item.type = "button";
  item.className = `card-list__item${card.id === state.selectedId ? " is-selected" : ""}${
    depth > 0 ? " is-nested" : ""
  }${canCollapse ? " has-children" : ""}`;
  item.dataset.cardId = card.id;
  item.style.setProperty("--card-list-depth", depth);

  const header = document.createElement("span");
  header.className = "card-list__row";

  if (canCollapse) {
    const toggle = document.createElement("span");
    toggle.className = "card-list__toggle";
    toggle.dataset.action = "toggle-collapse";
    toggle.textContent = isCollapsed ? ">" : "v";
    header.append(toggle);
  }

  const title = document.createElement("span");
  title.className = "card-list__title";
  title.textContent = card.title || "Untitled";
  header.append(title);

  const meta = document.createElement("span");
  meta.className = "card-list__meta";
  meta.textContent = `${card.type} | ${card.width * GRID_SIZE}x${card.height * GRID_SIZE}px`;

  item.append(header, meta);

  return isCollapsed ? [item] : [item, ...children.flatMap((child) => createCardListRows(child, depth + 1))];
}

function renderConfigModal() {
  const isOpen = Boolean(state.configMode && state.draft);
  cardConfigModal.classList.toggle("is-hidden", !isOpen);

  if (!isOpen) return;

  const modeLabel = state.configMode === "create" ? "New card" : "Edit card";
  const actionLabel = state.configMode === "create" ? "Add" : "Save";

  configCardMeta.textContent = modeLabel;
  saveConfigButton.textContent = actionLabel;
  typeField.hidden = state.configMode === "edit";
  contentField.hidden = state.draft.type === "board";
  typeInput.value = state.draft.type;
  titleInput.value = state.draft.title;
  contentInput.value = state.draft.content;
  widthInput.value = state.draft.width;
  heightInput.value = state.draft.height;
}

function boardLayerFor(boardId) {
  return [...document.querySelectorAll(".board-layer")].find((layer) => layer.dataset.boardId === boardId) ?? null;
}

function pointerToBoardUnits(event, parentId = null) {
  if (parentId) {
    const boardLayer = boardLayerFor(parentId);
    const rect = boardLayer?.getBoundingClientRect();
    if (rect) {
      return {
        x: snap(event.clientX - rect.left),
        y: snap(event.clientY - rect.top),
      };
    }
  }

  return {
    x: snap(event.clientX - state.pan.x),
    y: snap(event.clientY - state.pan.y),
  };
}

function boardAtPoint(event, draggedCardId) {
  const blockedIds = descendantIds(draggedCardId);
  blockedIds.add(draggedCardId);

  return [...document.querySelectorAll(".board-layer")]
    .map((layer) => {
      const boardId = layer.dataset.boardId;
      const board = state.cards.find((card) => card.id === boardId && card.type === "board");
      const rect = layer.getBoundingClientRect();
      return { board, rect };
    })
    .filter(
      ({ board, rect }) =>
        board &&
        !blockedIds.has(board.id) &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom,
    )
    .at(-1)?.board;
}

function transferCardToBoard(card, board, event) {
  if (!board || card.parentId === board.id) return;

  const dropPoint = pointerToBoardUnits(event, board.id);
  const preferredPosition = {
    x: Math.max(0, dropPoint.x - Math.round(card.width / 2)),
    y: Math.max(0, dropPoint.y - Math.round(card.height / 2)),
  };
  const excludedIds = descendantIds(card.id);
  excludedIds.add(card.id);
  const position = findEmptyCardPosition(card.width, card.height, board.id, preferredPosition, excludedIds);

  card.parentId = board.id;
  card.x = Math.max(0, position.x);
  card.y = Math.max(0, position.y);
}

function startDashboardPan(event) {
  if (event.button !== 0 || event.target.closest(".card, .util-modal, .config-modal")) return;
  activeInteraction = {
    type: "pan",
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPanX: state.pan.x,
    startPanY: state.pan.y,
  };
  dashboard.classList.add("is-panning");
  dashboard.setPointerCapture(event.pointerId);
}

function startCardInteraction(event) {
  const cardElement = event.target.closest(".card");
  if (!cardElement || event.button !== 0) return;

  const card = state.cards.find((item) => item.id === cardElement.dataset.cardId);
  if (!card) return;

  state.selectedId = card.id;
  const actionTarget = event.target.closest("[data-action]");
  const action = actionTarget?.dataset.action;

  if (action === "edit") {
    event.preventDefault();
    event.stopPropagation();
    openEditConfig(card.id);
    return;
  }

  if (action === "remove") {
    event.preventDefault();
    event.stopPropagation();
    removeCard(card.id);
    return;
  }

  if (action !== "move" && action !== "resize") {
    render();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const boardPoint = pointerToBoardUnits(event, card.parentId);

  activeInteraction = {
    type: action,
    pointerId: event.pointerId,
    cardId: card.id,
    startBoardX: boardPoint.x,
    startBoardY: boardPoint.y,
    startX: card.x,
    startY: card.y,
    startWidth: card.width,
    startHeight: card.height,
  };
  render();
}

function moveInteraction(event) {
  if (!activeInteraction || event.pointerId !== activeInteraction.pointerId) return;

  if (activeInteraction.type === "pan") {
    state.pan.x = activeInteraction.startPanX + event.clientX - activeInteraction.startClientX;
    state.pan.y = activeInteraction.startPanY + event.clientY - activeInteraction.startClientY;
    applyPan();
    return;
  }

  const card = state.cards.find((item) => item.id === activeInteraction.cardId);
  if (!card) return;

  const boardPoint = pointerToBoardUnits(event, card.parentId);
  const deltaX = boardPoint.x - activeInteraction.startBoardX;
  const deltaY = boardPoint.y - activeInteraction.startBoardY;

  if (activeInteraction.type === "move") {
    card.x = activeInteraction.startX + deltaX;
    card.y = activeInteraction.startY + deltaY;

    if (card.parentId) {
      card.x = Math.max(0, card.x);
      card.y = Math.max(0, card.y);
    }
  }

  if (activeInteraction.type === "resize") {
    card.width = Math.max(MIN_CARD_WIDTH_UNITS, activeInteraction.startWidth + deltaX);
    card.height = Math.max(MIN_CARD_HEIGHT_UNITS, activeInteraction.startHeight + deltaY);
  }

  render();
}

function endInteraction(event) {
  if (!activeInteraction || event.pointerId !== activeInteraction.pointerId) return;
  dashboard.classList.remove("is-panning");

  if (activeInteraction.type === "move") {
    const card = state.cards.find((item) => item.id === activeInteraction.cardId);
    const board = card ? boardAtPoint(event, card.id) : null;
    if (card && board) transferCardToBoard(card, board, event);
  }

  saveStoredState();
  activeInteraction = null;
  render();
}

dashboard.addEventListener("pointerdown", startDashboardPan);
cardLayer.addEventListener("pointerdown", startCardInteraction);
window.addEventListener("pointermove", moveInteraction);
window.addEventListener("pointerup", endInteraction);
window.addEventListener("pointercancel", endInteraction);

addCardButton.addEventListener("click", openCreateConfig);
closeConfigButton.addEventListener("click", closeConfig);
cancelConfigButton.addEventListener("click", closeConfig);
saveConfigButton.addEventListener("click", saveConfig);

typeInput.addEventListener("input", () => {
  syncDraftFromInputs();
  renderConfigModal();
});
titleInput.addEventListener("input", syncDraftFromInputs);
contentInput.addEventListener("input", syncDraftFromInputs);
widthInput.addEventListener("input", syncDraftFromInputs);
heightInput.addEventListener("input", syncDraftFromInputs);

cardList.addEventListener("click", (event) => {
  const item = event.target.closest(".card-list__item");
  if (!item) return;

  if (event.target.closest('[data-action="toggle-collapse"]')) {
    if (state.collapsedBoardIds.has(item.dataset.cardId)) {
      state.collapsedBoardIds.delete(item.dataset.cardId);
    } else {
      state.collapsedBoardIds.add(item.dataset.cardId);
    }
    saveStoredState();
    render();
    return;
  }

  state.selectedId = item.dataset.cardId;
  saveStoredState();
  render();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeConfig();
});
window.addEventListener("resize", applyPan);

loadStoredState();
render();
