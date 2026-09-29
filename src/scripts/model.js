export const starter = {
  version: 1,
  name: "My agent context",
  window: 128000,
  reserve: 8000,
  encoding: "o200k_base",
  categories: [
    { id: "envelope", name: "Request envelope", color: 1 },
    { id: "stable", name: "Stable system tier", color: 2 },
    { id: "context", name: "Project context tier", color: 3 },
    { id: "volatile", name: "Volatile system tier", color: 4 },
    { id: "body", name: "Growing body", color: 5 },
  ],
  slots: [
    {
      id: "tools",
      categoryId: "envelope",
      name: "Tool schemas",
      budget: 4000,
      content: "",
    },
    {
      id: "identity",
      categoryId: "stable",
      name: "Identity + behavior",
      budget: 4000,
      content: "",
    },
    {
      id: "project",
      categoryId: "context",
      name: "Project instructions",
      budget: 8000,
      content: "",
    },
    {
      id: "memory",
      categoryId: "volatile",
      name: "Memory + current state",
      budget: 4000,
      content: "",
    },
    {
      id: "history",
      categoryId: "body",
      name: "Conversation history",
      budget: 80000,
      content: "",
    },
  ],
  selection: { type: "slot", id: "identity" },
};

export function validate(raw) {
  if (!raw || raw.version !== 1)
    throw Error("Unsupported design version. Expected version 1.");
  const string = (v, label) => {
    if (typeof v !== "string") throw Error(label + " must be text.");
    return v;
  };
  const integer = (v, min, label) => {
    if (!Number.isSafeInteger(v) || v < min)
      throw Error(label + " must be a whole number of at least " + min + ".");
    return v;
  };
  if (!Array.isArray(raw.categories) || !Array.isArray(raw.slots))
    throw Error("The design must contain categories and slots arrays.");
  if (!["o200k_base", "cl100k_base"].includes(raw.encoding))
    throw Error("Unsupported tokenizer encoding.");
  const ids = new Set();
  const categories = raw.categories.map((c) => {
    const id = string(c.id, "Category ID");
    if (!id || ids.has(id))
      throw Error("Category IDs must be non-empty and unique.");
    ids.add(id);
    const color = integer(c.color, 1, "Category color");
    if (color > 6) throw Error("Category color must be 1–6.");
    return { id, name: string(c.name, "Category name"), color };
  });
  const slotIds = new Set();
  const slots = raw.slots.map((s) => {
    const id = string(s.id, "Slot ID");
    if (!id || slotIds.has(id))
      throw Error("Slot IDs must be non-empty and unique.");
    slotIds.add(id);
    if (!ids.has(s.categoryId))
      throw Error("Every slot must reference an existing category.");
    return {
      id,
      categoryId: s.categoryId,
      name: string(s.name, "Slot name"),
      budget: integer(s.budget, 0, "Slot budget"),
      content: string(s.content, "Slot content"),
    };
  });
  const selection =
    raw.selection &&
    ((raw.selection.type === "slot" && slotIds.has(raw.selection.id)) ||
      (raw.selection.type === "category" && ids.has(raw.selection.id)))
      ? { type: raw.selection.type, id: raw.selection.id }
      : slots[0]
        ? { type: "slot", id: slots[0].id }
        : categories[0]
          ? { type: "category", id: categories[0].id }
          : null;
  const result = {
    version: 1,
    name: string(raw.name, "Design name"),
    window: integer(raw.window, 1, "Context window"),
    reserve: integer(raw.reserve, 0, "Reserve"),
    encoding: raw.encoding,
    categories,
    slots,
    selection,
  };
  if (
    !Number.isSafeInteger(slots.reduce((n, s) => n + s.budget, result.reserve))
  )
    throw Error("Combined budgets exceed the supported numeric range.");
  return result;
}
