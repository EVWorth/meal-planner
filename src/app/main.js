// Entry point. The loader calls run() with the version it fetched.
import { Ctx } from "./context.js";
import { importShared } from "./importer.js";
import { home } from "./screens.js";
import { SetupError } from "./storage.js";
import { message, showError } from "./ui.js";

export async function run({ version = "dev", input = globalThis.args } = {}) {
  try {
    const ctx = await new Ctx({ version }).load();
    const shared = input && (input.urls?.length || input.plainTexts?.length || input.images?.length);
    if (shared) await importShared(ctx, input);
    else await home(ctx);
  } catch (e) {
    if (e instanceof SetupError) await message("Set up the shared folder", e.message);
    else await showError(e);
  }
}
