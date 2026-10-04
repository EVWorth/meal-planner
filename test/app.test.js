// Drives the bundled dist/app.js through the Scriptable mock.
// Run `npm run build` first (npm run check does both).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createScriptable } from "./scriptable-mock.js";

const fixtureHtml = readFileSync(new URL("./fixtures/allrecipes-like.html", import.meta.url), "utf8");

const tacos = {
  id: "tacos", name: "Tacos", servings: 4, tags: ["mexican"], steps: ["Cook."], sourceUrl: "", notes: "",
  ingredients: [
    { qty: 1, unit: "lb", item: "ground beef", note: "" },
    { qty: 1, unit: "", item: "onion", note: "" },
    { qty: null, unit: "", item: "salt", note: "" },
  ],
};
const chili = {
  id: "chili", name: "Chili", servings: 6, tags: [], steps: [], sourceUrl: "", notes: "",
  ingredients: [
    { qty: 8, unit: "oz", item: "ground beef", note: "" },
    { qty: 2, unit: "", item: "onions", note: "" },
    { qty: 2, unit: "can", item: "kidney beans", note: "" },
  ],
};

function noErrors(s) {
  const errors = s.log.alerts.filter((a) => a.title === "Something went wrong");
  assert.deepEqual(errors.map((e) => e.message), [], "unexpected error alert");
  assert.equal(s.remaining(), 0, "not every scripted step was used");
}

test("paste chatbot JSON, review, save", async () => {
  const json = '```json\n{"name":"Lemon Pasta","servings":2,"ingredients":[{"qty":8,"unit":"oz","item":"spaghetti"},"1 lemon, zested"],"steps":["Boil pasta."]}\n```';
  const s = createScriptable({
    pasteboard: json,
    steps: [
      { table: async ({ tap }) => { await tap("Add a recipe"); } },
      { alert: "Paste recipe JSON" },
      { table: async ({ tap, rows }) => {
        assert.ok(rows().some((r) => r.includes("8 oz spaghetti")));
        await tap("Save recipe");
      } },
    ],
  });
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  const saved = s.readShared("recipes/lemon-pasta.json");
  assert.equal(saved.name, "Lemon Pasta");
  assert.deepEqual(saved.ingredients[1], { qty: 1, unit: "", item: "lemon", note: "zested" });
  s.cleanup();
});

test("fill the week, send groceries to Reminders, skip what's already there", async () => {
  const s = createScriptable({
    steps: [
      { table: async ({ tap, rows }) => {
        await tap("Fill empty and unlocked nights");
        assert.equal(rows().filter((r) => r.includes("Tacos") || r.includes("Chili")).length, 2);
        await tap("Send grocery list");
      } },
      { table: async ({ tap, rows }) => {
        const r = rows();
        assert.ok(r.some((x) => /⬜️ Onions? \(3\)/.test(x) && x.includes("Already on the list")), r.join("\n"));
        assert.ok(r.some((x) => x.includes("⬜️ Salt") && x.includes("pantry")));
        assert.ok(r.some((x) => x.includes("✅ Ground beef (1 1/2 lb)")));
        await tap("Ground beef"); // untick
        await tap("Ground beef"); // tick again
        await tap("Add 2 items");
      } },
      { alert: "OK" },
    ],
  });
  s.writeShared("recipes/tacos.json", tacos);
  s.writeShared("recipes/chili.json", chili);
  const app = s.loadApp();
  // An onion is already on the grocery list.
  const cal = (await s.context.Calendar.forReminders())[0];
  s.log.reminders.push({ title: "Onions", calendar: cal });
  await app.run({ version: "test", input: s.context.args });
  noErrors(s);
  assert.deepEqual(s.log.reminders.slice(1).map((r) => r.title), ["Ground beef (1 1/2 lb)", "Kidney beans (2 cans)"]);
  assert.deepEqual(s.log.reminders[1].notes.split(", ").sort(), ["Chili", "Tacos"]);
  const plan = s.readShared("plan.json");
  assert.equal(plan.days.length, 7);
  assert.equal(plan.days.filter((d) => d.kind === "recipe").length, 2);
  s.cleanup();
});

