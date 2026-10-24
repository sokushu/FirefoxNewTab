(() => {
  function migrate(items) {
    const folders = new Map();
    for (const item of items) {
      if (item?.type === "folder" && typeof item.id === "string" && item.id && !folders.has(item.id)) {
        folders.set(item.id, typeof item.groupId === "string" && item.groupId ? item.groupId : null);
      }
    }
    let changed = false;
    const migrated = [];
    for (const item of items) {
      if (item?.type === "folder" || (typeof item?.presetKey === "string" && item.presetKey.length > 0) ||
        (typeof item?.id === "string" && item.id.startsWith("preset-"))) {
        changed = true;
        continue;
      }
      if (item && Object.prototype.hasOwnProperty.call(item, "folderId")) {
        const entry = { ...item };
        if (typeof item.folderId === "string" && item.folderId) {
          entry.groupId = folders.get(item.folderId) ?? item.groupId;
          delete entry.position;
        }
        delete entry.folderId;
        migrated.push(entry);
        changed = true;
      } else {
        migrated.push(item);
      }
    }
    return { items: migrated, changed };
  }

  window.shortcutMigrations = Object.freeze({ migrate });
})();
