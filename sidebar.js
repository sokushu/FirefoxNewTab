(() => {
  const { t } = window.newTabI18n;
  const storageKey = "shortcutSidebarCollapsed";
  const toggle = document.getElementById("group-sidebar-toggle");
  const sidebar = document.getElementById("group-sidebar");
  const main = document.querySelector(".new-tab");
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let collapsed = false;
  let animation = null;

  function readPreference() {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return collapsed;
    }
  }

  function readPitch() {
    const list = document.getElementById("shortcuts-list");
    const pitch = list && Number.parseFloat(getComputedStyle(list).gridAutoRows);
    return Number.isFinite(pitch) && pitch > 0 ? pitch : 96;
  }

  function finish(run, { animateTiles = true } = {}) {
    if (animation !== run) return;
    const list = document.getElementById("shortcuts-list");
    const motion = window.shortcutTileMotion;
    let snapshot = null;
    if (animateTiles && !reducedMotion.matches && !document.hidden) {
      try {
        snapshot = motion?.capture?.(list, { fromVisual: true });
      } catch {
        motion?.cancel?.();
      }
    }
    window.cancelAnimationFrame(run.frame);
    animation = null;
    root.style.removeProperty("--sidebar-width");
    main?.style.removeProperty("--tile-pitch");
    root.classList.remove("groups-resizing");
    document.dispatchEvent(new Event("shortcut-sidebar-change"));
    if (snapshot) {
      try {
        motion?.play?.(list, snapshot);
      } catch {
        motion?.cancel?.();
      }
    }
  }

  function settle() {
    if (animation) finish(animation, { animateTiles: false });
  }

  function apply(nextCollapsed, { persist = false, notify = true } = {}) {
    const changed = collapsed !== nextCollapsed;
    const fromWidth = changed && notify && sidebar ? sidebar.getBoundingClientRect().width : 0;
    const fromPitch = changed && notify ? readPitch() : 96;
    const animate = changed && notify && sidebar && !reducedMotion.matches && !document.hidden;

    if (changed && notify) {
      if (animation) {
        window.cancelAnimationFrame(animation.frame);
        animation = null;
      }
      root.classList.add("groups-resizing");
      document.dispatchEvent(new Event("shortcut-sidebar-transition-start"));
    }

    collapsed = nextCollapsed;
    root.classList.toggle("groups-collapsed", collapsed);
    if (toggle) {
      const label = t(collapsed ? "sidebar_expand" : "sidebar_collapse");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", label);
      toggle.title = label;
    }
    if (persist) {
      try {
        localStorage.setItem(storageKey, String(collapsed));
      } catch {
        // Preference failures must not prevent using the sidebar in this tab.
      }
    }
    if (!changed || !notify) return;

    root.style.removeProperty("--sidebar-width");
    main?.style.removeProperty("--tile-pitch");
    const toWidth = sidebar?.getBoundingClientRect().width ?? fromWidth;
    const toPitch = readPitch();
    const run = { frame: 0, started: null };
    animation = run;
    if (!animate || (Math.abs(toWidth - fromWidth) < 0.5 && Math.abs(toPitch - fromPitch) < 0.05)) {
      finish(run, { animateTiles: false });
      return;
    }

    root.style.setProperty("--sidebar-width", `${fromWidth}px`);
    main?.style.setProperty("--tile-pitch", `${fromPitch}px`);
    const step = (now) => {
      if (animation !== run) return;
      run.started ??= now;
      const progress = Math.min(1, (now - run.started) / 220);
      const eased = 1 - (1 - progress) ** 3;
      root.style.setProperty("--sidebar-width", `${fromWidth + (toWidth - fromWidth) * eased}px`);
      main?.style.setProperty("--tile-pitch", `${fromPitch + (toPitch - fromPitch) * eased}px`);
      if (progress < 1) run.frame = window.requestAnimationFrame(step);
      else finish(run);
    };
    run.frame = window.requestAnimationFrame(step);
  }

  apply(readPreference(), { notify: false });
  toggle?.addEventListener("click", () => apply(!collapsed, { persist: true }));
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) apply(readPreference());
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) settle();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) settle();
  });
  window.addEventListener("resize", settle);
  window.addEventListener("pagehide", settle);
  document.addEventListener("shortcut-layout-change", settle);
})();
