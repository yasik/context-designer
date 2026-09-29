import { starter, validate } from "./model.js";
import { createView } from "./view.js";
import { loadLibrary } from "./tokenizer.js";

const root = document.getElementById("context-designer");
const $ = (id) => root.querySelector("#" + id);
const APP = "context-taxonomy-designer-v1";
const LOCAL_KEY = APP + "-draft";
const clone = (x) => JSON.parse(JSON.stringify(x));
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
let design = clone(starter),
  undoState = null,
  saveTimer = null,
  countTimer = null,
  tokenizer = null,
  tokenizerName = "",
  loadGeneration = 0,
  dirty = false;
const counts = new Map();
const {
  renderMap,
  renderTotals,
  renderEditor,
  renderEditorMetrics,
  renderAll,
} = createView(root, {
  getDesign: () => design,
  countFor,
  choose,
  canUndo: () => !!undoState,
});
try {
  const local = localStorage.getItem(LOCAL_KEY);
  if (local) {
    design = validate(JSON.parse(local));
    $("save-status").textContent = "Restored saved design";
  }
} catch {
  $("save-status").textContent =
    "Saved state could not be restored; the starter template is shown.";
}
function selectedSlot() {
  return design.selection?.type === "slot"
    ? design.slots.find((s) => s.id === design.selection.id)
    : null;
}
function selectedCategory() {
  const slot = selectedSlot();
  return design.categories.find(
    (c) => c.id === (slot ? slot.categoryId : design.selection?.id),
  );
}
function countFor(s) {
  if (!s.content) return 0;
  const c = counts.get(s.id);
  return c?.text === s.content && c.encoding === design.encoding
    ? c.count
    : null;
}
function setError(text = "") {
  $("form-error").textContent = text;
}
function saveSoon() {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 450);
  $("save-status").textContent = "Unsaved changes…";
}
function save() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(design));
    dirty = false;
    $("save-status").textContent =
      "Saved in this browser · export JSON for a portable backup";
  } catch {
    $("save-status").textContent =
      "Autosave unavailable · export JSON to keep this draft";
  }
}
function remember() {
  undoState = clone(design);
  $("undo").disabled = false;
}
function changed({ structure = false, count = false } = {}) {
  setError();
  if (structure) {
    renderMap();
    renderEditor();
  } else renderMap();
  renderTotals();
  renderEditorMetrics();
  saveSoon();
  if (count) scheduleCount();
}
function countNow() {
  if (!tokenizer || tokenizerName !== design.encoding) return;
  try {
    for (const s of design.slots) {
      if (countFor(s) === null)
        counts.set(s.id, {
          text: s.content,
          encoding: design.encoding,
          count: tokenizer.countTokens(s.content, {
            disallowedSpecial: new Set(),
          }),
        });
    }
    $("tokenizer-status").textContent =
      design.encoding +
      " · exact literal-text token counts · gpt-tokenizer 3.4.0";
    renderMap();
    renderTotals();
    renderEditorMetrics();
  } catch (e) {
    $("tokenizer-status").textContent = "Token counting failed: " + e.message;
    renderTotals();
  }
}
function scheduleCount() {
  clearTimeout(countTimer);
  if (tokenizer && tokenizerName === design.encoding) {
    $("tokenizer-status").textContent = "Counting text…";
    countTimer = setTimeout(countNow, 140);
  }
}
async function activateTokenizer() {
  const generation = ++loadGeneration;
  const name = design.encoding;
  tokenizer = null;
  tokenizerName = "";
  $("retry-tokenizer").hidden = true;
  $("tokenizer-status").textContent = "Loading " + name + " tokenizer…";
  renderTotals();
  renderMap();
  renderEditorMetrics();
  try {
    const api = await loadLibrary(name);
    if (generation !== loadGeneration) return;
    tokenizer = api;
    tokenizerName = name;
    countNow();
  } catch {
    if (generation !== loadGeneration) return;
    $("tokenizer-status").textContent =
      "Tokenizer unavailable. Budgets remain editable; text counts are not estimated.";
    $("retry-tokenizer").hidden = false;
  }
}
function choose(type, id) {
  design.selection = { type, id };
  renderMap();
  renderEditor();
  saveSoon();
}
function integerInput(input, min, apply) {
  const value = input.valueAsNumber;
  if (!Number.isSafeInteger(value) || value < min) {
    input.setAttribute("aria-invalid", "true");
    setError(
      "Enter a whole number of at least " +
        min +
        ". The previous valid allocation is retained.",
    );
    return;
  }
  input.removeAttribute("aria-invalid");
  remember();
  apply(value);
  changed();
}
function addSlot() {
  const c = selectedCategory() || design.categories[0];
  if (!c) return;
  remember();
  const s = {
    id: uid(),
    categoryId: c.id,
    name: "New slot",
    budget: 1000,
    content: "",
  };
  design.slots.push(s);
  design.selection = { type: "slot", id: s.id };
  changed({ structure: true });
  $("slot-name").focus();
  $("slot-name").select();
}
$("add-slot").addEventListener("click", addSlot);
$("category-add-slot").addEventListener("click", addSlot);
$("add-category").addEventListener("click", () => {
  remember();
  const c = {
    id: uid(),
    name: "New category",
    color: (design.categories.length % 6) + 1,
  };
  design.categories.push(c);
  design.selection = { type: "category", id: c.id };
  changed({ structure: true });
  $("category-name").focus();
  $("category-name").select();
});
$("design-name").addEventListener("input", () => {
  design.name = $("design-name").value;
  changed();
});
$("context-window").addEventListener("input", () =>
  integerInput($("context-window"), 1, (v) => (design.window = v)),
);
$("output-reserve").addEventListener("input", () =>
  integerInput($("output-reserve"), 0, (v) => (design.reserve = v)),
);
$("encoding").addEventListener("change", () => {
  remember();
  design.encoding = $("encoding").value;
  changed();
  activateTokenizer();
});
$("retry-tokenizer").addEventListener("click", activateTokenizer);
$("slot-name").addEventListener("input", () => {
  const s = selectedSlot();
  if (s) {
    s.name = $("slot-name").value;
    changed();
  }
});
$("slot-budget").addEventListener("input", () =>
  integerInput($("slot-budget"), 0, (v) => {
    const s = selectedSlot();
    if (s) s.budget = v;
  }),
);
$("slot-content").addEventListener("input", () => {
  const s = selectedSlot();
  if (s) {
    s.content = $("slot-content").value;
    changed({ count: true });
  }
});
$("slot-category").addEventListener("change", () => {
  const s = selectedSlot();
  if (s) {
    remember();
    s.categoryId = $("slot-category").value;
    changed({ structure: true });
  }
});
$("fit-budget").addEventListener("click", () => {
  const s = selectedSlot();
  if (!s) return;
  const n = countFor(s);
  if (n === null) return;
  remember();
  s.budget = n;
  changed({ structure: true });
});
$("duplicate-slot").addEventListener("click", () => {
  const s = selectedSlot();
  if (!s) return;
  remember();
  const copy = { ...s, id: uid(), name: (s.name || "Slot") + " copy" };
  design.slots.splice(design.slots.indexOf(s) + 1, 0, copy);
  design.selection = { type: "slot", id: copy.id };
  changed({ structure: true, count: true });
});
$("delete-slot").addEventListener("click", () => {
  const s = selectedSlot();
  if (!s) return;
  remember();
  design.slots = design.slots.filter((x) => x.id !== s.id);
  counts.delete(s.id);
  design.selection = { type: "category", id: s.categoryId };
  changed({ structure: true });
});
function moveSlot(delta) {
  const s = selectedSlot();
  if (!s) return;
  const siblings = design.slots.filter((x) => x.categoryId === s.categoryId);
  const other = siblings[siblings.indexOf(s) + delta];
  if (!other) return;
  remember();
  const a = design.slots.indexOf(s),
    b = design.slots.indexOf(other);
  [design.slots[a], design.slots[b]] = [design.slots[b], design.slots[a]];
  changed({ structure: true });
}
$("slot-up").addEventListener("click", () => moveSlot(-1));
$("slot-down").addEventListener("click", () => moveSlot(1));
$("category-name").addEventListener("input", () => {
  const c = selectedCategory();
  if (c) {
    c.name = $("category-name").value;
    changed();
  }
});
$("category-color").addEventListener("change", () => {
  const c = selectedCategory();
  if (c) {
    remember();
    c.color = Number($("category-color").value);
    changed();
  }
});
function moveCategory(delta) {
  const c = selectedCategory();
  if (!c) return;
  const index = design.categories.indexOf(c);
  if (!design.categories[index + delta]) return;
  remember();
  [design.categories[index], design.categories[index + delta]] = [
    design.categories[index + delta],
    design.categories[index],
  ];
  changed({ structure: true });
}
$("category-up").addEventListener("click", () => moveCategory(-1));
$("category-down").addEventListener("click", () => moveCategory(1));
$("delete-category").addEventListener("click", () => {
  const c = selectedCategory();
  if (!c || design.slots.some((s) => s.categoryId === c.id)) return;
  remember();
  design.categories = design.categories.filter((x) => x.id !== c.id);
  design.selection = design.categories[0]
    ? { type: "category", id: design.categories[0].id }
    : null;
  changed({ structure: true });
});
$("undo").addEventListener("click", () => {
  if (!undoState) return;
  const encoding = design.encoding;
  design = undoState;
  undoState = null;
  setError();
  root
    .querySelectorAll("[aria-invalid]")
    .forEach((e) => e.removeAttribute("aria-invalid"));
  renderAll();
  saveSoon();
  if (encoding !== design.encoding) activateTokenizer();
  else scheduleCount();
});
function exportJSON() {
  return JSON.stringify(
    { format: APP, exportedAt: new Date().toISOString(), design },
    null,
    2,
  );
}
$("export-json").addEventListener("click", () => {
  $("design-json").value = exportJSON();
  $("json-status").textContent =
    "Complete design prepared, including all prompt text.";
});
$("copy-json").addEventListener("click", async () => {
  const text = exportJSON();
  $("design-json").value = text;
  try {
    await navigator.clipboard.writeText(text);
    $("json-status").textContent = "Design copied.";
  } catch {
    $("design-json").focus();
    $("design-json").select();
    $("json-status").textContent = "JSON selected. Press ⌘C / Ctrl+C to copy.";
  }
});
$("download-json").addEventListener("click", () => {
  const blob = new Blob([exportJSON()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    (design.name.replace(/[^a-z0-9_-]+/gi, "-") || "context-design") + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});
$("import-json").addEventListener("click", () => {
  try {
    const parsed = JSON.parse($("design-json").value);
    if (parsed.format && parsed.format !== APP)
      throw Error("This is not a context taxonomy design.");
    const next = validate(parsed.design ?? parsed);
    const encoding = design.encoding;
    remember();
    design = next;
    counts.clear();
    renderAll();
    setError();
    saveSoon();
    if (encoding !== next.encoding || !tokenizer) activateTokenizer();
    else countNow();
    $("json-status").textContent =
      "Design imported. Undo restores the previous design.";
  } catch (e) {
    $("json-status").textContent = "Import rejected: " + e.message;
  }
});
window.addEventListener("pagehide", () => {
  if (dirty) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(design));
    } catch {}
  }
});
renderAll();
activateTokenizer();
