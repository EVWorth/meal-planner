import { test } from "node:test";
import assert from "node:assert/strict";
import { toDraft, toSchemaOrg, normalizeRecipe, parseRecipeJson, slugify, uniqueId, describeIngredient, parseIngredient } from "../src/core/recipe.js";

const now = new Date("2026-10-04T12:00:00Z");

test("slugify and uniqueId", () => {
  assert.equal(slugify("Crème Brûlée & Friends!"), "creme-brulee-and-friends");
  assert.equal(slugify("!!!"), "recipe");
  assert.equal(uniqueId("Tacos", ["tacos", "tacos-2"]), "tacos-3");
});

test("toSchemaOrg writes a schema.org Recipe", () => {
  const doc = toSchemaOrg({
    name: "Tacos", servings: 4, tags: ["mexican", "beef"],
    ingredients: ["1 1/2 lb ground beef", "  8 small tortillas  ", ""],
    steps: ["Brown beef.", "Fill tortillas."], sourceUrl: "https://x.test/t", notes: "Kids like these.",
  }, { now, existingIds: ["tacos"] });
  assert.deepEqual(doc, {
    "@context": "https://schema.org",
    "@type": "Recipe",
    identifier: "tacos-2",
    name: "Tacos",
    recipeYield: "4",
    keywords: "mexican, beef",
    recipeIngredient: ["1 1/2 lb ground beef", "8 small tortillas"],
    recipeInstructions: [{ "@type": "HowToStep", text: "Brown beef." }, { "@type": "HowToStep", text: "Fill tortillas." }],
    url: "https://x.test/t",
    description: "Kids like these.",
    dateCreated: now.toISOString(),
    dateModified: now.toISOString(),
  });
});

test("a stored document reads back into the same draft", () => {
  const draft = { id: "", name: "Soup", servings: 2, tags: ["easy"], ingredients: ["1 onion"], steps: ["Simmer."], sourceUrl: "", notes: "", createdAt: "", updatedAt: "" };
  const doc = toSchemaOrg(draft, { now });
  const back = toDraft(doc);
  assert.deepEqual({ ...back, createdAt: "", updatedAt: "" }, { ...draft, id: "soup" });
  assert.equal(back.createdAt, now.toISOString());
});

test("editing keeps the id and creation date", () => {
  const existing = { id: "tacos", createdAt: "2026-01-01T00:00:00.000Z" };
  const doc = normalizeRecipe({ name: "Better Tacos", ingredients: ["1 onion"] }, { now, existing });
  assert.equal(doc.identifier, "tacos");
  assert.equal(doc.dateCreated, existing.createdAt);
});

test("loose input: structured ingredients become lines", () => {
  const d = toDraft({
    title: "Tacos", servings: "4 servings", tags: "Mexican, Beef, mexican",
    ingredients: [{ qty: "1 1/2", unit: "pounds", item: "ground beef" }, { name: "cheddar", quantity: 1, unit: "cup", note: "grated" }, "2 limes", { item: "" }],
    instructions: "1. Brown beef.\n2. Fill tortillas.",
  });
  assert.equal(d.name, "Tacos");
  assert.equal(d.servings, 4);
  assert.deepEqual(d.tags, ["mexican", "beef"]);
  assert.deepEqual(d.ingredients, ["1 1/2 pounds ground beef", "1 cup cheddar, grated", "2 limes"]);
  assert.deepEqual(d.steps, ["Brown beef.", "Fill tortillas."]);
});

test("toSchemaOrg rejects missing name or ingredients", () => {
  assert.throws(() => normalizeRecipe({ ingredients: ["1 egg"] }), /name/);
  assert.throws(() => normalizeRecipe({ name: "Air" }), /no ingredients/);
});

test("parseRecipeJson handles fences, arrays, @graph and surrounding chatter", () => {
  assert.equal(parseRecipeJson('Here you go:\n```json\n{"name":"A"}\n```\nEnjoy!')[0].name, "A");
  assert.equal(parseRecipeJson('Sure! {"name":"B"} hope that helps').length, 1);
  assert.equal(parseRecipeJson('[{"name":"A"},{"name":"B"}]').length, 2);
  assert.equal(parseRecipeJson('{"@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"C"}]}')[0].name, "C");
  assert.throws(() => parseRecipeJson("nope"), /valid JSON/);
});

test("parseIngredient and describeIngredient show how a line is read", () => {
  assert.deepEqual(parseIngredient("1 1/2 Tablespoons olive oil"), { qty: 1.5, unit: "tbsp", item: "olive oil", note: "" });
  assert.equal(describeIngredient("1 1/2 lb chicken thighs, boneless"), "1 1/2 · lb · chicken thighs");
  assert.equal(describeIngredient("salt to taste"), "no amount · salt");
});
