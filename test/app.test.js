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
    { qty: 1, unit: "lb", item: "ground beef", aisle: "Meat & Seafood", note: "" },
    { qty: 1, unit: "", item: "onion", aisle: "Produce", note: "" },
    { qty: null, unit: "", item: "salt", aisle: "Spices", note: "" },
  ],
};
const chili = {
  id: "chili", name: "Chili", servings: 6, tags: [], steps: [], sourceUrl: "", notes: "",
  ingredients: [
    { qty: 8, unit: "oz", item: "ground beef", aisle: "Meat & Seafood", note: "" },
    { qty: 2, unit: "", item: "onions", aisle: "Produce", note: "" },
    { qty: 2, unit: "can", item: "kidney beans", aisle: "Canned & Jarred", note: "" },
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
  assert.equal(saved.ingredients[1].aisle, "Produce");
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

test("share a recipe link: JSON-LD import without an API key", async () => {
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
  assert.ok(!s.log.requests.some((r) => r.url.includes("anthropic")));
  s.cleanup();
});

test("copied text goes to Claude with the key from the keychain", async () => {
  const reply = { found: true, name: "Toast", servings: 1, tags: ["breakfast"], notes: "",
    ingredients: [{ qty: 2, unit: "slice", item: "bread", note: "", aisle: "Bakery" }], steps: ["Toast it."] };
  const s = createScriptable({
    pasteboard: "Toast: two slices of bread, toasted.",
    fetch: (req) => ({ status: 200, body: { type: "message", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(reply) }] } }),
    steps: [
      { table: async ({ tap }) => { await tap("Add a recipe"); } },
      { alert: "From copied text" },
      { table: async ({ tap }) => { await tap("Save recipe"); } },
    ],
  });
  s.context.Keychain.set("meal-planner.anthropic-api-key", "sk-ant-test");
  await s.loadApp().run({ version: "test", input: s.context.args });
  noErrors(s);
  const call = s.log.requests.find((r) => r.url === "https://api.anthropic.com/v1/messages");
  assert.equal(call.method, "POST");
  assert.equal(call.headers["x-api-key"], "sk-ant-test");
  const body = JSON.parse(call.body);
  assert.match(body.messages[0].content[0].text, /two slices of bread/);
  assert.equal(s.readShared("recipes/toast.json").ingredients[0].unit, "slice");
  s.cleanup();
});

test("without a key, text import offers the chatbot prompt", async () => {
  const s = createScriptable({
    pasteboard: "some recipe text",
    steps: [
      { table: async ({ tap }) => { await tap("Add a recipe"); } },
      { alert: "From copied text" },
      { alert: "Copy chatbot prompt" },
      { alert: "OK" },
    ],
  });
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
