// Build a merged, aisle-grouped grocery list from planned recipes, and
// match it against what's already in Reminders.
import { itemKey } from "./ingredients.js";
import { DEFAULT_AISLES } from "./aisles.js";
import { formatAmount, sumAmounts } from "./units.js";

/**
 * @param recipes  recipes in the plan (a recipe planned twice appears twice)
 * @returns [{ key, name, aisle, amounts:[{qty,unit}], recipes:[name], title, notes }]
 *          sorted by aisle order, then name.
 */
export function buildGroceryList(recipes, { aisles = DEFAULT_AISLES } = {}) {
  const byKey = new Map();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients ?? []) {
      const key = itemKey(ing.item);
      if (!key) continue;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { key, name: capitalize(ing.item.trim()), aisle: ing.aisle || "Other", raw: [], recipes: [] };
        byKey.set(key, entry);
      }
      entry.raw.push({ qty: ing.qty, unit: ing.unit || "" });
      if (!entry.recipes.includes(recipe.name)) entry.recipes.push(recipe.name);
    }
  }
  const order = (a) => {
    const i = aisles.indexOf(a);
    return i < 0 ? aisles.length : i;
  };
  return [...byKey.values()]
    .map(({ raw, ...e }) => {
      const amounts = sumAmounts(raw);
      return { ...e, amounts, title: groceryTitle(e.name, amounts), notes: e.recipes.join(", ") };
    })
    .sort((a, b) => order(a.aisle) - order(b.aisle) || a.name.localeCompare(b.name));
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** "Onion (2)", "Flour (2 1/2 cups)", "Salt" */
export function groceryTitle(name, amounts) {
  const parts = amounts
    .filter((a) => a.qty != null)
    .map(formatAmount)
    .filter(Boolean);
  return parts.length ? `${name} (${parts.join(" + ")})` : name;
}

/** Item key from an existing reminder title, ignoring a trailing "(qty)". */
export function keyFromTitle(title) {
  return itemKey(String(title ?? "").replace(/\s*\([^)]*\)\s*$/, ""));
}

/**
 * Split the list into items to add and items already on the Reminders list
 * (incomplete reminders only), plus pantry items the user usually has.
 */
export function planExport(items, existingTitles, { pantry = [] } = {}) {
  const existing = new Set(existingTitles.map(keyFromTitle));
  const pantryKeys = new Set(pantry.map(itemKey));
  return items.map((item) => ({
    ...item,
    status: existing.has(item.key) ? "duplicate" : pantryKeys.has(item.key) ? "pantry" : "add",
  }));
}

/** Group items by aisle, preserving order: [{ aisle, items }]. */
export function groupByAisle(items) {
  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.aisle === item.aisle) last.items.push(item);
    else groups.push({ aisle: item.aisle, items: [item] });
  }
  return groups;
}
