(function initInteractions(app) {
  const {
    BOARD_CONTENT_HEIGHT_UNITS,
    BOARD_CONTENT_WIDTH_UNITS,
    CARD_LAYER_OFFSET,
    GRID_SIZE,
    MIN_CARD_HEIGHT_UNITS,
    MIN_CARD_WIDTH_UNITS,
    VALID_COLOR_THEMES,
    VALID_CARD_TYPES,
    ZOOM_MAX,
    ZOOM_MIN,
    ZOOM_STEP,
  } = app.constants;
  const {
    addCardButton,
    cancelConfigButton,
    cancelImportButton,
    cardConfigModal,
    cardContextMenu,
    cardLayer,
    cardList,
    cardSearchInput,
    clearSearchButton,
    closeConfigButton,
    closeImportButton,
    colorThemeInput,
    confirmImportButton,
    dashboard,
    exportButton,
    gridToggleButton,
    heightInput,
    imagePathInput,
    importContentInput,
    importButton,
    localLinkModeInput,
    localPathInput,
    miniMap,
    miniMapToggleButton,
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
  const { defaultColorTheme, normalizeCardData } = app.cardSchema;
  const { copySecretCard, copyText } = app.clipboard;
  const { saveStoredState, importStateData } = app.storage;
  const { render, renderConfigModal, applyPan, clampPan } = app.rendering;
  const {
    clampDashboardCard,
    clampBoardChildCard,
    defaultDraft,
    descendantIds,
    findEmptyCardPosition,
    normalizeDraft,
    removeCardTree,
    selectedCard,
    snap,
    syncDraftFromInputs,
  } = app.cardModel;
  const { searchCards } = app.searchModel;
  const PARTIAL_EXPORT_TYPE = "utilpage.partial-card.v1";
  const SEARCH_DEBOUNCE_MS = 500;
  let searchTimerId = null;
  let miniMapHoverRect = null;

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

  function applyCardSearch({ shouldRender = true } = {}) {
    const query = state.searchText.trim();
    if (query.length <= 1) {
      state.searchResultIds = null;
      state.searchResultFields = new Map();
      if (shouldRender) render();
      return;
    }

    const results = searchCards(state.cards, query);

    state.searchResultIds = new Set(results.map((result) => result.card.id));
    state.searchResultFields = new Map(results.map((result) => [result.card.id, result.fields]));
    if (shouldRender) render();
  }

  function scheduleCardSearch() {
    window.clearTimeout(searchTimerId);
    if (state.searchText.trim().length <= 1) {
      state.searchResultIds = null;
      state.searchResultFields = new Map();
      render();
      return;
    }
    render();
    searchTimerId = window.setTimeout(applyCardSearch, SEARCH_DEBOUNCE_MS);
  }

  function clearCardSearch() {
    window.clearTimeout(searchTimerId);
    state.searchText = "";
    state.searchResultIds = null;
    state.searchResultFields = new Map();
    render();
    cardSearchInput.focus();
  }

  function refreshCardSearchIfActive({ shouldRender = false } = {}) {
    if (state.searchText.trim().length > 1) {
      applyCardSearch({ shouldRender });
    }
  }

  function cardElementFor(cardId) {
    return [...cardLayer.querySelectorAll(".card")].find((element) => element.dataset.cardId === cardId) ?? null;
  }

  function cardAncestors(card) {
    const ancestors = [];
    let parentId = card?.parentId ?? null;

    while (parentId) {
      const parent = state.cards.find((item) => item.id === parentId);
      if (!parent) break;
      ancestors.unshift(parent);
      parentId = parent.parentId;
    }

    return ancestors;
  }

  function panBoardToCard(board, card) {
    const boardBody = boardBodyFor(board.id);
    const rect = boardBody?.getBoundingClientRect();
    if (!rect) return false;

    const marginUnits = 2;
    const viewportWidthUnits = rect.width / (GRID_SIZE * state.zoom);
    const viewportHeightUnits = rect.height / (GRID_SIZE * state.zoom);
    const previousPanX = board.boardPanX ?? 0;
    const previousPanY = board.boardPanY ?? 0;
    let nextPanX = previousPanX;
    let nextPanY = previousPanY;

    if (card.x < nextPanX + marginUnits) {
      nextPanX = card.x - marginUnits;
    } else if (card.x + card.width > nextPanX + viewportWidthUnits - marginUnits) {
      nextPanX = card.x + card.width - viewportWidthUnits + marginUnits;
    }

    if (card.y < nextPanY + marginUnits) {
      nextPanY = card.y - marginUnits;
    } else if (card.y + card.height > nextPanY + viewportHeightUnits - marginUnits) {
      nextPanY = card.y + card.height - viewportHeightUnits + marginUnits;
    }

    board.boardPanX = nextPanX;
    board.boardPanY = nextPanY;
    clampBoardPan(board, boardBody);
    return board.boardPanX !== previousPanX || board.boardPanY !== previousPanY;
  }

  function revealCardInView(cardId) {
    const card = state.cards.find((item) => item.id === cardId);
    if (!card) return;

    let didExpandAncestor = false;
    const ancestors = cardAncestors(card);
    ancestors.forEach((ancestor) => {
      if (ancestor.type !== "board" || !state.collapsedBoardCardIds.has(ancestor.id)) return;
      state.collapsedBoardCardIds.delete(ancestor.id);
      didExpandAncestor = true;
    });

    render();

    let didPanBoard = false;
    ancestors.forEach((ancestor, index) => {
      const child = ancestors[index + 1] ?? card;
      didPanBoard = panBoardToCard(ancestor, child) || didPanBoard;
    });

    if (didPanBoard) render();

    const element = cardElementFor(card.id);
    const rect = element?.getBoundingClientRect();
    if (!rect) return;

    const margin = 24;
    let deltaX = 0;
    let deltaY = 0;

    if (rect.left < margin) {
      deltaX = margin - rect.left;
    } else if (rect.right > window.innerWidth - margin) {
      deltaX = window.innerWidth - margin - rect.right;
    }

    if (rect.top < margin) {
      deltaY = margin - rect.top;
    } else if (rect.bottom > window.innerHeight - margin) {
      deltaY = window.innerHeight - margin - rect.bottom;
    }

    if (deltaX === 0 && deltaY === 0) {
      if (didExpandAncestor || didPanBoard) saveStoredState();
      return;
    }

    state.pan.x += deltaX;
    state.pan.y += deltaY;
    clampPan();
    saveStoredState();
    render();
  }

  function updateCardElementFrame(card) {
    const element = cardElementFor(card.id);
    if (!element) {
      render();
      return;
    }

    const offset = card.parentId === null ? CARD_LAYER_OFFSET : 0;
    element.style.left = `${offset + card.x * GRID_SIZE}px`;
    element.style.top = `${offset + card.y * GRID_SIZE}px`;
    element.style.width = `${card.width * GRID_SIZE}px`;
    element.style.height = `${card.height * GRID_SIZE}px`;
  }

  function showToast(message, { shouldRender = true } = {}) {
    state.toastMessage = message;
    if (shouldRender) render();

    window.setTimeout(() => {
      if (state.toastMessage !== message) return;
      state.toastMessage = "";
      render();
    }, 1200);
  }

  function clampZoom(zoom) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  }

  function showZoomToast(options) {
    showToast(`Zoom ${Math.round(state.zoom * 100)}%`, options);
  }

  function toggleGridVisibility() {
    state.showGrid = !state.showGrid;
    saveStoredState();
    render();
  }

  function toggleMiniMapVisibility() {
    state.showMiniMap = !state.showMiniMap;
    miniMap.classList.remove("is-hover-hidden");
    miniMapHoverRect = null;
    saveStoredState();
    render();
  }

  function hideMiniMapWhileHovered() {
    if (!state.showMiniMap) return;
    miniMapHoverRect = miniMap.getBoundingClientRect();
    miniMap.classList.add("is-hover-hidden");
  }

  function restoreMiniMapAfterHover(event) {
    if (!miniMapHoverRect || !miniMap.classList.contains("is-hover-hidden")) return;

    const margin = 1;
    const isOutside =
      event.clientX < miniMapHoverRect.left - margin ||
      event.clientX > miniMapHoverRect.right + margin ||
      event.clientY < miniMapHoverRect.top - margin ||
      event.clientY > miniMapHoverRect.bottom + margin;

    if (!isOutside) return;
    miniMapHoverRect = null;
    miniMap.classList.remove("is-hover-hidden");
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
    showZoomToast({ shouldRender: false });
    render();
  }

  function openCreateConfig(type = "text", target = null) {
    const cardType = VALID_CARD_TYPES.has(type) ? type : "text";
    state.configMode = "create";
    state.draft = defaultDraft();
    state.draft.type = cardType;
    state.draft.colorTheme = defaultColorTheme(cardType);
    state.createTarget = target
      ? {
          parentId: typeof target.parentId === "string" ? target.parentId : null,
          preferredPosition: target.preferredPosition
            ? {
                x: Number(target.preferredPosition.x) || 0,
                y: Number(target.preferredPosition.y) || 0,
              }
            : null,
        }
      : null;
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
      colorTheme: VALID_COLOR_THEMES.has(card.colorTheme) ? card.colorTheme : defaultColorTheme(card.type),
      content: card.content,
      url: card.url ?? "",
      localPath: card.localPath ?? "",
      localLinkMode: card.localLinkMode === "text" ? "text" : "app",
      imagePath: card.imagePath ?? "",
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
    state.createTarget = null;
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
      const target = state.createTarget ?? {};
      const parentId = target.parentId ?? null;
      const position = findEmptyCardPosition(draft.width, draft.height, parentId, target.preferredPosition ?? null);
      const card = {
        id: crypto.randomUUID(),
        parentId,
        isMutable: true,
        ...draft,
        x: parentId ? Math.max(0, position.x) : position.x,
        y: parentId ? Math.max(0, position.y) : position.y,
      };
      if (parentId === null) clampDashboardCard(card);
      if (parentId !== null) clampBoardChildCard(card);
      state.cards.push(card);
      state.selectedId = card.id;
      saveStoredState();
      refreshCardSearchIfActive();
    }

    if (state.configMode === "edit") {
      const card = selectedCard();
      if (!card) return;
      Object.assign(card, draft);
      if (card.parentId) {
        clampBoardChildCard(card);
      } else {
        clampDashboardCard(card);
      }
      if (card.type === "board") clampBoardPan(card);
      saveStoredState();
      refreshCardSearchIfActive();
    }

    closeConfig();
  }

  function removeCard(cardId) {
    const card = state.cards.find((item) => item.id === cardId);
    if (card?.type === "board" && !window.confirm(`Remove board "${card.title || "Untitled"}" and all child cards?`)) {
      return;
    }

    const result = removeCardTree(cardId);
    if (!result.removed) return;

    saveStoredState();
    refreshCardSearchIfActive();

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

  function boardBodyFor(boardId) {
    const boardLayer = boardLayerFor(boardId);
    return boardLayer?.closest(".card__body--board") ?? null;
  }

  function clampBoardPan(board, boardBody = boardBodyFor(board.id)) {
    const rect = boardBody?.getBoundingClientRect();
    const viewportWidthUnits = rect ? rect.width / (GRID_SIZE * state.zoom) : 0;
    const viewportHeightUnits = rect ? rect.height / (GRID_SIZE * state.zoom) : 0;

    board.boardPanX = Math.min(Math.max(0, BOARD_CONTENT_WIDTH_UNITS - viewportWidthUnits), Math.max(0, board.boardPanX ?? 0));
    board.boardPanY = Math.min(Math.max(0, BOARD_CONTENT_HEIGHT_UNITS - viewportHeightUnits), Math.max(0, board.boardPanY ?? 0));
  }

  function updateBoardLayerPan(board) {
    const boardLayer = boardLayerFor(board.id);
    const boardBody = boardBodyFor(board.id);
    if (!boardLayer) {
      render();
      return;
    }

    boardLayer.style.transform = `translate(${-board.boardPanX * GRID_SIZE}px, ${-board.boardPanY * GRID_SIZE}px)`;
    if (boardBody) {
      boardBody.style.backgroundPosition = `${-board.boardPanX * GRID_SIZE}px ${-board.boardPanY * GRID_SIZE}px`;
    }
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

    return [...document.querySelectorAll(".card__body--board")]
      .map((body) => {
        const boardId = body.querySelector(".board-layer")?.dataset.boardId;
        const board = state.cards.find((card) => card.id === boardId && card.type === "board");
        const rect = body.getBoundingClientRect();
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

  function transferCardToBoard(card, board, event, interaction) {
    if (!board || card.parentId === board.id) return;

    const dropPoint = pointerToBoardUnits(event, board.id);

    card.parentId = board.id;
    card.x = dropPoint.x - (interaction?.grabOffsetX ?? Math.round(card.width / 2));
    card.y = dropPoint.y - (interaction?.grabOffsetY ?? Math.round(card.height / 2));
    clampBoardChildCard(card);
  }

  function isDroppedPastParentBoardLeftEdge(card, event) {
    if (!card.parentId) return false;

    const boardBody = boardBodyFor(card.parentId);
    const rect = boardBody?.getBoundingClientRect();
    return Boolean(rect && event.clientX < rect.left);
  }

  function transferCardToDashboard(card, event, interaction) {
    const dashboardPoint = pointerToBoardUnits(event);

    card.parentId = null;
    card.x = dashboardPoint.x - (interaction?.grabOffsetX ?? Math.round(card.width / 2));
    card.y = dashboardPoint.y - (interaction?.grabOffsetY ?? Math.round(card.height / 2));
    clampDashboardCard(card);
  }

  function isPointerInsideBoard(boardId, event) {
    const boardBody = boardBodyFor(boardId);
    const rect = boardBody?.getBoundingClientRect();

    return Boolean(
      rect &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom,
    );
  }

  function updateDropTarget(event, card) {
    const previousDropTargetBoardId = state.dropTargetBoardId;
    const previousExitHintBoardId = state.exitHintBoardId;

    if (!card || state.activeInteraction?.type !== "move") {
      state.dropTargetBoardId = null;
      state.exitHintBoardId = null;
      return previousDropTargetBoardId !== state.dropTargetBoardId || previousExitHintBoardId !== state.exitHintBoardId;
    }

    if (card.parentId && isPointerInsideBoard(card.parentId, event)) {
      state.dropTargetBoardId = null;
      state.exitHintBoardId = card.parentId;
      return previousDropTargetBoardId !== state.dropTargetBoardId || previousExitHintBoardId !== state.exitHintBoardId;
    }

    const board = boardAtPoint(event, card.id);
    const nextBoardId = board?.id === card.parentId ? null : (board?.id ?? null);
    state.dropTargetBoardId = nextBoardId;
    state.exitHintBoardId = null;
    return previousDropTargetBoardId !== state.dropTargetBoardId || previousExitHintBoardId !== state.exitHintBoardId;
  }

  function startDashboardPan(event) {
    if (event.button !== 0 || event.target.closest(".card, .util-modal, .config-modal, .card-context-menu")) return;
    state.selectedId = null;
    hideContextMenu(false);
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

  function startBoardPan(event, board, boardBody) {
    event.preventDefault();
    event.stopPropagation();
    clampBoardPan(board, boardBody);
    state.activeInteraction = {
      type: "board-pan",
      pointerId: event.pointerId,
      boardId: board.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBoardPanX: board.boardPanX ?? 0,
      startBoardPanY: board.boardPanY ?? 0,
    };
    boardBody.classList.add("is-panning");
    boardBody.setPointerCapture(event.pointerId);
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

    if (card.type === "board" && bodyElement?.closest(".card") === cardElement) {
      startBoardPan(event, card, bodyElement);
      return;
    }

    if (event.target.closest(".card--local-link .card__title-link")) {
      state.activeInteraction = null;
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
      grabOffsetX: boardPoint.x - card.x,
      grabOffsetY: boardPoint.y - card.y,
      startX: card.x,
      startY: card.y,
      startWidth: card.width,
      startHeight: card.height,
      resizeAxis: actionTarget?.dataset.resizeAxis ?? "both",
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

    if (interaction.type === "board-pan") {
      const board = state.cards.find((item) => item.id === interaction.boardId && item.type === "board");
      if (!board) return;

      board.boardPanX = interaction.startBoardPanX - (event.clientX - interaction.startClientX) / (GRID_SIZE * state.zoom);
      board.boardPanY = interaction.startBoardPanY - (event.clientY - interaction.startClientY) / (GRID_SIZE * state.zoom);
      clampBoardPan(board);
      updateBoardLayerPan(board);
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
        clampBoardChildCard(card);
      } else {
        clampDashboardCard(card);
      }

      const dropTargetChanged = updateDropTarget(event, card);
      if (dropTargetChanged) {
        render();
        return;
      }
    }

    if (interaction.type === "resize") {
      card.width = Math.max(MIN_CARD_WIDTH_UNITS, interaction.startWidth + deltaX);
      if (interaction.resizeAxis !== "x") {
        card.height = Math.max(MIN_CARD_HEIGHT_UNITS, interaction.startHeight + deltaY);
      }
      if (card.parentId) {
        clampBoardChildCard(card);
      } else {
        clampDashboardCard(card);
      }
    }

    updateCardElementFrame(card);
    if (interaction.type === "resize" && card.type === "board") {
      clampBoardPan(card);
      updateBoardLayerPan(card);
    }
  }

  function endInteraction(event) {
    const interaction = state.activeInteraction;
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    dashboard.classList.remove("is-panning");

    if (interaction.type === "board-pan") {
      boardBodyFor(interaction.boardId)?.classList.remove("is-panning");
      saveStoredState();
      state.activeInteraction = null;
      render();
      return;
    }

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
        transferCardToDashboard(card, event, interaction);
      } else {
        const board = card ? boardAtPoint(event, card.id) : null;
        if (card && board) transferCardToBoard(card, board, event, interaction);
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

  function normalizeImportedCard(card, id, parentId, position = null) {
    return normalizeCardData(card, { id, parentId, position });
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
      return parentId ? clampBoardChildCard(importedCard) : clampDashboardCard(importedCard);
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

  function importTextData(text, { closeModalOnSuccess = false } = {}) {
    const trimmedText = text.trim();
    if (!trimmedText) {
      showToast("Import failed: empty content");
      return false;
    }

    try {
      const data = JSON.parse(trimmedText);
      if (data?.type === PARTIAL_EXPORT_TYPE) {
        importPartialData(data);
      } else {
        if (typeof data !== "object" || data === null) throw new Error("Invalid data");
        importStateData(data);
      }
      saveStoredState();
      refreshCardSearchIfActive();
      if (closeModalOnSuccess) {
        state.importModalOpen = false;
        state.importContent = "";
      }
      showToast(data?.type === PARTIAL_EXPORT_TYPE ? "Imported card" : "Imported dashboard", { shouldRender: false });
      render();
      return true;
    } catch {
      showToast("Import failed: invalid data");
      return false;
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
      showGrid: state.showGrid,
      showMiniMap: state.showMiniMap,
    });

    try {
      await copyText(data);
      showToast("Exported to clipboard");
    } catch {
      showToast("Export failed");
    }
  }

  function confirmImport() {
    importTextData(importContentInput.value, { closeModalOnSuccess: true });
  }

  function openCreateContextMenu(event, parentId = null) {
    event.preventDefault();
    event.stopPropagation();
    hideContextMenu(false);

    const preferredPosition = pointerToBoardUnits(event, parentId);
    state.contextMenu = {
      mode: "create",
      parentId,
      preferredPosition,
      x: event.clientX,
      y: event.clientY,
    };
    if (parentId) state.selectedId = parentId;
    render();
  }

  function openCardContextMenu(event, cardId) {
    if (!state.cards.some((card) => card.id === cardId)) return;

    event.preventDefault();
    event.stopPropagation();
    state.selectedId = cardId;
    state.contextMenu = {
      mode: "card",
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

  function showImageContextMenu(event) {
    const image = event.target.closest(".card__image");
    const cardElement = image?.closest(".card");
    if (!image || !cardElement) return;

    const card = state.cards.find((item) => item.id === cardElement.dataset.cardId && item.type === "image");
    if (!card || !card.imagePath) return;

    event.preventDefault();
    event.stopPropagation();
    state.selectedId = card.id;
    state.contextMenu = {
      mode: "image",
      cardId: card.id,
      imagePath: card.imagePath,
      x: event.clientX,
      y: event.clientY,
    };
    render();
  }

  function showCreateContextMenu(event) {
    if (event.target.closest(".util-modal, .config-modal, .card-context-menu, .card__header")) return;

    const boardBody = event.target.closest(".card__body--board");
    if (boardBody) {
      const boardCardElement = boardBody.closest(".card");
      const clickedCardElement = event.target.closest(".card");
      const board = state.cards.find((card) => card.id === boardCardElement?.dataset.cardId && card.type === "board");
      if (board && clickedCardElement === boardCardElement) {
        openCreateContextMenu(event, board.id);
      }
      return;
    }

    if (event.target.closest(".card")) return;

    openCreateContextMenu(event);
  }

  function handleContextMenuClick(event) {
    const button = event.target.closest("[data-action]");
    const menuState = state.contextMenu;
    const cardId = menuState?.mode === "card" ? menuState.cardId : null;
    const card = cardId ? state.cards.find((item) => item.id === cardId) : null;
    if (!button || button.disabled) return;

    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.action;
    hideContextMenu(false);

    if (action === "add-card") {
      openCreateConfig(button.dataset.cardType, {
        parentId: menuState?.parentId ?? null,
        preferredPosition: menuState?.preferredPosition ?? null,
      });
      return;
    }

    if (action === "copy-image-path") {
      copyText(menuState?.imagePath ?? "")
        .then(() => showToast("Image path copied"))
        .catch((error) => console.warn("Failed to copy image path.", error));
      return;
    }

    if (!card) return;

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

  function handleConfigKeyDown(event) {
    if (event.key !== "Enter" || event.isComposing || !state.configMode) return;
    if (event.target.closest("textarea")) return;

    event.preventDefault();
    saveConfig();
  }

  function editablePlainText(element) {
    return element.innerText.replace(/\r\n/g, "\n").replace(/\n$/, "");
  }

  function syncEditableTextCard(event) {
    const body = event.target.closest(".card__body");
    const cardElement = body?.closest(".card");
    if (!body || !cardElement) return;

    const card = state.cards.find((item) => item.id === cardElement.dataset.cardId);
    if (!card || card.type !== "text" || !card.isMutable) return;

    card.content = editablePlainText(body);
    if (state.configMode === "edit" && state.selectedId === card.id && state.draft) {
      state.draft.content = card.content;
      contentInput.value = card.content;
    }
    saveStoredState();
    refreshCardSearchIfActive({ shouldRender: event.type === "blur" });
  }

  function isTypingTarget(target) {
    return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
  }

  async function importClipboardContent() {
    if (!navigator.clipboard?.readText) {
      showToast("Import failed: clipboard unavailable");
      return;
    }

    try {
      importTextData(await navigator.clipboard.readText());
    } catch {
      showToast("Import failed: clipboard access denied");
    }
  }

  function handleGlobalShortcuts(event) {
    if (isTypingTarget(event.target)) return;

    const card = selectedCard();
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === "c" && card) {
      event.preventDefault();
      exportPartialCard(card.id).catch((error) => console.warn("Failed to export card.", error));
      return;
    }

    if (event.key === "Delete" && card?.isMutable) {
      event.preventDefault();
      removeCard(card.id);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && key === "v" && !card) {
      event.preventDefault();
      importClipboardContent();
    }
  }

  function attachEventHandlers() {
    dashboard.addEventListener("pointerdown", startDashboardPan);
    dashboard.addEventListener("contextmenu", showCreateContextMenu);
    dashboard.addEventListener("wheel", handleDashboardWheel, { passive: false });
    cardLayer.addEventListener("pointerdown", startCardInteraction);
    cardLayer.addEventListener("input", syncEditableTextCard);
    cardLayer.addEventListener("blur", syncEditableTextCard, true);
    cardLayer.addEventListener("contextmenu", showImageContextMenu);
    cardLayer.addEventListener("contextmenu", showCardHeaderContextMenu);
    cardContextMenu.addEventListener("click", handleContextMenuClick);
    window.addEventListener("pointermove", moveInteraction);
    window.addEventListener("pointermove", restoreMiniMapAfterHover);
    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);

    addCardButton.addEventListener("click", () => openCreateConfig());
    closeConfigButton.addEventListener("click", closeConfig);
    cancelConfigButton.addEventListener("click", closeConfig);
    saveConfigButton.addEventListener("click", saveConfig);
    cardConfigModal.addEventListener("keydown", handleConfigKeyDown);
    gridToggleButton.addEventListener("click", toggleGridVisibility);
    miniMapToggleButton.addEventListener("click", toggleMiniMapVisibility);
    miniMap.addEventListener("mouseenter", hideMiniMapWhileHovered);
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
    cardSearchInput.addEventListener("input", () => {
      state.searchText = cardSearchInput.value;
      scheduleCardSearch();
    });
    clearSearchButton.addEventListener("click", clearCardSearch);

    typeInput.addEventListener("input", () => {
      syncDraftFromInputs();
      renderConfigModal();
    });
    colorThemeInput.addEventListener("input", syncDraftFromInputs);
    titleInput.addEventListener("input", syncDraftFromInputs);
    contentInput.addEventListener("input", syncDraftFromInputs);
    urlInput.addEventListener("input", syncDraftFromInputs);
    localPathInput.addEventListener("input", syncDraftFromInputs);
    localLinkModeInput.addEventListener("input", syncDraftFromInputs);
    imagePathInput.addEventListener("input", syncDraftFromInputs);
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
      revealCardInView(item.dataset.cardId);
    });
    cardList.addEventListener("contextmenu", showCardListContextMenu);

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideContextMenu(false);
        closeConfig();
        closeImportModal();
      }
    });
    window.addEventListener("keydown", handleGlobalShortcuts);
    window.addEventListener("pointerdown", (event) => {
      if (!event.target.closest(".card-context-menu")) hideContextMenu();
    });
    window.addEventListener("resize", applyPan);
  }

  app.interactions = {
    attachEventHandlers,
  };
})(window.UtilPage ??= {});
