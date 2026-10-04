// Main screens: the week, the recipe library, the grocery list, settings.
import {
  buildGroceryList,
  chatbotPrompt,
  emptyPlan,
  fillPlan,
  groupByAisle,
  isPastWeek,
  planExport,
  plannedRecipes,
  preferenceOf,
  rerollDay,
  setDay,
  setPreference,
  toggleLock,
} from "../core/index.js";
import { editRecipe, viewRecipe } from "./editor.js";
import { addRecipeMenu } from "./importer.js";
import { addReminders, openReminderTitles, reminderLists } from "./services.js";
import { button, choose, confirm, header, liveTable, message, promptOne, row } from "./ui.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PREF_ICON = { include: "⭐️", ignore: "🚫", normal: "" };

function shortDate(ymd) {
  const [, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

// Week

export async function home(ctx) {
  await liveTable(async (t, refresh) => {
    const plan = ctx.plan;
    header(t, `🍽 Week of ${shortDate(plan.weekOf)}`);
    if (isPastWeek(plan)) {
      button(t, "This week is over — start next week", async () => {
        await startNextWeek(ctx);
        await refresh();
      });
    }
    plan.days.forEach((d, i) => {
      const recipe = d.kind === "recipe" ? ctx.recipe(d.recipeId) : null;
      const title = recipe ? recipe.name : d.kind === "out" ? "🍴 Eating out" : "—";
      row(t, title, `${d.label} ${shortDate(d.date)}`, async () => {
        await nightMenu(ctx, i);
        await refresh();
      }, { right: d.locked ? "🔒" : "" });
    });

    header(t, "Plan");
    button(t, "🎲 Fill empty and unlocked nights", async () => {
      if (!ctx.recipes.length) return message("No recipes yet", "Add some recipes first.");
      await ctx.updatePlan((p) => fillPlan(p, ctx.recipes));
      await refresh();
    });
    button(t, "🗓 Start next week", async () => {
      if (await confirm("Start next week?", "Clears this week's nights. Always-include and never-pick choices carry over.", "Start")) {
        await startNextWeek(ctx);
        await refresh();
      }
    });
    button(t, "🛒 Send grocery list to Reminders", () => groceries(ctx));

    header(t, "Recipes");
    button(t, `📖 Recipe library (${ctx.recipes.length})`, async () => {
      await library(ctx);
      await refresh();
    });
    button(t, "＋ Add a recipe", async () => {
      await addRecipeMenu(ctx);
      await refresh();
    });
    button(t, "⚙️ Settings", async () => {
      await settings(ctx);
      await refresh();
    });
    button(t, "🔄 Reload from iCloud", async () => {
      await ctx.load();
      await refresh();
    });
  });
}

async function startNextWeek(ctx) {
  await ctx.updatePlan((p) => {
    const next = emptyPlan({ startDay: ctx.config.startDay, nights: ctx.config.nights, previous: p });
    return ctx.recipes.length ? fillPlan(next, ctx.recipes) : next;
  });
}

async function nightMenu(ctx, i) {
  const d = ctx.plan.days[i];
  const recipe = d.kind === "recipe" ? ctx.recipe(d.recipeId) : null;
  const title = `${d.label} ${shortDate(d.date)}`;
  const actions = [];
  if (recipe) {
    actions.push(["View recipe", () => viewRecipe(recipe)]);
    actions.push(["Swap for another random recipe", () => ctx.updatePlan((p) => rerollDay(p, i, ctx.recipes))]);
  } else {
    actions.push(["Pick a random recipe", () => ctx.updatePlan((p) => rerollDay(p, i, ctx.recipes))]);
  }
  actions.push(["Choose a recipe…", async () => {
    const id = await pickRecipe(ctx, `Recipe for ${title}`);
    if (id) await ctx.updatePlan((p) => setDay(p, i, { kind: "recipe", recipeId: id }));
  }]);
  if (recipe) actions.push([d.locked ? "Unlock (allow rerolls)" : "Lock (keep when rerolling)", () => ctx.updatePlan((p) => toggleLock(p, i))]);
  if (d.kind !== "out") actions.push(["Eating out", () => ctx.updatePlan((p) => setDay(p, i, { kind: "out" }))]);
  if (d.kind !== "empty") actions.push(["Clear night", () => ctx.updatePlan((p) => setDay(p, i, { kind: "empty" }))]);
  const pick = await choose(title, actions.map((a) => a[0]), { message: recipe ? recipe.name : "" });
  if (pick >= 0) await actions[pick][1]();
}

/** Full-screen recipe chooser. Returns a recipe id or null. */
async function pickRecipe(ctx, title) {
  let chosen = null;
  let filter = "";
  await liveTable(async (t, refresh) => {
    header(t, title);
    button(t, filter ? `🔍 “${filter}” (tap to change)` : "🔍 Search", async () => {
      const v = await promptOne("Search", filter, { placeholder: "name or tag", ok: "Search" });
      if (v != null) filter = v.trim();
      await refresh();
    });
    for (const r of filtered(ctx.recipes, filter)) {
      const rr = row(t, r.name, r.tags.join(", "), null, { right: PREF_ICON[preferenceOf(ctx.plan, r.id)] });
      rr.dismissOnSelect = true;
      rr.onSelect = () => {
        chosen = r.id;
      };
    }
  });
  return chosen;
}

function filtered(recipes, filter) {
  const q = filter.toLowerCase();
  if (!q) return recipes;
  return recipes.filter((r) => r.name.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q)));
}

