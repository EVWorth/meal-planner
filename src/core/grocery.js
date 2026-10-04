// Build a merged grocery list from planned recipes, and
// match it against what's already in Reminders.
import { itemKey } from "./ingredients.js";
import { parseIngredient } from "./recipe.js";
import { formatAmount, sumAmounts } from "./units.js";

/**
 * @param recipes  drafts in the plan (a recipe planned twice appears twice);
 *                 each ingredient line is parsed here
 * @returns [{ key, name, amounts:[{qty,unit}], recipes:[name], title, notes }]
 *          sorted by name.
 */
export function buildGroceryList(recipes) {
  const byKey = new Map();
  for (const recipe of recipes) {
    for (const line of recipe.ingredients ?? []) {
      const ing = parseIngredient(line);
      const key = itemKey(ing.item);
      if (!key) continue;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { key, name: capitalize(ing.item.trim()), raw: [], recipes: [] };
        byKey.set(key, entry);
      }
      entry.raw.push({ qty: ing.qty, unit: ing.unit || "" });
      if (!entry.recipes.includes(recipe.name)) entry.recipes.push(recipe.name);
    }
  }
  return [...byKey.values()]
    .map(({ raw, ...e }) => {
      const amounts = sumAmounts(raw);
      return { ...e, amounts, title: groceryTitle(e.name, amounts), notes: e.recipes.join(", ") };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
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
