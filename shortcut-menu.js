(() => {
  const { t } = window.newTabI18n;
  let current = null;

  function close(restoreFocus = false) {
    if (!current) return;
    const previous = current;
    current = null;
    previous.menu.hidden = true;
    previous.menu.classList.remove("context-menu");
    for (const property of ["left", "top", "max-width", "max-height"]) previous.menu.style.removeProperty(property);
    previous.toggle.setAttribute("aria-expanded", "false");
    previous.card.classList.remove("menu-open");
    if (restoreFocus) previous.returnFocus.focus({ preventScroll: true });
  }

  function items(menu) {
    return Array.from(menu.querySelectorAll('[role="menuitem"], [role="menuitemradio"]'))
      .filter((item) => !item.disabled && !item.hidden);
  }

  function bounds(menu) {
    const result = { left: 8, top: 8, right: document.documentElement.clientWidth - 8, bottom: document.documentElement.clientHeight - 8 };
    const region = menu.closest(".new-tab");
    if (region) {
      const rect = region.getBoundingClientRect();
      result.left = Math.max(result.left, rect.left + region.clientLeft + 8);
      result.top = Math.max(result.top, rect.top + region.clientTop + 8);
      result.right = Math.min(result.right, rect.left + region.clientLeft + region.clientWidth - 8);
      result.bottom = Math.min(result.bottom, rect.top + region.clientTop + region.clientHeight - 8);
    }
    menu.style.maxWidth = `${Math.max(1, result.right - result.left)}px`;
    menu.style.maxHeight = `${Math.max(1, result.bottom - result.top)}px`;
    return result;
  }

  function open(state, event) {
    if (!event && current?.toggle === state.toggle && !state.menu.classList.contains("context-menu")) {
      close(true);
      return;
    }
    document.dispatchEvent(new Event("shortcut-menu-open"));
    const { card, menu, toggle, link } = state;
    current = { ...state, returnFocus: event ? link : toggle };
    menu.classList.toggle("context-menu", Boolean(event));
    menu.hidden = true;
    void menu.offsetWidth;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    card.classList.add("menu-open");
    const limits = bounds(menu);
    let originX = 0;
    let originY = 0;
    let x;
    let y;
    if (event) {
      menu.style.left = "0px";
      menu.style.top = "0px";
      const icon = link.querySelector(".shortcut-icon").getBoundingClientRect();
      const pointer = event.clientX !== 0 || event.clientY !== 0;
      x = pointer ? event.clientX : icon.left;
      y = pointer ? event.clientY : icon.bottom + 4;
    } else {
      const parent = menu.offsetParent || menu.parentElement;
      const rect = parent.getBoundingClientRect();
      originX = rect.left + parent.clientLeft - parent.scrollLeft;
      originY = rect.top + parent.clientTop - parent.scrollTop;
      x = originX + menu.offsetLeft;
      y = originY + menu.offsetTop;
    }
    const left = Math.min(Math.max(limits.left, x), Math.max(limits.left, limits.right - menu.offsetWidth));
    const top = Math.min(Math.max(limits.top, y), Math.max(limits.top, limits.bottom - menu.offsetHeight));
    menu.style.left = `${left - originX}px`;
    menu.style.top = `${top - originY}px`;
    items(menu)[0]?.focus({ preventScroll: true });
  }

  function bind(card, { label, size, onOpen, onEdit, onDelete, onSize }) {
    const link = card.querySelector(".shortcut-link");
    const toggle = card.querySelector(".shortcut-menu-toggle");
    const menu = card.querySelector(".shortcut-menu");
    const state = { card, link, toggle, menu };
    link.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      open(state, event);
    });
    toggle.setAttribute("aria-label", t("menu_website_named", { name: label }));
    toggle.addEventListener("click", (event) => { event.stopPropagation(); open(state); });
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Tab") { close(true); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const options = items(menu);
      if (!options.length) return;
      const index = options.indexOf(document.activeElement);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : index < 0 ? (direction > 0 ? 0 : options.length - 1)
        : (index + direction + options.length) % options.length;
      options[next].focus({ preventScroll: true });
    });
    for (const [selector, action, key] of [
      [".shortcut-open", onOpen, "menu_open_named"], [".shortcut-edit", onEdit, "menu_edit_named"], [".shortcut-delete", onDelete, "menu_delete_named"],
    ]) {
      const button = card.querySelector(selector);
      button.setAttribute("aria-label", t(key, { name: label }));
      button.addEventListener("click", (event) => { event.stopPropagation(); close(true); action(); });
    }
    for (const option of menu.querySelectorAll(".shortcut-size-option[data-size]")) {
      option.setAttribute("aria-checked", String(option.dataset.size === size));
      option.addEventListener("click", (event) => { event.stopPropagation(); close(true); onSize(option.dataset.size); });
    }
  }

  function init() {
    const closeOutside = (event) => {
      if (!current || current.menu.contains(event.target) || current.toggle.contains(event.target)) return;
      if (event.type === "pointerdown" && event.button === 2 && current.link.contains(event.target)) return;
      close();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("click", closeOutside);
    document.addEventListener("shortcut-menu-open", () => close());
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && current) { event.preventDefault(); close(true); }
    });
    window.addEventListener("scroll", (event) => {
      if (!(event.target instanceof Node) || !current?.menu.contains(event.target)) close(true);
    }, { capture: true, passive: true });
    window.addEventListener("resize", () => close(true));
    window.addEventListener("pagehide", () => close());
  }

  window.shortcutMenu = Object.freeze({ init, bind, close });
})();
