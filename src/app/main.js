// Entry point. The loader calls run() with the version it fetched.
// Progress goes to Scriptable's log so a silent stop shows where it happened.
import { Ctx } from "./context.js";
import { importShared } from "./importer.js";
import { home } from "./screens.js";
import { SetupError } from "./storage.js";
import { message, showError } from "./ui.js";

export async function run({ version = "dev", input = globalThis.args } = {}) {
  console.log(`Meal Planner ${version} starting`);
  try {
    const ctx = new Ctx({ version });
    console.log(`Shared folder: ${ctx.store.root}`);
    await ctx.load();
    console.log(`Loaded ${ctx.recipes.length} recipes, week of ${ctx.plan.weekOf}`);
    const shared = input && (input.urls?.length || input.plainTexts?.length || input.images?.length);
    if (shared) await importShared(ctx, input);
    else await home(ctx);
    console.log("Closed");
  } catch (e) {
    console.error(`Meal Planner error: ${e?.stack ?? e}`);
    if (e instanceof SetupError) await message("Set up the shared folder", e.message);
    else await showError(e);
  }
}
