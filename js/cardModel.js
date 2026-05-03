(function initCardModel(app) {
  const {
    DEFAULT_CARD_HEIGHT_UNITS,
    DEFAULT_CARD_WIDTH_UNITS,
    GRID_SIZE,
    MIN_CARD_HEIGHT_UNITS,
    MIN_CARD_WIDTH_UNITS,
    PLACEMENT_GAP_UNITS,
    PLACEMENT_SEARCH_RADIUS_UNITS,
    VALID_CARD_TYPES,
  } = app.constants;
  const { contentInput, heightInput, titleInput, typeInput, urlInput, widthInput } = app.dom;
  const { state } = app;

  function selectedCard() {
    return state.cards.find((card) => card.id === state.selectedId) ?? null;
  }

  function defaultDraft() {
    const index = state.cards.length + 1;
    return {
      type: "text",
      title: `Card ${index}`,
      content: "",
      url: "",
      width: DEFAULT_CARD_WIDTH_UNITS,
      height: DEFAULT_CARD_HEIGHT_UNITS,
    };
  }

  function normalizeDraft() {
    const type = VALID_CARD_TYPES.has(typeInput.value) ? typeInput.value : "text";
    return {
      type,
      title: titleInput.value.trim() || "Untitled",
      content: type === "text" ? contentInput.value : "",
      url: type === "link" ? urlInput.value.trim() : "",
      width: Math.max(MIN_CARD_WIDTH_UNITS, Number(widthInput.value) || DEFAULT_CARD_WIDTH_UNITS),
      height: Math.max(MIN_CARD_HEIGHT_UNITS, Number(heightInput.value) || DEFAULT_CARD_HEIGHT_UNITS),
    };
  }

  function syncDraftFromInputs() {
    if (!state.draft) return;
    state.draft = normalizeDraft();
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

  function removeCardTree(cardId) {
    const selectedIndex = state.cards.findIndex((card) => card.id === cardId);
    if (selectedIndex === -1) return { removed: false };

    const removedIds = descendantIds(cardId);
    removedIds.add(cardId);
    state.cards = state.cards.filter((card) => !removedIds.has(card.id));

    if (removedIds.has(state.selectedId)) {
      state.selectedId = state.cards[Math.max(0, selectedIndex - 1)]?.id ?? null;
    }

    return { removed: true, removedIds };
  }

  function snap(value) {
    return Math.round(value / GRID_SIZE);
  }

  app.cardModel = {
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
