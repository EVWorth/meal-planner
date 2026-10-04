import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRecipe, parseRecipeJson, slugify, uniqueId, ingredientText } from "../src/core/recipe.js";

const now = new Date("2026-10-04T12:00:00Z");

test("slugify and uniqueId", () => {
  assert.equal(slugify("Crème Brûlée & Friends!"), "creme-brulee-and-friends");
  assert.equal(slugify("!!!"), "recipe");
  assert.equal(uniqueId("Tacos", ["tacos", "tacos-2"]), "tacos-3");
});

test("normalizeRecipe accepts chatbot-style JSON", () => {
  const r = normalizeRecipe({
    title: "Tacos",
    servings: "4",
    tags: "Mexican, Beef, mexican",
    ingredients: [
      { qty: "1 1/2", unit: "pounds", item: "ground beef", aisle: "Meat & Seafood" },
      "8 small tortillas",
      { name: "cheddar", quantity: 1, unit: "cup", aisle: "Not an aisle" },
      { item: "" },
    ],
    instructions: "1. Brown beef.\n2. Fill tortillas.",
  }, { now });
  assert.equal(r.name, "Tacos");
  assert.equal(r.servings, 4);
  assert.deepEqual(r.tags, ["mexican", "beef"]);
  assert.deepEqual(r.ingredients.map((i) => [i.qty, i.unit, i.item, i.aisle]), [
    [1.5, "lb", "ground beef", "Meat & Seafood"],
    [8, "", "small tortillas", "Bakery"],
    [1, "cup", "cheddar", "Dairy & Eggs"],
  ]);
  assert.deepEqual(r.steps, ["Brown beef.", "Fill tortillas."]);
  assert.equal(r.createdAt, now.toISOString());
});

test("normalizeRecipe keeps id and createdAt when editing", () => {
  const existing = { id: "tacos", createdAt: "2026-01-01T00:00:00.000Z" };
  const r = normalizeRecipe({ name: "Better Tacos", ingredients: ["1 onion"] }, { now, existing });
  assert.equal(r.id, "tacos");
  assert.equal(r.createdAt, existing.createdAt);
});

test("normalizeRecipe rejects missing name or ingredients", () => {
  assert.throws(() => normalizeRecipe({ ingredients: ["1 egg"] }), /name/);
  assert.throws(() => normalizeRecipe({ name: "Air" }), /no ingredients/);
});

test("parseRecipeJson handles fences, arrays and surrounding chatter", () => {
  assert.equal(parseRecipeJson('Here you go:\n```json\n{"name":"A"}\n```\nEnjoy!')[0].name, "A");
  assert.equal(parseRecipeJson('Sure! {"name":"B"} hope that helps').length, 1);
  assert.equal(parseRecipeJson('[{"name":"A"},{"name":"B"}]').length, 2);
  assert.equal(parseRecipeJson('{"recipes":[{"name":"A"}]}')[0].name, "A");
  assert.throws(() => parseRecipeJson("nope"), /valid JSON/);
});

test("ingredientText round-trips through the parser format", () => {
  assert.equal(ingredientText({ qty: 1.5, unit: "cup", item: "flour", note: "sifted" }), "1 1/2 cup flour, sifted");
  assert.equal(ingredientText({ qty: null, unit: "", item: "salt", note: "" }), "salt");
});
