// Recipes are stored as schema.org Recipe JSON-LD (recipes/<id>.json), the
// same shape recipe sites publish and other recipe apps import:
//
// {
//   "@context": "https://schema.org", "@type": "Recipe",
//   "identifier": "chicken-tacos", "name": "Chicken Tacos",
//   "recipeYield": "4", "keywords": "mexican, chicken",
//   "recipeIngredient": ["1 1/2 lb chicken thighs, boneless", "salt, to taste"],
//   "recipeInstructions": [{ "@type": "HowToStep", "text": "Season the chicken." }],
//   "url": "https://…", "description": "our notes",
//   "dateCreated": "…", "dateModified": "…"
// }
//
// Ingredients stay plain lines; amounts are parsed when the grocery list is
// built. In the app a recipe is a "draft": { id, name, servings, tags,
// ingredients: [line], steps: [text], sourceUrl, notes, createdAt, updatedAt }.
import { parseIngredientLine, parseNumber } from "./ingredients.js";
import { findRecipe, fromSchemaOrg } from "./jsonld.js";
import { canonicalUnit, formatQty } from "./units.js";

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
  return v == null ? "" : String(v).replace(/\s+/g, " ").trim();
}

function toList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return v.split(/\n+/);
  return [v];
}

/** Parsed view of an ingredient line: { qty, unit, item, note }. */
export function parseIngredient(line) {
  const ing = parseIngredientLine(line);
  return { ...ing, unit: ing.unit ? canonicalUnit(ing.unit) ?? ing.unit : "" };
}

/** Ingredient line from a string or a structured object ({qty, unit, item, note}). */
function ingredientLine(input) {
  if (typeof input === "string") return toText(input);
  if (!input || typeof input !== "object") return "";
  if (typeof input.text === "string") return toText(input.text);
  const item = toText(input.item ?? input.name ?? input.ingredient ?? input.food);
  if (!item) return "";
  const raw = input.qty ?? input.quantity ?? input.amount;
  const qty = typeof raw === "number" ? raw : parseNumber(raw);
  return ingredientText({ qty: qty > 0 ? qty : null, unit: toText(input.unit), item, note: toText(input.note ?? input.notes) });
}

/**
 * Editable draft from anything recipe-shaped: a stored file, schema.org
 * JSON-LD from a page or an AI chat app, or a loose { name, ingredients,
 * steps } object. Never throws; toSchemaOrg validates.
 */
export function toDraft(input) {
  if (!input || typeof input !== "object") return toDraft({});
  const node = findRecipe(input);
  if (node) return fromSchemaOrg(node);
  const servings = typeof input.servings === "number" ? input.servings : parseNumber(String(input.servings ?? "").match(/[\d./ ]+/)?.[0]);
  return {
    id: toText(input.id),
    name: toText(input.name ?? input.title),
    servings: servings > 0 ? Math.round(servings) : null,
    tags: [...new Set(toList(typeof input.tags === "string" ? input.tags.split(",") : input.tags).map((t) => toText(t).toLowerCase()).filter(Boolean))],
    ingredients: toList(input.ingredients).map(ingredientLine).filter(Boolean),
    steps: toList(input.steps ?? input.instructions)
      .map((s) => (s && typeof s === "object" ? toText(s.text) : toText(s)))
      .map((s) => s.replace(/^\d+[.)]\s*/, ""))
      .filter(Boolean),
    sourceUrl: toText(input.sourceUrl ?? input.url ?? input.source),
    notes: toText(input.notes),
    createdAt: toText(input.createdAt),
    updatedAt: toText(input.updatedAt),
  };
}

/**
 * The stored schema.org document for a draft. Throws if there is no name
 * or no ingredients. `existing` (a draft) keeps id and dateCreated when
 * editing; new recipes get an id not in `existingIds`.
 */
export function toSchemaOrg(draft, { now = new Date(), existing = null, existingIds = [] } = {}) {
  const name = toText(draft.name);
  if (!name) throw new Error("Recipe needs a name.");
  const ingredients = draft.ingredients.map(toText).filter(Boolean);
  if (!ingredients.length) throw new Error(`"${name}" has no ingredients.`);
  const stamp = now.toISOString();
  const doc = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    identifier: existing?.id || draft.id || uniqueId(name, existingIds),
    name,
  };
  if (draft.servings) doc.recipeYield = String(draft.servings);
  if (draft.tags.length) doc.keywords = draft.tags.join(", ");
  doc.recipeIngredient = ingredients;
  doc.recipeInstructions = draft.steps.map(toText).filter(Boolean).map((text) => ({ "@type": "HowToStep", text }));
  if (draft.sourceUrl) doc.url = draft.sourceUrl;
  if (draft.notes) doc.description = draft.notes;
  doc.dateCreated = existing?.createdAt || draft.createdAt || stamp;
  doc.dateModified = stamp;
  return doc;
}

/** Stored document for anything recipe-shaped (toDraft + toSchemaOrg). */
export function normalizeRecipe(input, opts) {
  return toSchemaOrg(toDraft(input), opts);
}

/**
 * Parse recipe JSON pasted from an AI chat app. Accepts a bare object, an
 * array of recipes, an @graph, or text with a ```json fence around it.
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
  if (data && Array.isArray(data["@graph"])) {
    const recipes = data["@graph"].filter((n) => findRecipe(n));
    if (recipes.length) return recipes;
  }
  return [data];
}

/** An ingredient line from parsed parts. */
export function ingredientText(ing) {
  const parts = [];
  if (ing.qty != null) parts.push(formatQty(ing.qty, ing.unit));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.item);
  let s = parts.join(" ");
  if (ing.note) s += `, ${ing.note}`;
  return s;
}

/** How the grocery list reads a line: "1 1/2 · lb · chicken thighs". */
export function describeIngredient(line) {
  const ing = parseIngredient(line);
  const parts = [];
  parts.push(ing.qty != null ? formatQty(ing.qty, ing.unit) : "no amount");
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.item || "?");
  return parts.join(" · ");
}
