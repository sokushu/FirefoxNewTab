(() => {
  const { t } = window.newTabI18n;
  const {
    limits, maxResponsiveRows, span, position, plan, canFit, responsivePlacements,
  } = window.shortcutLayout;
  const listSelector = "#shortcuts-list";
  const measurements = new WeakMap();
  let board = null;
  let gesture = null;
  let blockedClick = null;
  let pendingDragPointer = null;

  function metrics(list) {
    const fallback = list && measurements.get(list);
    if (!list?.isConnected) return fallback || {
      displayColumns: limits.columns, unobstructedColumns: limits.columns,
      pitch: 108, gapX: 0, gapY: 0,
    };
    const style = getComputedStyle(list);
    const pitch = Math.max(1, parseFloat(style.gridAutoRows) || fallback?.pitch || 108);
    const gapX = parseFloat(style.columnGap) || 0;
    const gapY = parseFloat(style.rowGap) || 0;
    const main = list.closest("main.new-tab");
    const mainStyle = main && getComputedStyle(main);
    const available = main ? main.clientWidth - (parseFloat(mainStyle.paddingLeft) || 0) -
      (parseFloat(mainStyle.paddingRight) || 0) : limits.columns * pitch;
    const displayColumns = Math.max(1, Math.min(limits.columns, Math.floor((available + gapX + 0.1) / (pitch + gapX))));
    const unobstructedWidth = main ? main.offsetWidth - (parseFloat(mainStyle.borderLeftWidth) || 0) -
      (parseFloat(mainStyle.borderRightWidth) || 0) - (parseFloat(mainStyle.paddingLeft) || 0) -
      (parseFloat(mainStyle.paddingRight) || 0) : available;
    const unobstructedColumns = Math.max(1, Math.min(limits.columns,
      Math.floor((unobstructedWidth + gapX + 0.1) / (pitch + gapX))));
    return {
      displayColumns, unobstructedColumns, pitch, gapX, gapY,
    };
  }

  function dragDisplayColumns(state, columns) {
    const original = state.original;
    state.displayColumns = columns;
    state.originalDisplay = columns < limits.columns
      ? responsivePlacements(original.entries, original.placements, columns) : original.placements;
    state.startDisplayCell = state.originalDisplay.find((cell) => cell.id === state.id);
    const entries = new Map(original.entries.map((entry) => [entry.id, entry]));
    const usedRows = state.originalDisplay.reduce((last, cell) => Math.max(last,
      cell.row + span(entries.get(cell.id), columns).rows - 1), 1);
    state.expandedRows = columns < limits.columns
      ? Math.min(maxResponsiveRows, Math.max(usedRows + 2, Math.ceil(limits.cells / columns))) : limits.rows;
  }

  function apply(list, entries, placements, displayOverride, pass = 0, columnCap = limits.columns) {
    const grid = metrics(list);
    const active = gesture?.started && gesture.list === list ? gesture : null;
    const displayColumns = Math.min(columnCap, active?.displayColumns || grid.unobstructedColumns || grid.displayColumns);
    const display = displayOverride || (displayColumns < limits.columns
      ? responsivePlacements(entries, placements, displayColumns) : placements);
    const byId = new Map(display.map((item) => [item.id, item]));
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
    let rows = 1;
    for (const entry of entries) {
      const cell = byId.get(entry.id);
      if (!cell) continue;
      const size = span(entry, displayColumns);
      rows = Math.max(rows, cell.row + size.rows - 1);
    }
    if (active) {
      rows = displayColumns < limits.columns ? Math.max(rows, active.expandedRows) : limits.rows;
    }
    const section = list.closest(".new-tab > .shortcuts");
    for (const element of [section, list].filter(Boolean)) {
      element.style.setProperty("--shortcut-visible-rows", String(rows));
      element.style.setProperty("--shortcut-layout-columns", String(displayColumns));
    }
    list.style.gridTemplateColumns = `repeat(${displayColumns}, minmax(0, var(--tile-pitch)))`;
    list.style.gridTemplateRows = `repeat(${rows}, minmax(0, var(--tile-pitch)))`;
    list.style.height = `calc(${rows} * var(--tile-pitch))`;
    list.style.removeProperty("min-height");
    for (const child of list.children) {
      const entry = entriesById.get(child.dataset.shortcutId);
      const cell = entry && byId.get(entry.id);
      if (!cell) continue;
      const size = span(entry, displayColumns);
      child.style.setProperty("--shortcut-columns", String(size.columns));
      child.style.setProperty("--shortcut-rows", String(size.rows));
      child.style.gridColumnStart = String(cell.column);
      child.style.gridColumnEnd = `span ${size.columns}`;
      child.style.gridRowStart = String(cell.row);
      child.style.gridRowEnd = `span ${size.rows}`;
    }
    measurements.set(list, grid);
    const measuredColumns = metrics(list).displayColumns;
    if (pass < 1 && measuredColumns < displayColumns) {
      if (active) {
        dragDisplayColumns(active, measuredColumns);
        active.targetKey = null;
      }
      return apply(list, entries, placements, undefined, pass + 1, measuredColumns);
    }
    return display;
  }

  function layout(list, entries) {
    if (gesture?.started && gesture.list === list) cleanup(false);
    const placements = plan(entries);
    apply(list, entries, placements);
    return placements;
  }

  function moveWithAnimation(list, action) {
    const snapshot = window.shortcutTileMotion?.capture(list, { fromVisual: true });
    action();
    window.shortcutTileMotion?.play(list, snapshot);
  }

  function clearHighlights(state) {
    for (const element of state.highlights) {
      element.classList.remove("shortcut-grid-drop-group");
    }
    state.highlights.clear();
  }

  function restorePreview(state) {
    if (!state.previewing) return;
    const original = state.original;
    state.indicator.remove();
    moveWithAnimation(state.list, () => apply(state.list, original.entries, original.placements));
    state.previewing = false;
  }

  function inside(point, bounds) {
    return point.x >= bounds.left && point.x <= bounds.right &&
      point.y >= bounds.top && point.y <= bounds.bottom;
  }

  function scrollport(element) {
    const bounds = element.getBoundingClientRect();
    const left = bounds.left + element.clientLeft;
    const top = bounds.top + element.clientTop;
    return { left, top, right: left + element.clientWidth, bottom: top + element.clientHeight };
  }

  function visibleBounds(element, clientBox = false) {
    const bounds = clientBox ? scrollport(element) : element.getBoundingClientRect();
    const visible = {
      left: Math.max(0, bounds.left), right: Math.min(window.innerWidth, bounds.right),
      top: Math.max(0, bounds.top), bottom: Math.min(window.innerHeight, bounds.bottom),
    };
    for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const clip = scrollport(parent);
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        visible.left = Math.max(visible.left, clip.left);
        visible.right = Math.min(visible.right, clip.right);
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        visible.top = Math.max(visible.top, clip.top);
        visible.bottom = Math.min(visible.bottom, clip.bottom);
      }
    }
    return visible;
  }

  function groupCanAccept(state, groupId) {
    if (board.getContext(state.list)?.groupId === groupId) return true;
    if (!state.groupCapacity.has(groupId)) {
      const entries = board.getAllItems().filter((entry) => entry.groupId === groupId && entry.id !== state.id);
      entries.push({ ...state.entry, groupId, position: undefined });
      state.groupCapacity.set(groupId, canFit(entries));
    }
    return state.groupCapacity.get(groupId);
  }

  function targetAt(state) {
    const point = state.point;
    const hit = document.elementFromPoint(point.x, point.y);
    for (const row of document.querySelectorAll(".shortcut-group-item[data-group-id]")) {
      const sidebar = row.closest(".group-sidebar");
      const navigation = row.closest(".group-sidebar-nav");
      const regions = [row, sidebar, navigation].filter(Boolean).map((element) => visibleBounds(element, element !== row));
      const visible = {
        left: Math.max(0, ...regions.map((bounds) => bounds.left)),
        right: Math.min(window.innerWidth, ...regions.map((bounds) => bounds.right)),
        top: Math.max(0, ...regions.map((bounds) => bounds.top)),
        bottom: Math.min(window.innerHeight, ...regions.map((bounds) => bounds.bottom)),
      };
      if (inside(point, visible)) {
        return { kind: "group", element: row, groupId: row.dataset.groupId,
          blocked: !groupCanAccept(state, row.dataset.groupId) };
      }
    }
    const groupButton = hit?.closest(".shortcut-group-button[data-group-id]");
    if (groupButton) return { kind: "group", element: groupButton, groupId: groupButton.dataset.groupId,
      blocked: !groupCanAccept(state, groupButton.dataset.groupId) };
    const list = state.list;
    if (!list.isConnected || !inside(point, visibleBounds(list))) return null;
    const context = board.getContext(list);
    if (!context) return null;
    const grid = metrics(list);
    const size = span(state.entry, state.displayColumns);
    const deltaX = point.x - state.origin.x + (state.scroller?.scrollLeft || 0) - state.startScrollLeft;
    const deltaY = point.y - state.origin.y + (state.scroller?.scrollTop || 0) - state.startScrollTop;
    const column = Math.max(1, Math.min(state.displayColumns - size.columns + 1,
      state.startDisplayCell.column + Math.round(deltaX / (grid.pitch + grid.gapX))));
    const row = Math.max(1, Math.min(state.expandedRows - size.rows + 1,
      state.startDisplayCell.row + Math.round(deltaY / (grid.pitch + grid.gapY))));
    return { kind: "grid", list, groupId: context.groupId, position: { column, row } };
  }

  function preview(state) {
    if (gesture !== state || !state.started) return;
    const target = targetAt(state);
    const key = target && (target.kind === "grid"
      ? `${target.groupId}/${target.position.column}/${target.position.row}`
      : `${target.kind}/${target.groupId}/${Boolean(target.blocked)}`);
    if (key === state.targetKey) return;
    clearHighlights(state);
    if (state.previewing && target?.kind !== "grid") restorePreview(state);
    state.targetKey = key;
    state.target = target;
    if (!target || target.blocked) return;
    if (target.kind !== "grid") {
      target.element.classList.add("shortcut-grid-drop-group");
      state.highlights.add(target.element);
      return;
    }
    const original = state.original;
    const entries = original.entries.filter((entry) => entry.id !== state.entry.id);
    entries.push({ ...state.entry, groupId: target.groupId, position: target.position });
    let placements;
    let display;
    try {
      if (state.displayColumns < limits.columns) {
        if (target.position.column === state.startDisplayCell.column && target.position.row === state.startDisplayCell.row) {
          display = state.originalDisplay;
          placements = original.placements;
        } else {
          display = responsivePlacements(entries, original.placements, state.displayColumns, {
            priorityId: state.id, target: target.position, base: state.originalDisplay,
          });
          placements = original.placements;
        }
      } else placements = plan(entries, { priorityId: state.entry.id, position: target.position });
    } catch {
      restorePreview(state);
      state.target = { ...target, blocked: true };
      return;
    }
    if (state.indicator.parentNode !== target.list) target.list.append(state.indicator);
    moveWithAnimation(target.list, () => {
      const visible = apply(target.list, entries, placements, display);
      const cell = visible.find((item) => item.id === state.entry.id);
      const size = span(state.entry, state.displayColumns);
      Object.assign(state.indicator.style, {
        gridColumnStart: String(cell.column), gridColumnEnd: `span ${size.columns}`,
        gridRowStart: String(cell.row), gridRowEnd: `span ${size.rows}`,
      });
      if (state.displayColumns < limits.columns) {
        target.responsive = { columns: state.displayColumns, placements: visible };
      }
    });
    state.previewing = true;
    target.placements = placements;
    target.logicalPosition = placements.find((cell) => cell.id === state.id);
  }

  function autoScroll(state) {
    const navigation = document.querySelector(".group-sidebar-nav");
    const main = state.list.closest("main.new-tab");
    const inNavigation = navigation && inside(state.point, visibleBounds(navigation, true));
    const scroller = inNavigation ? navigation : main && inside(state.point, visibleBounds(main, true)) ? main : null;
    if (!scroller) return;
    const bounds = visibleBounds(scroller, true);
    const speed = (value, start, end) => {
      const edge = Math.min(48, Math.max(0, (end - start) / 3));
      return value < start + edge ? -Math.min(20, (start + edge - value) / 3)
        : value > end - edge ? Math.min(20, (value - end + edge) / 3) : 0;
    };
    if (!inNavigation && scroller.scrollWidth > scroller.clientWidth) {
      scroller.scrollLeft += speed(state.point.x, bounds.left, bounds.right);
    }
    if (scroller.scrollHeight > scroller.clientHeight) {
      scroller.scrollTop += speed(state.point.y, bounds.top, bounds.bottom);
    }
  }

  function frame(state) {
    if (gesture !== state || !state.started) return;
    state.frame = 0;
    try {
      state.ghost.style.transform = `translate3d(${state.point.x - state.offsetX}px, ${state.point.y - state.offsetY}px, 0) scale(${state.scale})`;
      autoScroll(state);
      preview(state);
      state.frame = requestAnimationFrame(() => frame(state));
    } catch {
      cancel();
    }
  }

  function start(state) {
    if (gesture !== state || !board.canDrag() || document.documentElement.classList.contains("groups-resizing") ||
        !state.item.isConnected) return cancel();
    board.beforeDrag();
    if (gesture !== state || !state.item.isConnected) return;
    const entry = board.getAllItems().find((item) => item.id === state.id);
    if (!entry) return cancel();
    state.entry = entry;
    state.started = true;
    pendingDragPointer = state.pointerId;
    state.highlights = new Set();
    state.groupCapacity = new Map();
    const entries = board.getItems(state.list).map((item) => ({ ...item, position: position(item.position) }));
    const original = { entries, placements: plan(entries) };
    state.original = original;
    if (!original.placements.some((cell) => cell.id === state.id)) return cancel();
    dragDisplayColumns(state, metrics(state.list).displayColumns);
    const bounds = state.item.getBoundingClientRect();
    state.scale = Math.min(1, 180 / Math.max(bounds.width, bounds.height));
    state.offsetX = (state.origin.x - bounds.left) * state.scale;
    state.offsetY = (state.origin.y - bounds.top) * state.scale;
    state.ghost = state.item.cloneNode(true);
    state.ghost.removeAttribute("id");
    state.ghost.removeAttribute("data-shortcut-id");
    for (const element of state.ghost.querySelectorAll("[id]")) element.removeAttribute("id");
    for (const element of state.ghost.querySelectorAll(".shortcut-menu-wrap")) element.remove();
    state.ghost.classList.add("shortcut-grid-ghost");
    state.ghost.setAttribute("aria-hidden", "true");
    state.ghost.setAttribute("inert", "");
    Object.assign(state.ghost.style, {
      position: "fixed", left: "0", top: "0", margin: "0", pointerEvents: "none",
      width: `${bounds.width}px`, height: `${bounds.height}px`, transformOrigin: "0 0", zIndex: "2147483646",
    });
    const itemStyle = getComputedStyle(state.item);
    for (const name of [
      "--tile-pitch", "--icon-size", "--shortcut-columns", "--shortcut-rows",
      "--shortcut-name-font-size", "--shortcut-name-inset", "--shortcut-link-gap",
      "--shortcut-menu-size", "--shortcut-menu-font-size", "--shortcut-menu-offset-top", "--shortcut-menu-offset-side",
    ]) {
      state.ghost.style.setProperty(name, itemStyle.getPropertyValue(name));
    }
    document.body.append(state.ghost);
    state.indicator = document.createElement("li");
    state.indicator.className = "shortcut-grid-drop-indicator";
    state.indicator.setAttribute("aria-hidden", "true");
    state.indicator.setAttribute("inert", "");
    Object.assign(state.indicator.style, { position: "relative", pointerEvents: "none", minWidth: "0" });
    state.item.classList.add("shortcut-grid-source");
    document.body.classList.add("is-shortcut-dragging");
    state.scroller = state.list.closest("main.new-tab");
    if (state.scroller) {
      state.previousScrollAnchor = state.scroller.style.getPropertyValue("overflow-anchor");
      state.scroller.style.setProperty("overflow-anchor", "none");
    }
    apply(state.list, original.entries, original.placements);
    state.list.getBoundingClientRect();
    state.startScrollLeft = state.scroller?.scrollLeft || 0;
    state.startScrollTop = state.scroller?.scrollTop || 0;
    try { state.list.setPointerCapture(state.pointerId); } catch {}
    state.observer = new MutationObserver(() => {
      if (gesture === state && !state.item.isConnected) cleanup(false);
    });
    state.observer.observe(state.list, { childList: true });
    frame(state);
  }

  function cleanup(restore = true, reason = "cancel") {
    const state = gesture;
    if (!state) return;
    gesture = null;
    window.clearTimeout(state.holdTimer);
    if (!state.started) return;
    if (reason !== "drop") {
      pendingDragPointer = state.pointerId;
      blockedClick = { until: performance.now() + 600, ...state.point };
    }
    cancelAnimationFrame(state.frame);
    state.observer?.disconnect();
    window.shortcutTileMotion?.cancel();
    state.ghost?.remove();
    state.indicator?.remove();
    clearHighlights(state);
    state.item.classList.remove("shortcut-grid-source");
    document.body.classList.remove("is-shortcut-dragging");
    if (state.scroller) {
      if (state.previousScrollAnchor) state.scroller.style.setProperty("overflow-anchor", state.previousScrollAnchor);
      else state.scroller.style.removeProperty("overflow-anchor");
    }
    try { state.list.releasePointerCapture(state.pointerId); } catch {}
    const { list, original } = state;
    if (list.isConnected && original) {
      const liveIds = restore ? null : new Set([...list.children].map((item) => item.dataset.shortcutId));
      const entries = liveIds ? original.entries.filter((entry) => liveIds.has(entry.id)) : original.entries;
      const placements = liveIds ? original.placements.filter((cell) => liveIds.has(cell.id)) : original.placements;
      apply(list, entries, placements);
    }
  }

  function cancel() { cleanup(true); }

  function bind(api) {
    cancel();
    board = api;
  }

  document.addEventListener("pointerdown", (event) => {
    if (!gesture && event.button === 0 && event.isPrimary !== false) {
      pendingDragPointer = null;
      blockedClick = null;
    }
    if (!board || gesture || event.button !== 0 || event.isPrimary === false || !board.canDrag() ||
        document.documentElement.classList.contains("groups-resizing")) return;
    const item = event.target.closest("[data-shortcut-id]");
    const list = item?.parentElement;
    if (!list?.matches(listSelector) || event.target.closest(".shortcut-menu-wrap, input, select, textarea, [contenteditable]")) return;
    if (event.target.closest("button")) return;
    const point = { x: event.clientX, y: event.clientY };
    const state = { id: item.dataset.shortcutId, item, list, origin: point, point, pointerId: event.pointerId,
      pointerType: event.pointerType, started: false, moved: false, frame: 0, holdTimer: 0 };
    gesture = state;
    if (event.pointerType === "touch") state.holdTimer = window.setTimeout(() => {
      try { start(state); } catch { cancel(); }
    }, 350);
  });

  document.addEventListener("pointermove", (event) => {
    const state = gesture;
    if (!state || state.pointerId !== event.pointerId) return;
    state.point = { x: event.clientX, y: event.clientY };
    const distance = Math.hypot(state.point.x - state.origin.x, state.point.y - state.origin.y);
    if (!state.started) {
      if (state.pointerType === "touch") {
        if (distance > 10) cancel();
        return;
      }
      if (distance < 6) return;
      state.moved = true;
      try { start(state); } catch { cancel(); }
    } else if (distance > 6) state.moved = true;
    if (gesture?.started) event.preventDefault();
  }, { passive: false });

  document.addEventListener("pointerup", (event) => {
    if (pendingDragPointer === event.pointerId) {
      pendingDragPointer = null;
      blockedClick = { until: performance.now() + 600, x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
    const state = gesture;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.started) return cleanup(false);
    event.preventDefault();
    state.point = { x: event.clientX, y: event.clientY };
    state.groupCapacity.clear();
    try { preview(state); } catch { return cancel(); }
    const target = state.target;
    blockedClick = { until: performance.now() + 600, ...state.point };
    const unchanged = target?.kind === "grid" &&
      target.position.column === state.startDisplayCell.column && target.position.row === state.startDisplayCell.row;
    const targetList = target?.kind === "grid" && !target.blocked && !unchanged ? target.list : null;
    const snapshot = targetList && window.shortcutTileMotion?.capture(targetList, { fromVisual: true });
    cleanup(true, "drop");
    if (!state.moved || !target || unchanged) return;
    if (target.blocked) {
      document.dispatchEvent(new CustomEvent("newtab-status", {
        detail: { message: t("grid_drop_no_space") },
      }));
      return;
    }
    const context = board.getContext(state.list);
    if (target.kind === "group" && context.groupId === target.groupId) return;
    const destination = {
      groupId: target.groupId,
      ...(target.kind === "grid" ? {
        position: target.logicalPosition, placements: target.placements,
        ...(target.responsive ? { responsive: target.responsive } : {}),
      } : {}),
    };
    try {
      if (board.commitMove(state.id, destination) && targetList?.isConnected) {
        window.shortcutTileMotion?.play(targetList, snapshot);
      }
    } catch {
      if (state.list.isConnected) layout(state.list, board.getItems(state.list));
    }
  });

  document.addEventListener("pointercancel", (event) => {
    if (gesture?.pointerId === event.pointerId) cancel();
  });
  document.addEventListener("lostpointercapture", (event) => {
    if (gesture?.started && gesture.pointerId === event.pointerId) cancel();
  });
  document.addEventListener("click", (event) => {
    if (!blockedClick || performance.now() > blockedClick.until) return;
    if (event.detail && Math.hypot(event.clientX - blockedClick.x, event.clientY - blockedClick.y) < 24) {
      blockedClick = null;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener("dragstart", (event) => {
    const item = event.target.closest("[data-shortcut-id]");
    if (item?.parentElement?.matches(listSelector)) event.preventDefault();
  });
  document.addEventListener("touchmove", (event) => {
    if (gesture?.started) event.preventDefault();
  }, { passive: false });
  document.addEventListener("contextmenu", (event) => {
    if (gesture?.started) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && gesture) {
      const started = gesture.started;
      cancel();
      if (started) { event.preventDefault(); event.stopPropagation(); }
    }
  }, true);
  window.addEventListener("blur", cancel);
  window.addEventListener("resize", cancel);
  window.addEventListener("pagehide", cancel);
  document.addEventListener("shortcut-sidebar-transition-start", cancel);
  window.shortcutGrid = Object.freeze({ layout, bind, cancel });
})();
