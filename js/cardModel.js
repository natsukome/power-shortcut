(function initCardModel(app) {
  const {
    DEFAULT_CARD_HEIGHT_UNITS,
    DEFAULT_CARD_WIDTH_UNITS,
    BOARD_CONTENT_HEIGHT_UNITS,
    BOARD_CONTENT_WIDTH_UNITS,
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
  const { state } = app;
  const { defaultColorTheme, normalizeCardData } = app.cardSchema;

  function selectedCard() {
    return state.cards.find((card) => card.id === state.selectedId) ?? null;
  }

  function defaultDraft() {
    const index = state.cards.length + 1;
    return {
      type: "text",
      title: `Card ${index}`,
      colorTheme: defaultColorTheme("text"),
      content: "",
      url: "",
      localPath: "",
      localLinkMode: "app",
      imagePath: "",
      secret: "",
      width: DEFAULT_CARD_WIDTH_UNITS,
      height: DEFAULT_CARD_HEIGHT_UNITS,
    };
  }

  function normalizeDraft(values) {
    const type = VALID_CARD_TYPES.has(values?.type) ? values.type : "text";
    return {
      type,
      title: String(values?.title ?? "").trim() || "Untitled",
      colorTheme: VALID_COLOR_THEMES.has(values?.colorTheme) ? values.colorTheme : "slate",
      content: type === "text" ? String(values?.content ?? "") : "",
      url: type === "link" ? String(values?.url ?? "").trim() : "",
      localPath: type === "local-link" ? String(values?.localPath ?? "").trim() : "",
      localLinkMode: type === "local-link" && values?.localLinkMode === "text" ? "text" : "app",
      imagePath: type === "image" ? String(values?.imagePath ?? "").trim() : "",
      secret: type === "secret" ? String(values?.secret ?? "") : "",
      width: Math.max(MIN_CARD_WIDTH_UNITS, Number(values?.width) || DEFAULT_CARD_WIDTH_UNITS),
      height: Math.max(MIN_CARD_HEIGHT_UNITS, Number(values?.height) || DEFAULT_CARD_HEIGHT_UNITS),
    };
  }

  function syncDraftFromValues(values) {
    if (!state.draft) return;
    state.draft = normalizeDraft(values);
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

  function clampBoardChildCard(card) {
    if (card.parentId === null) return card;

    card.width = Math.min(BOARD_CONTENT_WIDTH_UNITS, Math.max(MIN_CARD_WIDTH_UNITS, card.width));
    card.height = Math.min(BOARD_CONTENT_HEIGHT_UNITS, Math.max(MIN_CARD_HEIGHT_UNITS, card.height));
    card.x = clamp(card.x, 0, Math.max(0, BOARD_CONTENT_WIDTH_UNITS - card.width));
    card.y = clamp(card.y, 0, Math.max(0, BOARD_CONTENT_HEIGHT_UNITS - card.height));
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
    const boundedWidth =
      parentId === null ? Math.min(width, DASHBOARD_WIDTH_UNITS) : Math.min(width, BOARD_CONTENT_WIDTH_UNITS);
    const boundedHeight =
      parentId === null ? Math.min(height, DASHBOARD_HEIGHT_UNITS) : Math.min(height, BOARD_CONTENT_HEIGHT_UNITS);
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
        : {
            x: clamp(preferred.x, 0, Math.max(0, BOARD_CONTENT_WIDTH_UNITS - boundedWidth)),
            y: clamp(preferred.y, 0, Math.max(0, BOARD_CONTENT_HEIGHT_UNITS - boundedHeight)),
          };

    for (let radius = 0; radius <= PLACEMENT_SEARCH_RADIUS_UNITS; radius += 1) {
      for (let y = boundedPreferred.y - radius; y <= boundedPreferred.y + radius; y += 1) {
        for (let x = boundedPreferred.x - radius; x <= boundedPreferred.x + radius; x += 1) {
          const isEdge =
            x === boundedPreferred.x - radius ||
            x === boundedPreferred.x + radius ||
            y === boundedPreferred.y - radius ||
            y === boundedPreferred.y + radius;
          if (!isEdge) continue;

          const isOutOfBounds =
            parentId === null
              ? x < 0 || y < 0 || x + boundedWidth > DASHBOARD_WIDTH_UNITS || y + boundedHeight > DASHBOARD_HEIGHT_UNITS
              : x < 0 || y < 0 || x + boundedWidth > BOARD_CONTENT_WIDTH_UNITS || y + boundedHeight > BOARD_CONTENT_HEIGHT_UNITS;
          if (isOutOfBounds) {
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
    clampBoardChildCard,
    defaultColorTheme,
    defaultDraft,
    descendantIds,
    findEmptyCardPosition,
    normalizeCardData,
    normalizeDraft,
    removeCardTree,
    selectedCard,
    snap,
    syncDraftFromValues,
  };
})(window.UtilPage ??= {});
