(function bootstrap(app) {
  app.storage.loadStoredState();
  app.interactions.attachEventHandlers();
  app.rendering.render();
})(window.UtilPage);
