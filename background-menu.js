(() => {
  const { t } = window.newTabI18n;
  const backgroundMenuElement = document.getElementById("background-context-menu");
  const backgroundMenuItems = Array.from(backgroundMenuElement.querySelectorAll("button"));
  const backgroundAddShortcut = document.getElementById("context-add-shortcut");
  const backgroundMenuExcluded = [
    "dialog", ".group-sidebar", '[role="menu"]', "a", "button", "input",
    "textarea", "select", "label", "summary", "iframe", "audio", "video",
    '[role="button"]', '[role="link"]', "[tabindex]", "[contenteditable]",
  ].join(",");

  let backgroundMenuReturnFocus = null;

  function backgroundMenuEnabledItems() {
    return backgroundMenuItems.filter((item) => !item.disabled && !item.hidden);
  }

  function refreshBackgroundMenuCapacity() {
    let capacity;
    try {
      capacity = window.shortcutBoard?.getCapacity?.();
    } catch {
      capacity = null;
    }

    const disabled = !capacity?.canAdd;
    backgroundAddShortcut.disabled = disabled;
    backgroundAddShortcut.setAttribute("aria-disabled", String(disabled));
    backgroundAddShortcut.title = disabled
      ? capacity?.reason || t("ui_group_full", { count: 60 })
      : t("ui_add_website_icon");

    if (disabled && !backgroundMenuElement.hidden && document.activeElement === backgroundAddShortcut) {
      backgroundMenuEnabledItems()[0]?.focus({ preventScroll: true });
    }
  }

  function backgroundMenuCanOpen(backgroundMenuTarget) {
    if (
      !(backgroundMenuTarget instanceof Element) ||
      document.body.classList.contains("is-shortcut-dragging") ||
      backgroundMenuTarget.isContentEditable
    ) {
      return false;
    }

    const backgroundMenuControl = backgroundMenuTarget.closest(backgroundMenuExcluded);
    return !backgroundMenuControl || backgroundMenuControl.id === "shortcuts-list";
  }

  function backgroundMenuClose(backgroundMenuRestoreFocus = false) {
    if (backgroundMenuElement.hidden) {
      return;
    }

    const backgroundMenuPreviousFocus = backgroundMenuReturnFocus;
    backgroundMenuReturnFocus = null;
    backgroundMenuElement.hidden = true;
    backgroundMenuElement.style.removeProperty("left");
    backgroundMenuElement.style.removeProperty("top");

    if (backgroundMenuRestoreFocus && backgroundMenuPreviousFocus?.isConnected) {
      backgroundMenuPreviousFocus.focus({ preventScroll: true });
    }
  }

  function backgroundMenuOpen(backgroundMenuEvent) {
    window.shortcutMenu.close(true);
    refreshBackgroundMenuCapacity();

    if (backgroundMenuElement.hidden) {
      backgroundMenuReturnFocus = document.activeElement;
    }

    backgroundMenuElement.hidden = true;
    void backgroundMenuElement.offsetWidth;
    backgroundMenuElement.hidden = false;
    backgroundMenuElement.style.left = "0px";
    backgroundMenuElement.style.top = "0px";

    const backgroundMenuBoxWidth = backgroundMenuElement.offsetWidth;
    const backgroundMenuBoxHeight = backgroundMenuElement.offsetHeight;
    const backgroundMenuWidth = document.documentElement.clientWidth;
    const backgroundMenuHeight = document.documentElement.clientHeight;
    const backgroundMenuHasPointer = backgroundMenuEvent.clientX !== 0 || backgroundMenuEvent.clientY !== 0;
    const backgroundMenuX = backgroundMenuHasPointer ? backgroundMenuEvent.clientX : backgroundMenuWidth / 2;
    const backgroundMenuY = backgroundMenuHasPointer ? backgroundMenuEvent.clientY : backgroundMenuHeight / 2;
    const backgroundMenuLeft = Math.min(
      Math.max(8, backgroundMenuX),
      Math.max(8, backgroundMenuWidth - backgroundMenuBoxWidth - 8),
    );
    const backgroundMenuTop = Math.min(
      Math.max(8, backgroundMenuY),
      Math.max(8, backgroundMenuHeight - backgroundMenuBoxHeight - 8),
    );
    backgroundMenuElement.style.left = `${backgroundMenuLeft}px`;
    backgroundMenuElement.style.top = `${backgroundMenuTop}px`;
    backgroundMenuEnabledItems()[0]?.focus({ preventScroll: true });
  }

  document.addEventListener("contextmenu", (backgroundMenuEvent) => {
    if (backgroundMenuEvent.defaultPrevented || !backgroundMenuCanOpen(backgroundMenuEvent.target)) {
      return;
    }

    backgroundMenuEvent.preventDefault();
    backgroundMenuOpen(backgroundMenuEvent);
  });

  document.addEventListener("shortcut-menu-open", () => backgroundMenuClose());
  document.addEventListener("shortcut-capacity-change", refreshBackgroundMenuCapacity);

  function backgroundMenuCloseOnOutside(backgroundMenuEvent) {
    if (backgroundMenuElement.hidden || backgroundMenuElement.contains(backgroundMenuEvent.target)) {
      return;
    }

    if (
      backgroundMenuEvent.type === "pointerdown" &&
      backgroundMenuEvent.button === 2 &&
      backgroundMenuCanOpen(backgroundMenuEvent.target)
    ) {
      return;
    }

    backgroundMenuClose();
  }

  document.addEventListener("pointerdown", backgroundMenuCloseOnOutside);
  document.addEventListener("click", backgroundMenuCloseOnOutside);

  backgroundMenuElement.addEventListener("keydown", (backgroundMenuEvent) => {
    if (backgroundMenuEvent.key === "Tab") {
      backgroundMenuClose(true);
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(backgroundMenuEvent.key)) {
      return;
    }

    backgroundMenuEvent.preventDefault();
    const enabledItems = backgroundMenuEnabledItems();
    if (!enabledItems.length) {
      return;
    }
    const backgroundMenuCurrent = enabledItems.indexOf(document.activeElement);
    const backgroundMenuDirection = backgroundMenuEvent.key === "ArrowDown" ? 1 : -1;
    const backgroundMenuNext = backgroundMenuEvent.key === "Home" ? 0
      : backgroundMenuEvent.key === "End" ? enabledItems.length - 1
      : backgroundMenuCurrent < 0 ? (backgroundMenuDirection > 0 ? 0 : enabledItems.length - 1)
      : (backgroundMenuCurrent + backgroundMenuDirection + enabledItems.length) % enabledItems.length;
    enabledItems[backgroundMenuNext].focus({ preventScroll: true });
  });

  document.addEventListener("keydown", (backgroundMenuEvent) => {
    if (backgroundMenuEvent.key === "Escape" && !backgroundMenuElement.hidden) {
      backgroundMenuEvent.preventDefault();
      backgroundMenuClose(true);
    }
  });

  window.addEventListener("scroll", (backgroundMenuEvent) => {
    if (
      backgroundMenuEvent.target instanceof Node &&
      backgroundMenuElement.contains(backgroundMenuEvent.target)
    ) {
      return;
    }

    backgroundMenuClose(true);
  }, { capture: true, passive: true });
  window.addEventListener("resize", () => backgroundMenuClose(true));

  for (const [backgroundMenuButtonId, backgroundMenuAction] of [
    ["context-add-shortcut", () => window.shortcutBoard.openEditor()],
    ["context-change-wallpaper", () => window.newTabSettings.openWallpapers()],
    ["context-open-settings", () => window.newTabSettings.open()],
  ]) {
    const backgroundMenuButton = document.getElementById(backgroundMenuButtonId);
    backgroundMenuButton.addEventListener("click", () => {
      if (backgroundMenuButton === backgroundAddShortcut) {
        refreshBackgroundMenuCapacity();
      }
      if (backgroundMenuButton.disabled) {
        return;
      }
      backgroundMenuClose(true);
      backgroundMenuAction();
    });
  }

  refreshBackgroundMenuCapacity();
})();
