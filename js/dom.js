(function initDom(app) {
  const typeInput = document.querySelector("#typeInput");
  const colorThemeInput = document.querySelector("#colorThemeInput");
  const contentInput = document.querySelector("#contentInput");
  const urlInput = document.querySelector("#urlInput");
  const localPathInput = document.querySelector("#localPathInput");
  const localLinkModeInput = document.querySelector("#localLinkModeInput");
  const imagePathInput = document.querySelector("#imagePathInput");
  const secretInput = document.querySelector("#secretInput");

  app.dom = {
    dashboard: document.querySelector("#dashboard"),
    dashboardToast: document.querySelector("#dashboardToast"),
    gridToggleButton: document.querySelector("#gridToggleButton"),
    gridLayer: document.querySelector("#gridLayer"),
    cardLayer: document.querySelector("#cardLayer"),
    cardContextMenu: document.querySelector("#cardContextMenu"),
    cardConfigModal: document.querySelector("#cardConfigModal"),
    importModal: document.querySelector("#importModal"),
    utilModal: document.querySelector("#utilModal"),
    mobileAddCardButton: document.querySelector("#mobileAddCardButton"),
    mobileUtilButton: document.querySelector("#mobileUtilButton"),
    miniMap: document.querySelector("#miniMap"),
    miniMapSurface: document.querySelector("#miniMapSurface"),
    miniMapToggleButton: document.querySelector("#miniMapToggleButton"),
    addCardButton: document.querySelector("#addCardButton"),
    cardSearchInput: document.querySelector("#cardSearchInput"),
    clearSearchButton: document.querySelector("#clearSearchButton"),
    closeConfigButton: document.querySelector("#closeConfigButton"),
    cancelConfigButton: document.querySelector("#cancelConfigButton"),
    saveConfigButton: document.querySelector("#saveConfigButton"),
    closeImportButton: document.querySelector("#closeImportButton"),
    cancelImportButton: document.querySelector("#cancelImportButton"),
    confirmImportButton: document.querySelector("#confirmImportButton"),
    cardList: document.querySelector("#cardList"),
    cardCount: document.querySelector("#cardCount"),
    configCardMeta: document.querySelector("#configCardMeta"),
    typeInput,
    typeField: typeInput.closest("label"),
    colorThemeInput,
    colorThemeField: colorThemeInput.closest("label"),
    titleInput: document.querySelector("#titleInput"),
    contentInput,
    contentField: contentInput.closest("label"),
    urlInput,
    urlField: urlInput.closest("label"),
    localPathInput,
    localPathField: localPathInput.closest("label"),
    localLinkModeInput,
    localLinkModeField: localLinkModeInput.closest("label"),
    imagePathInput,
    imagePathField: imagePathInput.closest("label"),
    secretInput,
    secretField: secretInput.closest("label"),
    widthInput: document.querySelector("#widthInput"),
    heightInput: document.querySelector("#heightInput"),
    importContentInput: document.querySelector("#importContentInput"),
    zoomInButton: document.querySelector("#zoomInButton"),
    zoomOutButton: document.querySelector("#zoomOutButton"),
    exportButton: document.querySelector("#exportButton"),
    importButton: document.querySelector("#importButton"),
  };
})(window.UtilPage ??= {});
