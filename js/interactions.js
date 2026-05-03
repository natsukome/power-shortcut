(function initInteractions(app) {
  const {
    DEFAULT_CARD_HEIGHT_UNITS,
    DEFAULT_CARD_WIDTH_UNITS,
    GRID_SIZE,
    MIN_CARD_HEIGHT_UNITS,
    MIN_CARD_WIDTH_UNITS,
    VALID_CARD_TYPES,
    ZOOM_MAX,
    ZOOM_MIN,
    ZOOM_STEP,
  } = app.constants;
  const {
    addCardButton,
    cancelConfigButton,
    cancelImportButton,
    cardContextMenu,
    cardLayer,
    cardList,
    closeConfigButton,
    closeImportButton,
    confirmImportButton,
    dashboard,
    exportButton,
    heightInput,
    importContentInput,
    importButton,
    saveConfigButton,
    secretInput,
    titleInput,
    typeInput,
    urlInput,
    widthInput,
    zoomInButton,
    zoomOutButton,
    contentInput,
  } = app.dom;
  const { state } = app;
  const { saveStoredState, importStateData } = app.storage;
  const { render, renderConfigModal, applyPan, clampPan } = app.rendering;
  const {
    clampDashboardCard,
    defaultDraft,
    descendantIds,
    findEmptyCardPosition,
    normalizeDraft,
    removeCardTree,
    selectedCard,
    snap,
    syncDraftFromInputs,
  } = app.cardModel;
  const PARTIAL_EXPORT_TYPE = "utilpage.partial-card.v1";

  function normalizeUrl(url) {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return "";
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
  }

  function openLinkCard(card) {
    const url = normalizeUrl(card.url ?? "");
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }

  async function copySecretCard(card) {
    const secret = card.secret ?? "";
    if (!secret) return;
    await copyText(secret);
  }

  function showToast(message) {
    state.toastMessage = message;
    render();

    window.setTimeout(() => {
      if (state.toastMessage !== message) return;
      state.toastMessage = "";
      render();
    }, 1200);
  }

  function clampZoom(zoom) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  }

  function showZoomToast() {
    showToast(`Zoom ${Math.round(state.zoom * 100)}%`);
  }

  function setZoom(nextZoom, anchorClientX = window.innerWidth / 2, anchorClientY = window.innerHeight / 2) {
    const oldZoom = state.zoom;
    const zoom = clampZoom(nextZoom);
    if (zoom === oldZoom) {
      showZoomToast();
      return;
    }

    const anchorBoardX = (anchorClientX - state.pan.x) / oldZoom;
    const anchorBoardY = (anchorClientY - state.pan.y) / oldZoom;
    state.zoom = zoom;
    state.pan.x = anchorClientX - anchorBoardX * zoom;
    state.pan.y = anchorClientY - anchorBoardY * zoom;
    clampPan();
    saveStoredState();
    render();
    showZoomToast();
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
      url: card.url ?? "",
      secret: card.secret ?? "",
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

  function openImportModal() {
    hideContextMenu(false);
    state.importModalOpen = true;
    state.importContent = "";
    render();
    importContentInput.focus();
  }

  function closeImportModal() {
    state.importModalOpen = false;
    state.importContent = "";
    render();
  }

  function hideContextMenu(shouldRender = true) {
    if (!state.contextMenu) return;
    state.contextMenu = null;
    if (shouldRender) render();
  }

  function saveConfig() {
    if (!state.configMode) return;

    const draft = normalizeDraft();

    if (state.configMode === "create") {
      const position = findEmptyCardPosition(draft.width, draft.height);
      const card = {
        id: crypto.randomUUID(),
        parentId: null,
        isMutable: true,
        ...draft,
        x: position.x,
        y: position.y,
      };
      clampDashboardCard(card);
      state.cards.push(card);
      state.selectedId = card.id;
      saveStoredState();
    }

    if (state.configMode === "edit") {
      const card = selectedCard();
      if (!card) return;
      Object.assign(card, draft);
      clampDashboardCard(card);
      saveStoredState();
    }

    closeConfig();
  }

  function removeCard(cardId) {
    const result = removeCardTree(cardId);
    if (!result.removed) return;

    saveStoredState();

    if (state.configMode === "edit" && !result.removedIds.has(state.selectedId)) {
      closeConfig();
      return;
    }

    render();
  }

  function toggleCardMutability(card) {
    card.isMutable = !card.isMutable;
    saveStoredState();
    render();
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
          x: snap((event.clientX - rect.left) / state.zoom),
          y: snap((event.clientY - rect.top) / state.zoom),
        };
      }
    }

    return {
      x: snap((event.clientX - state.pan.x) / state.zoom),
      y: snap((event.clientY - state.pan.y) / state.zoom),
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

  function isDroppedPastParentBoardLeftEdge(card, event) {
    if (!card.parentId) return false;

    const boardLayer = boardLayerFor(card.parentId);
    const rect = boardLayer?.getBoundingClientRect();
    return Boolean(rect && event.clientX < rect.left);
  }

  function transferCardToDashboard(card, event) {
    const dashboardPoint = pointerToBoardUnits(event);
    const preferredPosition = {
      x: dashboardPoint.x - Math.round(card.width / 2),
      y: dashboardPoint.y - Math.round(card.height / 2),
    };
    const excludedIds = descendantIds(card.id);
    excludedIds.add(card.id);
    const position = findEmptyCardPosition(card.width, card.height, null, preferredPosition, excludedIds);

    card.parentId = null;
    card.x = position.x;
    card.y = position.y;
    clampDashboardCard(card);
  }

  function isPointerInsideBoard(boardId, event) {
    const boardLayer = boardLayerFor(boardId);
    const rect = boardLayer?.getBoundingClientRect();

    return Boolean(
      rect &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom,
    );
  }

  function updateDropTarget(event, card) {
    if (!card || state.activeInteraction?.type !== "move") {
      state.dropTargetBoardId = null;
      state.exitHintBoardId = null;
      return;
    }

    if (card.parentId && isPointerInsideBoard(card.parentId, event)) {
      state.dropTargetBoardId = null;
      state.exitHintBoardId = card.parentId;
      return;
    }

    const board = boardAtPoint(event, card.id);
    const nextBoardId = board?.id === card.parentId ? null : (board?.id ?? null);
    if (state.dropTargetBoardId === nextBoardId && state.exitHintBoardId === null) return;
    state.dropTargetBoardId = nextBoardId;
    state.exitHintBoardId = null;
  }

  function startDashboardPan(event) {
    if (event.button !== 0 || event.target.closest(".card, .util-modal, .config-modal, .card-context-menu")) return;
    state.activeInteraction = {
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

  function handleDashboardWheel(event) {
    if (event.target.closest(".util-modal, .config-modal")) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setZoom(state.zoom + direction * ZOOM_STEP, event.clientX, event.clientY);
  }

  function startCardInteraction(event) {
    const cardElement = event.target.closest(".card");
    if (!cardElement || event.button !== 0) return;

    const card = state.cards.find((item) => item.id === cardElement.dataset.cardId);
    if (!card) return;

    state.selectedId = card.id;
    hideContextMenu(false);
    const actionTarget = event.target.closest("[data-action]");
    const action = actionTarget?.dataset.action;

    const bodyElement = event.target.closest(".card__body");
    if (card.type === "text" && bodyElement?.closest(".card") === cardElement) {
      saveStoredState();
      return;
    }

    if (action === "toggle-board-collapse") {
      event.preventDefault();
      event.stopPropagation();
      toggleBoardCardCollapse(card.id);
      return;
    }

    if (action === "toggle-mutability") {
      event.preventDefault();
      event.stopPropagation();
      toggleCardMutability(card);
      return;
    }

    if (action === "edit") {
      if (!card.isMutable) return;
      event.preventDefault();
      event.stopPropagation();
      openEditConfig(card.id);
      return;
    }

    if (action === "remove") {
      if (!card.isMutable) return;
      event.preventDefault();
      event.stopPropagation();
      removeCard(card.id);
      return;
    }

    if (action === "resize" && !card.isMutable) {
      render();
      return;
    }

    if (action !== "move" && action !== "resize") {
      render();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const boardPoint = pointerToBoardUnits(event, card.parentId);

    state.activeInteraction = {
      type: action,
      pointerId: event.pointerId,
      cardId: card.id,
      startedOnLinkTitle: Boolean(event.target.closest(".card--link .card__title")),
      startBoardX: boardPoint.x,
      startBoardY: boardPoint.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startedOnSecretTitle: Boolean(event.target.closest(".card--secret .card__title")),
      startX: card.x,
      startY: card.y,
      startWidth: card.width,
      startHeight: card.height,
    };
    render();
  }

  function moveInteraction(event) {
    const interaction = state.activeInteraction;
    if (!interaction || event.pointerId !== interaction.pointerId) return;

    if (interaction.type === "pan") {
      state.pan.x = interaction.startPanX + event.clientX - interaction.startClientX;
      state.pan.y = interaction.startPanY + event.clientY - interaction.startClientY;
      applyPan();
      return;
    }

    const card = state.cards.find((item) => item.id === interaction.cardId);
    if (!card) return;

    const boardPoint = pointerToBoardUnits(event, card.parentId);
    const deltaX = boardPoint.x - interaction.startBoardX;
    const deltaY = boardPoint.y - interaction.startBoardY;

    if (interaction.type === "move") {
      card.x = interaction.startX + deltaX;
      card.y = interaction.startY + deltaY;

      if (card.parentId) {
        card.x = Math.max(0, card.x);
        card.y = Math.max(0, card.y);
      } else {
        clampDashboardCard(card);
      }

      updateDropTarget(event, card);
    }

    if (interaction.type === "resize") {
      card.width = Math.max(MIN_CARD_WIDTH_UNITS, interaction.startWidth + deltaX);
      card.height = Math.max(MIN_CARD_HEIGHT_UNITS, interaction.startHeight + deltaY);
      clampDashboardCard(card);
    }

    render();
  }

  function endInteraction(event) {
    const interaction = state.activeInteraction;
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    dashboard.classList.remove("is-panning");

    if (interaction.type === "move") {
      const card = state.cards.find((item) => item.id === interaction.cardId);
      const movedDistance = Math.hypot(event.clientX - interaction.startClientX, event.clientY - interaction.startClientY);
      const clickedElement = document.elementFromPoint(event.clientX, event.clientY);
      const clickedSameTitle = clickedElement?.closest(".card--link .card__title")?.closest(".card")?.dataset.cardId === card?.id;

      if (card?.type === "link" && interaction.startedOnLinkTitle && movedDistance < 4 && clickedSameTitle) {
        state.activeInteraction = null;
        state.dropTargetBoardId = null;
        state.exitHintBoardId = null;
        saveStoredState();
        render();
        openLinkCard(card);
        return;
      }

      const clickedSameSecretTitle =
        clickedElement?.closest(".card--secret .card__title")?.closest(".card")?.dataset.cardId === card?.id;

      if (card?.type === "secret" && interaction.startedOnSecretTitle && movedDistance < 4 && clickedSameSecretTitle) {
        state.activeInteraction = null;
        state.dropTargetBoardId = null;
        state.exitHintBoardId = null;
        saveStoredState();
        render();
        copySecretCard(card)
          .then(() => showToast(`Copied: ${card.title || "Untitled"}`))
          .catch((error) => console.warn("Failed to copy secret.", error));
        return;
      }

      if (card && isDroppedPastParentBoardLeftEdge(card, event)) {
        transferCardToDashboard(card, event);
      } else {
        const board = card ? boardAtPoint(event, card.id) : null;
        if (card && board) transferCardToBoard(card, board, event);
      }
    }

    saveStoredState();
    state.activeInteraction = null;
    state.dropTargetBoardId = null;
    state.exitHintBoardId = null;
    render();
  }

  function toggleBoardCollapse(cardId) {
    if (state.collapsedBoardIds.has(cardId)) {
      state.collapsedBoardIds.delete(cardId);
    } else {
      state.collapsedBoardIds.add(cardId);
    }
    saveStoredState();
    render();
  }

  function toggleBoardCardCollapse(cardId) {
    if (state.collapsedBoardCardIds.has(cardId)) {
      state.collapsedBoardCardIds.delete(cardId);
    } else {
      state.collapsedBoardCardIds.add(cardId);
    }
    saveStoredState();
    render();
  }

  function cardTreeExportData(cardId) {
    const ids = descendantIds(cardId);
    ids.add(cardId);

    return {
      type: PARTIAL_EXPORT_TYPE,
      rootId: cardId,
      cards: state.cards.filter((card) => ids.has(card.id)),
      collapsedBoardIds: [...state.collapsedBoardIds].filter((id) => ids.has(id)),
      collapsedBoardCardIds: [...state.collapsedBoardCardIds].filter((id) => ids.has(id)),
    };
  }

  async function exportPartialCard(cardId) {
    const card = state.cards.find((item) => item.id === cardId);
    if (!card) return;

    try {
      await copyText(JSON.stringify(cardTreeExportData(card.id)));
      showToast("Card exported to clipboard");
    } catch {
      showToast("Export failed");
    }
  }

  function importedNumber(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function normalizeImportedCard(card, id, parentId, position = null) {
    const type = VALID_CARD_TYPES.has(card.type) ? card.type : "text";

    return {
      id,
      parentId,
      type,
      title: typeof card.title === "string" && card.title.trim() ? card.title : "Untitled",
      content: type === "text" && typeof card.content === "string" ? card.content : "",
      url: type === "link" && typeof card.url === "string" ? card.url : "",
      secret: type === "secret" && typeof card.secret === "string" ? card.secret : "",
      isMutable: typeof card.isMutable === "boolean" ? card.isMutable : true,
      x: position?.x ?? importedNumber(card.x, 0),
      y: position?.y ?? importedNumber(card.y, 0),
      width: Math.max(MIN_CARD_WIDTH_UNITS, importedNumber(card.width, DEFAULT_CARD_WIDTH_UNITS)),
      height: Math.max(MIN_CARD_HEIGHT_UNITS, importedNumber(card.height, DEFAULT_CARD_HEIGHT_UNITS)),
    };
  }

  function importPartialData(data) {
    if (data?.type !== PARTIAL_EXPORT_TYPE || !Array.isArray(data.cards) || typeof data.rootId !== "string") {
      throw new Error("Invalid partial export data");
    }

    const sourceCards = data.cards.filter((card) => typeof card?.id === "string");
    const sourceIds = new Set(sourceCards.map((card) => card.id));
    const rootSource = sourceCards.find((card) => card.id === data.rootId);
    if (!rootSource) throw new Error("Missing root card");

    const idMap = new Map(sourceCards.map((card) => [card.id, crypto.randomUUID()]));
    const rootPreview = normalizeImportedCard(rootSource, idMap.get(rootSource.id), null);
    const rootPosition = findEmptyCardPosition(rootPreview.width, rootPreview.height);
    const importedCards = sourceCards.map((card) => {
      const parentId = card.id === data.rootId || !sourceIds.has(card.parentId) ? null : idMap.get(card.parentId);
      const position = card.id === data.rootId ? rootPosition : null;
      const importedCard = normalizeImportedCard(card, idMap.get(card.id), parentId, position);
      return clampDashboardCard(importedCard);
    });

    state.cards.push(...importedCards);
    state.selectedId = idMap.get(data.rootId);

    if (Array.isArray(data.collapsedBoardIds)) {
      data.collapsedBoardIds.forEach((id) => {
        if (idMap.has(id)) state.collapsedBoardIds.add(idMap.get(id));
      });
    }

    if (Array.isArray(data.collapsedBoardCardIds)) {
      data.collapsedBoardCardIds.forEach((id) => {
        if (idMap.has(id)) state.collapsedBoardCardIds.add(idMap.get(id));
      });
    }
  }

  async function exportDashboard() {
    const data = JSON.stringify({
      cards: state.cards,
      selectedId: state.selectedId,
      collapsedBoardIds: [...state.collapsedBoardIds],
      collapsedBoardCardIds: [...state.collapsedBoardCardIds],
      pan: state.pan,
      zoom: state.zoom,
    });

    try {
      await copyText(data);
      showToast("Exported to clipboard");
    } catch {
      showToast("Export failed");
    }
  }

  function confirmImport() {
    const text = importContentInput.value.trim();
    if (!text) {
      showToast("Import failed: empty content");
      return;
    }

    try {
      const data = JSON.parse(text);
      if (data?.type === PARTIAL_EXPORT_TYPE) {
        importPartialData(data);
      } else {
        if (typeof data !== "object" || data === null) throw new Error("Invalid data");
        importStateData(data);
      }
      saveStoredState();
      state.importModalOpen = false;
      state.importContent = "";
      render();
      showToast(data?.type === PARTIAL_EXPORT_TYPE ? "Imported card" : "Imported dashboard");
    } catch {
      showToast("Import failed: invalid data");
    }
  }

  function openCardContextMenu(event, cardId) {
    if (!state.cards.some((card) => card.id === cardId)) return;

    event.preventDefault();
    event.stopPropagation();
    state.selectedId = cardId;
    state.contextMenu = {
      cardId,
      x: event.clientX,
      y: event.clientY,
    };
    saveStoredState();
    render();
  }

  function showCardHeaderContextMenu(event) {
    const header = event.target.closest(".card__header");
    const cardElement = header?.closest(".card");
    if (!cardElement) return;

    openCardContextMenu(event, cardElement.dataset.cardId);
  }

  function showCardListContextMenu(event) {
    const item = event.target.closest(".card-list__item");
    if (!item) return;

    openCardContextMenu(event, item.dataset.cardId);
  }

  function handleContextMenuClick(event) {
    const button = event.target.closest("[data-action]");
    const cardId = state.contextMenu?.cardId;
    const card = cardId ? state.cards.find((item) => item.id === cardId) : null;
    if (!button || !card || button.disabled) return;

    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    hideContextMenu(false);

    if (action === "edit") {
      if (card.isMutable) openEditConfig(card.id);
      return;
    }

    if (action === "remove") {
      if (card.isMutable) removeCard(card.id);
      return;
    }

    if (action === "toggle-mutability") {
      toggleCardMutability(card);
      return;
    }

    if (action === "export-partial") {
      render();
      exportPartialCard(card.id).catch((error) => console.warn("Failed to export card.", error));
    }
  }

  function attachEventHandlers() {
    dashboard.addEventListener("pointerdown", startDashboardPan);
    dashboard.addEventListener("wheel", handleDashboardWheel, { passive: false });
    cardLayer.addEventListener("pointerdown", startCardInteraction);
    cardLayer.addEventListener("contextmenu", showCardHeaderContextMenu);
    cardContextMenu.addEventListener("click", handleContextMenuClick);
    window.addEventListener("pointermove", moveInteraction);
    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);

    addCardButton.addEventListener("click", openCreateConfig);
    closeConfigButton.addEventListener("click", closeConfig);
    cancelConfigButton.addEventListener("click", closeConfig);
    saveConfigButton.addEventListener("click", saveConfig);
    zoomInButton.addEventListener("click", () => setZoom(state.zoom + ZOOM_STEP));
    zoomOutButton.addEventListener("click", () => setZoom(state.zoom - ZOOM_STEP));
    exportButton.addEventListener("click", exportDashboard);
    importButton.addEventListener("click", openImportModal);
    closeImportButton.addEventListener("click", closeImportModal);
    cancelImportButton.addEventListener("click", closeImportModal);
    confirmImportButton.addEventListener("click", confirmImport);
    importContentInput.addEventListener("input", () => {
      state.importContent = importContentInput.value;
    });

    typeInput.addEventListener("input", () => {
      syncDraftFromInputs();
      renderConfigModal();
    });
    titleInput.addEventListener("input", syncDraftFromInputs);
    contentInput.addEventListener("input", syncDraftFromInputs);
    urlInput.addEventListener("input", syncDraftFromInputs);
    secretInput.addEventListener("input", syncDraftFromInputs);
    widthInput.addEventListener("input", syncDraftFromInputs);
    heightInput.addEventListener("input", syncDraftFromInputs);

    cardList.addEventListener("click", (event) => {
      const item = event.target.closest(".card-list__item");
      if (!item) return;

      if (event.target.closest('[data-action="toggle-collapse"]')) {
        toggleBoardCollapse(item.dataset.cardId);
        return;
      }

      state.selectedId = item.dataset.cardId;
      saveStoredState();
      render();
    });
    cardList.addEventListener("contextmenu", showCardListContextMenu);

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideContextMenu(false);
        closeConfig();
        closeImportModal();
      }
    });
    window.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".card-context-menu")) hideContextMenu();
    });
    window.addEventListener("resize", applyPan);
  }

  app.interactions = {
    attachEventHandlers,
  };
})(window.UtilPage ??= {});
