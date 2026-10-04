// Adding recipes: web link, copied text, photo, chatbot JSON, or by hand.
import { chatbotPrompt, normalizeRecipe, parseRecipeJson } from "../core/index.js";
import { editRecipe } from "./editor.js";
import { apiKey } from "./storage.js";
import { NeedsApiKey, importFromImage, importFromText, importFromUrl } from "./services.js";
import { choose, confirm, message, promptOne } from "./ui.js";

const URL_RE = /^https?:\/\/\S+$/i;

export async function addRecipeMenu(ctx) {
  const options = [
    "From a web link",
    "From copied text",
    "From a photo",
    "Take a photo",
    "Paste recipe JSON",
    "Copy prompt for ChatGPT / other chatbot",
    "Type it in",
  ];
  const pick = await choose("Add a recipe", options, {
    message: apiKey.get() ? "" : "No Claude API key on this phone: links with recipe data still work; for the rest, use the chatbot prompt and paste the JSON.",
  });
  switch (pick) {
    case 0: {
      const clip = String(Pasteboard.paste() ?? "").trim();
      const url = await promptOne("Recipe link", URL_RE.test(clip) ? clip : "", { placeholder: "https://", ok: "Import" });
      if (url && url.trim()) return importAndEdit(ctx, "url", url.trim());
      return null;
    }
    case 1: {
      const text = String(Pasteboard.paste() ?? "").trim();
      if (!text) return message("Clipboard is empty", "Copy the recipe text first, then try again.");
      return importAndEdit(ctx, "text", text);
    }
    case 2:
    case 3: {
      let image;
      try {
        image = pick === 2 ? await Photos.fromLibrary() : await Photos.fromCamera();
      } catch {
        return null; // picker cancelled
      }
      return importAndEdit(ctx, "image", image);
    }
    case 4:
      return pasteJson(ctx);
    case 5:
      Pasteboard.copy(chatbotPrompt(ctx.config.aisles));
      return message(
        "Prompt copied",
        "Paste it into ChatGPT (or any chatbot), add the recipe link, text or photo after it, and send. Copy the JSON it gives back, then come here and choose “Paste recipe JSON”.",
      );
    case 6:
      return editRecipe(ctx, { name: "" }, { title: "New recipe" });
    default:
      return null;
  }
}

/**
 * Import from a url/text/image, then open the editor to review and save.
 * Used by the menu and by the share sheet.
 */
export async function importAndEdit(ctx, kind, value) {
  if (kind === "url") {
    const dup = ctx.recipes.find((r) => r.sourceUrl && r.sourceUrl === value);
    if (dup && !(await confirm("Already saved", `“${dup.name}” came from this link. Import it again?`, "Import"))) return null;
  }
  let input;
  try {
    const opts = ctx.importOptions();
    if (kind === "url") input = await importFromUrl(value, opts);
    else if (kind === "text") input = await importFromText(value, opts);
    else input = await importFromImage(value, opts);
  } catch (e) {
    if (e instanceof NeedsApiKey) return offerChatbot(ctx, e.message);
    throw e;
  }
  return editRecipe(ctx, input, { title: "Check and save" });
}

async function offerChatbot(ctx, why) {
  const pick = await choose("Needs Claude", ["Copy chatbot prompt", "Add API key in Settings later"], { message: why });
  if (pick === 0) {
    Pasteboard.copy(chatbotPrompt(ctx.config.aisles));
    await message("Prompt copied", "Paste it into a chatbot with the recipe, then use “Paste recipe JSON”.");
  }
  return null;
}

async function pasteJson(ctx) {
  const text = String(Pasteboard.paste() ?? "");
  if (!text.trim()) return message("Clipboard is empty", "Copy the chatbot's JSON reply first.");
  const items = parseRecipeJson(text);
  if (items.length === 1) return editRecipe(ctx, items[0], { title: "Check and save" });
  // Several recipes at once: save the good ones, report the rest.
  const saved = [];
  const failed = [];
  for (const item of items) {
    try {
      const recipe = normalizeRecipe(item, { aisles: ctx.config.aisles, existingIds: ctx.recipes.map((r) => r.id) });
      ctx.saveRecipe(recipe);
      saved.push(recipe.name);
    } catch (e) {
      failed.push(e.message);
    }
  }
  await message(`Saved ${saved.length} recipes`, [saved.join("\n"), failed.length ? `\nSkipped:\n${failed.join("\n")}` : ""].join(""));
  return null;
}

/** Share sheet: a URL, text (which may itself be a URL) or an image. */
export async function importShared(ctx, input) {
  const url = input.urls?.[0];
  const text = input.plainTexts?.[0]?.trim();
  const image = input.images?.[0];
  let saved;
  if (url) saved = await importAndEdit(ctx, "url", url);
  else if (text && URL_RE.test(text)) saved = await importAndEdit(ctx, "url", text);
  else if (text) {
    // Chatbot JSON shared straight from the chat app
    if (/^\s*(```|\{|\[)/.test(text)) {
      const items = parseRecipeJson(text);
      saved = await editRecipe(ctx, items[0], { title: "Check and save" });
    } else {
      saved = await importAndEdit(ctx, "text", text);
    }
  } else if (image) saved = await importAndEdit(ctx, "image", image);
  else return message("Nothing to import", "Share a recipe link, text, or photo to this script.");
  if (saved) await message("Saved", `“${saved.name}” is in your recipes.`);
  return saved;
}
