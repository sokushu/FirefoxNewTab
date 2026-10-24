(() => {
  const { t } = window.newTabI18n;
  const limits = Object.freeze({ columns: 10, rows: 6, cells: 60 });
  const MAX_DISPLAY_ROWS = limits.cells * 2 + 2;
  const dimensions = Object.freeze({
    normal: [1, 1], wide: [2, 1], tall: [1, 2], large: [2, 2],
  });
  const sizes = Object.freeze(Object.keys(dimensions));

  function normalizeSize(size) {
    return typeof size === "string" && Object.hasOwn(dimensions, size) ? size : "normal";
  }

  function span(entryOrSize, columns = limits.columns) {
    const name = typeof entryOrSize === "string" ? entryOrSize : entryOrSize?.size;
    const size = dimensions[normalizeSize(name)];
    const displayColumns = Number.isInteger(columns) && columns > 0
      ? Math.min(columns, limits.columns) : limits.columns;
    return { columns: Math.min(size[0], displayColumns), rows: size[1] };
  }

  function position(value) {
    return value && Number.isInteger(value.column) && value.column >= 1 && value.column <= limits.columns &&
      Number.isInteger(value.row) && value.row >= 1 && value.row <= limits.rows
      ? { column: value.column, row: value.row } : null;
  }

  function isPositionInBounds(entry, value = entry?.position) {
    return Boolean(validCell(value, span(entry)));
  }

  function responsiveCell(value, size, columns) {
    return value && Number.isInteger(value.column) && value.column >= 1 &&
      value.column + size.columns - 1 <= columns && Number.isInteger(value.row) && value.row >= 1 &&
      value.row + size.rows - 1 <= MAX_DISPLAY_ROWS
      ? { column: value.column, row: value.row } : null;
  }

  function normalizeResponsivePositions(value, size) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const positions = {};
    for (let columns = 1; columns < limits.columns; columns += 1) {
      if (!Object.hasOwn(value, columns)) continue;
      const cell = responsiveCell(value[columns], span(size, columns), columns);
      if (cell) positions[columns] = cell;
    }
    return Object.keys(positions).length ? positions : undefined;
  }

  function uniqueEntries(entries) {
    return [...new Map(entries.filter((entry) => entry?.id).map((entry) => [entry.id, entry])).values()];
  }

  function validCell(value, size) {
    const cell = position(value);
    return cell && cell.column + size.columns - 1 <= limits.columns &&
      cell.row + size.rows - 1 <= limits.rows ? cell : null;
  }

  function area(entry) {
    const size = span(entry);
    return size.columns * size.rows;
  }

  function free(rows, cell, size) {
    const mask = ((1 << size.columns) - 1) << (cell.column - 1);
    for (let row = cell.row - 1; row < cell.row + size.rows - 1; row += 1) {
      if (rows[row] & mask) return false;
    }
    return true;
  }

  function mark(rows, cell, size, remove = false) {
    const mask = ((1 << size.columns) - 1) << (cell.column - 1);
    for (let row = cell.row - 1; row < cell.row + size.rows - 1; row += 1) {
      rows[row] = remove ? rows[row] & ~mask : rows[row] | mask;
    }
  }

  function emptySpot(size, rows, columnFirst = false) {
    for (let index = 0; index < limits.cells; index += 1) {
      const cell = columnFirst
        ? { column: Math.floor(index / limits.rows) + 1, row: index % limits.rows + 1 }
        : { column: index % limits.columns + 1, row: Math.floor(index / limits.columns) + 1 };
      if (validCell(cell, size) && free(rows, cell, size)) return cell;
    }
    return null;
  }

  function packing(entries, options, preserve, columnFirst = false, tallFirst = false) {
    const rows = new Uint16Array(limits.rows);
    const placed = new Map();
    const waiting = [];
    const ordered = options.priorityId
      ? [...entries.filter((item) => item.id === options.priorityId), ...entries.filter((item) => item.id !== options.priorityId)]
      : entries;
    for (const entry of ordered) {
      const size = span(entry);
      const priority = entry.id === options.priorityId;
      const desired = validCell(priority && options.position != null ? options.position : entry.position, size);
      if (desired && (preserve || priority) && free(rows, desired, size)) {
        mark(rows, desired, size);
        placed.set(entry.id, desired);
      } else {
        waiting.push(entry);
      }
    }
    waiting.sort((a, b) => area(b) - area(a) ||
      (tallFirst ? span(b).rows - span(a).rows : span(b).columns - span(a).columns));
    for (const entry of waiting) {
      const size = span(entry);
      const cell = emptySpot(size, rows, columnFirst);
      if (!cell) return null;
      mark(rows, cell, size);
      placed.set(entry.id, cell);
    }
    return placed;
  }

  function boundedPacking(entries, options) {
    const rows = new Uint16Array(limits.rows);
    const placed = new Map();
    const priority = entries.find((entry) => entry.id === options.priorityId);
    const forced = priority && validCell(options.position ?? priority.position, span(priority));
    if (forced) {
      mark(rows, forced, span(priority));
      placed.set(priority.id, forced);
    }
    const shapes = ["large", "tall", "wide", "normal"].map((size) => ({
      size: span({ size }), entries: [], cells: [],
    }));
    for (const entry of entries) {
      if (placed.has(entry.id)) continue;
      const size = span(entry);
      shapes.find((shape) => shape.size.columns === size.columns && shape.size.rows === size.rows).entries.push(entry);
    }
    const counts = shapes.map((shape) => shape.entries.length);
    const failed = new Set();
    let attempts = 0;
    const search = (remaining, available) => {
      if (!remaining) return true;
      if (++attempts > 8000 || remaining > available) return false;
      const key = `${rows.join(",")}/${counts.join(",")}`;
      if (failed.has(key)) return false;
      const first = emptySpot({ columns: 1, rows: 1 }, rows);
      if (!first) return false;
      for (let index = 0; index < shapes.length; index += 1) {
        const shape = shapes[index];
        if (!counts[index] || !validCell(first, shape.size) || !free(rows, first, shape.size)) continue;
        const cells = shape.size.columns * shape.size.rows;
        counts[index] -= 1;
        shape.cells.push(first);
        mark(rows, first, shape.size);
        if (search(remaining - cells, available - cells)) return true;
        mark(rows, first, shape.size, true);
        shape.cells.pop();
        counts[index] += 1;
        if (attempts > 8000) return false;
      }
      if (available > remaining) {
        mark(rows, first, { columns: 1, rows: 1 });
        if (search(remaining, available - 1)) return true;
        mark(rows, first, { columns: 1, rows: 1 }, true);
      }
      failed.add(key);
      return false;
    };
    const used = forced ? area(priority) : 0;
    if (!search(entries.reduce((sum, entry) => sum + area(entry), 0) - used, limits.cells - used)) return null;
    for (const shape of shapes) {
      shape.entries.forEach((entry, index) => placed.set(entry.id, shape.cells[index]));
    }
    return placed;
  }

  function completePacking(entries, options) {
    if (entries.reduce((sum, entry) => sum + area(entry), 0) > limits.cells) return null;
    const priority = entries.find((entry) => entry.id === options.priorityId);
    if (options.position != null && (!priority || !validCell(options.position, span(priority)))) return null;
    const preserved = packing(entries, options, true);
    if (preserved) return preserved;
    for (const columnFirst of [false, true]) {
      for (const tallFirst of [false, true]) {
        const repacked = packing(entries, options, false, columnFirst, tallFirst);
        if (repacked) return repacked;
      }
    }
    // Fixed-size, shape-count search is a bounded fallback for fragmented boards.
    return boundedPacking(entries, options);
  }

  function placementsFor(entries, placed) {
    return entries.map((entry) => ({ id: entry.id, ...placed.get(entry.id) }));
  }

  function plan(entries, options = {}) {
    const unique = uniqueEntries(entries);
    const placed = completePacking(unique, options);
    if (!placed) throw new Error(t("layout_grid_full"));
    return placementsFor(unique, placed);
  }

  function canFit(entries, options = {}) {
    try { return Boolean(completePacking(uniqueEntries(entries), options)); }
    catch { return false; }
  }

  function partition(entries, options = {}) {
    const unique = uniqueEntries(entries);
    const complete = completePacking(unique, options);
    if (complete) return { placements: placementsFor(unique, complete), visibleIds: unique.map((entry) => entry.id), overflowIds: [] };
    const preferred = new Set(options.preferredVisibleIds || []);
    const ordered = unique.slice().sort((a, b) => Number(preferred.has(b.id)) - Number(preferred.has(a.id)) ||
      Number(Boolean(validCell(b.position, span(b)))) - Number(Boolean(validCell(a.position, span(a)))));
    const selected = [];
    let placed = new Map();
    let selectedArea = 0;
    for (const entry of ordered) {
      if (selectedArea + area(entry) > limits.cells) continue;
      const next = [...selected, entry];
      const hasPriority = next.some((item) => item.id === options.priorityId);
      const candidate = completePacking(next, hasPriority ? options : {});
      if (!candidate) continue;
      selected.push(entry);
      selectedArea += area(entry);
      placed = candidate;
    }
    return {
      placements: placementsFor(selected, placed),
      visibleIds: unique.filter((entry) => placed.has(entry.id)).map((entry) => entry.id),
      overflowIds: unique.filter((entry) => !placed.has(entry.id)).map((entry) => entry.id),
    };
  }

  function responsivePlacements(entries, placements, columns, { priorityId, target, base } = {}) {
    const logical = new Map(placements.map((cell) => [cell.id, cell]));
    const previous = new Map((base || []).map((cell) => [cell.id, cell]));
    const ordered = entries.slice().sort((a, b) =>
      logical.get(a.id).row - logical.get(b.id).row || logical.get(a.id).column - logical.get(b.id).column);
    const rows = new Uint16Array(MAX_DISPLAY_ROWS);
    const placed = new Map();
    const waiting = [];
    const sequence = priorityId ? [...ordered.filter((entry) => entry.id === priorityId),
      ...ordered.filter((entry) => entry.id !== priorityId)] : ordered;
    for (const entry of sequence) {
      const size = span(entry, columns);
      const desired = responsiveCell(entry.id === priorityId ? target :
        base === undefined ? entry.responsivePositions?.[columns] : previous.get(entry.id), size, columns);
      if (desired && free(rows, desired, size)) {
        mark(rows, desired, size);
        placed.set(entry.id, desired);
      } else waiting.push(entry);
    }
    for (const entry of waiting) {
      const size = span(entry, columns);
      let found = null;
      for (let row = 1; row + size.rows - 1 <= MAX_DISPLAY_ROWS && !found; row += 1) {
        for (let column = 1; column + size.columns - 1 <= columns; column += 1) {
          const cell = { column, row };
          if (free(rows, cell, size)) { found = cell; break; }
        }
      }
      if (!found) throw new Error(t("layout_mobile_failed"));
      mark(rows, found, size);
      placed.set(entry.id, found);
    }
    return placementsFor(entries, placed);
  }

  window.shortcutLayout = Object.freeze({
    limits, sizes, normalizeSize, span, area, position, isPositionInBounds,
    normalizeResponsivePositions, maxResponsiveRows: MAX_DISPLAY_ROWS,
    plan, canFit, partition, responsivePlacements,
  });
})();
