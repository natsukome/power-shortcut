(function initInteractions(app) {
  const { GRID_SIZE, MIN_CARD_HEIGHT_UNITS, MIN_CARD_WIDTH_UNITS, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } = app.constants;
  const {
    addCardButton,
    cancelConfigButton,
    cardLayer,
    cardList,
    closeConfigButton,
    dashboard,
    heightInput,
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
  const { saveStoredState } = app.storage;
  const { render, renderConfigModal, applyPan } = app.rendering;
  const {
    defaultDraft,
    descendantIds,
    findEmptyCardPosition,
    normalizeDraft,
    removeCardTree,
    selectedCard,
    snap,
    syncDraftFromInputs,
  } = app.cardModel;

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

  async function copySecretCard(card) {
    const secret = card.secret ?? "";
    if (!secret) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(secret);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = secret;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
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
    const result = removeCardTree(cardId);
    if (!result.removed) return;

    saveStoredState();

    if (state.configMode === "edit" && !result.removedIds.has(state.selectedId)) {
      closeConfig();
      return;
    }

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
    if (event.button !== 0 || event.target.closest(".card, .util-modal, .config-modal")) return;
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
      card.isMutable = !card.isMutable;
      saveStoredState();
      render();
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
      }

      updateDropTarget(event, card);
    }

    if (interaction.type === "resize") {
      card.width = Math.max(MIN_CARD_WIDTH_UNITS, interaction.startWidth + deltaX);
      card.height = Math.max(MIN_CARD_HEIGHT_UNITS, interaction.startHeight + deltaY);
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

  function attachEventHandlers() {
    dashboard.addEventListener("pointerdown", startDashboardPan);
    dashboard.addEventListener("wheel", handleDashboardWheel, { passive: false });
    cardLayer.addEventListener("pointerdown", startCardInteraction);
    window.addEventListener("pointermove", moveInteraction);
    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);

    addCardButton.addEventListener("click", openCreateConfig);
    closeConfigButton.addEventListener("click", closeConfig);
    cancelConfigButton.addEventListener("click", closeConfig);
    saveConfigButton.addEventListener("click", saveConfig);
    zoomInButton.addEventListener("click", () => setZoom(state.zoom + ZOOM_STEP));
    zoomOutButton.addEventListener("click", () => setZoom(state.zoom - ZOOM_STEP));

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

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeConfig();
    });
    window.addEventListener("resize", applyPan);
  }

  app.interactions = {
    attachEventHandlers,
  };
})(window.UtilPage ??= {});
