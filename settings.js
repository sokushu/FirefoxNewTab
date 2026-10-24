(() => {
  const { t } = window.newTabI18n;
  const settingsButton = document.getElementById("settings-button");
  const settingsPanel = document.getElementById("settings-panel");
  const settingsScrollContainer = document.getElementById("settings-scroll");
  const settingsCloseButton = document.getElementById("close-settings");
  const settingsClockToggle = document.getElementById("show-clock");
  const settingsClockSection = document.querySelector(".clock-section");
  const settingsThemeInputs = document.querySelectorAll('input[name="theme"]');
  const settingsSystemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const settingsReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let settingsThemePreference = "system";
  let settingsCloseRequest = 0;
  let settingsCloseCleanup = null;

  function applyThemePreference(preference) {
    settingsThemePreference = ["dark", "light", "system"].includes(preference)
      ? preference
      : "system";
    document.documentElement.dataset.theme = settingsThemePreference === "system"
      ? (settingsSystemTheme.matches ? "dark" : "light")
      : settingsThemePreference;

    for (const input of settingsThemeInputs) {
      input.checked = input.value === settingsThemePreference;
    }
  }

  function readPreference(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function savePreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The current tab keeps its selection when local storage is unavailable.
    }
  }

  applyThemePreference(readPreference("theme"));

  for (const input of settingsThemeInputs) {
    input.addEventListener("change", () => {
      if (!input.checked) {
        return;
      }

      applyThemePreference(input.value);

      savePreference("theme", settingsThemePreference);
    });
  }

  settingsSystemTheme.addEventListener("change", () => {
    if (settingsThemePreference === "system") {
      applyThemePreference("system");
    }
  });

  function applyClockVisibility(visible) {
    const changed = document.body.classList.contains("show-clock") !== visible;
    settingsClockToggle.checked = visible;
    settingsClockSection.hidden = !visible;
    document.body.classList.toggle("show-clock", visible);
    if (changed) {
      document.dispatchEvent(new Event("shortcut-layout-change"));
    }
  }

  applyClockVisibility(readPreference("showClock") === "true");

  settingsClockToggle.addEventListener("change", () => {
    const visible = settingsClockToggle.checked;
    applyClockVisibility(visible);

    savePreference("showClock", String(visible));
  });

  window.addEventListener("storage", (event) => {
    if (event.key === "showClock" || event.key === null) {
      applyClockVisibility(event.newValue === "true");
    }
    if (event.key === "theme" || event.key === null) {
      applyThemePreference(event.key === null ? "system" : event.newValue);
    }
  });

  function cancelSettingsClose() {
    settingsCloseRequest += 1;
    settingsCloseCleanup?.();
    settingsCloseCleanup = null;
    settingsPanel.classList.remove("is-closing");
  }

  function openSettings() {
    cancelSettingsClose();
    if (!settingsPanel.open) {
      settingsPanel.classList.remove("is-open");
      settingsPanel.showModal();
      // Commit the off-screen position before starting the slide-in transition.
      settingsPanel.getBoundingClientRect();
    }
    settingsPanel.classList.add("is-open");
    settingsButton.setAttribute("aria-expanded", "true");
  }

  function scrollSettingsRegion(container, target) {
    const containerBounds = container.getBoundingClientRect();
    const targetBounds = target.getBoundingClientRect();
    const targetCenter = targetBounds.top + targetBounds.height / 2;
    const scrollTop = container.scrollTop + targetCenter -
      containerBounds.top - container.clientTop - container.clientHeight / 2;
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    container.scrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));
  }

  function openWallpaperSettings() {
    openSettings();
    const backgroundImages = document.getElementById("background-images");
    const backgroundFileInput = document.getElementById("background-file");
    const backgroundWallpaperTarget =
      backgroundImages.querySelector('[aria-pressed="true"]') ||
      backgroundImages.querySelector("button") ||
      backgroundFileInput;

    scrollSettingsRegion(settingsScrollContainer, backgroundImages);

    if (backgroundFileInput.disabled) {
      const backgroundStatus = document.getElementById("background-status");
      backgroundStatus.textContent = t("ui_wallpaper_processing");
      backgroundStatus.hidden = false;
      return;
    }

    backgroundWallpaperTarget.focus({ preventScroll: true });
  }

  function closeSettings() {
    if (!settingsPanel.open || settingsPanel.classList.contains("is-closing")) {
      return;
    }

    const request = ++settingsCloseRequest;
    const finish = () => {
      if (request !== settingsCloseRequest || !settingsPanel.open) {
        return;
      }
      cancelSettingsClose();
      settingsPanel.close();
    };
    const onTransitionEnd = (event) => {
      if (event.target === settingsPanel && event.propertyName === "transform") {
        finish();
      }
    };

    settingsPanel.classList.add("is-closing");
    settingsPanel.classList.remove("is-open");
    settingsButton.setAttribute("aria-expanded", "false");

    if (settingsReducedMotion.matches) {
      finish();
      return;
    }

    settingsPanel.addEventListener("transitionend", onTransitionEnd);
    // Also finish if a transition is interrupted or never starts.
    const timeout = window.setTimeout(finish, 300);
    settingsCloseCleanup = () => {
      window.clearTimeout(timeout);
      settingsPanel.removeEventListener("transitionend", onTransitionEnd);
    };
  }

  settingsButton.addEventListener("click", openSettings);
  settingsCloseButton.addEventListener("click", closeSettings);

  settingsPanel.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSettings();
  });

  settingsPanel.addEventListener("close", () => {
    if (settingsPanel.open) {
      return;
    }
    cancelSettingsClose();
    settingsPanel.classList.remove("is-open");
    settingsButton.setAttribute("aria-expanded", "false");
    settingsButton.focus({ preventScroll: true });
  });

  settingsPanel.addEventListener("click", (event) => {
    if (event.target !== settingsPanel) {
      return;
    }

    const bounds = settingsPanel.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (outside) {
      closeSettings();
    }
  });

  window.newTabSettings = Object.freeze({ open: openSettings, openWallpapers: openWallpaperSettings });
})();
