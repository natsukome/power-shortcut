(function bootstrap(app) {
  app.storage.loadStoredState();
  app.interactions.attachEventHandlers();
  app.rendering.render();
  app.storage.refreshStorageEstimate().then(app.rendering.render);
})(window.UtilPage);
