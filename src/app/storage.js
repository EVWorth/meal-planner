// Shared data in the iCloud Drive folder bookmarked as "MealPlanner".
//
//   recipes/<id>.json   one schema.org Recipe per file
//   plan.json           current week
//   config.json         shared settings
//
// iCloud can offload files, so every read downloads first. Writes are
// last-write-wins; plan changes re-read plan.json right before writing to
// keep the window for clobbering the other phone's change small.
import { emptyPlan, toDraft } from "../core/index.js";

export const BOOKMARK = "MealPlanner";

export const DEFAULT_CONFIG = {
  nights: 7,
  startDay: 1, // 0 = Sunday, 1 = Monday
  pantry: ["salt", "black pepper", "water"],
};

// Settings that differ per phone, kept outside the shared folder.
export const DEFAULT_DEVICE = {
  remindersList: "Groceries",
};

export class SetupError extends Error {}

// The iCloud manager can download offloaded files; it throws when Scriptable's
// own iCloud sync is off, and bookmarks work from the local one too.
function defaultFileManager() {
  try {
    return FileManager.iCloud();
  } catch {
    return FileManager.local();
  }
}

export class Store {
  /** @param fm a Scriptable FileManager; @param root folder path */
  constructor(fm, root) {
    this.fm = fm;
    this.root = root;
    this.recipesDir = fm.joinPath(root, "recipes");
  }

  static open(fm = defaultFileManager(), bookmark = BOOKMARK) {
    if (!fm.bookmarkExists(bookmark)) {
      throw new SetupError(
        `No file bookmark named "${bookmark}". In Scriptable, open Settings → File Bookmarks, add the shared Meal Planner folder from iCloud Drive, and name it ${bookmark}.`,
      );
    }
    const store = new Store(fm, fm.bookmarkedPath(bookmark));
    if (!fm.fileExists(store.recipesDir)) fm.createDirectory(store.recipesDir, true);
    return store;
  }

  path(...parts) {
    return this.fm.joinPath(this.root, parts.join("/"));
  }

  async readJson(path, fallback = null) {
    const fm = this.fm;
    if (!this.exists(path)) return fallback;
    await fm.downloadFileFromiCloud(path);
    const text = fm.readString(path);
    if (text == null || text.trim() === "") return fallback;
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`${path.split("/").pop()} is not valid JSON (${e.message}).`);
    }
  }

  /** True for a file on disk or one iCloud has offloaded to a ".name.icloud" placeholder. */
  exists(path) {
    if (this.fm.fileExists(path)) return true;
    const slash = path.lastIndexOf("/");
    return this.fm.fileExists(`${path.slice(0, slash)}/.${path.slice(slash + 1)}.icloud`);
  }

  writeJson(path, data) {
    this.fm.writeString(path, JSON.stringify(data, null, 2) + "\n");
  }

  // Recipes

  recipePath(id) {
    return this.fm.joinPath(this.recipesDir, `${id}.json`);
  }

  /** Recipe file names, including ones iCloud has offloaded (".x.json.icloud"). */
  recipeFiles() {
    const names = new Set();
    for (const name of this.fm.listContents(this.recipesDir)) {
      const offloaded = name.match(/^\.(.+\.json)\.icloud$/);
      if (offloaded) names.add(offloaded[1]);
      else if (name.endsWith(".json") && !name.startsWith(".")) names.add(name);
    }
    return [...names];
  }

  /** All recipes as drafts, sorted by name. Unreadable files are skipped. */
  async listRecipes() {
    const recipes = await Promise.all(
      this.recipeFiles().map(async (name) => {
        const path = this.fm.joinPath(this.recipesDir, name);
        try {
          const doc = await this.readJson(path);
          if (!doc) return null;
          const draft = toDraft(doc);
          // The file name is the id, whatever the file says.
          draft.id = name.replace(/\.json$/, "");
          return draft.name ? draft : null;
        } catch {
          return null; // a half-synced or hand-broken file shouldn't take the app down
        }
      }),
    );
    return recipes.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Write a stored schema.org document (see core/recipe.js). */
  saveRecipe(doc) {
    this.writeJson(this.recipePath(doc.identifier), doc);
  }

  deleteRecipe(id) {
    const path = this.recipePath(id);
    if (this.exists(path)) this.fm.remove(path);
  }

  existingIds() {
    return this.recipeFiles().map((n) => n.replace(/\.json$/, ""));
  }

  // Config

  async config() {
    const saved = await this.readJson(this.path("config.json"), {});
    return { ...DEFAULT_CONFIG, ...saved };
  }

  async updateConfig(patch) {
    const saved = await this.readJson(this.path("config.json"), {});
    const next = { ...saved, ...patch };
    this.writeJson(this.path("config.json"), next);
    return { ...DEFAULT_CONFIG, ...next };
  }

  // Plan

  async plan(config) {
    const saved = await this.readJson(this.path("plan.json"));
    if (saved && Array.isArray(saved.days)) return { include: [], ignore: [], ...saved };
    return emptyPlan({ startDay: config.startDay, nights: config.nights });
  }

  /** Re-read the plan, apply fn, write it back. Returns the new plan. */
  async updatePlan(config, fn) {
    const current = await this.plan(config);
    const next = await fn(current);
    this.writeJson(this.path("plan.json"), next);
    return next;
  }
}

/** Per-phone settings in Scriptable's local documents folder. */
export class DeviceSettings {
  constructor(fm = FileManager.local()) {
    this.fm = fm;
    this.path = fm.joinPath(fm.documentsDirectory(), "meal-planner-device.json");
  }

  get() {
    if (!this.fm.fileExists(this.path)) return { ...DEFAULT_DEVICE };
    try {
      return { ...DEFAULT_DEVICE, ...JSON.parse(this.fm.readString(this.path)) };
    } catch {
      return { ...DEFAULT_DEVICE };
    }
  }

  set(patch) {
    const next = { ...this.get(), ...patch };
    this.fm.writeString(this.path, JSON.stringify(next, null, 2));
    return next;
  }
}
