(function initConstants(app) {
  app.constants = {
    GRID_SIZE: 10,
    CARD_LAYER_OFFSET: 50000,
    MIN_CARD_WIDTH_UNITS: 8,
    MIN_CARD_HEIGHT_UNITS: 6,
    DEFAULT_CARD_WIDTH_UNITS: 24,
    DEFAULT_CARD_HEIGHT_UNITS: 14,
    PLACEMENT_GAP_UNITS: 1,
    PLACEMENT_SEARCH_RADIUS_UNITS: 240,
    STORAGE_KEY: "utilpage.dashboard.v1",
    VALID_CARD_TYPES: new Set(["text", "board", "link", "secret"]),
    ZOOM_MAX: 2.5,
    ZOOM_MIN: 0.4,
    ZOOM_STEP: 0.1,
  };
})(window.UtilPage ??= {});
