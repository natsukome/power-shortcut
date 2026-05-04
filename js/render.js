(function initRender(app) {
  const { CARD_LAYER_OFFSET, DASHBOARD_HEIGHT_UNITS, DASHBOARD_WIDTH_UNITS, GRID_SIZE } = app.constants;
  const {
    cardConfigModal,
    cardContextMenu,
    cardCount,
    cardLayer,
    cardList,
    cardSearchInput,
    clearSearchButton,
    colorThemeField,
    colorThemeInput,
    configCardMeta,
    contentField,
    contentInput,
    dashboardToast,
    gridToggleButton,
    gridLayer,
    heightInput,
    importContentInput,
    importModal,
    imagePathField,
    imagePathInput,
    localLinkModeField,
    localLinkModeInput,
    localPathField,
    localPathInput,
    saveConfigButton,
    secretField,
    secretInput,
    titleInput,
    typeField,
    typeInput,
    urlField,
    urlInput,
    widthInput,
  } = app.dom;
  const { state } = app;
  const ICON_PATHS = {
    edit:
      "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    export:
      "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 18H8V7h11v16z",
    lock:
      "M12 17a2 2 0 0 0 2-2c0-.74-.4-1.38-1-1.72V11h-2v2.28A2 2 0 0 0 12 17zm6-8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V11c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V6z",
    remove: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z",
    typeBoard: "M3 5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5zm2 0v14h14V5H5zm2 2h10v3H7V7zm0 5h4v5H7v-5zm6 0h4v5h-4v-5z",
    typeLink:
      "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4v2H7c-.61 0-1.1.49-1.1 1.1S6.39 13.1 7 13.1h4v2H7c-1.71 0-3.1-1.39-3.1-3.1zm5.1 1h6v-2H9v2zm4-4.1h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4v-2h4c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1h-4v-2z",
    typeLocalLink:
      "M4 4h11c1.1 0 2 .9 2 2v3h-2V6H4v12h11v-3h2v3c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm13.59 5.59L20 12l-2.41 2.41-1.42-1.42.59-.59H9v-2h7.76l-.59-.59 1.42-1.42z",
    typeImage:
      "M5 3h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 2v14h14V5H5zm2 11 3.5-4.5 2.5 3.01 1.75-2.26L18 16H7zm2-6.5A1.5 1.5 0 1 1 9 6a1.5 1.5 0 0 1 0 3.5z",
    typeSecret:
      "M12 2a5 5 0 0 0-5 5v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9zm3 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    typeText: "M4 5h16v2H4V5zm0 4h16v2H4V9zm0 4h10v2H4v-2zm0 4h16v2H4v-2z",
    unlock:
      "M12 17a2 2 0 0 0 2-2c0-.74-.4-1.38-1-1.72V11h-2v2.28A2 2 0 0 0 12 17zm6-8H9V6c0-1.66 1.34-3 3-3s3 1.34 3 3h2c0-2.76-2.24-5-5-5S7 3.24 7 6v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V11c0-1.1-.9-2-2-2z",
    gridVisible: "M3 3h18v18H3V3zm2 2v4h4V5H5zm6 0v4h4V5h-4zm6 0v4h2V5h-2zM5 11v4h4v-4H5zm6 0v4h4v-4h-4zm6 0v4h2v-4h-2zM5 17v2h4v-2H5zm6 0v2h4v-2h-4zm6 0v2h2v-2h-2z",
    gridHidden:
      "M3.28 2 22 20.72 20.72 22l-3-3H3V4.28l-1-1L3.28 2zM5 6.28V9h2.72L5 6.28zM5 11v4h4v-4H5zm0 6v2h4v-2H5zm6 0v2h4.72l-2-2H11zm0-2h.72l-.72-.72V15zm8-10h-2v4h2V5zm-4 0h-4v2.72l2 2H15V5zm4 6h-2v2.72l2 2V11z",
  };

  function clampPan() {
    const dashboardWidth = DASHBOARD_WIDTH_UNITS * GRID_SIZE * state.zoom;
    const dashboardHeight = DASHBOARD_HEIGHT_UNITS * GRID_SIZE * state.zoom;
    const minX = window.innerWidth - dashboardWidth;
    const minY = window.innerHeight - dashboardHeight;

    state.pan.x = dashboardWidth <= window.innerWidth ? (window.innerWidth - dashboardWidth) / 2 : Math.min(0, Math.max(minX, state.pan.x));
    state.pan.y =
      dashboardHeight <= window.innerHeight ? (window.innerHeight - dashboardHeight) / 2 : Math.min(0, Math.max(minY, state.pan.y));
  }

  function applyPan() {
    clampPan();
    gridLayer.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
  }

  function render() {
    applyPan();
    renderGridVisibility();
    renderCards();
    renderSearch();
    renderCardList();
    renderConfigModal();
    renderImportModal();
    renderCardContextMenu();
    renderToast();
  }

  function renderGridVisibility() {
    gridLayer.classList.toggle("is-grid-hidden", !state.showGrid);
    gridToggleButton.title = state.showGrid ? "Hide grid lines" : "Show grid lines";
    gridToggleButton.setAttribute("aria-label", state.showGrid ? "Hide grid lines" : "Show grid lines");
    gridToggleButton.replaceChildren(createIcon(state.showGrid ? ICON_PATHS.gridVisible : ICON_PATHS.gridHidden, "zoom-button__icon"));
  }

  function renderCards() {
    gridLayer.style.width = `${DASHBOARD_WIDTH_UNITS * GRID_SIZE}px`;
    gridLayer.style.height = `${DASHBOARD_HEIGHT_UNITS * GRID_SIZE}px`;
    const dashboardCards = state.cards.filter((card) => card.parentId === null);
    cardLayer.replaceChildren(createDashboardBounds(), ...dashboardCards.map((card) => createCardElement(card, true)));
  }

  function createDashboardBounds() {
    const bounds = document.createElement("div");
    bounds.className = "dashboard-bounds";
    bounds.style.left = `${CARD_LAYER_OFFSET}px`;
    bounds.style.top = `${CARD_LAYER_OFFSET}px`;
    bounds.style.width = `${DASHBOARD_WIDTH_UNITS * GRID_SIZE}px`;
    bounds.style.height = `${DASHBOARD_HEIGHT_UNITS * GRID_SIZE}px`;
    return bounds;
  }

  function createIcon(pathData, className = "card__action-icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    path.setAttribute("d", pathData);
    svg.append(path);
    return svg;
  }

  function cardTypeLabel(card) {
    if (card.type !== "local-link") return card.type;
    return `Link (${card.localLinkMode === "text" ? "Text" : "App"})`;
  }

  function cardTypeIconPath(type) {
    if (type === "board") return ICON_PATHS.typeBoard;
    if (type === "link") return ICON_PATHS.typeLink;
    if (type === "local-link") return ICON_PATHS.typeLocalLink;
    if (type === "image") return ICON_PATHS.typeImage;
    if (type === "secret") return ICON_PATHS.typeSecret;
    return ICON_PATHS.typeText;
  }

  function imageSourcePath(path) {
    const source = (path ?? "").trim();
    if (!source) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith("/") || source.startsWith("./") || source.startsWith("../")) {
      return source;
    }
    if (/^[a-z]:[\\/]/i.test(source)) return encodeURI(`file:///${source.replace(/\\/g, "/")}`);
    if (source.startsWith("\\\\")) return encodeURI(`file:${source.replace(/\\/g, "/")}`);
    return source;
  }

  function localLinkHref(card) {
    const mode = card.localLinkMode === "text" ? "text" : "app";
    const path = encodeURIComponent((card.localPath ?? "").trim());
    return `explorerBridge://open?mode=${mode}&path=${path}`;
  }

  function createCardElement(card, isDashboardCard = false) {
    const element = document.createElement("article");
    const isActiveCard =
      state.activeInteraction?.cardId === card.id &&
      (state.activeInteraction.type === "move" || state.activeInteraction.type === "resize");
    const isBoardCollapsed = card.type === "board" && state.collapsedBoardCardIds.has(card.id);
    const isWidthOnlyResize = card.type === "link" || card.type === "local-link" || card.type === "secret";
    const canResize = card.isMutable;

    element.className = `card card--${card.type} card--theme-${card.colorTheme ?? "slate"}${card.isMutable ? "" : " card--immutable"}${
      isBoardCollapsed ? " is-collapsed" : ""
    }${
      card.id === state.selectedId ? " is-selected" : ""
    }${
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
    if (card.type === "link" && card.url) {
      header.title = card.url;
    } else if (card.type === "local-link" && card.localPath) {
      header.title = card.localPath;
    } else if (card.type === "secret") {
      header.title = "Click title to copy secret";
    }

    const heading = document.createElement("div");
    heading.className = "card__heading";

    const type = document.createElement("div");
    type.className = "card__type";
    type.title = cardTypeLabel(card);
    type.append(createIcon(cardTypeIconPath(card.type), "card__type-icon"));
    if (card.type === "local-link") {
      const mode = document.createElement("span");
      mode.className = "card__type-mode";
      mode.textContent = card.localLinkMode === "text" ? "txt" : "app";
      type.append(mode);
    }

    const title = document.createElement("div");
    title.className = "card__title";
    if (card.type === "local-link") {
      const anchor = document.createElement("a");
      anchor.className = "card__title-link";
      anchor.href = localLinkHref(card);
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = card.title || "Untitled";
      title.append(anchor);
    } else {
      title.textContent = card.title || "Untitled";
    }
    if (card.type === "board") {
      title.dataset.action = "toggle-board-collapse";
      title.title = isBoardCollapsed ? "Expand board" : "Collapse board";
    }

    const actions = document.createElement("div");
    actions.className = "card__actions";

    const mutabilityButton = document.createElement("button");
    mutabilityButton.className = "card__action card__action--icon";
    mutabilityButton.type = "button";
    mutabilityButton.dataset.action = "toggle-mutability";
    mutabilityButton.title = card.isMutable ? "Make immutable" : "Make mutable";
    mutabilityButton.setAttribute("aria-label", card.isMutable ? "Make immutable" : "Make mutable");
    mutabilityButton.append(createIcon(card.isMutable ? ICON_PATHS.unlock : ICON_PATHS.lock));

    const editButton = document.createElement("button");
    editButton.className = "card__action card__action--edit";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.title = "Edit";
    editButton.setAttribute("aria-label", "Edit");
    editButton.append(createIcon(ICON_PATHS.edit));

    const removeButton = document.createElement("button");
    removeButton.className = "card__action card__action--danger";
    removeButton.type = "button";
    removeButton.dataset.action = "remove";
    removeButton.title = "Remove";
    removeButton.setAttribute("aria-label", "Remove");
    removeButton.append(createIcon(ICON_PATHS.remove));

    const body = card.type === "link" || card.type === "local-link" || card.type === "secret" ? null : document.createElement("div");

    if (card.type === "board") {
      body.className = "card__body card__body--board";
      const boardLayer = document.createElement("div");
      boardLayer.className = "board-layer";
      boardLayer.dataset.boardId = card.id;
      boardLayer.append(
        ...state.cards.filter((child) => child.parentId === card.id).map((child) => createCardElement(child)),
      );
      body.append(boardLayer);
      if (state.dropTargetBoardId === card.id) {
        const dropHint = document.createElement("div");
        dropHint.className = "board-drop-hint";
        dropHint.textContent = "Drop to add";
        body.append(dropHint);
      }
      if (state.exitHintBoardId === card.id) {
        const exitHint = document.createElement("div");
        exitHint.className = "board-exit-hint";
        exitHint.textContent = "Move out";
        body.append(exitHint);
      }
    } else if (card.type === "text") {
      body.className = "card__body";
      if (card.isMutable) {
        body.contentEditable = "true";
        body.spellcheck = true;
      }
      body.textContent = card.content;
    } else if (card.type === "image") {
      body.className = "card__body card__body--image";
      const imagePath = (card.imagePath ?? "").trim();
      if (imagePath) {
        const image = document.createElement("img");
        image.className = "card__image";
        image.src = imageSourcePath(imagePath);
        image.alt = card.title || "Image";
        image.dataset.cardId = card.id;
        image.draggable = false;
        body.append(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "card__image-placeholder";
        placeholder.textContent = "No image path";
        body.append(placeholder);
      }
    }

    const resizeHandle = document.createElement("div");
    resizeHandle.className = `card__resize${isWidthOnlyResize ? " card__resize--width" : ""}`;
    resizeHandle.dataset.action = "resize";
    if (isWidthOnlyResize) resizeHandle.dataset.resizeAxis = "x";
    resizeHandle.setAttribute("aria-hidden", "true");

    heading.append(type, title);
    actions.append(mutabilityButton);
    if (card.isMutable) actions.append(editButton, removeButton);
    header.append(heading, actions);
    element.append(header);
    if (body && !isBoardCollapsed) element.append(body);
    if (canResize) element.append(resizeHandle);
    return element;
  }

  function renderToast() {
    dashboardToast.textContent = state.toastMessage;
    dashboardToast.classList.toggle("is-hidden", !state.toastMessage);
  }

  function renderSearch() {
    if (cardSearchInput.value !== state.searchText) {
      cardSearchInput.value = state.searchText;
    }
    clearSearchButton.classList.toggle("is-hidden", state.searchText.length <= 1);
  }

  function cardListSearchVisibleIds() {
    if (!state.searchResultIds) return null;

    const visibleIds = new Set(state.searchResultIds);
    let didAddAncestor = true;

    while (didAddAncestor) {
      didAddAncestor = false;
      state.cards.forEach((card) => {
        if (!visibleIds.has(card.id) || !card.parentId || visibleIds.has(card.parentId)) return;
        visibleIds.add(card.parentId);
        didAddAncestor = true;
      });
    }

    return visibleIds;
  }

  function renderCardList() {
    const visibleIds = cardListSearchVisibleIds();
    const visibleCount = visibleIds ? state.searchResultIds.size : state.cards.length;
    cardCount.textContent = visibleIds
      ? `${visibleCount} ${visibleCount === 1 ? "match" : "matches"}`
      : `${state.cards.length} ${state.cards.length === 1 ? "card" : "cards"}`;

    if (state.cards.length === 0) {
      const empty = document.createElement("div");
      empty.className = "card-list__meta";
      empty.textContent = "No cards yet.";
      cardList.replaceChildren(empty);
      return;
    }

    if (visibleIds && state.searchResultIds.size === 0) {
      const empty = document.createElement("div");
      empty.className = "card-list__meta";
      empty.textContent = "No matches.";
      cardList.replaceChildren(empty);
      return;
    }

    cardList.replaceChildren(
      ...state.cards
        .filter((card) => card.parentId === null && (!visibleIds || visibleIds.has(card.id)))
        .flatMap((card) => createCardListRows(card, 0, visibleIds)),
    );
  }

  function createCardListRows(card, depth = 0, visibleIds = null) {
    const item = document.createElement("button");
    const children = state.cards.filter((child) => child.parentId === card.id && (!visibleIds || visibleIds.has(child.id)));
    const canCollapse = card.type === "board" && children.length > 0;
    const isCollapsed = !visibleIds && state.collapsedBoardIds.has(card.id);

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
    meta.textContent = `${cardTypeLabel(card)} | ${card.width * GRID_SIZE}x${card.height * GRID_SIZE}px`;

    header.append(meta);
    item.append(header);
    return isCollapsed ? [item] : [item, ...children.flatMap((child) => createCardListRows(child, depth + 1, visibleIds))];
  }

  function renderConfigModal() {
    const isOpen = Boolean(state.configMode && state.draft);
    cardConfigModal.classList.toggle("is-hidden", !isOpen);

    if (!isOpen) return;

    configCardMeta.textContent = state.configMode === "create" ? "New card" : "Edit card";
    saveConfigButton.textContent = state.configMode === "create" ? "Add" : "Save";
    typeField.hidden = state.configMode === "edit";
    colorThemeField.hidden = false;
    contentField.hidden = state.draft.type !== "text";
    urlField.hidden = state.draft.type !== "link";
    localPathField.hidden = state.draft.type !== "local-link";
    localLinkModeField.hidden = state.draft.type !== "local-link";
    imagePathField.hidden = state.draft.type !== "image";
    secretField.hidden = state.draft.type !== "secret";
    typeInput.value = state.draft.type;
    colorThemeInput.value = state.draft.colorTheme ?? "slate";
    titleInput.value = state.draft.title;
    contentInput.value = state.draft.content;
    urlInput.value = state.draft.url ?? "";
    localPathInput.value = state.draft.localPath ?? "";
    localLinkModeInput.value = state.draft.localLinkMode === "text" ? "text" : "app";
    imagePathInput.value = state.draft.imagePath ?? "";
    secretInput.value = state.draft.secret ?? "";
    widthInput.value = state.draft.width;
    heightInput.value = state.draft.height;
  }

  function renderImportModal() {
    importModal.classList.toggle("is-hidden", !state.importModalOpen);
    if (!state.importModalOpen) return;

    if (importContentInput.value !== state.importContent) {
      importContentInput.value = state.importContent;
    }
  }

  function createContextMenuButton(action, label, iconPath, disabled = false) {
    const button = document.createElement("button");
    const text = document.createElement("span");

    button.type = "button";
    button.className = "card-context-menu__item";
    button.dataset.action = action;
    button.disabled = disabled;
    text.textContent = label;
    button.append(createIcon(iconPath), text);
    return button;
  }

  function createAddCardContextMenuButton(type, label) {
    const button = createContextMenuButton("add-card", label, cardTypeIconPath(type));
    button.dataset.cardType = type;
    return button;
  }

  function renderCardContextMenu() {
    const menuState = state.contextMenu;
    const isCreateMenu = menuState?.mode === "create";
    const isImageMenu = menuState?.mode === "image";
    const card = menuState?.mode === "card" ? state.cards.find((item) => item.id === menuState.cardId) : null;

    cardContextMenu.classList.toggle("is-hidden", !card && !isCreateMenu && !isImageMenu);
    cardContextMenu.replaceChildren();
    if ((!card && !isCreateMenu && !isImageMenu) || !menuState) return;

    cardContextMenu.style.left = `${menuState.x}px`;
    cardContextMenu.style.top = `${menuState.y}px`;

    if (isCreateMenu) {
      cardContextMenu.append(
        createAddCardContextMenuButton("text", "Text"),
        createAddCardContextMenuButton("board", "Board"),
        createAddCardContextMenuButton("link", "Link"),
        createAddCardContextMenuButton("local-link", "Link (Local)"),
        createAddCardContextMenuButton("image", "Image"),
        createAddCardContextMenuButton("secret", "Secret"),
      );
      return;
    }

    if (isImageMenu) {
      cardContextMenu.append(createContextMenuButton("copy-image-path", "Copy path", ICON_PATHS.export));
      return;
    }

    cardContextMenu.append(
      createContextMenuButton("edit", "Edit", ICON_PATHS.edit, !card.isMutable),
      createContextMenuButton("remove", "Remove", ICON_PATHS.remove, !card.isMutable),
      createContextMenuButton("toggle-mutability", card.isMutable ? "Lock" : "Unlock", card.isMutable ? ICON_PATHS.lock : ICON_PATHS.unlock),
      createContextMenuButton("export-partial", "Export", ICON_PATHS.export),
    );
  }

  app.rendering = {
    applyPan,
    clampPan,
    render,
    renderConfigModal,
  };
})(window.UtilPage ??= {});
