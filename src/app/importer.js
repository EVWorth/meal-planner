// Adding recipes: web link, JSON from an AI chat app, or by hand.
import { chatbotPrompt, normalizeRecipe, parseRecipeJson } from "../core/index.js";
import { editRecipe } from "./editor.js";
import { NoRecipeData, importFromUrl } from "./services.js";
import { choose, confirm, message, promptOne } from "./ui.js";

const URL_RE = /^https?:\/\/\S+$/i;

const PROMPT_HELP =
  "Paste it into any AI chat app, add the recipe's link, text or photo after it, and send. Copy the JSON it replies with, then come back and choose “Paste recipe JSON”. You can also share the reply straight to this script.";

export async function addRecipeMenu(ctx) {
  const options = ["From a web link", "Paste recipe JSON", "Copy prompt for AI", "Type it in"];
  const pick = await choose("Add a recipe", options);
  switch (pick) {
    case 0: {
      const clip = String(Pasteboard.paste() ?? "").trim();
      const url = await promptOne("Recipe link", URL_RE.test(clip) ? clip : "", { placeholder: "https://", ok: "Import" });
      if (url && url.trim()) return importAndEdit(ctx, url.trim());
      return null;
    }
    case 1:
      return pasteJson(ctx);
    case 2:
      Pasteboard.copy(chatbotPrompt());
      return message("Prompt copied", PROMPT_HELP);
    case 3:
      return editRecipe(ctx, { name: "" }, { title: "New recipe" });
    default:
      return null;
  }
}

/**
 * Import a recipe link, then open the editor to review and save.
 * Used by the menu and by the share sheet.
 */
export async function importAndEdit(ctx, url) {
  const dup = ctx.recipes.find((r) => r.sourceUrl && r.sourceUrl === url);
  if (dup && !(await confirm("Already saved", `“${dup.name}” came from this link. Import it again?`, "Import"))) return null;
  let input;
  try {
    input = await importFromUrl(url);
  } catch (e) {
    if (e instanceof NoRecipeData) return offerPrompt(ctx, e.message);
    throw e;
  }
  return editRecipe(ctx, input, { title: "Check and save" });
}

async function offerPrompt(ctx, why) {
  const pick = await choose("Can't read this recipe", ["Copy prompt for AI", "Type it in"], { message: why });
  if (pick === 0) {
    Pasteboard.copy(chatbotPrompt());
    await message("Prompt copied", PROMPT_HELP);
  } else if (pick === 1) {
    return editRecipe(ctx, { name: "" }, { title: "New recipe" });
  }
  return null;
}

async function pasteJson(ctx) {
  const text = String(Pasteboard.paste() ?? "");
  if (!text.trim()) return message("Clipboard is empty", "Copy the AI's JSON reply first.");
  const items = parseRecipeJson(text);
  if (items.length === 1) return editRecipe(ctx, items[0], { title: "Check and save" });
  // Several recipes at once: save the good ones, report the rest.
  const saved = [];
  const failed = [];
  for (const item of items) {
    try {
      const recipe = normalizeRecipe(item, { existingIds: ctx.recipes.map((r) => r.id) });
      ctx.saveRecipe(recipe);
      saved.push(recipe.name);
    } catch (e) {
      failed.push(e.message);
    }
  }
  await message(`Saved ${saved.length} recipes`, [saved.join("\n"), failed.length ? `\nSkipped:\n${failed.join("\n")}` : ""].join(""));
  return null;
}

/** Share sheet: a recipe link, or recipe JSON shared from an AI chat app. */
export async function importShared(ctx, input) {
  const url = input.urls?.[0];
  const text = input.plainTexts?.[0]?.trim();
  let saved;
  if (url) saved = await importAndEdit(ctx, url);
  else if (text && URL_RE.test(text)) saved = await importAndEdit(ctx, text);
  else if (text && /^\s*(```|\{|\[)/.test(text)) {
    const items = parseRecipeJson(text);
    saved = await editRecipe(ctx, items[0], { title: "Check and save" });
  } else {
    return offerPrompt(ctx, "Share a recipe link, or the recipe JSON from an AI chat app. For text or photos, copy the prompt for AI and use any AI chat app.");
  }
  if (saved) await message("Saved", `“${saved.name}” is in your recipes.`);
  return saved;
}
