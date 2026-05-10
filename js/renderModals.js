(function initRenderModals(app) {
  const { CARD_TYPES, CARD_TYPE_DEFS } = app.constants;
  const {
    cardConfigModal,
    cardContextMenu,
    colorThemeField,
    colorThemeInput,
    configCardMeta,
    contentField,
    contentInput,
    heightInput,
    imagePathField,
    imagePathInput,
    importContentInput,
    importModal,
    localLinkModeField,
    localLinkModeInput,
    localPathField,
    localPathInput,
    mobileUtilButton,
    saveConfigButton,
    secretField,
    secretInput,
    storageIndicator,
    titleInput,
    typeField,
    typeInput,
    urlField,
    urlInput,
    utilModal,
    widthInput,
  } = app.dom;
  const { state } = app;
  const { ICON_PATHS, cardTypeIconPath, createIcon } = app.icons;

  function renderUtilModal() {
    utilModal.classList.toggle("is-mobile-open", state.utilModalOpen);
    mobileUtilButton.setAttribute("aria-expanded", String(state.utilModalOpen));
    renderStorageIndicator();
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    const precision = value >= 10 || unitIndex === 0 ? 1 : 2;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
  }

  function renderStorageIndicator() {
    const { appBytes, usageBytes, quotaBytes, remainingBytes } = state.storageEstimate;
    const usedPercent = quotaBytes > 0 ? Math.min(100, (appBytes / quotaBytes) * 100) : 0;
    const label = `${usedPercent < 0.1 && appBytes > 0 ? "<0.1" : usedPercent.toFixed(1)}% used`;
    const quotaLabel = `${formatBytes(quotaBytes)} assumed localStorage quota`;
    const title = [
      `UtilPage data: ${formatBytes(appBytes)} of ${quotaLabel}.`,
      `Origin usage: ${formatBytes(usageBytes)}.`,
      `Remaining: ${formatBytes(remainingBytes)}.`,
    ].join(" ");

    storageIndicator.textContent = label;
    storageIndicator.title = title;
  }

  function renderConfigModal() {
    const isOpen = Boolean(state.configMode && state.draft);
    cardConfigModal.classList.toggle("is-hidden", !isOpen);

    if (!isOpen) return;

    configCardMeta.textContent = state.configMode === "create" ? "New card" : "Edit card";
    saveConfigButton.textContent = state.configMode === "create" ? "Add" : "Save";
    typeField.hidden = state.configMode === "edit";
    colorThemeField.hidden = false;
    const editableFields = new Set(CARD_TYPE_DEFS[state.draft.type]?.editableFields ?? []);
    contentField.hidden = !editableFields.has("content");
    urlField.hidden = !editableFields.has("url");
    localPathField.hidden = !editableFields.has("localPath");
    localLinkModeField.hidden = !editableFields.has("localLinkMode");
    imagePathField.hidden = !editableFields.has("imagePath");
    secretField.hidden = !editableFields.has("secret");
    typeInput.value = state.draft.type;
    colorThemeInput.value = state.draft.colorTheme ?? "slate";
    titleInput.value = state.draft.title;
    contentInput.value = state.draft.content;
    urlInput.value = state.draft.url ?? "";
    localPathInput.value = state.draft.localPath ?? "";
    localLinkModeInput.value = state.draft.localLinkMode === "text" ? "text" : "app";
    imagePathInput.value = state.draft.imagePath ?? "";
    secretInput.value = state.draft.secret ?? "";
    widthInput.value = state.draft.width;
    heightInput.value = state.draft.height;
  }

  function renderImportModal() {
    importModal.classList.toggle("is-hidden", !state.importModalOpen);
    if (!state.importModalOpen) return;

    if (importContentInput.value !== state.importContent) {
      importContentInput.value = state.importContent;
    }
  }

  function createContextMenuButton(action, label, iconPath, disabled = false) {
    const button = document.createElement("button");
    const text = document.createElement("span");

    button.type = "button";
    button.className = "card-context-menu__item";
    button.dataset.action = action;
    button.disabled = disabled;
    text.textContent = label;
    button.append(createIcon(iconPath), text);
    return button;
  }

  function createAddCardContextMenuButton(type, label) {
    const button = createContextMenuButton("add-card", label, cardTypeIconPath(type));
    button.dataset.cardType = type;
    return button;
  }

  function renderCardContextMenu() {
    const menuState = state.contextMenu;
    const isCreateMenu = menuState?.mode === "create";
    const isImageMenu = menuState?.mode === "image";
    const card = menuState?.mode === "card" ? state.cards.find((item) => item.id === menuState.cardId) : null;

    cardContextMenu.classList.toggle("is-hidden", !card && !isCreateMenu && !isImageMenu);
    cardContextMenu.replaceChildren();
    if ((!card && !isCreateMenu && !isImageMenu) || !menuState) return;

    cardContextMenu.style.left = `${menuState.x}px`;
    cardContextMenu.style.top = `${menuState.y}px`;

    if (isCreateMenu) {
      cardContextMenu.append(...CARD_TYPES.map((cardType) => createAddCardContextMenuButton(cardType.id, cardType.label)));
      return;
    }

    if (isImageMenu) {
      cardContextMenu.append(createContextMenuButton("copy-image-path", "Copy path", ICON_PATHS.export));
      return;
    }

    cardContextMenu.append(
      createContextMenuButton("edit", "Edit", ICON_PATHS.edit, !card.isMutable),
      createContextMenuButton("remove", "Remove", ICON_PATHS.remove, !card.isMutable),
      createContextMenuButton("toggle-mutability", card.isMutable ? "Lock" : "Unlock", card.isMutable ? ICON_PATHS.lock : ICON_PATHS.unlock),
      createContextMenuButton("export-partial", "Export", ICON_PATHS.export),
    );
  }

  app.renderModals = {
    renderCardContextMenu,
    renderConfigModal,
    renderImportModal,
    renderUtilModal,
  };
})(window.UtilPage ??= {});
