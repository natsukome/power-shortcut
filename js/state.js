(function initState(app) {
  const {
    STORAGE_KEY,
    ZOOM_MAX,
    ZOOM_MIN,
  } = app.constants;
  const { normalizeCardData } = app.cardSchema;

  const state = {
    cards: [],
    selectedId: null,
    collapsedBoardIds: new Set(),
    collapsedBoardCardIds: new Set(),
    toastMessage: "",
    searchText: "",
    searchResultIds: null,
    searchResultFields: new Map(),
    configMode: null,
    draft: null,
    createTarget: null,
    contextMenu: null,
    importModalOpen: false,
    importContent: "",
    activeInteraction: null,
    dropTargetBoardId: null,
    exitHintBoardId: null,
    zoom: 1,
    showGrid: true,
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
      .map((card) => normalizeCardData(card));

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
    state.showGrid = typeof storedState.showGrid === "boolean" ? storedState.showGrid : true;
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
        showGrid: state.showGrid,
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
