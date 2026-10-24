(() => {
  const uiLocale = browser.i18n.getUILanguage().replaceAll("_", "-");
  const supported = new Set(["zh", "en", "ja", "es", "ko", "fr", "de", "pt"]);
  const locale = supported.has(uiLocale.split("-")[0].toLowerCase()) ? uiLocale : "zh-CN";

  function t(key, values = {}) {
    const message = browser.i18n.getMessage(key);
    return message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (placeholder, name) =>
      Object.hasOwn(values, name) ? String(values[name]) : placeholder);
  }

  function localize(root) {
    for (const element of root.querySelectorAll("[data-i18n]")) {
      element.textContent = t(element.getAttribute("data-i18n"));
    }
    for (const attribute of ["title", "aria-label", "placeholder"]) {
      const marker = `data-i18n-${attribute}`;
      for (const element of root.querySelectorAll(`[${marker}]`)) {
        element.setAttribute(attribute, t(element.getAttribute(marker)));
      }
    }
    for (const template of root.querySelectorAll("template")) localize(template.content);
  }

  window.newTabI18n = Object.freeze({ t, locale });
  document.documentElement.lang = locale;
  localize(document);
})();
