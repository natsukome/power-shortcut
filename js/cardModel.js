(function initCardModel(app) {
  const {
    DEFAULT_CARD_HEIGHT_UNITS,
    DEFAULT_CARD_WIDTH_UNITS,
    DASHBOARD_HEIGHT_UNITS,
    DASHBOARD_WIDTH_UNITS,
    GRID_SIZE,
    MIN_CARD_HEIGHT_UNITS,
    MIN_CARD_WIDTH_UNITS,
    PLACEMENT_GAP_UNITS,
    PLACEMENT_SEARCH_RADIUS_UNITS,
    VALID_COLOR_THEMES,
    VALID_CARD_TYPES,
  } = app.constants;
  const {
    colorThemeInput,
    contentInput,
    heightInput,
    localLinkModeInput,
    localPathInput,
    secretInput,
    titleInput,
    typeInput,
    urlInput,
    widthInput,
  } = app.dom;
  const { state } = app;

  function selectedCard() {
    return state.cards.find((card) => card.id === state.selectedId) ?? null;
  }

  function defaultDraft() {
    const index = state.cards.length + 1;
    return {
      type: "text",
      title: `Card ${index}`,
      colorTheme: "blue",
      content: "",
      url: "",
      localPath: "",
      localLinkMode: "app",
      secret: "",
      width: DEFAULT_CARD_WIDTH_UNITS,
      height: DEFAULT_CARD_HEIGHT_UNITS,
    };
  }

  function normalizeDraft() {
    const type = VALID_CARD_TYPES.has(typeInput.value) ? typeInput.value : "text";
    return {
      type,
      title: titleInput.value.trim() || "Untitled",
      colorTheme: VALID_COLOR_THEMES.has(colorThemeInput.value) ? colorThemeInput.value : "slate",
      content: type === "text" ? contentInput.value : "",
      url: type === "link" ? urlInput.value.trim() : "",
      localPath: type === "local-link" ? localPathInput.value.trim() : "",
      localLinkMode: type === "local-link" && localLinkModeInput.value === "text" ? "text" : "app",
      secret: type === "secret" ? secretInput.value : "",
      width: Math.max(MIN_CARD_WIDTH_UNITS, Number(widthInput.value) || DEFAULT_CARD_WIDTH_UNITS),
      height: Math.max(MIN_CARD_HEIGHT_UNITS, Number(heightInput.value) || DEFAULT_CARD_HEIGHT_UNITS),
    };
  }

  function syncDraftFromInputs() {
    if (!state.draft) return;
    state.draft = normalizeDraft();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampDashboardCard(card) {
    if (card.parentId !== null) return card;

    card.width = Math.min(DASHBOARD_WIDTH_UNITS, Math.max(MIN_CARD_WIDTH_UNITS, card.width));
    card.height = Math.min(DASHBOARD_HEIGHT_UNITS, Math.max(MIN_CARD_HEIGHT_UNITS, card.height));
    card.x = clamp(card.x, 0, Math.max(0, DASHBOARD_WIDTH_UNITS - card.width));
    card.y = clamp(card.y, 0, Math.max(0, DASHBOARD_HEIGHT_UNITS - card.height));
    return card;
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
    const boundedWidth = parentId === null ? Math.min(width, DASHBOARD_WIDTH_UNITS) : width;
    const boundedHeight = parentId === null ? Math.min(height, DASHBOARD_HEIGHT_UNITS) : height;
    const preferred =
      preferredPosition ?? {
        x: Math.round((window.innerWidth / 2 - state.pan.x) / (GRID_SIZE * state.zoom) - boundedWidth / 2),
        y: Math.round((window.innerHeight / 2 - state.pan.y) / (GRID_SIZE * state.zoom) - boundedHeight / 2),
      };
    const boundedPreferred =
      parentId === null
        ? {
            x: clamp(preferred.x, 0, Math.max(0, DASHBOARD_WIDTH_UNITS - boundedWidth)),
            y: clamp(preferred.y, 0, Math.max(0, DASHBOARD_HEIGHT_UNITS - boundedHeight)),
          }
        : preferred;

    for (let radius = 0; radius <= PLACEMENT_SEARCH_RADIUS_UNITS; radius += 1) {
      for (let y = boundedPreferred.y - radius; y <= boundedPreferred.y + radius; y += 1) {
        for (let x = boundedPreferred.x - radius; x <= boundedPreferred.x + radius; x += 1) {
          const isEdge =
            x === boundedPreferred.x - radius ||
            x === boundedPreferred.x + radius ||
            y === boundedPreferred.y - radius ||
            y === boundedPreferred.y + radius;
          if (!isEdge) continue;

          if (
            parentId === null &&
            (x < 0 || y < 0 || x + boundedWidth > DASHBOARD_WIDTH_UNITS || y + boundedHeight > DASHBOARD_HEIGHT_UNITS)
          ) {
            continue;
          }

          const candidate = { x, y, width: boundedWidth, height: boundedHeight };
          if (!hasCardOverlap(candidate, parentId, excludedIds)) return { x, y };
        }
      }
    }

    return boundedPreferred;
  }

  function removeCardTree(cardId) {
    const selectedIndex = state.cards.findIndex((card) => card.id === cardId);
    if (selectedIndex === -1) return { removed: false };

    const removedIds = descendantIds(cardId);
    removedIds.add(cardId);
    state.cards = state.cards.filter((card) => !removedIds.has(card.id));

    if (removedIds.has(state.selectedId)) state.selectedId = null;

    return { removed: true, removedIds };
  }

  function snap(value) {
    return Math.round(value / GRID_SIZE);
  }

  app.cardModel = {
    clampDashboardCard,
    defaultDraft,
    descendantIds,
    findEmptyCardPosition,
    normalizeDraft,
    removeCardTree,
    selectedCard,
    snap,
    syncDraftFromInputs,
  };
})(window.UtilPage ??= {});
