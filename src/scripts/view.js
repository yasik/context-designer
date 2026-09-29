export function createView(root, { getDesign, countFor, choose, canUndo }) {
  const $ = (id) => root.querySelector("#" + id);
  const encoder = new TextEncoder();
  const fmt = (n) => n.toLocaleString();
  const palette = (n) => "var(--viz-series-" + n + ")";
  function orderedSlots() {
    const design = getDesign();
    return design.categories.flatMap((c) =>
      design.slots.filter((s) => s.categoryId === c.id),
    );
  }
  function selectedSlot() {
    const design = getDesign();
    return design.selection?.type === "slot"
      ? design.slots.find((s) => s.id === design.selection.id)
      : null;
  }
  function selectedCategory() {
    const design = getDesign();
    const slot = selectedSlot();
    return design.categories.find(
      (c) => c.id === (slot ? slot.categoryId : design.selection?.id),
    );
  }
  function totals() {
    const design = getDesign();
    const values = design.slots.map((s) => ({ s, count: countFor(s) }));
    const ready = values.every((v) => v.count !== null);
    const used = values.reduce((a, v) => a + (v.count ?? 0), 0);
    const budget = values.reduce((a, v) => a + v.s.budget, 0);
    const footprint = values.reduce(
      (a, v) => a + Math.max(v.s.budget, v.count ?? 0),
      design.reserve,
    );
    return { ready, used, budget, footprint, free: design.window - footprint };
  }
  function button(text, fn, cls = "btn btn-ghost") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = text;
    b.addEventListener("click", fn);
    return b;
  }
  function renderMap() {
    const design = getDesign();
    const host = $("sector-map");
    host.replaceChildren();
    let index = 0;
    for (const c of design.categories) {
      const group = document.createElement("section");
      const header = document.createElement("div");
      header.className = "category-heading";
      const name = document.createElement("div");
      name.className = "category-name";
      name.textContent = c.name || "Unnamed category";
      const members = design.slots.filter((s) => s.categoryId === c.id);
      const sub = document.createElement("div");
      sub.className = "viz-row";
      const edit = button("Edit category", () => choose("category", c.id));
      edit.setAttribute("aria-label", "Edit category " + (c.name || "unnamed"));
      edit.setAttribute(
        "aria-pressed",
        String(
          design.selection?.type === "category" && design.selection.id === c.id,
        ),
      );
      const sum = document.createElement("span");
      sum.className = "text-small tabular-nums";
      sum.textContent =
        fmt(members.reduce((n, s) => n + s.budget, 0)) + " tokens budgeted";
      sub.append(edit, sum);
      header.append(name, sub);
      group.append(header);
      for (const s of members) {
        const row = document.createElement("div");
        row.className = "sector";
        row.dataset.slotId = s.id;
        const address = document.createElement("code");
        address.className = "sector-address text-small";
        address.textContent = "S" + String(index++).padStart(2, "0");
        const mark = document.createElement("div");
        mark.className = "sector-mark";
        mark.style.setProperty("--sector-color", palette(c.color));
        mark.setAttribute("aria-hidden", "true");
        const cell = document.createElement("div");
        const label = document.createElement("div");
        label.className = "sector-label";
        label.textContent = s.name || "Unnamed slot";
        const action = button(
          "Edit content",
          () => choose("slot", s.id),
          "btn btn-block",
        );
        action.setAttribute("aria-label", "Edit slot " + (s.name || "unnamed"));
        action.setAttribute(
          "aria-pressed",
          String(
            design.selection?.type === "slot" && design.selection.id === s.id,
          ),
        );
        const amount = countFor(s);
        const caption = document.createElement("div");
        caption.className = "sector-caption text-small tabular-nums";
        caption.textContent =
          (amount === null ? "…" : fmt(amount)) +
          " / " +
          fmt(s.budget) +
          " tokens";
        if (amount !== null && amount > s.budget) {
          caption.classList.add("text-destructive");
          caption.textContent += " · +" + fmt(amount - s.budget) + " over";
        }
        cell.append(label, action, caption);
        row.append(address, mark, cell);
        group.append(row);
      }
      if (!members.length) {
        const empty = document.createElement("div");
        empty.className = "text-small empty";
        empty.textContent = "No slots allocated";
        group.append(empty);
      }
      host.append(group);
    }
    if (!design.categories.length) host.textContent = "No categories yet.";
    $("add-slot").disabled = !design.categories.length;
  }
  function renderTotals() {
    const design = getDesign();
    const t = totals();
    $("totals").replaceChildren();
    for (const label of [
      (t.ready ? fmt(t.used) : "…") + " text tokens",
      fmt(t.budget) + " budgeted",
      fmt(design.reserve) + " reserved",
      t.ready
        ? t.free >= 0
          ? fmt(t.free) + " unallocated"
          : fmt(-t.free) + " over window"
        : "Counting footprint…",
    ]) {
      const span = document.createElement("span");
      span.textContent = label;
      $("totals").append(span);
    }
    const track = $("allocation-track");
    track.replaceChildren();
    const extent = Math.max(design.window, t.footprint, 1);
    for (const s of orderedSlots()) {
      const used = countFor(s);
      const footprint = Math.max(s.budget, used ?? 0);
      if (!footprint) continue;
      const c = design.categories.find((c) => c.id === s.categoryId);
      const segment = document.createElement("div");
      segment.className = "allocation-segment cursor-interaction";
      segment.style.width = (footprint / extent) * 100 + "%";
      segment.style.setProperty("--segment-color", palette(c.color));
      segment.dataset.chartSlot = s.id;
      segment.setAttribute(
        "data-tooltip",
        (s.name || "Unnamed slot") +
          " · " +
          (used === null ? "pending" : fmt(used)) +
          " used / " +
          fmt(s.budget) +
          " budget",
      );
      segment.addEventListener("click", () => choose("slot", s.id));
      const fill = document.createElement("div");
      fill.className = "content-fill";
      fill.style.width = ((used ?? 0) / footprint) * 100 + "%";
      segment.append(fill);
      if (used !== null && used > s.budget) {
        const over = document.createElement("div");
        over.className = "over-budget-fill";
        over.style.left = (s.budget / footprint) * 100 + "%";
        over.style.width = ((used - s.budget) / footprint) * 100 + "%";
        segment.append(over);
      }
      track.append(segment);
    }
    if (design.reserve) {
      const reserve = document.createElement("div");
      reserve.className = "allocation-segment";
      reserve.style.width = (design.reserve / extent) * 100 + "%";
      reserve.style.setProperty("--segment-color", "var(--foreground)");
      reserve.setAttribute(
        "data-tooltip",
        "Output / overhead reserve · " + fmt(design.reserve) + " tokens",
      );
      track.append(reserve);
    }
    if (t.footprint > design.window) {
      const marker = document.createElement("div");
      marker.className = "capacity-marker";
      marker.style.left = (design.window / extent) * 100 + "%";
      track.append(marker);
    }
    track.setAttribute(
      "aria-label",
      (t.ready ? fmt(t.used) + " content tokens" : "Token counting pending") +
        ", " +
        fmt(t.budget) +
        " slot budget, " +
        fmt(design.reserve) +
        " output and overhead reserve, " +
        fmt(design.window) +
        " token window",
    );
    $("allocation-end").textContent =
      fmt(extent) +
      " tokens" +
      (extent > design.window ? " · window ends at " + fmt(design.window) : "");
    const legend = $("allocation-legend");
    legend.replaceChildren();
    for (const c of design.categories) {
      const item = document.createElement("span");
      item.className = "legend-item";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.setProperty("--swatch-color", palette(c.color));
      const label = document.createElement("span");
      label.textContent = c.name || "Unnamed category";
      item.append(swatch, label);
      legend.append(item);
    }
    const over = t.ready
      ? design.slots.filter((s) => countFor(s) > s.budget).length
      : 0;
    $("budget-warning").textContent =
      t.footprint > design.window
        ? "Footprint exceeds the window by " +
          fmt(t.footprint - design.window) +
          " tokens."
        : over
          ? over +
            " slot" +
            (over === 1 ? " is" : "s are") +
            " over budget; the full text is still counted."
          : "";
    $("budget-warning").classList.toggle(
      "text-destructive",
      t.footprint > design.window || over > 0,
    );
  }
  function renderEditor() {
    const design = getDesign();
    const s = selectedSlot(),
      c = selectedCategory();
    $("slot-editor").hidden = !s;
    $("category-editor").hidden = !!s || !c;
    $("no-selection").hidden = !!s || !!c;
    if (s) {
      $("slot-heading").textContent =
        "Edit slot · S" +
        String(orderedSlots().findIndex((x) => x.id === s.id)).padStart(2, "0");
      $("slot-name").value = s.name;
      $("slot-budget").value = s.budget;
      $("slot-content").value = s.content;
      $("slot-category").replaceChildren(
        ...design.categories.map((c) => {
          const o = document.createElement("option");
          o.value = c.id;
          o.textContent = c.name || "Unnamed category";
          return o;
        }),
      );
      $("slot-category").value = s.categoryId;
      const siblings = design.slots.filter(
        (x) => x.categoryId === s.categoryId,
      );
      const i = siblings.indexOf(s);
      $("slot-up").disabled = i === 0;
      $("slot-down").disabled = i === siblings.length - 1;
    } else if (c) {
      $("category-name").value = c.name;
      $("category-color").value = c.color;
      const i = design.categories.indexOf(c);
      $("category-up").disabled = i === 0;
      $("category-down").disabled = i === design.categories.length - 1;
      const occupied = design.slots.some((s) => s.categoryId === c.id);
      $("delete-category").disabled = occupied;
      $("category-delete-note").textContent = occupied
        ? "Move or delete its slots before deleting this category."
        : "";
    }
    renderEditorMetrics();
  }
  function renderEditorMetrics() {
    const design = getDesign();
    const s = selectedSlot(),
      c = selectedCategory();
    if (s) {
      const n = countFor(s);
      $("slot-metrics").textContent =
        n === null
          ? "Token count pending"
          : fmt(n) +
            " text tokens · " +
            (n <= s.budget
              ? fmt(s.budget - n) + " within budget"
              : fmt(n - s.budget) + " over budget") +
            " · " +
            fmt(encoder.encode(s.content).length) +
            " UTF-8 bytes";
      $("slot-metrics").classList.toggle(
        "text-destructive",
        n !== null && n > s.budget,
      );
      $("fit-budget").disabled = n === null;
    }
    if (c) {
      const slots = design.slots.filter((s) => s.categoryId === c.id);
      const ready = slots.every((s) => countFor(s) !== null);
      $("category-metrics").textContent =
        slots.length +
        " slots · " +
        (ready ? fmt(slots.reduce((n, s) => n + countFor(s), 0)) : "…") +
        " text tokens · " +
        fmt(slots.reduce((n, s) => n + s.budget, 0)) +
        " budgeted";
    }
  }
  function renderAll() {
    const design = getDesign();
    $("design-name").value = design.name;
    $("context-window").value = design.window;
    $("output-reserve").value = design.reserve;
    $("encoding").value = design.encoding;
    renderMap();
    renderEditor();
    renderTotals();
    $("undo").disabled = !canUndo();
  }

  return {
    renderMap,
    renderTotals,
    renderEditor,
    renderEditorMetrics,
    renderAll,
  };
}
