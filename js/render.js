(function initRender(app) {
  const { CARD_TYPES, DASHBOARD_HEIGHT_UNITS, DASHBOARD_WIDTH_UNITS, GRID_SIZE } = app.constants;
  const { cardSearchInput, clearSearchButton, dashboardToast, gridLayer, gridToggleButton, typeInput } = app.dom;
  const { state } = app;
  const { ICON_PATHS, createIcon } = app.icons;
  const { renderCardList, renderCards } = app.renderCards;
  const { renderMiniMap } = app.renderMiniMap;
  const { renderCardContextMenu, renderConfigModal, renderImportModal, renderUtilModal } = app.renderModals;

  function initializeTypeOptions() {
    typeInput.replaceChildren(
      ...CARD_TYPES.map((cardType) => {
        const option = document.createElement("option");
        option.value = cardType.id;
        option.textContent = cardType.label;
        return option;
      }),
    );
  }

  initializeTypeOptions();

  function clampPan() {
    const dashboardWidth = DASHBOARD_WIDTH_UNITS * GRID_SIZE * state.zoom;
    const dashboardHeight = DASHBOARD_HEIGHT_UNITS * GRID_SIZE * state.zoom;
    const minX = window.innerWidth - dashboardWidth;
    const minY = window.innerHeight - dashboardHeight;

    state.pan.x = dashboardWidth <= window.innerWidth ? (window.innerWidth - dashboardWidth) / 2 : Math.min(0, Math.max(minX, state.pan.x));
    state.pan.y =
      dashboardHeight <= window.innerHeight ? (window.innerHeight - dashboardHeight) / 2 : Math.min(0, Math.max(minY, state.pan.y));
  }

  function applyPan() {
    clampPan();
    gridLayer.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
  }

  function render() {
    applyPan();
    renderGridVisibility();
    renderCards();
    renderSearch();
    renderCardList();
    renderConfigModal();
    renderImportModal();
    renderUtilModal();
    renderCardContextMenu();
    renderMiniMap();
    renderToast();
  }

  function renderGridVisibility() {
    gridLayer.classList.toggle("is-grid-hidden", !state.showGrid);
    gridToggleButton.title = state.showGrid ? "Hide grid lines" : "Show grid lines";
    gridToggleButton.setAttribute("aria-label", state.showGrid ? "Hide grid lines" : "Show grid lines");
    gridToggleButton.replaceChildren(createIcon(state.showGrid ? ICON_PATHS.gridVisible : ICON_PATHS.gridHidden, "zoom-button__icon"));
  }

  function renderSearch() {
    if (cardSearchInput.value !== state.searchText) {
      cardSearchInput.value = state.searchText;
    }
    clearSearchButton.classList.toggle("is-hidden", state.searchText.length <= 1);
  }

  function renderToast() {
    dashboardToast.textContent = state.toastMessage;
    dashboardToast.classList.toggle("is-hidden", !state.toastMessage);
  }

  app.rendering = {
    applyPan,
    clampPan,
    render,
    renderConfigModal,
  };
})(window.UtilPage ??= {});
