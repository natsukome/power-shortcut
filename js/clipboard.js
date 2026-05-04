(function initClipboard(app) {
  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }

  async function copySecretCard(card) {
    const secret = card.secret ?? "";
    if (!secret) return;
    await copyText(secret);
  }

  app.clipboard = {
    copySecretCard,
    copyText,
  };
})(window.UtilPage ??= {});
