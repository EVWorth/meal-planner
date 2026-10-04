// Viewing and editing a single recipe.
import {
  formatAmount,
  ingredientText,
  normalizeIngredient,
  normalizeRecipe,
  parseIngredientLine,
} from "../core/index.js";
import { button, choose, escapeHtml, header, liveTable, promptOne, row, showError } from "./ui.js";

/** Loosely-shaped recipe input -> editable draft. Never throws. */
export function toDraft(input) {
  return {
    id: input.id,
    createdAt: input.createdAt,
    name: String(input.name ?? input.title ?? ""),
    servings: input.servings ?? null,
    tags: Array.isArray(input.tags) ? input.tags : String(input.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    ingredients: (Array.isArray(input.ingredients) ? input.ingredients : []).map(normalizeIngredient).filter(Boolean),
    steps: (Array.isArray(input.steps) ? input.steps : []).map(String),
    sourceUrl: String(input.sourceUrl ?? ""),
    notes: String(input.notes ?? ""),
  };
}

function move(list, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

/**
 * Edit a draft. Returns the saved recipe, or null if the user backed out.
 * `existing` is the stored recipe when editing (keeps id and createdAt).
 */
export async function editRecipe(ctx, input, { existing = null, title = "Edit recipe" } = {}) {
  const draft = toDraft(input);
  for (;;) {
    let save = false;
    await liveTable(async (t, refresh) => {
      header(t, title);
      const saveRow = row(t, "💾 Save recipe", "Or tap Close to discard changes", () => {});
      saveRow.dismissOnSelect = true;
      saveRow.onSelect = () => {
        save = true;
      };

      header(t, "Details");
      row(t, draft.name || "(no name)", "Name", async () => {
        const v = await promptOne("Name", draft.name);
        if (v != null) draft.name = v.trim();
        await refresh();
      });
      row(t, draft.servings ? String(draft.servings) : "—", "Servings", async () => {
        const v = await promptOne("Servings", draft.servings ? String(draft.servings) : "", { placeholder: "4" });
        if (v != null) draft.servings = Number.parseInt(v, 10) || null;
        await refresh();
      });
      row(t, draft.tags.join(", ") || "—", "Tags", async () => {
        const v = await promptOne("Tags", draft.tags.join(", "), { message: "Comma separated", placeholder: "chicken, quick" });
        if (v != null) draft.tags = v.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        await refresh();
      });
      row(t, draft.sourceUrl || "—", "Source link", async () => {
        const v = await promptOne("Source link", draft.sourceUrl, { placeholder: "https://" });
        if (v != null) draft.sourceUrl = v.trim();
        await refresh();
      });
      row(t, draft.notes || "—", "Notes", async () => {
        const v = await promptOne("Notes", draft.notes);
        if (v != null) draft.notes = v.trim();
        await refresh();
      });

      header(t, `Ingredients (${draft.ingredients.length})`);
      draft.ingredients.forEach((ing, i) => {
        row(t, ingredientText(ing), "", async () => {
          const pick = await choose(ingredientText(ing), ["Edit", "Move up", "Delete"], { destructive: [2] });
          if (pick === 0) {
            const v = await promptOne("Ingredient", ingredientText(ing), { message: 'Like "1 1/2 cup flour, sifted"' });
            if (v != null && v.trim()) draft.ingredients[i] = parseIngredientLine(v);
          } else if (pick === 1) {
            move(draft.ingredients, i, -1);
          } else if (pick === 2) {
            draft.ingredients.splice(i, 1);
          }
          await refresh();
        });
      });
      button(t, "＋ Add ingredient", async () => {
        const v = await promptOne("Add ingredient", "", { message: 'Like "2 cloves garlic, minced"', ok: "Add" });
        if (v && v.trim()) draft.ingredients.push(normalizeIngredient(v));
        await refresh();
      });
      button(t, "📋 Add ingredients from clipboard (one per line)", async () => {
        const lines = String(Pasteboard.paste() ?? "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
        draft.ingredients.push(...lines.map(normalizeIngredient).filter(Boolean));
        await refresh();
      });

      header(t, `Steps (${draft.steps.length})`);
      draft.steps.forEach((step, i) => {
        row(t, `${i + 1}. ${step}`, "", async () => {
          const pick = await choose(`Step ${i + 1}`, ["Edit", "Move up", "Delete"], { destructive: [2] });
          if (pick === 0) {
            const v = await promptOne(`Step ${i + 1}`, step);
            if (v != null && v.trim()) draft.steps[i] = v.trim();
          } else if (pick === 1) {
            move(draft.steps, i, -1);
          } else if (pick === 2) {
            draft.steps.splice(i, 1);
          }
          await refresh();
        });
      });
      button(t, "＋ Add step", async () => {
        const v = await promptOne("Add step", "", { ok: "Add" });
        if (v && v.trim()) draft.steps.push(v.trim());
        await refresh();
      });
      button(t, "📋 Add steps from clipboard (one per line)", async () => {
        const lines = String(Pasteboard.paste() ?? "").split(/\n+/).map((l) => l.trim().replace(/^\d+[.)]\s*/, "")).filter(Boolean);
        draft.steps.push(...lines);
        await refresh();
      });
    });
    if (!save) return null;
    try {
      const recipe = normalizeRecipe(draft, {
        existing,
        existingIds: ctx.recipes.map((r) => r.id),
      });
      ctx.saveRecipe(recipe);
      return recipe;
    } catch (e) {
      await showError(e); // back into the editor with the draft intact
    }
  }
}

export function recipeHtml(recipe) {
  const ings = recipe.ingredients
    .map((i) => {
      const amount = i.qty != null ? formatAmount({ qty: i.qty, unit: i.unit }) : i.unit;
      return `<li>${amount ? `<b>${escapeHtml(amount)}</b> ` : ""}${escapeHtml(i.item)}${i.note ? `, <span class="note">${escapeHtml(i.note)}</span>` : ""}</li>`;
    })
    .join("");
  const steps = recipe.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const meta = [recipe.servings ? `Serves ${recipe.servings}` : "", recipe.tags.join(" · ")].filter(Boolean).join(" — ");
  const source = recipe.sourceUrl ? `<p class="meta"><a href="${escapeHtml(recipe.sourceUrl)}">Original recipe</a></p>` : "";
  const notes = recipe.notes ? `<h2>Notes</h2><p>${escapeHtml(recipe.notes)}</p>` : "";
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { color-scheme: light dark; --muted: #6b6b6b; --accent: #b4532a; }
@media (prefers-color-scheme: dark) { :root { --muted: #a0a0a0; --accent: #e8875c; } }
body { font: 17px/1.5 -apple-system, system-ui, sans-serif; margin: 0; padding: 20px 16px 48px; max-width: 680px; }
h1 { font-size: 26px; line-height: 1.2; margin: 0 0 4px; }
h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); margin: 28px 0 8px; }
.meta { color: var(--muted); margin: 0; font-size: 15px; }
ul, ol { padding-left: 22px; } li { margin: 6px 0; }
ol li { margin: 12px 0; } .note { color: var(--muted); }
a { color: var(--accent); }
</style></head><body>
<h1>${escapeHtml(recipe.name)}</h1>
${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}${source}
<h2>Ingredients</h2><ul>${ings}</ul>
${steps ? `<h2>Method</h2><ol>${steps}</ol>` : ""}
${notes}
</body></html>`;
}

export async function viewRecipe(recipe) {
  const wv = new WebView();
  await wv.loadHTML(recipeHtml(recipe));
  await wv.present();
}

