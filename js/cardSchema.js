(function initCardSchema(app) {
  const {
    DEFAULT_CARD_HEIGHT_UNITS,
    DEFAULT_CARD_WIDTH_UNITS,
    BOARD_CONTENT_HEIGHT_UNITS,
    BOARD_CONTENT_WIDTH_UNITS,
    CARD_TYPE_DEFS,
    MIN_CARD_HEIGHT_UNITS,
    MIN_CARD_WIDTH_UNITS,
    VALID_COLOR_THEMES,
    VALID_CARD_TYPES,
  } = app.constants;

  function defaultColorTheme(type) {
    return CARD_TYPE_DEFS[type]?.defaultColorTheme ?? "slate";
  }

  function normalizeCardData(card = {}, { id = card.id, parentId = card.parentId ?? null, position = null } = {}) {
    const type = VALID_CARD_TYPES.has(card.type) ? card.type : "text";
    return {
      id,
      parentId: typeof parentId === "string" ? parentId : null,
      type,
      title: typeof card.title === "string" && card.title.trim() ? card.title : "Untitled",
      colorTheme: VALID_COLOR_THEMES.has(card.colorTheme) ? card.colorTheme : defaultColorTheme(type),
      content: type === "text" && typeof card.content === "string" ? card.content : "",
      url: type === "link" && typeof card.url === "string" ? card.url : "",
      localPath: type === "local-link" && typeof card.localPath === "string" ? card.localPath : "",
      localLinkMode: type === "local-link" && card.localLinkMode === "text" ? "text" : "app",
      imagePath: type === "image" && typeof card.imagePath === "string" ? card.imagePath : "",
      secret: type === "secret" && typeof card.secret === "string" ? card.secret : "",
      isMutable: typeof card.isMutable === "boolean" ? card.isMutable : true,
      x: position?.x ?? (Number.isFinite(Number(card.x)) ? Number(card.x) : 0),
      y: position?.y ?? (Number.isFinite(Number(card.y)) ? Number(card.y) : 0),
      width: Math.max(MIN_CARD_WIDTH_UNITS, Number(card.width) || DEFAULT_CARD_WIDTH_UNITS),
      height: Math.max(MIN_CARD_HEIGHT_UNITS, Number(card.height) || DEFAULT_CARD_HEIGHT_UNITS),
      boardPanX: type === "board" ? Math.min(BOARD_CONTENT_WIDTH_UNITS, Math.max(0, Number(card.boardPanX) || 0)) : 0,
      boardPanY: type === "board" ? Math.min(BOARD_CONTENT_HEIGHT_UNITS, Math.max(0, Number(card.boardPanY) || 0)) : 0,
    };
  }

  app.cardSchema = {
    defaultColorTheme,
    normalizeCardData,
  };
})(window.UtilPage ??= {});
