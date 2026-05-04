(function initSearchModel(app) {
  const { CARD_TYPE_DEFS } = app.constants;

  function normalizeSearchText(text) {
    return String(text ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function isSubsequence(needle, haystack) {
    let index = 0;
    for (const char of haystack) {
      if (char === needle[index]) index += 1;
      if (index === needle.length) return true;
    }
    return false;
  }

  function searchableCardFields(card) {
    const fields = [{ label: "title", text: card.title }];
    const typeFields = CARD_TYPE_DEFS[card.type]?.searchableFields ?? [];
    typeFields.forEach((field) => fields.push({ label: field.label, text: card[field.key] }));
    return fields.filter((field) => field.text);
  }

  function searchTextScore(text, query) {
    const normalizedQuery = normalizeSearchText(query);
    const haystack = normalizeSearchText(text);
    if (!normalizedQuery || !haystack) return 0;
    if (haystack.includes(normalizedQuery)) return 100 + normalizedQuery.length;

    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const tokenHits = queryTokens.filter((token) => haystack.includes(token)).length;
    if (tokenHits === queryTokens.length) return 80 + tokenHits;
    if (queryTokens.length === 1 && normalizedQuery.length >= 3 && isSubsequence(normalizedQuery, haystack)) return 40;
    return 0;
  }

  function searchScore(card, query) {
    return Math.max(0, ...searchableCardFields(card).map((field) => searchTextScore(field.text, query)));
  }

  function searchFieldLabels(card, query) {
    return searchableCardFields(card)
      .filter((field) => searchTextScore(field.text, query) > 0)
      .map((field) => field.label);
  }

  function searchCards(cards, query) {
    return cards
      .map((card) => ({ card, fields: searchFieldLabels(card, query), score: searchScore(card, query) }))
      .filter((result) => result.score > 0)
      .sort((first, second) => second.score - first.score || first.card.title.localeCompare(second.card.title));
  }

  app.searchModel = {
    searchCards,
  };
})(window.UtilPage ??= {});
