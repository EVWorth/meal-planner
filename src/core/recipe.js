// Recipe shape, normalization and validation.
//
// Stored recipe (recipes/<id>.json):
// {
//   id, name, servings (number|null), tags: [string],
//   ingredients: [{ qty (number|null), unit, item, aisle, note }],
//   steps: [string], sourceUrl, notes, createdAt, updatedAt
// }
import { parseIngredientLine, parseNumber } from "./ingredients.js";
import { canonicalUnit, formatQty } from "./units.js";
import { DEFAULT_AISLES, guessAisle } from "./aisles.js";

export function slugify(name) {
  const s = String(name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "recipe";
}

/** A slug for `name` that isn't in `existingIds`. */
export function uniqueId(name, existingIds) {
  const taken = new Set(existingIds);
  const base = slugify(name);
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

function toText(v) {
  return v == null ? "" : String(v).trim();
}

function toQty(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  const n = parseNumber(v);
  return n != null && n > 0 ? n : null;
}

export function normalizeIngredient(input, aisles = DEFAULT_AISLES) {
  let ing;
  if (typeof input === "string") {
    ing = parseIngredientLine(input);
  } else if (input && typeof input === "object") {
    ing = {
      qty: toQty(input.qty ?? input.quantity ?? input.amount),
      unit: toText(input.unit),
      item: toText(input.item ?? input.name ?? input.ingredient),
      note: toText(input.note ?? input.notes ?? input.preparation),
      aisle: toText(input.aisle),
    };
    // An object with only a text field ("1 cup flour") — parse it.
    if (!ing.item && typeof input.text === "string") ing = { ...parseIngredientLine(input.text), aisle: ing.aisle };
  } else {
    return null;
  }
  if (!ing.item) return null;
  const unit = ing.unit ? canonicalUnit(ing.unit) ?? ing.unit.toLowerCase() : "";
  const aisle = aisles.includes(ing.aisle) ? ing.aisle : guessAisle(ing.item, aisles);
  return { qty: ing.qty ?? null, unit, item: ing.item, aisle, note: ing.note ?? "" };
}

function toList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return v.split(/\n+/);
  return [v];
}

/**
 * Coerce loosely-shaped input (chatbot JSON, JSON-LD mapping, form edits)
 * into a stored recipe. Throws if there is no name or no ingredients.
 * `existing` keeps id/createdAt when editing.
 */
export function normalizeRecipe(input, { aisles = DEFAULT_AISLES, now = new Date(), existing = null, existingIds = [] } = {}) {
  if (!input || typeof input !== "object") throw new Error("Recipe must be a JSON object.");
  const name = toText(input.name ?? input.title);
  if (!name) throw new Error("Recipe needs a name.");
  const ingredients = toList(input.ingredients)
    .map((i) => normalizeIngredient(i, aisles))
    .filter(Boolean);
  if (!ingredients.length) throw new Error(`"${name}" has no ingredients.`);
  const steps = toList(input.steps ?? input.instructions)
    .map((s) => (typeof s === "object" && s ? toText(s.text) : toText(s)))
    .map((s) => s.replace(/^\d+[.)]\s*/, ""))
    .filter(Boolean);
  const tags = [...new Set(toList(typeof input.tags === "string" ? input.tags.split(",") : input.tags)
    .map((t) => toText(t).toLowerCase())
    .filter(Boolean))];
  const servings = toQty(input.servings ?? input.yield);
  const stamp = now.toISOString();
  return {
    id: existing?.id ?? input.id ?? uniqueId(name, existingIds),
    name,
    servings: servings == null ? null : Math.round(servings),
    tags,
    ingredients,
    steps,
    sourceUrl: toText(input.sourceUrl ?? input.url ?? input.source),
    notes: toText(input.notes),
    createdAt: existing?.createdAt ?? input.createdAt ?? stamp,
    updatedAt: stamp,
  };
}

/**
 * Parse recipe JSON pasted from a chatbot. Accepts a bare object, an array
 * of recipes, or text with a ```json fence around it.
 */
export function parseRecipeJson(text) {
  const raw = String(text ?? "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  let body = fenced ? fenced[1] : raw;
  if (!fenced) {
    const start = body.search(/[[{]/);
    const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
    if (start >= 0 && end > start) body = body.slice(start, end + 1);
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    throw new Error("That isn't valid JSON: " + e.message);
  }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.recipes)) return data.recipes;
  return [data];
}

/** One line per ingredient, for display and editing. */
export function ingredientText(ing) {
  const parts = [];
  if (ing.qty != null) parts.push(formatQty(ing.qty, ing.unit));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.item);
  let s = parts.join(" ");
  if (ing.note) s += `, ${ing.note}`;
  return s;
}
