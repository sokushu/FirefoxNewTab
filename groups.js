window.shortcutGroupManager = (() => {
  const { t } = window.newTabI18n;
  const icons = window.newTabIcons;
  const shortcutGroupStorageKey = "shortcutGroups";
  const shortcutGroupInitialId = "default";
  const shortcutGroupList = document.getElementById("shortcut-groups");
  const shortcutGroupAddButton = document.getElementById("add-shortcut-group");
  const shortcutGroupDialog = document.getElementById("shortcut-group-dialog");
  const shortcutGroupForm = document.getElementById("shortcut-group-form");
  const shortcutGroupTitle = document.getElementById("shortcut-group-title");
  const shortcutGroupName = document.getElementById("shortcut-group-name");
  const shortcutGroupSymbolInput = document.getElementById("shortcut-group-symbol");
  const shortcutGroupIconPreview = document.getElementById("shortcut-group-icon-preview");
  const shortcutGroupIconFile = document.getElementById("shortcut-group-icon-file");
  const shortcutGroupIconRemove = document.getElementById("shortcut-group-icon-remove");
  const shortcutGroupSave = document.getElementById("save-shortcut-group");
  const shortcutGroupDelete = document.getElementById("delete-shortcut-group");
  const shortcutGroupDeleteHelp = document.getElementById("shortcut-group-delete-help");
  const shortcutGroupError = document.getElementById("shortcut-group-error");
  const shortcutGroupCancel = document.getElementById("cancel-shortcut-group");

  let shortcutGroupState = shortcutGroupInitialState();
  let shortcutGroupAvailable = true;
  let shortcutGroupEditingId = null;
  let shortcutGroupPendingIcon = null;
  let shortcutGroupIconBusy = false;
  let shortcutGroupEditorSession = 0;
  let shortcutGroupStatusReady = document.readyState === "complete";
  document.addEventListener("DOMContentLoaded", () => {
    shortcutGroupStatusReady = true;
  }, { once: true });

  function shortcutGroupInitialState() {
    return {
      version: 2,
      groups: [{ id: shortcutGroupInitialId, name: t("group_default_name"), localizedName: true }],
      activeId: shortcutGroupInitialId,
    };
  }

  function shortcutGroupStatus(shortcutGroupMessage) {
    const notify = () => document.dispatchEvent(new CustomEvent("newtab-status", {
      detail: { message: shortcutGroupMessage },
    }));
    if (!shortcutGroupStatusReady) {
      document.addEventListener("DOMContentLoaded", notify, { once: true });
    } else {
      notify();
    }
  }

  function shortcutGroupShowError(shortcutGroupMessage, shortcutGroupInput = shortcutGroupName) {
    shortcutGroupError.textContent = shortcutGroupMessage;
    shortcutGroupError.hidden = false;
    shortcutGroupInput?.focus();
  }

  function shortcutGroupNormalizeId(shortcutGroupId, shortcutGroupSource = shortcutGroupState) {
    return shortcutGroupSource.groups.some((shortcutGroup) => shortcutGroup.id === shortcutGroupId)
      ? shortcutGroupId
      : shortcutGroupSource.groups[0].id;
  }

  function shortcutGroupRead() {
    try {
      const shortcutGroupRaw = localStorage.getItem(shortcutGroupStorageKey);

      if (shortcutGroupRaw === null) {
        shortcutGroupAvailable = true;
        return shortcutGroupInitialState();
      }

      const shortcutGroupSaved = JSON.parse(shortcutGroupRaw);

      if (
        !shortcutGroupSaved || !Array.isArray(shortcutGroupSaved.groups) ||
        ![undefined, 1, 2].includes(shortcutGroupSaved.version)
      ) {
        throw new Error("Invalid groups");
      }

      const shortcutGroupIds = new Set();
      const shortcutGroupEntries = [];

      for (const shortcutGroup of shortcutGroupSaved.groups) {
        if (
          !shortcutGroup || typeof shortcutGroup.id !== "string" || !shortcutGroup.id ||
          shortcutGroupIds.has(shortcutGroup.id) || typeof shortcutGroup.name !== "string" ||
          !shortcutGroup.name.trim() || shortcutGroup.name.trim().length > 20
        ) {
          continue;
        }

        const shortcutGroupEntry = { id: shortcutGroup.id, name: shortcutGroup.name.trim() };
        if (shortcutGroup.id === shortcutGroupInitialId) {
          const shortcutGroupUsesDefaultName = shortcutGroup.localizedName === true ||
            (shortcutGroup.localizedName === undefined && shortcutGroupEntry.name === "常用");
          if (shortcutGroupUsesDefaultName) {
            shortcutGroupEntry.name = t("group_default_name");
            shortcutGroupEntry.localizedName = true;
          } else if (shortcutGroup.localizedName === false) {
            shortcutGroupEntry.localizedName = false;
          }
        }

        if (typeof shortcutGroup.symbol === "string" && shortcutGroup.symbol.trim().length <= 8) {
          if (shortcutGroup.symbol.trim()) {
            shortcutGroupEntry.symbol = shortcutGroup.symbol.trim();
          }
        }
        if (icons.isValid(shortcutGroup.icon)) {
          shortcutGroupEntry.icon = shortcutGroup.icon;
        }

        shortcutGroupIds.add(shortcutGroup.id);
        shortcutGroupEntries.push(shortcutGroupEntry);
      }

      if (shortcutGroupSaved.version !== 2 && !shortcutGroupIds.has(shortcutGroupInitialId)) {
        shortcutGroupEntries.unshift({ id: shortcutGroupInitialId, name: t("group_default_name"), localizedName: true });
      }
      if (!shortcutGroupEntries.length) {
        throw new Error("At least one group is required");
      }

      const shortcutGroupNext = {
        version: 2,
        groups: shortcutGroupEntries,
        activeId: shortcutGroupEntries[0].id,
      };
      shortcutGroupNext.activeId = shortcutGroupNormalizeId(shortcutGroupSaved.activeId, shortcutGroupNext);

      if (shortcutGroupSaved.version !== 2) {
        try {
          localStorage.setItem(shortcutGroupStorageKey, JSON.stringify(shortcutGroupNext));
        } catch {
          shortcutGroupStatus(t("group_migration_save_failed"));
        }
      }

      shortcutGroupAvailable = true;
      return shortcutGroupNext;
    } catch {
      shortcutGroupAvailable = false;
      shortcutGroupStatus(t("group_read_failed_preserved"));
      return null;
    }
  }

  function shortcutGroupDeletedIds(shortcutGroupPrevious, shortcutGroupNext) {
    return shortcutGroupPrevious.groups
      .filter((shortcutGroup) => !shortcutGroupNext.groups.some((shortcutGroupEntry) => shortcutGroupEntry.id === shortcutGroup.id))
      .map((shortcutGroup) => shortcutGroup.id);
  }

  function shortcutGroupEmit(shortcutGroupReason, shortcutGroupPrevious, shortcutGroupRemoved = []) {
    const shortcutGroupPreviousId = shortcutGroupPrevious.activeId;
    const shortcutGroupCurrentId = shortcutGroupState.activeId;
    let shortcutGroupOrder = shortcutGroupState.groups;

    if (!shortcutGroupOrder.some((shortcutGroup) => shortcutGroup.id === shortcutGroupPreviousId)) {
      shortcutGroupOrder = shortcutGroupPrevious.groups;
    }

    const shortcutGroupPreviousIndex = shortcutGroupOrder.findIndex((shortcutGroup) => shortcutGroup.id === shortcutGroupPreviousId);
    const shortcutGroupNextIndex = shortcutGroupOrder.findIndex((shortcutGroup) => shortcutGroup.id === shortcutGroupCurrentId);
    const shortcutGroupDirection = shortcutGroupPreviousId === shortcutGroupCurrentId ||
      shortcutGroupPreviousIndex < 0 || shortcutGroupNextIndex < 0
      ? 0
      : Math.sign(shortcutGroupNextIndex - shortcutGroupPreviousIndex);

    document.dispatchEvent(new CustomEvent("shortcut-groups-change", {
      detail: {
        reason: shortcutGroupReason,
        groupId: shortcutGroupCurrentId,
        previousGroupId: shortcutGroupPreviousId,
        direction: shortcutGroupDirection,
        deletedIds: shortcutGroupRemoved,
        destinationName: shortcutGroupRemoved.length ? shortcutGroupState.groups[0].name : undefined,
      },
    }));
  }

  function shortcutGroupRenderIcon(shortcutGroupContainer, shortcutGroupLabel, shortcutGroupSymbol, shortcutGroupIcon) {
    const shortcutGroupFallback = shortcutGroupSymbol ||
      Array.from(shortcutGroupLabel.trim())[0]?.toLocaleUpperCase() || t("group_icon_fallback");
    icons.render(shortcutGroupContainer, { icon: shortcutGroupIcon, fallback: shortcutGroupFallback });
  }

  function shortcutGroupUpdatePreview() {
    shortcutGroupRenderIcon(
      shortcutGroupIconPreview,
      shortcutGroupName.value,
      shortcutGroupSymbolInput.value.trim(),
      shortcutGroupPendingIcon,
    );
  }

  function shortcutGroupUpdateDelete() {
    const shortcutGroupExists = shortcutGroupState.groups.some((shortcutGroup) => shortcutGroup.id === shortcutGroupEditingId);
    const shortcutGroupRemaining = shortcutGroupState.groups.filter((shortcutGroup) => shortcutGroup.id !== shortcutGroupEditingId);
    shortcutGroupDelete.hidden = shortcutGroupEditingId === null;
    shortcutGroupDelete.disabled = shortcutGroupIconBusy || !shortcutGroupAvailable ||
      !shortcutGroupExists || shortcutGroupRemaining.length === 0;
    shortcutGroupDeleteHelp.hidden = shortcutGroupEditingId === null;

    if (!shortcutGroupExists && shortcutGroupEditingId !== null) {
      shortcutGroupDeleteHelp.textContent = t("group_deleted_other_tab");
    } else if (!shortcutGroupRemaining.length) {
      shortcutGroupDeleteHelp.textContent = t("group_last_cannot_delete");
    } else {
      shortcutGroupDeleteHelp.textContent = t("group_delete_help", { name: shortcutGroupRemaining[0].name });
    }
  }

  function shortcutGroupSetBusy(shortcutGroupIsBusy) {
    shortcutGroupIconBusy = shortcutGroupIsBusy;
    shortcutGroupSave.disabled = shortcutGroupIsBusy;
    shortcutGroupIconFile.disabled = shortcutGroupIsBusy;
    shortcutGroupIconRemove.disabled = shortcutGroupIsBusy;
    shortcutGroupForm.setAttribute("aria-busy", String(shortcutGroupIsBusy));
    shortcutGroupUpdateDelete();
  }

  function shortcutGroupFocusActive() {
    const shortcutGroupButton = Array.from(shortcutGroupList.querySelectorAll(".shortcut-group-button"))
      .find((shortcutGroupControl) => shortcutGroupControl.dataset.groupId === shortcutGroupState.activeId);
    shortcutGroupButton?.focus({ preventScroll: true });
  }

  function shortcutGroupFocusSettings(shortcutGroupId) {
    const shortcutGroupButton = Array.from(shortcutGroupList.querySelectorAll(".shortcut-group-settings"))
      .find((shortcutGroupControl) => shortcutGroupControl.dataset.groupId === shortcutGroupId);
    (shortcutGroupButton || shortcutGroupAddButton).focus({ preventScroll: true });
  }

  function shortcutGroupRender() {
    const shortcutGroupFragment = document.createDocumentFragment();

    for (const shortcutGroup of shortcutGroupState.groups) {
      const shortcutGroupItem = document.createElement("li");
      const shortcutGroupButton = document.createElement("button");
      const shortcutGroupSymbol = document.createElement("span");
      const shortcutGroupLabel = document.createElement("span");
      const shortcutGroupSettings = document.createElement("button");
      shortcutGroupItem.className = "shortcut-group-item";
      shortcutGroupItem.dataset.groupId = shortcutGroup.id;
      shortcutGroupButton.type = "button";
      shortcutGroupButton.className = "shortcut-group-button";
      shortcutGroupButton.dataset.groupId = shortcutGroup.id;
      shortcutGroupButton.title = shortcutGroup.name;
      shortcutGroupButton.setAttribute("aria-label", shortcutGroup.name);
      shortcutGroupSymbol.className = "shortcut-group-symbol";
      shortcutGroupSymbol.setAttribute("aria-hidden", "true");
      shortcutGroupRenderIcon(shortcutGroupSymbol, shortcutGroup.name, shortcutGroup.symbol, shortcutGroup.icon);
      shortcutGroupLabel.className = "shortcut-group-name";
      shortcutGroupLabel.textContent = shortcutGroup.name;
      shortcutGroupButton.append(shortcutGroupSymbol, shortcutGroupLabel);

      if (shortcutGroup.id === shortcutGroupState.activeId) {
        shortcutGroupButton.setAttribute("aria-current", "page");
      }

      shortcutGroupButton.addEventListener("click", () => {
        const shortcutGroupLatest = shortcutGroupLoadLatest();

        if (!shortcutGroupLatest) {
          return;
        }

        const shortcutGroupNext = {
          ...shortcutGroupLatest,
          activeId: shortcutGroupNormalizeId(shortcutGroup.id, shortcutGroupLatest),
        };

        if (!shortcutGroupCommit(shortcutGroupNext, "selection")) {
          shortcutGroupStatus(t("group_selection_save_failed"));
          return;
        }

        shortcutGroupFocusActive();
      });

      shortcutGroupSettings.type = "button";
      shortcutGroupSettings.className = "shortcut-group-settings";
      shortcutGroupSettings.dataset.groupId = shortcutGroup.id;
      shortcutGroupSettings.textContent = "⚙";
      shortcutGroupSettings.title = t("group_settings_named", { name: shortcutGroup.name });
      shortcutGroupSettings.setAttribute("aria-label", t("group_settings_named", { name: shortcutGroup.name }));
      shortcutGroupSettings.setAttribute("aria-haspopup", "dialog");
      shortcutGroupSettings.addEventListener("click", (shortcutGroupEvent) => {
        shortcutGroupEvent.stopPropagation();
        shortcutGroupOpenEditor(shortcutGroup.id);
      });
      shortcutGroupItem.append(shortcutGroupButton, shortcutGroupSettings);
      shortcutGroupFragment.append(shortcutGroupItem);
    }

    shortcutGroupList.replaceChildren(shortcutGroupFragment);
    shortcutGroupUpdateDelete();
  }

  function shortcutGroupAdopt(shortcutGroupNext, shortcutGroupReason, shortcutGroupRemoved = []) {
    const shortcutGroupPrevious = shortcutGroupState;
    shortcutGroupState = shortcutGroupNext;
    shortcutGroupRender();
    shortcutGroupEmit(shortcutGroupReason, shortcutGroupPrevious, shortcutGroupRemoved);
  }

  function shortcutGroupLoadLatest() {
    const shortcutGroupWasAvailable = shortcutGroupAvailable;
    const shortcutGroupLatest = shortcutGroupRead();

    if (
      shortcutGroupLatest &&
      (!shortcutGroupWasAvailable || JSON.stringify(shortcutGroupLatest) !== JSON.stringify(shortcutGroupState))
    ) {
      shortcutGroupAdopt(
        shortcutGroupLatest,
        "storage",
        shortcutGroupDeletedIds(shortcutGroupState, shortcutGroupLatest),
      );
    }
    return shortcutGroupLatest;
  }

  function shortcutGroupCommit(shortcutGroupNext, shortcutGroupReason, shortcutGroupRemoved = []) {
    try {
      localStorage.setItem(shortcutGroupStorageKey, JSON.stringify(shortcutGroupNext));
    } catch {
      return false;
    }

    shortcutGroupAvailable = true;
    shortcutGroupAdopt(shortcutGroupNext, shortcutGroupReason, shortcutGroupRemoved);
    return true;
  }

  function shortcutGroupOpenEditor(shortcutGroupId = null) {
    if (shortcutGroupDialog.open) {
      return;
    }

    document.dispatchEvent(new Event("shortcut-menu-open"));

    shortcutGroupLoadLatest();
    const shortcutGroup = shortcutGroupId === null ? null :
      shortcutGroupState.groups.find((shortcutGroupEntry) => shortcutGroupEntry.id === shortcutGroupId);

    if (shortcutGroupId !== null && !shortcutGroup) {
      shortcutGroupStatus(t("group_deleted_select_another"));
      return;
    }

    shortcutGroupEditorSession += 1;
    shortcutGroupForm.reset();
    shortcutGroupEditingId = shortcutGroup?.id ?? null;
    shortcutGroupPendingIcon = icons.isValid(shortcutGroup?.icon) ? shortcutGroup.icon : null;
    shortcutGroupName.value = shortcutGroup?.name ?? "";
    shortcutGroupSymbolInput.value = shortcutGroup?.symbol ?? "";
    shortcutGroupTitle.textContent = t(shortcutGroup ? "group_settings" : "group_add");
    shortcutGroupSave.textContent = t(shortcutGroup ? "group_save_action" : "group_add_action");
    shortcutGroupError.hidden = true;
    shortcutGroupSetBusy(false);
    shortcutGroupUpdatePreview();
    shortcutGroupDialog.showModal();
    shortcutGroupName.focus();
  }

  function shortcutGroupRemove() {
    if (shortcutGroupIconBusy || shortcutGroupEditingId === null) {
      return;
    }

    let shortcutGroupLatest = shortcutGroupLoadLatest();
    const shortcutGroup = shortcutGroupLatest?.groups.find((shortcutGroupEntry) => shortcutGroupEntry.id === shortcutGroupEditingId);

    if (!shortcutGroupLatest || !shortcutGroup) {
      shortcutGroupShowError(t("group_delete_unavailable"));
      return;
    }
    if (shortcutGroupLatest.groups.length <= 1) {
      shortcutGroupUpdateDelete();
      shortcutGroupShowError(t("group_last_cannot_delete"));
      return;
    }

    const shortcutGroupDestination = shortcutGroupLatest.groups.find((shortcutGroupEntry) => shortcutGroupEntry.id !== shortcutGroupEditingId);
    if (!window.confirm(t("group_delete_confirm", { name: shortcutGroup.name, destination: shortcutGroupDestination.name }))) {
      return;
    }

    // Another tab can change the groups while the confirmation is open.
    shortcutGroupLatest = shortcutGroupLoadLatest();
    if (!shortcutGroupLatest || shortcutGroupLatest.groups.length <= 1) {
      shortcutGroupUpdateDelete();
      shortcutGroupShowError(t("group_last_recheck"));
      return;
    }
    if (!shortcutGroupLatest.groups.some((shortcutGroupEntry) => shortcutGroupEntry.id === shortcutGroupEditingId)) {
      shortcutGroupShowError(t("group_deleted_other_tab"));
      return;
    }

    const shortcutGroupRemaining = shortcutGroupLatest.groups.filter((shortcutGroupEntry) => shortcutGroupEntry.id !== shortcutGroupEditingId);
    const shortcutGroupNext = {
      version: 2,
      groups: shortcutGroupRemaining,
      activeId: shortcutGroupNormalizeId(shortcutGroupState.activeId, { groups: shortcutGroupRemaining }),
    };

    if (!shortcutGroupCommit(shortcutGroupNext, "delete", [shortcutGroupEditingId])) {
      shortcutGroupShowError(t("group_delete_failed"));
      return;
    }

    shortcutGroupDialog.close();
    shortcutGroupFocusActive();
  }

  shortcutGroupAddButton.addEventListener("click", () => shortcutGroupOpenEditor());
  shortcutGroupCancel.addEventListener("click", () => shortcutGroupDialog.close());
  shortcutGroupDelete.addEventListener("click", shortcutGroupRemove);
  shortcutGroupName.addEventListener("input", shortcutGroupUpdatePreview);
  shortcutGroupSymbolInput.addEventListener("input", shortcutGroupUpdatePreview);
  shortcutGroupIconRemove.addEventListener("click", () => {
    if (!shortcutGroupIconBusy) {
      shortcutGroupPendingIcon = null;
      shortcutGroupIconFile.value = "";
      shortcutGroupError.hidden = true;
      shortcutGroupUpdatePreview();
    }
  });

  shortcutGroupIconFile.addEventListener("change", async () => {
    const shortcutGroupFile = shortcutGroupIconFile.files?.[0];
    shortcutGroupIconFile.value = "";

    if (!shortcutGroupFile || shortcutGroupIconBusy) {
      return;
    }

    const shortcutGroupSession = shortcutGroupEditorSession;
    shortcutGroupError.hidden = true;
    shortcutGroupSetBusy(true);

    try {
      const shortcutGroupIcon = await icons.create(shortcutGroupFile);
      if (shortcutGroupSession === shortcutGroupEditorSession && shortcutGroupDialog.open) {
        shortcutGroupPendingIcon = shortcutGroupIcon;
        shortcutGroupUpdatePreview();
      }
    } catch (shortcutGroupFailure) {
      if (shortcutGroupSession === shortcutGroupEditorSession && shortcutGroupDialog.open) {
        shortcutGroupShowError(shortcutGroupFailure.message, null);
      }
    } finally {
      if (shortcutGroupSession === shortcutGroupEditorSession) {
        shortcutGroupSetBusy(false);
      }
    }
  });

  shortcutGroupDialog.addEventListener("close", () => {
    if (shortcutGroupDialog.open) {
      return;
    }
    const shortcutGroupPreviousEditingId = shortcutGroupEditingId;
    shortcutGroupEditorSession += 1;
    shortcutGroupEditingId = null;
    shortcutGroupPendingIcon = null;
    shortcutGroupIconFile.value = "";
    shortcutGroupSetBusy(false);

    if (document.activeElement === document.body) {
      shortcutGroupFocusSettings(shortcutGroupPreviousEditingId);
    }
  });

  shortcutGroupForm.addEventListener("submit", (shortcutGroupEvent) => {
    shortcutGroupEvent.preventDefault();
    if (shortcutGroupIconBusy) {
      return;
    }

    shortcutGroupError.hidden = true;
    const shortcutGroupNewName = shortcutGroupName.value.trim();
    const shortcutGroupNewSymbol = shortcutGroupSymbolInput.value.trim();

    if (!shortcutGroupNewName || shortcutGroupNewName.length > 20) {
      shortcutGroupShowError(t("group_name_invalid"));
      return;
    }
    if (shortcutGroupNewSymbol.length > 8) {
      shortcutGroupShowError(t("group_symbol_too_long"), shortcutGroupSymbolInput);
      return;
    }

    const shortcutGroupLatest = shortcutGroupLoadLatest();
    if (!shortcutGroupLatest) {
      shortcutGroupShowError(t("group_read_failed"));
      return;
    }
    if (
      shortcutGroupEditingId !== null &&
      !shortcutGroupLatest.groups.some((shortcutGroup) => shortcutGroup.id === shortcutGroupEditingId)
    ) {
      shortcutGroupShowError(t("group_deleted_readd"));
      return;
    }
    if (shortcutGroupLatest.groups.some((shortcutGroup) =>
      shortcutGroup.id !== shortcutGroupEditingId &&
      shortcutGroup.name.toLocaleLowerCase("zh-CN") === shortcutGroupNewName.toLocaleLowerCase("zh-CN")
    )) {
      shortcutGroupShowError(t("group_name_duplicate"));
      return;
    }

    const shortcutGroupIsEditing = shortcutGroupEditingId !== null;
    const shortcutGroupEntry = {
      id: shortcutGroupEditingId ?? ("group-" + crypto.randomUUID()),
      name: shortcutGroupNewName,
    };
    if (shortcutGroupEntry.id === shortcutGroupInitialId) {
      shortcutGroupEntry.localizedName = false;
    }
    if (shortcutGroupNewSymbol) {
      shortcutGroupEntry.symbol = shortcutGroupNewSymbol;
    }
    if (icons.isValid(shortcutGroupPendingIcon)) {
      shortcutGroupEntry.icon = shortcutGroupPendingIcon;
    }

    const shortcutGroupNext = {
      version: 2,
      groups: shortcutGroupIsEditing
        ? shortcutGroupLatest.groups.map((shortcutGroup) => shortcutGroup.id === shortcutGroupEditingId ? shortcutGroupEntry : shortcutGroup)
        : [...shortcutGroupLatest.groups, shortcutGroupEntry],
      activeId: shortcutGroupIsEditing ? shortcutGroupLatest.activeId : shortcutGroupEntry.id,
    };

    if (!shortcutGroupCommit(shortcutGroupNext, shortcutGroupIsEditing ? "edit" : "add")) {
      shortcutGroupShowError(t("group_save_failed"));
      return;
    }

    shortcutGroupDialog.close();
    if (shortcutGroupIsEditing) {
      shortcutGroupFocusSettings(shortcutGroupEntry.id);
    } else {
      shortcutGroupFocusActive();
    }
  });

  window.addEventListener("storage", (shortcutGroupEvent) => {
    if (shortcutGroupEvent.key === shortcutGroupStorageKey || shortcutGroupEvent.key === null) {
      shortcutGroupLoadLatest();
    }
  });

  shortcutGroupState = shortcutGroupRead() || shortcutGroupState;
  shortcutGroupRender();

  return Object.freeze({
    get defaultId() { return shortcutGroupState.groups[0].id; },
    isAvailable: () => shortcutGroupAvailable,
    getActiveId: () => shortcutGroupState.activeId,
    normalizeId: (shortcutGroupId) => shortcutGroupNormalizeId(shortcutGroupId),
  });
})();
