(function initState(app) {
  const {
    DEFAULT_CARD_HEIGHT_UNITS,
    DEFAULT_CARD_WIDTH_UNITS,
    MIN_CARD_HEIGHT_UNITS,
    MIN_CARD_WIDTH_UNITS,
    STORAGE_KEY,
    VALID_CARD_TYPES,
    ZOOM_MAX,
    ZOOM_MIN,
  } = app.constants;

  const state = {
    cards: [],
    selectedId: null,
    collapsedBoardIds: new Set(),
    collapsedBoardCardIds: new Set(),
    toastMessage: "",
    configMode: null,
    draft: null,
    contextMenu: null,
    importModalOpen: false,
    importContent: "",
    activeInteraction: null,
    dropTargetBoardId: null,
    exitHintBoardId: null,
    zoom: 1,
    pan: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    },
  };

  function applyStateData(storedState) {
    const cards = Array.isArray(storedState.cards) ? storedState.cards : [];
    const pan = storedState.pan ?? {};

    state.cards = cards
      .filter((card) => typeof card.id === "string")
      .map((card) => ({
        id: card.id,
        parentId: typeof card.parentId === "string" ? card.parentId : null,
        type: VALID_CARD_TYPES.has(card.type) ? card.type : "text",
        title: typeof card.title === "string" ? card.title : "Untitled",
        content: typeof card.content === "string" ? card.content : "",
        url: typeof card.url === "string" ? card.url : "",
        secret: typeof card.secret === "string" ? card.secret : "",
        isMutable: typeof card.isMutable === "boolean" ? card.isMutable : true,
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

    state.selectedId = restoredIds.has(storedState.selectedId) ? storedState.selectedId : null;
    state.pan = {
      x: Number.isFinite(Number(pan.x)) ? Number(pan.x) : state.pan.x,
      y: Number.isFinite(Number(pan.y)) ? Number(pan.y) : state.pan.y,
    };
    state.zoom = Number.isFinite(Number(storedState.zoom))
      ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(storedState.zoom)))
      : state.zoom;
    state.collapsedBoardIds = new Set(
      Array.isArray(storedState.collapsedBoardIds)
        ? storedState.collapsedBoardIds.filter((id) => restoredIds.has(id))
        : [],
    );
    state.collapsedBoardCardIds = new Set(
      Array.isArray(storedState.collapsedBoardCardIds)
        ? storedState.collapsedBoardCardIds.filter((id) => restoredIds.has(id))
        : [],
    );
  }

  function loadStoredState() {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) return;

    try {
      applyStateData(JSON.parse(rawState));
    } catch (error) {
      console.warn("Failed to restore UtilPage state.", error);
    }
  }

  function importStateData(data) {
    applyStateData(data);
  }

  function saveStoredState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        cards: state.cards,
        selectedId: state.selectedId,
        collapsedBoardIds: [...state.collapsedBoardIds],
        collapsedBoardCardIds: [...state.collapsedBoardCardIds],
        pan: state.pan,
        zoom: state.zoom,
      }),
    );
  }

  app.state = state;
  app.storage = {
    loadStoredState,
    saveStoredState,
    importStateData,
  };
})(window.UtilPage ??= {});
