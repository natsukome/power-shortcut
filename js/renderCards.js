(function initRenderCards(app) {
  const {
    BOARD_CONTENT_HEIGHT_UNITS,
    BOARD_CONTENT_WIDTH_UNITS,
    CARD_LAYER_OFFSET,
    CARD_TYPE_DEFS,
    DASHBOARD_HEIGHT_UNITS,
    DASHBOARD_WIDTH_UNITS,
    GRID_SIZE,
  } = app.constants;
  const { cardCount, cardLayer, cardList, gridLayer } = app.dom;
  const { state } = app;
  const { ICON_PATHS, cardTypeIconPath, createIcon } = app.icons;

  function cardTypeLabel(card) {
    if (card.type !== "local-link") return CARD_TYPE_DEFS[card.type]?.label ?? card.type;
    return `Link (${card.localLinkMode === "text" ? "Text" : "App"})`;
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

  function createDashboardBounds() {
    const bounds = document.createElement("div");
    bounds.className = "dashboard-bounds";
    bounds.style.left = `${CARD_LAYER_OFFSET}px`;
    bounds.style.top = `${CARD_LAYER_OFFSET}px`;
    bounds.style.width = `${DASHBOARD_WIDTH_UNITS * GRID_SIZE}px`;
    bounds.style.height = `${DASHBOARD_HEIGHT_UNITS * GRID_SIZE}px`;
    return bounds;
  }

  function createCardHeader(card, isBoardCollapsed) {
    const cardType = CARD_TYPE_DEFS[card.type] ?? CARD_TYPE_DEFS.text;
    const header = document.createElement("header");
    const heading = document.createElement("div");
    const type = document.createElement("div");
    const title = document.createElement("div");
    const actions = document.createElement("div");

    header.className = "card__header";
    header.dataset.action = "move";
    if (card.type === "link" && card.url) {
      header.title = card.url;
    } else if (card.type === "local-link" && card.localPath) {
      header.title = card.localPath;
    } else if (card.type === "secret") {
      header.title = "Click title to copy secret";
    }

    heading.className = "card__heading";
    type.className = "card__type";
    type.title = cardTypeLabel(card);
    type.append(createIcon(cardTypeIconPath(card.type), "card__type-icon"));
    if (card.type === "local-link") {
      const mode = document.createElement("span");
      mode.className = "card__type-mode";
      mode.textContent = card.localLinkMode === "text" ? "txt" : "app";
      type.append(mode);
    }

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

    actions.className = "card__actions";
    actions.append(createMutabilityButton(card));
    if (card.isMutable) actions.append(createEditButton(), createRemoveButton());

    heading.append(type, title);
    header.append(heading, actions);
    return { header, cardType };
  }

  function createMutabilityButton(card) {
    const button = document.createElement("button");
    button.className = "card__action card__action--icon";
    button.type = "button";
    button.dataset.action = "toggle-mutability";
    button.title = card.isMutable ? "Make immutable" : "Make mutable";
    button.setAttribute("aria-label", card.isMutable ? "Make immutable" : "Make mutable");
    button.append(createIcon(card.isMutable ? ICON_PATHS.unlock : ICON_PATHS.lock));
    return button;
  }

  function createEditButton() {
    const button = document.createElement("button");
    button.className = "card__action card__action--edit";
    button.type = "button";
    button.dataset.action = "edit";
    button.title = "Edit";
    button.setAttribute("aria-label", "Edit");
    button.append(createIcon(ICON_PATHS.edit));
    return button;
  }

  function createRemoveButton() {
    const button = document.createElement("button");
    button.className = "card__action card__action--danger";
    button.type = "button";
    button.dataset.action = "remove";
    button.title = "Remove";
    button.setAttribute("aria-label", "Remove");
    button.append(createIcon(ICON_PATHS.remove));
    return button;
  }

  function createCardBody(card) {
    if (card.type === "board") return createBoardBody(card);
    if (card.type === "text") return createTextBody(card);
    if (card.type === "image") return createImageBody(card);
    return null;
  }

  function createBoardBody(card) {
    const body = document.createElement("div");
    const boardLayer = document.createElement("div");

    body.className = "card__body card__body--board";
    body.style.backgroundPosition = `${-card.boardPanX * GRID_SIZE}px ${-card.boardPanY * GRID_SIZE}px`;
    boardLayer.className = "board-layer";
    boardLayer.dataset.boardId = card.id;
    boardLayer.style.width = `${BOARD_CONTENT_WIDTH_UNITS * GRID_SIZE}px`;
    boardLayer.style.height = `${BOARD_CONTENT_HEIGHT_UNITS * GRID_SIZE}px`;
    boardLayer.style.transform = `translate(${-card.boardPanX * GRID_SIZE}px, ${-card.boardPanY * GRID_SIZE}px)`;
    boardLayer.append(...state.cards.filter((child) => child.parentId === card.id).map((child) => createCardElement(child)));
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
    return body;
  }

  function createTextBody(card) {
    const body = document.createElement("div");
    body.className = "card__body";
    if (card.isMutable) {
      body.contentEditable = "true";
      body.spellcheck = true;
    }
    body.textContent = card.content;
    return body;
  }

  function createImageBody(card) {
    const body = document.createElement("div");
    const imagePath = (card.imagePath ?? "").trim();
    body.className = "card__body card__body--image";

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
    return body;
  }

  function createResizeHandle(isWidthOnlyResize) {
    const resizeHandle = document.createElement("div");
    resizeHandle.className = `card__resize${isWidthOnlyResize ? " card__resize--width" : ""}`;
    resizeHandle.dataset.action = "resize";
    if (isWidthOnlyResize) resizeHandle.dataset.resizeAxis = "x";
    resizeHandle.setAttribute("aria-hidden", "true");
    return resizeHandle;
  }

  function createCardElement(card, isDashboardCard = false) {
    const element = document.createElement("article");
    const isActiveCard =
      state.activeInteraction?.cardId === card.id &&
      (state.activeInteraction.type === "move" || state.activeInteraction.type === "resize");
    const isBoardCollapsed = card.type === "board" && state.collapsedBoardCardIds.has(card.id);
    const { header, cardType } = createCardHeader(card, isBoardCollapsed);
    const body = cardType.hasBody ? createCardBody(card) : null;
    const isWidthOnlyResize = Boolean(cardType.widthOnlyResize);

    element.className = `card card--${card.type} card--theme-${card.colorTheme ?? "slate"}${card.isMutable ? "" : " card--immutable"}${
      isBoardCollapsed ? " is-collapsed" : ""
    }${card.id === state.selectedId ? " is-selected" : ""}${isActiveCard ? " is-dragging" : ""}`;
    element.dataset.cardId = card.id;
    element.style.left = `${(isDashboardCard ? CARD_LAYER_OFFSET : 0) + card.x * GRID_SIZE}px`;
    element.style.top = `${(isDashboardCard ? CARD_LAYER_OFFSET : 0) + card.y * GRID_SIZE}px`;
    element.style.width = `${card.width * GRID_SIZE}px`;
    element.style.height = `${card.height * GRID_SIZE}px`;
    element.append(header);
    if (body && !isBoardCollapsed) element.append(body);
    if (card.isMutable) element.append(createResizeHandle(isWidthOnlyResize));
    return element;
  }

  function renderCards() {
    gridLayer.style.width = `${DASHBOARD_WIDTH_UNITS * GRID_SIZE}px`;
    gridLayer.style.height = `${DASHBOARD_HEIGHT_UNITS * GRID_SIZE}px`;
    const dashboardCards = state.cards.filter((card) => card.parentId === null);
    cardLayer.replaceChildren(createDashboardBounds(), ...dashboardCards.map((card) => createCardElement(card, true)));
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
    item.className = `card-list__item${card.id === state.selectedId ? " is-selected" : ""}${depth > 0 ? " is-nested" : ""}${
      canCollapse ? " has-children" : ""
    }`;
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
    meta.textContent = cardTypeLabel(card);
    header.append(meta);

    const matchedFields = visibleIds ? (state.searchResultFields.get(card.id) ?? []) : [];
    if (matchedFields.length > 0) {
      const badges = document.createElement("span");
      badges.className = "card-list__badges";
      matchedFields.forEach((field) => {
        const badge = document.createElement("span");
        badge.className = "card-list__badge";
        badge.textContent = field;
        badges.append(badge);
      });
      header.append(badges);
    }

    item.append(header);
    return isCollapsed ? [item] : [item, ...children.flatMap((child) => createCardListRows(child, depth + 1, visibleIds))];
  }

  app.renderCards = {
    cardTypeLabel,
    renderCardList,
    renderCards,
  };
})(window.UtilPage ??= {});
