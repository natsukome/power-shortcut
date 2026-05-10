(function initRenderMiniMap(app) {
  const {
    BOARD_CONTENT_HEIGHT_UNITS,
    BOARD_CONTENT_WIDTH_UNITS,
    COLOR_THEME_ACCENTS,
    DASHBOARD_HEIGHT_UNITS,
    DASHBOARD_WIDTH_UNITS,
    GRID_SIZE,
  } = app.constants;
  const { miniMap, miniMapSurface, miniMapToggleButton } = app.dom;
  const { state } = app;
  const { isMobileViewport } = app.viewport;
  const { ICON_PATHS, createIcon } = app.icons;

  function focusedBoardForMiniMap() {
    let card = state.cards.find((item) => item.id === state.selectedId) ?? null;
    if (card?.type === "board") return card;

    while (card?.parentId) {
      const parent = state.cards.find((item) => item.id === card.parentId);
      if (!parent) return null;
      if (parent.type === "board") return parent;
      card = parent;
    }

    return null;
  }

  function renderMiniMap() {
    miniMap.classList.toggle("is-hidden", !state.showMiniMap);
    miniMapToggleButton.title = state.showMiniMap ? "Hide mini map" : "Show mini map";
    miniMapToggleButton.setAttribute("aria-label", state.showMiniMap ? "Hide mini map" : "Show mini map");
    miniMapToggleButton.replaceChildren(createIcon(state.showMiniMap ? ICON_PATHS.miniMap : ICON_PATHS.miniMapHidden, "zoom-button__icon"));

    if (!state.showMiniMap) {
      miniMapSurface.replaceChildren();
      return;
    }

    const focusedBoard = focusedBoardForMiniMap();
    const widthUnits = focusedBoard ? BOARD_CONTENT_WIDTH_UNITS : DASHBOARD_WIDTH_UNITS;
    const heightUnits = focusedBoard ? BOARD_CONTENT_HEIGHT_UNITS : DASHBOARD_HEIGHT_UNITS;
    const cards = state.cards.filter((card) => card.parentId === (focusedBoard?.id ?? null));
    const maxWidth = isMobileViewport() ? 150 : 220;
    const maxHeight = isMobileViewport() ? 86 : 120;
    const scale = Math.min(maxWidth / widthUnits, maxHeight / heightUnits);

    miniMap.dataset.scope = focusedBoard ? "board" : "dashboard";
    miniMapSurface.style.width = `${Math.round(widthUnits * scale)}px`;
    miniMapSurface.style.height = `${Math.round(heightUnits * scale)}px`;
    miniMapSurface.replaceChildren(
      ...cards.map((card) => createMiniMapFrame(card, widthUnits, heightUnits)),
      createMiniMapViewport(focusedBoard, widthUnits, heightUnits),
    );
  }

  function createMiniMapFrame(card, widthUnits, heightUnits) {
    const frame = document.createElement("div");
    const accent = COLOR_THEME_ACCENTS[card.colorTheme] ?? COLOR_THEME_ACCENTS.slate;

    frame.className = `mini-map__frame${card.id === state.selectedId ? " is-focused" : ""}`;
    frame.style.left = `${(card.x / widthUnits) * 100}%`;
    frame.style.top = `${(card.y / heightUnits) * 100}%`;
    frame.style.width = `${(card.width / widthUnits) * 100}%`;
    frame.style.height = `${(card.height / heightUnits) * 100}%`;
    frame.style.borderColor = accent;
    frame.style.backgroundColor = `${accent}26`;
    return frame;
  }

  function createMiniMapViewport(focusedBoard, widthUnits, heightUnits) {
    const frame = document.createElement("div");
    const viewport = focusedBoard ? boardMiniMapViewport(focusedBoard) : dashboardMiniMapViewport();

    frame.className = "mini-map__viewport";
    frame.style.left = `${(viewport.x / widthUnits) * 100}%`;
    frame.style.top = `${(viewport.y / heightUnits) * 100}%`;
    frame.style.width = `${(viewport.width / widthUnits) * 100}%`;
    frame.style.height = `${(viewport.height / heightUnits) * 100}%`;
    return frame;
  }

  function dashboardMiniMapViewport() {
    return {
      x: Math.max(0, Math.min(DASHBOARD_WIDTH_UNITS, (0 - state.pan.x) / (GRID_SIZE * state.zoom))),
      y: Math.max(0, Math.min(DASHBOARD_HEIGHT_UNITS, (0 - state.pan.y) / (GRID_SIZE * state.zoom))),
      width: Math.min(DASHBOARD_WIDTH_UNITS, window.innerWidth / (GRID_SIZE * state.zoom)),
      height: Math.min(DASHBOARD_HEIGHT_UNITS, window.innerHeight / (GRID_SIZE * state.zoom)),
    };
  }

  function boardMiniMapViewport(board) {
    const boardBody = document.querySelector(`.board-layer[data-board-id="${CSS.escape(board.id)}"]`)?.closest(".card__body--board");
    const rect = boardBody?.getBoundingClientRect();

    return {
      x: board.boardPanX ?? 0,
      y: board.boardPanY ?? 0,
      width: rect ? Math.min(BOARD_CONTENT_WIDTH_UNITS, rect.width / (GRID_SIZE * state.zoom)) : BOARD_CONTENT_WIDTH_UNITS,
      height: rect ? Math.min(BOARD_CONTENT_HEIGHT_UNITS, rect.height / (GRID_SIZE * state.zoom)) : BOARD_CONTENT_HEIGHT_UNITS,
    };
  }

  app.renderMiniMap = {
    renderMiniMap,
  };
})(window.UtilPage ??= {});
