(function initIcons(app) {
  const ICON_PATHS = {
    edit:
      "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    export:
      "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 18H8V7h11v16z",
    lock:
      "M12 17a2 2 0 0 0 2-2c0-.74-.4-1.38-1-1.72V11h-2v2.28A2 2 0 0 0 12 17zm6-8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V11c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V6z",
    remove: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z",
    typeBoard: "M3 5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5zm2 0v14h14V5H5zm2 2h10v3H7V7zm0 5h4v5H7v-5zm6 0h4v5h-4v-5z",
    typeLink:
      "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4v2H7c-.61 0-1.1.49-1.1 1.1S6.39 13.1 7 13.1h4v2H7c-1.71 0-3.1-1.39-3.1-3.1zm5.1 1h6v-2H9v2zm4-4.1h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4v-2h4c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1h-4v-2z",
    typeLocalLink:
      "M4 4h11c1.1 0 2 .9 2 2v3h-2V6H4v12h11v-3h2v3c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm13.59 5.59L20 12l-2.41 2.41-1.42-1.42.59-.59H9v-2h7.76l-.59-.59 1.42-1.42z",
    typeImage:
      "M5 3h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 2v14h14V5H5zm2 11 3.5-4.5 2.5 3.01 1.75-2.26L18 16H7zm2-6.5A1.5 1.5 0 1 1 9 6a1.5 1.5 0 0 1 0 3.5z",
    typeSecret:
      "M12 2a5 5 0 0 0-5 5v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9zm3 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    typeText: "M4 5h16v2H4V5zm0 4h16v2H4V9zm0 4h10v2H4v-2zm0 4h16v2H4v-2z",
    unlock:
      "M12 17a2 2 0 0 0 2-2c0-.74-.4-1.38-1-1.72V11h-2v2.28A2 2 0 0 0 12 17zm6-8H9V6c0-1.66 1.34-3 3-3s3 1.34 3 3h2c0-2.76-2.24-5-5-5S7 3.24 7 6v3H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V11c0-1.1-.9-2-2-2z",
    gridVisible: "M3 3h18v18H3V3zm2 2v4h4V5H5zm6 0v4h4V5h-4zm6 0v4h2V5h-2zM5 11v4h4v-4H5zm6 0v4h4v-4h-4zm6 0v4h2v-4h-2zM5 17v2h4v-2H5zm6 0v2h4v-2h-4zm6 0v2h2v-2h-2z",
    gridHidden:
      "M3.28 2 22 20.72 20.72 22l-3-3H3V4.28l-1-1L3.28 2zM5 6.28V9h2.72L5 6.28zM5 11v4h4v-4H5zm0 6v2h4v-2H5zm6 0v2h4.72l-2-2H11zm0-2h.72l-.72-.72V15zm8-10h-2v4h2V5zm-4 0h-4v2.72l2 2H15V5zm4 6h-2v2.72l2 2V11z",
    miniMap: "M3 4h18v16H3V4zm2 2v12h14V6H5zm2 2h4v3H7V8zm6 1h4v5h-4V9zm-6 4h5v3H7v-3z",
    miniMapHidden:
      "M3.28 2 22 20.72 20.72 22l-3-3H3V4.28l-1-1L3.28 2zM5 6.28V9h2.72L5 6.28zM5 11v5h5.72l-5-5H5zm14 6.72V6H7.28l-2-2H21v15.72l-2-2zM13 8h4v4.72L13 8.72V8z",
  };

  function createIcon(pathData, className = "card__action-icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    path.setAttribute("d", pathData);
    svg.append(path);
    return svg;
  }

  function cardTypeIconPath(type) {
    if (type === "board") return ICON_PATHS.typeBoard;
    if (type === "link") return ICON_PATHS.typeLink;
    if (type === "local-link") return ICON_PATHS.typeLocalLink;
    if (type === "image") return ICON_PATHS.typeImage;
    if (type === "secret") return ICON_PATHS.typeSecret;
    return ICON_PATHS.typeText;
  }

  app.icons = {
    ICON_PATHS,
    cardTypeIconPath,
    createIcon,
  };
})(window.UtilPage ??= {});
