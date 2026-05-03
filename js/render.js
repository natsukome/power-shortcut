(function initRender(app) {
  const { CARD_LAYER_OFFSET, GRID_SIZE } = app.constants;
  const {
    cardConfigModal,
    cardCount,
    cardLayer,
    cardList,
    configCardMeta,
    contentField,
    contentInput,
    gridLayer,
    heightInput,
    saveConfigButton,
    titleInput,
    typeField,
    typeInput,
    widthInput,
  } = app.dom;
  const { state } = app;

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
    const dashboardCards = state.cards.filter((card) => card.parentId === null);
    cardLayer.replaceChildren(...dashboardCards.map((card) => createCardElement(card, true)));
  }

  function createCardElement(card, isDashboardCard = false) {
    const element = document.createElement("article");
    const isActiveCard =
      state.activeInteraction?.cardId === card.id &&
      (state.activeInteraction.type === "move" || state.activeInteraction.type === "resize");

    element.className = `card card--${card.type}${card.isMutable ? "" : " card--immutable"}${
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

    const mutabilityButton = document.createElement("button");
    mutabilityButton.className = "card__action card__action--icon";
    mutabilityButton.type = "button";
    mutabilityButton.dataset.action = "toggle-mutability";
    mutabilityButton.title = card.isMutable ? "Make immutable" : "Make mutable";
    mutabilityButton.setAttribute("aria-label", card.isMutable ? "Make immutable" : "Make mutable");
    mutabilityButton.textContent = card.isMutable ? "U" : "L";

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
      boardLayer.append(
        ...state.cards.filter((child) => child.parentId === card.id).map((child) => createCardElement(child)),
      );
      body.append(boardLayer);
    } else {
      body.textContent = card.content;
    }

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "card__resize";
    resizeHandle.dataset.action = "resize";
    resizeHandle.setAttribute("aria-hidden", "true");

    heading.append(title, type);
    actions.append(mutabilityButton);
    if (card.isMutable) actions.append(editButton, removeButton);
    header.append(heading, actions);
    element.append(header, body);
    if (card.isMutable) element.append(resizeHandle);
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

    cardList.replaceChildren(
      ...state.cards.filter((card) => card.parentId === null).flatMap((card) => createCardListRows(card)),
    );
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

    configCardMeta.textContent = state.configMode === "create" ? "New card" : "Edit card";
    saveConfigButton.textContent = state.configMode === "create" ? "Add" : "Save";
    typeField.hidden = state.configMode === "edit";
    contentField.hidden = state.draft.type === "board";
    typeInput.value = state.draft.type;
    titleInput.value = state.draft.title;
    contentInput.value = state.draft.content;
    widthInput.value = state.draft.width;
    heightInput.value = state.draft.height;
  }

  app.rendering = {
    applyPan,
    render,
    renderConfigModal,
  };
})(window.UtilPage ??= {});
