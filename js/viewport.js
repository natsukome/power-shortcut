(function initViewport(app) {
  const { MOBILE_BREAKPOINT_PX } = app.constants;
  const mobileViewportQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);

  function isMobileViewport() {
    return mobileViewportQuery.matches;
  }

  app.viewport = {
    isMobileViewport,
    MOBILE_BREAKPOINT_PX,
  };
})(window.UtilPage ??= {});