test("night menu: eating out and lock survive a refill", async () => {
  const s = createScriptable({
    steps: [
      { table: async ({ tap }) => {
        await tap("Fill empty and unlocked nights");
        await tap("Mon");
        await tap("Tue");
      } },
      { alert: "Eating out" },
      { alert: (a) => a.actions.findIndex((x) => x.startsWith("Lock")) },
    ],
  });
  s.writeShared("recipes/tacos.json", tacos);
  s.writeShared("recipes/chili.json", chili);
  s.writeShared("config.json", { startDay: 1 });
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  const plan = s.readShared("plan.json");
  assert.equal(plan.days[0].kind, "out");
  assert.equal(plan.days[1].locked, plan.days[1].kind === "recipe");
  s.cleanup();
});

test("share a recipe link: JSON-LD import", async () => {
  const s = createScriptable({
    fetch: (req) => ({ status: 200, body: req.url === "https://example.com/r" ? fixtureHtml : "" }),
    steps: [
      { table: async ({ tap }) => { await tap("Save recipe"); } },
      { alert: "OK" },
    ],
  });
  s.context.args = { urls: ["https://example.com/r"], plainTexts: [], images: [] };
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  const saved = s.readShared("recipes/easy-chicken-and-rice.json");
  assert.equal(saved.sourceUrl, "https://example.com/r");
  assert.equal(saved.ingredients.length, 5);
  s.cleanup();
});

test("a link without recipe data offers the prompt for AI", async () => {
  const s = createScriptable({
    fetch: () => ({ status: 200, body: "<html><body>Just a blog post</body></html>" }),
    steps: [
      { table: async ({ tap }) => { await tap("Add a recipe"); } },
      { alert: "From a web link" },
      { alert: (a) => { a.values = ["https://example.com/blog"]; return "Import"; } },
      { alert: "Copy prompt for AI" },
      { alert: "OK" },
    ],
  });
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  assert.match(s.clipboard, /Convert the recipe below into JSON/);
  assert.ok(!s.log.requests.some((r) => !r.url.startsWith("https://example.com/")), "only the recipe page is fetched");
  s.cleanup();
});

test("sharing recipe JSON from an AI chat app opens it for review", async () => {
  const s = createScriptable({
    steps: [
      { table: async ({ tap }) => { await tap("Save recipe"); } },
      { alert: "OK" },
    ],
  });
  s.context.args = { urls: [], plainTexts: ['```json\n{"name":"Toast","ingredients":["2 slices bread"]}\n```'], images: [] };
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  assert.equal(s.readShared("recipes/toast.json").ingredients[0].unit, "slice");
  s.cleanup();
});

test("sharing plain text offers the prompt for AI", async () => {
  const s = createScriptable({
    steps: [{ alert: "Copy prompt for AI" }, { alert: "OK" }],
  });
  s.context.args = { urls: [], plainTexts: ["Toast: two slices of bread, toasted."], images: [] };
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  assert.match(s.clipboard, /Convert the recipe below into JSON/);
  s.cleanup();
});

test("reads recipes iCloud has offloaded", async () => {
  const s = createScriptable({
    steps: [{ table: async ({ rows }) => { assert.ok(rows().some((r) => r.includes("Recipe library (1)"))); } }],
  });
  s.writeShared("recipes/.tacos.json.icloud", tacos);
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  s.cleanup();
});

test("settings: pick the Reminders list for this phone", async () => {
  const s = createScriptable({
    reminderLists: ["Groceries", "Shopping"],
    steps: [
      { table: async ({ tap }) => { await tap("Settings"); } },
      { table: async ({ tap, rows }) => {
        await tap("Reminders list for groceries");
        assert.ok(rows().some((r) => r.startsWith("Shopping")));
      } },
      { alert: "Shopping" },
    ],
  });
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  s.cleanup();
});
