// Loaded state shared by the screens.
import { prunePlan } from "../core/index.js";
import { DeviceSettings, Store, apiKey } from "./storage.js";

export class Ctx {
  constructor({ store = Store.open(), device = new DeviceSettings(), version = "dev" } = {}) {
    this.store = store;
    this.device = device;
    this.version = version;
    this.config = null;
    this.recipes = [];
    this.plan = null;
  }

  async load() {
    this.config = await this.store.config();
    await this.reloadRecipes();
    return this;
  }

  async reloadRecipes() {
    this.recipes = await this.store.listRecipes();
    this.plan = prunePlan(await this.store.plan(this.config), this.recipes);
  }

  recipe(id) {
    return this.recipes.find((r) => r.id === id) ?? null;
  }

  /** Apply fn to the latest plan on disk and save it. */
  async updatePlan(fn) {
    this.plan = await this.store.updatePlan(this.config, (p) => fn(prunePlan(p, this.recipes)));
    return this.plan;
  }

  async updateConfig(patch) {
    this.config = await this.store.updateConfig(patch);
    return this.config;
  }

  saveRecipe(recipe) {
    this.store.saveRecipe(recipe);
    const i = this.recipes.findIndex((r) => r.id === recipe.id);
    if (i >= 0) this.recipes[i] = recipe;
    else this.recipes.push(recipe);
    this.recipes.sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteRecipe(id) {
    this.store.deleteRecipe(id);
    this.recipes = this.recipes.filter((r) => r.id !== id);
    await this.updatePlan((p) => p);
  }

  importOptions() {
    return { key: apiKey.get(), model: this.config.model, aisles: this.config.aisles };
  }
}
