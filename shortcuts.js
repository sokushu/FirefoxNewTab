(() => {
  const { t } = window.newTabI18n;
  const shortcutGroupManager = window.shortcutGroupManager;
  const shortcutLayout = window.shortcutLayout;
  const shortcutIcons = window.newTabIcons;
  const shortcutGrid = window.shortcutGrid;
  const shortcutPage = window.shortcutPageTransition;
  const shortcutMenu = window.shortcutMenu;
  const normalizeShortcutSize = shortcutLayout.normalizeSize;
  const normalizeShortcutPosition = shortcutLayout.position;
  const getShortcutCells = shortcutLayout.area;
  const isShortcutPositionInBounds = shortcutLayout.isPositionInBounds;
  const canFitShortcutItems = shortcutLayout.canFit;
  const shortcutsStorageKey = "shortcuts";
  const shortcutsList = document.getElementById("shortcuts-list");
  const shortcutsEmpty = document.getElementById("shortcuts-empty");
  const shortcutsStatus = document.getElementById("shortcuts-status");
  const shortcutTemplate = document.getElementById("shortcut-template");
  const shortcutDialog = document.getElementById("shortcut-dialog");
  const shortcutDialogTitle = document.getElementById("shortcut-dialog-title");
  const shortcutForm = document.getElementById("shortcut-form");
  const shortcutNameInput = document.getElementById("shortcut-name");
  const shortcutUrlInput = document.getElementById("shortcut-url");
  const shortcutError = document.getElementById("shortcut-error");
  const cancelShortcutButton = document.getElementById("cancel-shortcut");
  const shortcutIconPreview = document.getElementById("shortcut-icon-preview");
  const shortcutIconFile = document.getElementById("shortcut-icon-file");
  const shortcutIconRemove = document.getElementById("shortcut-icon-remove");
  const shortcutIconFetch = document.getElementById("shortcut-icon-fetch");
  const shortcutSaveButton = shortcutForm.querySelector('button[type="submit"]');
  const shortcutOverflowOpen = document.getElementById("shortcut-overflow-open");
  const shortcutOverflowDialog = document.getElementById("shortcut-overflow-dialog");
  const shortcutOverflowClose = document.getElementById("shortcut-overflow-close");
  const shortcutOverflowList = document.getElementById("shortcut-overflow-list");
  const shortcutOverflowStatus = document.getElementById("shortcut-overflow-status");
  const shortcutBoardLimits = shortcutLayout.limits;

  let editingShortcutId = null;
  let shortcutEditingGroupId = shortcutGroupManager.defaultId;
  let shortcutStorageReadFailed = false;
  let shortcutMigrationPending = false;
  let shortcutPendingIcon = null;
  let shortcutIconBusy = false;
  let shortcutEditorSession = 0;
  let shortcutRenderedGroupId = null;
  let shortcutRenderedVisibleIds = new Set();
  let shortcutsStatusTimer = 0;

  function showShortcutsStatus(message = "") {
    window.clearTimeout(shortcutsStatusTimer);
    shortcutsStatusTimer = 0;
    const statusElements = [shortcutsStatus, shortcutOverflowStatus].filter(Boolean);
    for (const status of statusElements) {
      status.textContent = message;
      status.hidden = !message;
    }

    if (!message) {
      return;
    }

    shortcutsStatusTimer = window.setTimeout(() => {
      shortcutsStatusTimer = 0;
      for (const status of statusElements) {
        status.textContent = "";
        status.hidden = true;
      }
    }, 1000);
  }

  function cancelShortcutTileMotion() {
    try {
      window.shortcutTileMotion?.cancel?.();
    } catch {
      // Animation cleanup must not prevent saving or displaying websites.
    }
  }

  function showShortcutError(message, input) {
    shortcutError.textContent = message;
    shortcutError.hidden = false;
    input?.focus();
  }

  function normalizeShortcutUrl(value) {
    const address = value.trim();

    if (!address) {
      throw new Error(t("site_address_required"));
    }

    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(address);
    const hasHostPort = /^(?:localhost|[^/?#:\s]+\.[^/?#:\s]+):\d+(?:[/?#]|$)/i.test(address);
    let url;

    try {
      url = new URL(hasScheme && !hasHostPort ? address : `https://${address}`);
    } catch {
      throw new Error(t("site_address_invalid"));
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(t("site_address_http_only"));
    }

    return url.href;
  }

  function renderShortcutIcon(container, name, icon) {
    const fallback = Array.from(name.trim())[0]?.toLocaleUpperCase() || t("site_icon_fallback");
    shortcutIcons.render(container, { icon, fallback });
  }

  function updateShortcutIconPreview() {
    renderShortcutIcon(shortcutIconPreview, shortcutNameInput.value, shortcutPendingIcon);
  }

  function setShortcutIconBusy(shortcutIsBusy) {
    shortcutIconBusy = shortcutIsBusy;
    shortcutSaveButton.disabled = shortcutIsBusy;
    cancelShortcutButton.disabled = shortcutIsBusy;
    shortcutIconFile.disabled = shortcutIsBusy;
    shortcutIconRemove.disabled = shortcutIsBusy;
    if (shortcutIconFetch) {
      shortcutIconFetch.disabled = shortcutIsBusy;
      if (!shortcutIsBusy) {
        shortcutIconFetch.textContent = t("site_icon_fetch");
      }
    }
    shortcutUrlInput.disabled = shortcutIsBusy;
    shortcutForm.setAttribute("aria-busy", String(shortcutIsBusy));
  }

  function loadShortcuts() {
    shortcutStorageReadFailed = false;
    shortcutMigrationPending = false;

    try {
      const raw = localStorage.getItem(shortcutsStorageKey);

      if (raw === null) {
        return [];
      }

      const stored = JSON.parse(raw);

      if (!Array.isArray(stored)) {
        throw new Error("Invalid shortcuts");
      }

      const migration = window.shortcutMigrations.migrate(stored);
      const customStored = migration.items;
      const migrationNeeded = migration.changed;

      const entries = [];
      const ids = new Set();

      for (const item of customStored) {
        if (
          !item ||
          typeof item.id !== "string" ||
          !item.id ||
          ids.has(item.id) ||
          typeof item.name !== "string" ||
          !item.name.trim() ||
          item.name.trim().length > 50 ||
          (item.type != null && item.type !== "website") ||
          typeof item.url !== "string"
        ) {
          continue;
        }

        try {
          const entry = {
            id: item.id,
            type: "website",
            name: item.name.trim(),
            url: normalizeShortcutUrl(item.url),
            size: normalizeShortcutSize(item.size),
            groupId: shortcutGroupManager.isAvailable()
              ? shortcutGroupManager.normalizeId(item.groupId)
              : (typeof item.groupId === "string" && item.groupId ? item.groupId : shortcutGroupManager.defaultId),
          };

          const position = normalizeShortcutPosition(item.position);
          if (position) {
            entry.position = position;
          }
          const responsivePositions = shortcutLayout.normalizeResponsivePositions(item.responsivePositions, entry.size);
          if (responsivePositions) {
            entry.responsivePositions = responsivePositions;
          }
          if (shortcutIcons.isValid(item.icon)) {
            entry.icon = item.icon;
          }

          entries.push(entry);
          ids.add(item.id);
        } catch {
          // 忽略无效地址，避免生成无法使用的快捷入口。
        }
      }

      if (migrationNeeded) {
        if (shortcutGroupManager.isAvailable()) {
          try {
            const migrated = planShortcutPositions(entries);
            localStorage.setItem(shortcutsStorageKey, JSON.stringify(migrated));
            return migrated;
          } catch {
            shortcutMigrationPending = true;
          }
        } else {
          shortcutMigrationPending = true;
        }
        showShortcutsStatus(t("site_migration_save_failed"));
      }
      if (!shortcutMigrationPending && entries.length !== customStored.length) {
        showShortcutsStatus(t("site_invalid_saved_entries"));
      }

      return entries;
    } catch {
      shortcutStorageReadFailed = true;
      showShortcutsStatus(t("site_read_extension_failed"));
      return [];
    }
  }

  let shortcuts = loadShortcuts();

  function getShortcutContext() {
    return { groupId: shortcutGroupManager.getActiveId() };
  }

  function isShortcutInContext(entry, context) {
    return shortcutGroupManager.normalizeId(entry.groupId) === context.groupId;
  }

  function sortShortcutPositions(entries) {
    return entries.slice().sort((a, b) =>
      (a.position?.row ?? Number.MAX_SAFE_INTEGER) - (b.position?.row ?? Number.MAX_SAFE_INTEGER) ||
      (a.position?.column ?? Number.MAX_SAFE_INTEGER) - (b.position?.column ?? Number.MAX_SAFE_INTEGER));
  }

  function getGroupShortcutItems(groupId, entries = shortcuts) {
    const normalizedId = shortcutGroupManager.normalizeId(groupId);
    return entries.filter((entry) => shortcutGroupManager.normalizeId(entry.groupId) === normalizedId);
  }

  function getShortcutPartition(groupId, entries = shortcuts, options = {}) {
    const items = getGroupShortcutItems(groupId, entries);
    const preferredVisibleIds = options.preferredVisibleIds ??
      (shortcutRenderedGroupId === groupId ? shortcutRenderedVisibleIds : undefined);
    try {
      const result = shortcutLayout.partition(items, { ...options, preferredVisibleIds });
      const allowedIds = new Set(items.map((entry) => entry.id));
      const reportedIds = new Set(result.visibleIds);
      const placements = result.placements.filter((placement) => allowedIds.has(placement.id) &&
        reportedIds.has(placement.id) && normalizeShortcutPosition(placement));
      const visibleIds = new Set(placements.map((placement) => placement.id));
      return {
        items, placements, visibleIds,
        overflowIds: new Set(items.filter((entry) => !visibleIds.has(entry.id)).map((entry) => entry.id)),
        error: false,
      };
    } catch {
      return { items, placements: [], visibleIds: new Set(), overflowIds: new Set(items.map((entry) => entry.id)), error: true };
    }
  }

  function getShortcutCapacity(groupId = shortcutGroupManager.getActiveId()) {
    const normalizedId = shortcutGroupManager.normalizeId(groupId);
    const items = getGroupShortcutItems(normalizedId);
    const count = items.length;
    const usedCells = items.reduce((total, entry) => total + getShortcutCells(entry.size), 0);
    const partition = getShortcutPartition(normalizedId);
    let probeId = "__shortcut_capacity_probe__";
    while (items.some((entry) => entry.id === probeId)) {
      probeId += "_";
    }
    const available = !shortcutStorageReadFailed && shortcutGroupManager.isAvailable();
    const canAdd = available && !partition.error && partition.overflowIds.size === 0 && canFitShortcutItems([...items, { id: probeId, type: "website", size: "normal" }]);
    const reason = canAdd ? "" : !available ? t("site_read_reload_failed")
      : partition.error ? t("site_arrange_failed")
      : partition.overflowIds.size ? t("site_overflow_capacity")
      : t("site_capacity_full");
    return {
      groupId: normalizedId, canAdd, reason, usedCells, count,
      maxCount: shortcutBoardLimits.cells, maxCells: shortcutBoardLimits.cells,
      columns: shortcutBoardLimits.columns, rows: shortcutBoardLimits.rows,
      remainingCells: Math.max(0, shortcutBoardLimits.cells - usedCells),
      overflowCount: partition.overflowIds.size,
    };
  }

  function notifyShortcutCapacity() {
    document.dispatchEvent(new CustomEvent("shortcut-capacity-change", { detail: getShortcutCapacity() }));
  }

  function reloadShortcutsBeforeMutation() {
    const reloaded = loadShortcuts();
    if (shortcutStorageReadFailed || !shortcutGroupManager.isAvailable()) {
      return false;
    }
    shortcuts = reloaded;
    return true;
  }

  function getShortcutItems(list, entries = shortcuts) {
    if (list !== shortcutsList) {
      return [];
    }
    const context = getShortcutContext(list);
    const partition = getShortcutPartition(context.groupId, entries);
    return sortShortcutPositions(partition.items.filter((entry) => partition.visibleIds.has(entry.id)));
  }

  function applyShortcutPlacements(entries, placements, context) {
    const positions = new Map();
    for (const placement of Array.isArray(placements) ? placements : []) {
      const position = normalizeShortcutPosition(placement);
      if (position && typeof placement.id === "string") {
        positions.set(placement.id, position);
      }
    }
    return entries.map((entry) => {
      const position = positions.get(entry.id);
      if (!position || !isShortcutInContext(entry, context) ||
        (entry.position?.column === position.column && entry.position?.row === position.row)) {
        return entry;
      }
      return { ...entry, position };
    });
  }

  function planShortcutPositions(entries, priorityId) {
    const scopes = new Map();
    for (const entry of entries) {
      const context = { groupId: shortcutGroupManager.normalizeId(entry.groupId) };
      const key = context.groupId;
      if (!scopes.has(key)) {
        scopes.set(key, { context, entries: [] });
      }
      scopes.get(key).entries.push(entry);
    }
    let planned = entries;
    for (const scope of scopes.values()) {
      const priority = scope.entries.find((entry) => entry.id === priorityId && entry.position);
      const partition = getShortcutPartition(scope.context.groupId, entries, {
        priorityId: priority?.id,
        position: priority && isShortcutPositionInBounds(priority) ? priority.position : undefined,
      });
      if (partition.error) {
        continue;
      }
      planned = applyShortcutPlacements(planned, partition.placements, scope.context).map((entry) => {
        if (!partition.overflowIds.has(entry.id) || !entry.position) {
          return entry;
        }
        const overflow = { ...entry };
        delete overflow.position;
        return overflow;
      });
    }
    return planned;
  }

  function layoutShortcutList(list, entries, { persist = true } = {}) {
    if (document.documentElement.classList.contains("groups-resizing")) {
      return;
    }
    let placements;
    try {
      placements = shortcutGrid.layout(list, entries);
    } catch {
      showShortcutsStatus(t("site_grid_layout_failed"));
      return;
    }
    const context = getShortcutContext(list);
    const nextShortcuts = applyShortcutPlacements(shortcuts, placements, context);
    const order = new Map(placements.map((placement) => [placement.id, placement]));
    const cards = Array.from(list.children).sort((a, b) => {
      const first = order.get(a.dataset.shortcutId);
      const second = order.get(b.dataset.shortcutId);
      const firstRow = Number(a.style.gridRowStart) || first?.row || 0;
      const secondRow = Number(b.style.gridRowStart) || second?.row || 0;
      const firstColumn = Number(a.style.gridColumnStart) || first?.column || 0;
      const secondColumn = Number(b.style.gridColumnStart) || second?.column || 0;
      return firstRow - secondRow || firstColumn - secondColumn;
    });
    list.append(...cards);
    if (!persist || !nextShortcuts.some((entry, index) => entry !== shortcuts[index]) ||
      shortcutStorageReadFailed || shortcutMigrationPending || !shortcutGroupManager.isAvailable()) {
      return;
    }
    try {
      localStorage.setItem(shortcutsStorageKey, JSON.stringify(nextShortcuts));
    } catch {
      showShortcutsStatus(t("site_grid_save_failed"));
      return;
    }
    shortcuts = nextShortcuts;
  }

  function saveShortcuts(nextShortcuts, pageOptions, priorityId) {
    shortcutPage.cancel();
    if (shortcutStorageReadFailed || !shortcutGroupManager.isAvailable()) {
      return false;
    }

    let planned;
    try {
      planned = planShortcutPositions(nextShortcuts, priorityId);
      localStorage.setItem(shortcutsStorageKey, JSON.stringify(planned));
    } catch {
      return false;
    }

    shortcuts = planned;
    shortcutMigrationPending = false;
    renderShortcuts(pageOptions);
    return true;
  }

  function getVisibleShortcuts() {
    return getShortcutItems(shortcutsList);
  }

  function focusShortcut(id, focusOptions) {
    shortcutPage.cancel();
    if (shortcutOverflowDialog.open) {
      const row = Array.from(shortcutOverflowList.children).find((item) => item.dataset.shortcutId === id);
      (row?.querySelector("a") || shortcutOverflowClose).focus(focusOptions);
      return;
    }
    const card = Array.from(shortcutsList.children).find((item) => item.dataset.shortcutId === id);
    (card?.querySelector(".shortcut-link") || shortcutsList).focus(focusOptions);
  }

  function openShortcutEditor(shortcut) {
    shortcutPage.cancel();
    cancelShortcutTileMotion();
    if (shortcutDialog.open) {
      return;
    }
    if (!shortcut) {
      if (!reloadShortcutsBeforeMutation()) {
        showShortcutsStatus(t("site_read_retry_failed"));
        notifyShortcutCapacity();
        return;
      }
      const capacity = getShortcutCapacity();
      if (!capacity.canAdd) {
        renderShortcuts();
        showShortcutsStatus(capacity.reason);
        notifyShortcutCapacity();
        return;
      }
    }

    shortcutMenu.close(true);
    shortcutEditorSession += 1;
    shortcutForm.reset();
    setShortcutIconBusy(false);
    shortcutError.hidden = true;
    editingShortcutId = shortcut?.id ?? null;
    shortcutEditingGroupId = typeof shortcut?.groupId === "string" && shortcut.groupId
      ? shortcut.groupId
      : shortcutGroupManager.getActiveId();
    shortcutPendingIcon = shortcutIcons.isValid(shortcut?.icon) ? shortcut.icon : null;
    shortcutDialogTitle.textContent = t(shortcut ? "site_edit" : "site_add");
    shortcutNameInput.value = shortcut?.name ?? "";
    shortcutUrlInput.value = shortcut?.url ?? "";
    updateShortcutIconPreview();
    shortcutDialog.showModal();
    shortcutNameInput.focus();
  }

  function deleteShortcut(shortcut) {
    shortcutPage.cancel();
    cancelShortcutTileMotion();
    if (!window.confirm(t("site_delete_confirm", { name: shortcut.name }))) {
      return;
    }
    if (!reloadShortcutsBeforeMutation()) {
      showShortcutsStatus(t("site_delete_read_failed"));
      return;
    }

    const nextShortcuts = shortcuts.filter((item) => item.id !== shortcut.id);
    if (!saveShortcuts(nextShortcuts)) {
      showShortcutsStatus(t("site_delete_save_failed"));
      return;
    }

    showShortcutsStatus(t("site_deleted"));
    focusShortcut(null, { preventScroll: true });
  }

  function setShortcutSize(id, size) {
    shortcutPage.cancel();
    cancelShortcutTileMotion();
    shortcutMenu.close(true);
    if (!reloadShortcutsBeforeMutation()) {
      showShortcutsStatus(t("site_resize_read_failed"));
      return;
    }
    const shortcut = shortcuts.find((item) => item.id === id);

    if (!shortcut || shortcut.type !== "website" || !shortcutLayout.sizes.includes(size)) {
      return;
    }
    if (normalizeShortcutSize(shortcut.size) === size) {
      focusShortcut(id, { preventScroll: true });
      return;
    }
    const groupId = shortcutGroupManager.normalizeId(shortcut.groupId);
    const partition = getShortcutPartition(groupId);
    let nextShortcuts = shortcuts.map((item) => {
      if (item.id !== id) return item;
      const resized = { ...item, size };
      const responsivePositions = shortcutLayout.normalizeResponsivePositions(item.responsivePositions, size);
      if (responsivePositions) resized.responsivePositions = responsivePositions;
      else delete resized.responsivePositions;
      return resized;
    });
    const groupItems = getGroupShortcutItems(groupId, nextShortcuts);
    const visibleItems = groupItems.filter((item) => partition.visibleIds.has(item.id));
    const enlarging = getShortcutCells(size) > getShortcutCells(shortcut.size);
    if (!partition.visibleIds.has(id) || !canFitShortcutItems(visibleItems, { priorityId: id }) ||
      (enlarging && !canFitShortcutItems(groupItems, { priorityId: id }))) {
      renderShortcuts();
      showShortcutsStatus(t("site_resize_no_space"));
      return;
    }
    try {
      const placements = shortcutLayout.plan(visibleItems, { priorityId: id });
      nextShortcuts = applyShortcutPlacements(nextShortcuts, placements, { groupId });
    } catch {
      renderShortcuts();
      showShortcutsStatus(t("site_resize_failed"));
      return;
    }

    const tileMotion = window.shortcutTileMotion;
    let snapshot = null;

    try {
      snapshot = tileMotion?.capture?.(shortcutsList);
    } catch {
      cancelShortcutTileMotion();
    }

    // Render cancels active animations while preserving the pending capture.
    if (!saveShortcuts(nextShortcuts, undefined, id)) {
      cancelShortcutTileMotion();
      showShortcutsStatus(t("site_resize_save_failed"));
      focusShortcut(id, { preventScroll: true });
      return;
    }

    focusShortcut(id, { preventScroll: true });

    if (snapshot !== null && snapshot !== undefined) {
      try {
        tileMotion?.play?.(shortcutsList, snapshot);
      } catch {
        cancelShortcutTileMotion();
      }
    }
  }

  function createShortcutCard(shortcut) {
    const card = shortcutTemplate.content.cloneNode(true);
    const item = card.querySelector(".shortcut-item");
    const link = card.querySelector(".shortcut-link");
    item.dataset.shortcutId = shortcut.id;
    item.dataset.size = normalizeShortcutSize(shortcut.size);
    link.draggable = false;
    link.href = shortcut.url;
    link.title = shortcut.url;
    renderShortcutIcon(card.querySelector(".shortcut-icon"), shortcut.name, shortcut.icon);
    card.querySelector(".shortcut-name").textContent = shortcut.name;
    shortcutMenu.bind(item, {
      label: shortcut.name,
      size: item.dataset.size,
      onOpen: () => window.location.assign(shortcut.url),
      onEdit: () => openShortcutEditor(shortcut),
      onDelete: () => deleteShortcut(shortcut),
      onSize: (size) => setShortcutSize(shortcut.id, size),
    });
    return card;
  }

  function renderShortcutItems(list, entries) {
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      fragment.append(createShortcutCard(entry));
    }
    list.replaceChildren(fragment);
    layoutShortcutList(list, entries);
  }

  function renderShortcutOverflow(partition) {
    const overflowItems = partition.items.filter((entry) => partition.overflowIds.has(entry.id));
    shortcutOverflowOpen.hidden = overflowItems.length === 0;
    shortcutOverflowOpen.textContent = t("site_overflow_count", { count: overflowItems.length });
    const fragment = document.createDocumentFragment();
    for (const entry of overflowItems) {
      const item = document.createElement("li");
      item.className = "shortcut-overflow-item";
      item.dataset.shortcutId = entry.id;
      const link = document.createElement("a");
      link.className = "shortcut-overflow-link";
      link.href = entry.url;
      link.title = entry.url;
      link.textContent = entry.name;
      const actions = document.createElement("div");
      actions.className = "shortcut-overflow-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = t("site_edit_action");
      edit.setAttribute("aria-label", t("site_edit_named", { name: entry.name }));
      edit.addEventListener("click", () => openShortcutEditor(entry));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "shortcut-overflow-delete";
      remove.textContent = t("site_delete_action");
      remove.setAttribute("aria-label", t("site_delete_named", { name: entry.name }));
      remove.addEventListener("click", () => deleteShortcut(entry));
      actions.append(edit, remove);
      item.append(link, actions);
      fragment.append(item);
    }
    shortcutOverflowList.replaceChildren(fragment);
    if (!overflowItems.length && shortcutOverflowDialog.open) {
      shortcutOverflowDialog.close();
    }
  }

  function renderShortcuts({ direction = 0 } = {}) {
    cancelShortcutTileMotion();
    shortcutPage.cancel();
    shortcutGrid.cancel();
    shortcutMenu.close();
    const nextGroupId = shortcutGroupManager.getActiveId();
    const groupChanged = shortcutRenderedGroupId !== null && shortcutRenderedGroupId !== nextGroupId;
    let transitionDirection = direction === 1 || direction === -1 ? direction : 0;
    if (groupChanged && !transitionDirection) {
      const groupOrder = Array.from(document.querySelectorAll("#shortcut-groups > .shortcut-group-item[data-group-id]"),
        (item) => item.dataset.groupId);
      const previousIndex = groupOrder.indexOf(shortcutRenderedGroupId);
      const nextIndex = groupOrder.indexOf(nextGroupId);
      if (previousIndex >= 0 && nextIndex >= 0) {
        transitionDirection = Math.sign(nextIndex - previousIndex);
      }
    }
    if (groupChanged) {
      document.dispatchEvent(new Event("shortcut-menu-open"));
      if (shortcutOverflowDialog.open) {
        shortcutOverflowDialog.close();
      }
    }
    const animateGroupChange = groupChanged && transitionDirection !== 0 && !shortcutDialog.open &&
      !shortcutOverflowDialog.open && !document.documentElement.classList.contains("groups-resizing");
    const outgoingSnapshot = animateGroupChange ? shortcutPage.capture() : null;

    const planned = planShortcutPositions(shortcuts);
    if (planned.some((entry, index) => entry !== shortcuts[index]) &&
      !shortcutStorageReadFailed && !shortcutMigrationPending && shortcutGroupManager.isAvailable() &&
      !document.documentElement.classList.contains("groups-resizing")) {
      try {
        localStorage.setItem(shortcutsStorageKey, JSON.stringify(planned));
        shortcuts = planned;
      } catch {
        showShortcutsStatus(t("site_rearrange_save_failed"));
      }
    }
    const partition = getShortcutPartition(nextGroupId);
    const visible = sortShortcutPositions(partition.items.filter((entry) => partition.visibleIds.has(entry.id)));
    shortcutRenderedVisibleIds = partition.visibleIds;
    renderShortcutItems(shortcutsList, visible);
    shortcutsList.hidden = false;
    shortcutsEmpty.hidden = visible.length > 0;
    shortcutRenderedGroupId = nextGroupId;
    renderShortcutOverflow(partition);
    if (partition.error) {
      showShortcutsStatus(t("site_grid_overflow_failed"));
    }
    notifyShortcutCapacity();

    if (groupChanged) shortcutPage.start(outgoingSnapshot, transitionDirection);
  }

  shortcutsList.tabIndex = -1;

  shortcutOverflowOpen.addEventListener("click", () => {
    shortcutPage.cancel();
    cancelShortcutTileMotion();
    shortcutGrid.cancel();
    shortcutMenu.close();
    renderShortcutOverflow(getShortcutPartition(shortcutGroupManager.getActiveId()));
    if (!shortcutOverflowOpen.hidden && !shortcutOverflowDialog.open) {
      shortcutOverflowDialog.showModal();
      shortcutOverflowClose.focus();
    }
  });
  shortcutOverflowClose.addEventListener("click", () => shortcutOverflowDialog.close());
  shortcutOverflowDialog.addEventListener("close", () => {
    if (!shortcutOverflowDialog.open && !shortcutDialog.open) {
      (shortcutOverflowOpen.hidden ? shortcutsList : shortcutOverflowOpen).focus({ preventScroll: true });
    }
  });

  cancelShortcutButton.addEventListener("click", () => {
    if (!shortcutIconBusy) {
      shortcutDialog.close();
    }
  });

  shortcutDialog.addEventListener("cancel", (event) => {
    if (shortcutIconBusy) {
      event.preventDefault();
    }
  });

  shortcutDialog.addEventListener("close", () => {
    shortcutEditorSession += 1;
    editingShortcutId = null;
    shortcutEditingGroupId = shortcutGroupManager.defaultId;
    shortcutPendingIcon = null;
    shortcutIconFile.value = "";
    setShortcutIconBusy(false);
  });

  shortcutNameInput.addEventListener("input", updateShortcutIconPreview);

  shortcutIconRemove.addEventListener("click", () => {
    if (!shortcutIconBusy) {
      shortcutPendingIcon = null;
      shortcutIconFile.value = "";
      shortcutError.hidden = true;
      updateShortcutIconPreview();
    }
  });

  shortcutIconFile.addEventListener("change", async () => {
    const shortcutFile = shortcutIconFile.files?.[0];
    shortcutIconFile.value = "";

    if (!shortcutFile || shortcutIconBusy) {
      return;
    }

    const shortcutSession = shortcutEditorSession;
    setShortcutIconBusy(true);
    shortcutError.hidden = true;

    try {
      const shortcutIcon = await shortcutIcons.create(shortcutFile);

      if (shortcutSession === shortcutEditorSession && shortcutDialog.open) {
        shortcutPendingIcon = shortcutIcon;
        updateShortcutIconPreview();
      }
    } catch (error) {
      if (shortcutSession === shortcutEditorSession && shortcutDialog.open) {
        showShortcutError(error.message, shortcutIconFile);
      }
    } finally {
      if (shortcutSession === shortcutEditorSession) {
        setShortcutIconBusy(false);
      }
    }
  });

  shortcutIconFetch?.addEventListener("click", async () => {
    if (shortcutIconBusy) {
      return;
    }
    shortcutError.hidden = true;
    let url;
    try {
      url = normalizeShortcutUrl(shortcutUrlInput.value);
    } catch (error) {
      showShortcutError(error.message, shortcutUrlInput);
      return;
    }
    if (typeof window.shortcutIconFetcher?.fetchIcon !== "function") {
      showShortcutError(t("site_icon_fetch_unavailable"));
      return;
    }
    const shortcutSession = shortcutEditorSession;
    setShortcutIconBusy(true);
    shortcutIconFetch.textContent = t("site_icon_fetching");
    try {
      const shortcutIcon = await window.shortcutIconFetcher.fetchIcon(url);
      if (shortcutSession !== shortcutEditorSession || !shortcutDialog.open) {
        return;
      }
      if (!shortcutIcons.isValid(shortcutIcon)) {
        throw new Error(t("site_icon_fetch_invalid"));
      }
      shortcutPendingIcon = shortcutIcon;
      updateShortcutIconPreview();
    } catch (error) {
      if (shortcutSession === shortcutEditorSession && shortcutDialog.open) {
        showShortcutError(error?.message || t("site_icon_fetch_failed"));
      }
    } finally {
      if (shortcutSession === shortcutEditorSession) {
        setShortcutIconBusy(false);
      }
    }
  });

  document.addEventListener("newtab-status", (event) => {
    showShortcutsStatus(event.detail?.message || "");
  });
  document.addEventListener("shortcut-menu-open", () => {
    cancelShortcutTileMotion();
    shortcutGrid.cancel();
  });

  function refreshShortcutBoardLayout() {
    cancelShortcutTileMotion();
    shortcutPage.cancel();
    shortcutGrid.cancel();
    shortcutMenu.close(true);
    layoutShortcutList(shortcutsList, getVisibleShortcuts(), { persist: false });
  }
  document.addEventListener("shortcut-sidebar-transition-start", () => {
    cancelShortcutTileMotion();
    shortcutPage.cancel();
    shortcutGrid.cancel();
    shortcutMenu.close(true);
  });
  window.addEventListener("resize", refreshShortcutBoardLayout);
  document.addEventListener("shortcut-sidebar-change", refreshShortcutBoardLayout);
  document.addEventListener("shortcut-layout-change", refreshShortcutBoardLayout);
  window.addEventListener("pagehide", () => {
    cancelShortcutTileMotion();
    shortcutPage.cancel();
    shortcutGrid.cancel();
    showShortcutsStatus("");
  });

  shortcutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    shortcutPage.cancel();
    cancelShortcutTileMotion();

    if (shortcutIconBusy) {
      return;
    }

    shortcutError.hidden = true;
    const name = shortcutNameInput.value.trim();

    if (!name || name.length > 50) {
      showShortcutError(t("site_name_invalid"), shortcutNameInput);
      return;
    }

    let url;

    try {
      url = normalizeShortcutUrl(shortcutUrlInput.value);
    } catch (error) {
      showShortcutError(error.message, shortcutUrlInput);
      return;
    }

    if (!reloadShortcutsBeforeMutation()) {
      showShortcutError(t("site_read_retry_failed"));
      notifyShortcutCapacity();
      return;
    }
    const existing = shortcuts.find((item) => item.id === editingShortcutId && item.type === "website");
    if (editingShortcutId && !existing) {
      renderShortcuts();
      showShortcutError(t("site_deleted_elsewhere"));
      return;
    }

    const isEditing = editingShortcutId !== null;
    const entry = {
      ...existing,
      id: editingShortcutId ?? crypto.randomUUID(),
      type: "website",
      name,
      url,
      size: normalizeShortcutSize(existing?.size),
      groupId: shortcutGroupManager.normalizeId(existing?.groupId ?? shortcutEditingGroupId),
    };

    if (shortcutIcons.isValid(shortcutPendingIcon)) {
      entry.icon = shortcutPendingIcon;
    } else {
      delete entry.icon;
    }

    const nextShortcuts = isEditing
      ? shortcuts.map((item) => (item.id === editingShortcutId ? entry : item))
      : [...shortcuts, entry];

    if (!isEditing && (!getShortcutCapacity(entry.groupId).canAdd ||
      !canFitShortcutItems(getGroupShortcutItems(entry.groupId, nextShortcuts)))) {
      renderShortcuts();
      showShortcutError(t("site_capacity_full"));
      notifyShortcutCapacity();
      return;
    }

    if (!saveShortcuts(nextShortcuts)) {
      showShortcutError(t("site_save_failed"));
      return;
    }

    shortcutDialog.close();
    showShortcutsStatus(t(isEditing ? "site_saved" : "site_added"));
    focusShortcut(entry.id);
  });

  function canDragShortcuts() {
    return !shortcutIconBusy && !shortcutStorageReadFailed && shortcutGroupManager.isAvailable() &&
      !document.documentElement.classList.contains("groups-resizing") &&
      !document.querySelector("dialog[open]");
  }

  function beforeShortcutDrag() {
    shortcutPage.cancel();
    cancelShortcutTileMotion();
    shortcutMenu.close();
  }

  function commitShortcutMove(id, destination) {
    if (!reloadShortcutsBeforeMutation()) {
      showShortcutsStatus(t("site_move_read_failed"));
      notifyShortcutCapacity();
      return false;
    }
    const source = shortcuts.find((entry) => entry.id === id);
    const groupId = destination?.groupId;
    const movingResponsive = destination?.responsive != null;
    const position = movingResponsive ? null : normalizeShortcutPosition(destination?.position);
    if (!source || !canDragShortcuts() || typeof groupId !== "string" ||
      shortcutGroupManager.normalizeId(groupId) !== groupId ||
      (!movingResponsive && destination.position != null && !position)) {
      showShortcutsStatus(t("site_move_failed"));
      renderShortcuts();
      return false;
    }

    const contextChanged = shortcutGroupManager.normalizeId(source.groupId) !== groupId;
    if (movingResponsive && contextChanged) {
      renderShortcuts();
      showShortcutsStatus(t("site_move_failed"));
      return false;
    }
    const sourcePartition = getShortcutPartition(shortcutGroupManager.normalizeId(source.groupId));
    if (!sourcePartition.visibleIds.has(id)) {
      renderShortcuts();
      showShortcutsStatus(t("site_move_overflow"));
      return false;
    }
    let next = shortcuts.map((entry) => {
      if (entry.id === id && !movingResponsive) {
        const moved = { ...entry, groupId };
        if (contextChanged) delete moved.responsivePositions;
        if (position) {
          moved.position = position;
        } else if (contextChanged) {
          delete moved.position;
        }
        return moved;
      }
      return entry;
    });
    const targetItems = getGroupShortcutItems(groupId, next);
    if (contextChanged && !canFitShortcutItems(targetItems, { priorityId: id, position })) {
      renderShortcuts();
      showShortcutsStatus(t("site_move_group_full"));
      return false;
    }
    const allowedIds = contextChanged ? new Set(targetItems.map((entry) => entry.id)) : sourcePartition.visibleIds;
    const requested = !movingResponsive && Array.isArray(destination.placements)
      ? destination.placements.filter((placement) => allowedIds.has(placement.id)) : [];
    if (!movingResponsive) next = applyShortcutPlacements(next, requested, { groupId });
    try {
      const visibleItems = getGroupShortcutItems(groupId, next).filter((entry) => allowedIds.has(entry.id));
      if (movingResponsive) {
        const { columns, placements: requestedDisplay } = destination.responsive;
        if (!Number.isInteger(columns) || columns < 1 || columns >= shortcutBoardLimits.columns ||
          !Array.isArray(requestedDisplay)) {
          throw new Error("Invalid responsive destination");
        }
        const entriesById = new Map(visibleItems.map((entry) => [entry.id, entry]));
        const base = [];
        const ids = new Set();
        for (const cell of requestedDisplay) {
          const entry = entriesById.get(cell?.id);
          if (!entry || ids.has(entry.id)) continue;
          const normalized = shortcutLayout.normalizeResponsivePositions({ [columns]: cell }, entry.size)?.[columns];
          if (!normalized) continue;
          base.push({ id: entry.id, ...normalized });
          ids.add(entry.id);
        }
        const target = base.find((cell) => cell.id === id);
        if (!target) throw new Error("Invalid responsive position");
        const placements = shortcutLayout.plan(visibleItems);
        const display = shortcutLayout.responsivePlacements(visibleItems, placements, columns, { priorityId: id, target, base });
        const byId = new Map(display.map((cell) => [cell.id, { column: cell.column, row: cell.row }]));
        next = next.map((entry) => {
          const cell = byId.get(entry.id);
          if (!cell || !isShortcutInContext(entry, { groupId })) return entry;
          return {
            ...entry,
            responsivePositions: {
              ...shortcutLayout.normalizeResponsivePositions(entry.responsivePositions, entry.size),
              [columns]: cell,
            },
          };
        });
      } else {
        const placements = shortcutLayout.plan(visibleItems, { priorityId: id, position });
        next = applyShortcutPlacements(next, placements, { groupId });
      }
    } catch {
      renderShortcuts();
      showShortcutsStatus(t("site_move_no_space"));
      return false;
    }
    if (!saveShortcuts(next, undefined, movingResponsive ? undefined : id)) {
      renderShortcuts();
      showShortcutsStatus(t("site_move_save_failed"));
      return false;
    }
    showShortcutsStatus(t("site_move_saved"));
    return true;
  }

  window.shortcutBoard = Object.freeze({
    getItems: (list) => getShortcutItems(list),
    getContext: (list) => getShortcutContext(list),
    getAllItems: () => shortcuts.slice(),
    getCapacity: getShortcutCapacity,
    openEditor: openShortcutEditor,
    canDrag: canDragShortcuts,
    beforeDrag: beforeShortcutDrag,
    commitMove: commitShortcutMove,
  });

  window.addEventListener("storage", (event) => {
    if (event.key === shortcutsStorageKey || event.key === null) {
      shortcutRenderedVisibleIds = new Set();
      const shortcutReloaded = loadShortcuts();

      if (!shortcutStorageReadFailed) {
        shortcuts = shortcutReloaded;
      }

      renderShortcuts();
    }
  });

  document.addEventListener("shortcut-groups-change", (event) => {
    cancelShortcutTileMotion();
    const pageOptions = { direction: event.detail.direction };
    const destination = event.detail.destinationName
      ? t("site_named_group", { name: event.detail.destinationName })
      : t("site_remaining_group");
    const shortcutReloaded = loadShortcuts();

    if (!shortcutStorageReadFailed) {
      shortcuts = shortcutReloaded;
    }

    if (event.detail.deletedIds.length && !shortcutStorageReadFailed) {
      if (!saveShortcuts(shortcuts, pageOptions)) {
        renderShortcuts(pageOptions);
        showShortcutsStatus(t("site_group_deleted_save_failed", { name: destination }));
      } else {
        showShortcutsStatus(t("site_group_deleted_moved", { name: destination }));
      }
    } else {
      renderShortcuts(pageOptions);
    }
  });

  shortcutPage.init({ list: shortcutsList, empty: shortcutsEmpty, main: shortcutsList.closest("main.new-tab") });
  shortcutMenu.init();
  renderShortcuts();
  shortcutGrid.bind(window.shortcutBoard);
})();
