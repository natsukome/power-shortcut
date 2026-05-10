(function initRender(app) {
  const { CARD_TYPES, DASHBOARD_HEIGHT_UNITS, DASHBOARD_WIDTH_UNITS, GRID_SIZE } = app.constants;
  const {
    cardSearchInput,
    cardTypeFilterBadges,
    cardTypeFilterInput,
    clearSearchButton,
    dashboardToast,
    gridLayer,
    gridToggleButton,
    typeInput,
  } = app.dom;
  const { state } = app;
  const { ICON_PATHS, createIcon } = app.icons;
  const { renderCardList, renderCards } = app.renderCards;
  const { renderMiniMap } = app.renderMiniMap;
  const { renderCardContextMenu, renderConfigModal, renderImportModal, renderUtilModal } = app.renderModals;

  function initializeTypeOptions() {
    const addTypeOption = document.createElement("option");
    addTypeOption.value = "";
    addTypeOption.textContent = "Card type filter";

    cardTypeFilterInput.replaceChildren(
      addTypeOption,
      ...CARD_TYPES.map((cardType) => {
        const option = document.createElement("option");
        option.value = cardType.id;
        option.textContent = cardType.label;
        return option;
      }),
    );

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
    cardTypeFilterInput.value = "";
    [...cardTypeFilterInput.options].forEach((option) => {
      option.disabled = Boolean(option.value && state.cardTypeFilters.has(option.value));
    });
    renderCardTypeFilterBadges();
    clearSearchButton.classList.toggle("is-hidden", state.searchText.length <= 1);
  }

  function renderCardTypeFilterBadges() {
    const badges = [...state.cardTypeFilters].map((type) => {
      const cardType = CARD_TYPES.find((item) => item.id === type);
      const badge = document.createElement("span");
      const text = document.createElement("span");
      const removeButton = document.createElement("button");

      badge.className = "type-filter-badge";
      text.textContent = cardType?.label ?? type;
      removeButton.type = "button";
      removeButton.className = "type-filter-badge__remove";
      removeButton.dataset.cardType = type;
      removeButton.setAttribute("aria-label", `Remove ${text.textContent} filter`);
      removeButton.textContent = "x";
      badge.append(text, removeButton);
      return badge;
    });

    cardTypeFilterBadges.classList.toggle("is-hidden", badges.length === 0);
    cardTypeFilterBadges.replaceChildren(...badges);
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
