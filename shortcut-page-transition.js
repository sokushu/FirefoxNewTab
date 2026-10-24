(() => {
  let elements;
  let transition = null;
  let reducedMotion;

  function cancel() {
    const previous = transition;
    if (!previous) return;
    transition = null;
    window.clearTimeout(previous.timeout);
    for (const animation of previous.animations) {
      try {
        animation.finished.catch(() => {});
        animation.cancel();
      } catch {
        // Restore the live page even if an animation cannot be canceled.
      }
    }
    for (const saved of previous.visibility) {
      if (saved.value) {
        saved.element.style.setProperty("visibility", saved.value, saved.priority);
      } else {
        saved.element.style.removeProperty("visibility");
      }
    }
    elements.list.classList.remove("is-page-transitioning");
    previous.overlay.remove();
  }

  function scrollport() {
    const { main } = elements;
    const bounds = main.getBoundingClientRect();
    const left = Math.max(0, bounds.left + main.clientLeft);
    const top = Math.max(0, bounds.top + main.clientTop);
    const right = Math.min(document.documentElement.clientWidth, bounds.left + main.clientLeft + main.clientWidth);
    const bottom = Math.min(document.documentElement.clientHeight, bounds.top + main.clientTop + main.clientHeight);
    return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
  }

  function capture() {
    if (reducedMotion.matches || typeof elements.list.animate !== "function") return null;
    const snapshots = [];
    try {
      for (const element of [elements.list, elements.empty]) {
        if (element.hidden) continue;
        const bounds = element.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) continue;
        const style = getComputedStyle(element);
        const clone = element.cloneNode(true);
        clone.removeAttribute("id");
        for (const child of clone.querySelectorAll("[id]")) child.removeAttribute("id");
        clone.classList.add("shortcut-page-snapshot");
        clone.setAttribute("aria-hidden", "true");
        clone.setAttribute("inert", "");
        clone.style.width = `${bounds.width}px`;
        clone.style.height = `${bounds.height}px`;
        if (element === elements.list) {
          for (const property of ["gridTemplateColumns", "gridTemplateRows", "gridAutoRows", "columnGap", "rowGap"]) {
            clone.style[property] = style[property];
          }
          for (const name of [
            "--tile-pitch", "--icon-size", "--shortcut-name-font-size", "--shortcut-name-inset", "--shortcut-link-gap",
            "--shortcut-menu-size", "--shortcut-menu-font-size", "--shortcut-menu-offset-top", "--shortcut-menu-offset-side",
            "--shortcut-visible-rows", "--shortcut-layout-columns",
          ]) {
            clone.style.setProperty(name, style.getPropertyValue(name));
          }
          const pitch = Number.parseFloat(style.gridAutoRows);
          if (Number.isFinite(pitch) && pitch > 0) clone.style.setProperty("--tile-pitch", `${pitch}px`);
        }
        snapshots.push({ clone, left: bounds.left, top: bounds.top });
      }
      return snapshots.length ? { snapshots } : null;
    } catch {
      return null;
    }
  }

  function start(snapshot, direction) {
    cancel();
    const { main } = elements;
    main.scrollTop = 0;
    main.scrollLeft = 0;
    if (!snapshot || reducedMotion.matches || (direction !== 1 && direction !== -1)) return;
    const viewport = scrollport();
    const incoming = capture();
    if (!viewport || !incoming) return;
    const overlay = document.createElement("div");
    const current = {
      overlay, animations: [], visibility: [], timeout: 0,
      scrollTop: main.scrollTop, scrollLeft: main.scrollLeft,
    };
    transition = current;
    const finish = () => { if (transition === current) cancel(); };
    try {
      overlay.className = "shortcut-page-transition-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.setAttribute("inert", "");
      Object.assign(overlay.style, {
        left: `${viewport.left}px`, top: `${viewport.top}px`,
        width: `${viewport.width}px`, height: `${viewport.height}px`,
      });
      const panels = [snapshot, incoming].map((page) => {
        const panel = document.createElement("div");
        panel.className = "shortcut-page-transition-panel";
        for (const part of page.snapshots) {
          part.clone.style.left = `${part.left - viewport.left}px`;
          part.clone.style.top = `${part.top - viewport.top}px`;
          panel.append(part.clone);
        }
        overlay.append(panel);
        return panel;
      });
      document.body.append(overlay);
      for (const element of [elements.list, elements.empty]) {
        current.visibility.push({
          element, value: element.style.getPropertyValue("visibility"),
          priority: element.style.getPropertyPriority("visibility"),
        });
        element.style.setProperty("visibility", "hidden");
      }
      elements.list.classList.add("is-page-transitioning");
      const options = { duration: 300, easing: "cubic-bezier(0.22, 0.68, 0, 1)", fill: "both" };
      current.animations.push(panels[0].animate([
        { transform: "translateY(0)" }, { transform: `translateY(${-direction * viewport.height}px)` },
      ], options));
      current.animations.push(panels[1].animate([
        { transform: `translateY(${direction * viewport.height}px)` }, { transform: "translateY(0)" },
      ], options));
      Promise.all(current.animations.map((animation) => animation.finished)).then(finish, finish);
      current.timeout = window.setTimeout(finish, 450);
    } catch {
      finish();
    }
  }

  function init(configuration) {
    elements = configuration;
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.addEventListener("contextmenu", cancel, { capture: true });
    document.addEventListener("shortcut-menu-open", cancel);
    document.addEventListener("shortcut-sidebar-transition-start", cancel);
    window.addEventListener("resize", cancel);
    window.addEventListener("pagehide", cancel);
    reducedMotion.addEventListener("change", (event) => { if (event.matches) cancel(); });
    window.addEventListener("scroll", (event) => {
      const { main } = elements;
      if (transition && event.target === main &&
        (main.scrollTop !== transition.scrollTop || main.scrollLeft !== transition.scrollLeft)) cancel();
    }, { capture: true, passive: true });
  }

  window.shortcutPageTransition = Object.freeze({ init, capture, start, cancel });
})();
