(function initDom(app) {
  const typeInput = document.querySelector("#typeInput");
  const contentInput = document.querySelector("#contentInput");
  const urlInput = document.querySelector("#urlInput");
  const secretInput = document.querySelector("#secretInput");

  app.dom = {
    dashboard: document.querySelector("#dashboard"),
    dashboardToast: document.querySelector("#dashboardToast"),
    gridLayer: document.querySelector("#gridLayer"),
    cardLayer: document.querySelector("#cardLayer"),
    cardConfigModal: document.querySelector("#cardConfigModal"),
    addCardButton: document.querySelector("#addCardButton"),
    closeConfigButton: document.querySelector("#closeConfigButton"),
    cancelConfigButton: document.querySelector("#cancelConfigButton"),
    saveConfigButton: document.querySelector("#saveConfigButton"),
    cardList: document.querySelector("#cardList"),
    cardCount: document.querySelector("#cardCount"),
    configCardMeta: document.querySelector("#configCardMeta"),
    typeInput,
    typeField: typeInput.closest("label"),
    titleInput: document.querySelector("#titleInput"),
    contentInput,
    contentField: contentInput.closest("label"),
    urlInput,
    urlField: urlInput.closest("label"),
    secretInput,
    secretField: secretInput.closest("label"),
    widthInput: document.querySelector("#widthInput"),
    heightInput: document.querySelector("#heightInput"),
    zoomInButton: document.querySelector("#zoomInButton"),
    zoomOutButton: document.querySelector("#zoomOutButton"),
  };
})(window.UtilPage ??= {});