// Library

async function library(ctx) {
  let filter = "";
  await liveTable(async (t, refresh) => {
    header(t, `Recipes (${ctx.recipes.length})`);
    button(t, "＋ Add a recipe", async () => {
      await addRecipeMenu(ctx);
      await refresh();
    });
    button(t, filter ? `🔍 “${filter}” (tap to change)` : "🔍 Search", async () => {
      const v = await promptOne("Search", filter, { placeholder: "name or tag", ok: "Search" });
      if (v != null) filter = v.trim();
      await refresh();
    });
    row(t, "⭐️ always include   🚫 never pick", "", null);
    for (const r of filtered(ctx.recipes, filter)) {
      row(t, r.name, r.tags.join(", "), async () => {
        await recipeMenu(ctx, r);
        await refresh();
      }, { right: PREF_ICON[preferenceOf(ctx.plan, r.id)] });
    }
  });
}

async function recipeMenu(ctx, recipe) {
  const pref = preferenceOf(ctx.plan, recipe.id);
  const actions = [
    ["View", () => viewRecipe(recipe)],
    ["Edit", () => editRecipe(ctx, recipe, { existing: recipe })],
  ];
  if (pref !== "include") actions.push(["⭐️ Always include when filling the week", () => ctx.updatePlan((p) => setPreference(p, recipe.id, "include"))]);
  if (pref !== "ignore") actions.push(["🚫 Never pick when filling the week", () => ctx.updatePlan((p) => setPreference(p, recipe.id, "ignore"))]);
  if (pref !== "normal") actions.push(["Normal (pick at random)", () => ctx.updatePlan((p) => setPreference(p, recipe.id, "normal"))]);
  actions.push(["Put on a night…", async () => {
    const nights = ctx.plan.days.map((d) => `${d.label} ${shortDate(d.date)}`);
    const n = await choose(`Cook ${recipe.name} on`, nights);
    if (n >= 0) await ctx.updatePlan((p) => setDay(p, n, { kind: "recipe", recipeId: recipe.id }));
  }]);
  actions.push(["Delete", async () => {
    if (await confirm(`Delete ${recipe.name}?`, "This removes it for both phones.", "Delete", true)) await ctx.deleteRecipe(recipe.id);
  }]);
  const pick = await choose(recipe.name, actions.map((a) => a[0]), { destructive: [actions.length - 1] });
  if (pick >= 0) await actions[pick][1]();
}

