(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const snapshots = new WeakMap();
  const activeClass = "shortcut-tile-motion-active";
  const resizeClass = "shortcut-tile-motion-resize";
  const duration = 280;
  const overshoot = 0.025;
  let captureSequence = 0;
  let currentRun = null;

  function rect(element) {
    if (!element) return null;
    const { left, top, width, height } = element.getBoundingClientRect();
    return [left, top, width, height].every(Number.isFinite) && width > 0 && height > 0
      ? { left, top, width, height }
      : null;
  }

  function tiles(list) {
    const result = new Map();
    for (const item of list.children) {
      const id = item.dataset.shortcutId;
      const key = id || null;
      if (!key || result.has(key)) continue;
      const itemRect = rect(item);
      if (!itemRect) continue;
      const icon = item.querySelector(".shortcut-icon");
      const name = item.querySelector(".shortcut-name");
      const menu = item.querySelector(".shortcut-menu-wrap");
      result.set(key, {
        item, itemRect, icon, iconRect: rect(icon), name, nameRect: rect(name),
        menu, menuRect: rect(menu),
      });
    }
    return result;
  }

  function finish(run) {
    if (currentRun !== run) return;
    currentRun = null;
    window.clearTimeout(run.timeout);
    run.observer?.disconnect();
    for (const animation of run.animations) {
      try {
        animation.finished.catch(() => {});
        animation.cancel();
      } catch {
        // Complete cleanup even if an animation has already been removed.
      }
    }
    for (const icon of run.resizingIcons) icon.classList.remove(resizeClass);
    run.list.classList.remove(activeClass);
  }

  function cancel() {
    if (currentRun) finish(currentRun);
    // A synchronous render between capture and play may call cancel().
    // Pending snapshots remain valid until another capture supersedes them.
  }

  function capture(list, { fromVisual = false } = {}) {
    let visualTiles = null;
    if (fromVisual && list?.isConnected && currentRun?.list === list) {
      try { visualTiles = tiles(list); } catch {}
    }
    cancel();
    const sequence = ++captureSequence;
    if (!list?.isConnected || reducedMotion.matches || getComputedStyle(list).visibility === "hidden" ||
        list.classList.contains("is-page-transitioning")) return null;

    list.classList.add(activeClass);
    try {
      const entries = new Map();
      for (const [key, tile] of visualTiles || tiles(list)) {
        entries.set(key, {
          itemRect: tile.itemRect, iconRect: tile.iconRect, nameRect: tile.nameRect,
          menuRect: tile.menuRect,
        });
      }
      const snapshot = Object.freeze({});
      snapshots.set(snapshot, {
        list, sequence, entries, used: false,
        viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
      });
      return snapshot;
    } catch {
      return null;
    } finally {
      list.classList.remove(activeClass);
    }
  }

  function translate(x, y) {
    return `${x}px ${y}px`;
  }

  function movement(x, y) {
    return [
      { translate: translate(x, y), offset: 0 },
      { translate: translate(-x * overshoot, -y * overshoot), offset: 0.82 },
      { translate: "0px 0px", offset: 1 },
    ];
  }

  function moved(x, y) {
    return Math.abs(x) > 0.5 || Math.abs(y) > 0.5;
  }

  function animate(run, element, frames) {
    const animation = element.animate(frames, {
      duration, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)", fill: "both",
    });
    run.animations.push(animation);
    const finished = animation.finished;
    finished.catch(() => finish(run));
    run.finished.push(finished);
  }

  function play(list, snapshot) {
    const saved = snapshot && typeof snapshot === "object" ? snapshots.get(snapshot) : null;
    if (!saved || saved.used || saved.sequence !== captureSequence || saved.list !== list) return false;
    saved.used = true;
    cancel();
    if (!list.isConnected || reducedMotion.matches || getComputedStyle(list).visibility === "hidden" || typeof list.animate !== "function" ||
        saved.viewportWidth !== window.innerWidth || saved.viewportHeight !== window.innerHeight ||
        list.classList.contains("is-page-transitioning")) return false;

    const run = {
      list, animations: [], finished: [], resizingIcons: [], observer: null, timeout: 0,
    };
    currentRun = run;
    list.classList.add(activeClass);

    try {
      // Read every final rectangle before starting animations or changing widths.
      const nextTiles = tiles(list);
      for (const [key, next] of nextTiles) {
        const previous = saved.entries.get(key);
        if (!previous) continue;
        const dx = previous.itemRect.left - next.itemRect.left;
        const dy = previous.itemRect.top - next.itemRect.top;
        if (moved(dx, dy)) animate(run, next.item, movement(dx, dy));

        let heightChange = 0;
        if (previous.iconRect && next.iconRect && next.icon) {
          const before = previous.iconRect;
          const after = next.iconRect;
          const widthChange = after.width - before.width;
          heightChange = after.height - before.height;
          // Icons remain centered while their physical dimensions interpolate.
          // Compensate that centering instead of stretching the image with scale().
          const iconX = before.left - after.left - dx - widthChange / 2;
          const iconY = before.top - after.top - dy;
          if (moved(widthChange, heightChange) || moved(iconX, iconY)) {
            next.icon.classList.add(resizeClass);
            run.resizingIcons.push(next.icon);
            animate(run, next.icon, [
              {
                width: `${before.width}px`, height: `${before.height}px`,
                translate: translate(iconX, iconY), offset: 0,
              },
              {
                width: `${Math.max(1, after.width + widthChange * overshoot)}px`,
                height: `${Math.max(1, after.height + heightChange * overshoot)}px`,
                translate: translate(-iconX * overshoot, -iconY * overshoot), offset: 0.82,
              },
              {
                width: `${after.width}px`, height: `${after.height}px`,
                translate: "0px 0px", offset: 1,
              },
            ]);
          }
        }

        if (previous.nameRect && next.nameRect && next.name) {
          const nameX = previous.nameRect.left - next.nameRect.left - dx;
          // Height interpolation already moves the label in the normal flow.
          const nameY = previous.nameRect.top - next.nameRect.top - dy + heightChange;
          if (moved(nameX, nameY)) animate(run, next.name, movement(nameX, nameY));
        }

        if (previous.menuRect && next.menuRect && next.menu) {
          const menuX = previous.menuRect.left - next.menuRect.left - dx;
          const menuY = previous.menuRect.top - next.menuRect.top - dy;
          if (moved(menuX, menuY)) animate(run, next.menu, movement(menuX, menuY));
        }
      }

      if (!run.animations.length) {
        finish(run);
        return false;
      }

      run.observer = new MutationObserver((changes) => {
        if (!list.isConnected || changes.some((change) => change.target === list)) finish(run);
      });
      run.observer.observe(list, { childList: true });
      if (list.parentNode) run.observer.observe(list.parentNode, { childList: true });
      Promise.all(run.finished).then(() => finish(run), () => finish(run));
      run.timeout = window.setTimeout(() => finish(run), duration + 180);
      return true;
    } catch {
      finish(run);
      return false;
    }
  }

  window.addEventListener("resize", cancel);
  window.addEventListener("pagehide", cancel);
  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) cancel();
  });
  window.shortcutTileMotion = Object.freeze({ capture, play, cancel });
})();