// Groceries

export async function groceries(ctx) {
  const recipes = plannedRecipes(ctx.plan, ctx.recipes);
  if (!recipes.length) return message("Nothing planned", "Add some recipes to this week first.");
  const listName = ctx.device.get().remindersList;
  const items = planExport(
    buildGroceryList(recipes, { aisles: ctx.config.aisles }),
    await openReminderTitles(listName),
    { pantry: ctx.config.pantry },
  );
  const selected = new Set(items.filter((i) => i.status === "add").map((i) => i.key));
  let send = false;
  await liveTable(async (t, refresh) => {
    header(t, `🛒 ${recipes.length} meals → “${listName}”`);
    const go = row(t, `Add ${selected.size} items to Reminders`, "Tap items below to include or skip them", null);
    go.dismissOnSelect = true;
    go.onSelect = () => {
      send = true;
    };
    for (const group of groupByAisle(items)) {
      header(t, group.aisle);
      for (const item of group.items) {
        const on = selected.has(item.key);
        const why = item.status === "duplicate" ? "Already on the list" : item.status === "pantry" ? "Usually in the pantry" : item.notes;
        row(t, `${on ? "✅" : "⬜️"} ${item.title}`, why, async () => {
          if (on) selected.delete(item.key);
          else selected.add(item.key);
          await refresh();
        });
      }
    }
  });
  if (!send || !selected.size) return;
  const n = await addReminders(listName, items.filter((i) => selected.has(i.key)));
  await message("Grocery list updated", `Added ${n} items to “${listName}”.`);
}

// Settings

export async function settings(ctx) {
  await liveTable(async (t, refresh) => {
    const device = ctx.device.get();
    const cfg = ctx.config;
    header(t, "This phone");
    row(t, device.remindersList, "Reminders list for groceries", async () => {
      const lists = await reminderLists();
      if (!lists.length) return message("No Reminders lists", "Create a list in Reminders first.");
      const i = await choose("Grocery list", lists, { message: "Items are added to this list on this phone." });
      if (i >= 0) ctx.device.set({ remindersList: lists[i] });
      await refresh();
    });

    header(t, "Shared with both phones");
    row(t, DAY_NAMES[cfg.startDay], "Week starts on", async () => {
      const i = await choose("Week starts on", DAY_NAMES);
      if (i >= 0) await ctx.updateConfig({ startDay: i });
      await refresh();
    });
    row(t, String(cfg.nights), "Nights per week", async () => {
      const i = await choose("Nights per week", ["1", "2", "3", "4", "5", "6", "7"]);
      if (i >= 0) await ctx.updateConfig({ nights: i + 1 });
      await refresh();
    });
    row(t, cfg.pantry.join(", ") || "—", "Pantry items (unticked by default on the grocery list)", async () => {
      const v = await promptOne("Pantry items", cfg.pantry.join(", "), { message: "Comma separated" });
      if (v != null) await ctx.updateConfig({ pantry: v.split(",").map((s) => s.trim()).filter(Boolean) });
      await refresh();
    });
    row(t, cfg.aisles.join(", "), "Aisles, in shopping order", async () => {
      const v = await promptOne("Aisles", cfg.aisles.join(", "), { message: "Comma separated, in the order you walk the store. Keep “Other” last." });
      if (v != null) {
        const aisles = v.split(",").map((s) => s.trim()).filter(Boolean);
        if (aisles.length) await ctx.updateConfig({ aisles: aisles.includes("Other") ? aisles : [...aisles, "Other"] });
      }
      await refresh();
    });
    button(t, "📋 Copy prompt for AI", async () => {
      Pasteboard.copy(chatbotPrompt(cfg.aisles));
      await message("Prompt copied", "Paste it into any AI chat app with a recipe, then use “Paste recipe JSON”.");
    });
    header(t, "About");
    row(t, `Version ${ctx.version}`, "Updates load automatically from GitHub", null);
  });
}
