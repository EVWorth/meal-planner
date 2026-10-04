import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { recipeFromHtml, decodeEntities, normalizeRecipe } from "../src/core/index.js";

const html = readFileSync(new URL("./fixtures/allrecipes-like.html", import.meta.url), "utf8");

test("recipeFromHtml finds a Recipe inside @graph with a type array", () => {
  const r = recipeFromHtml(html, "https://example.com/r");
  assert.equal(r.name, "Easy Chicken & Rice");
  assert.equal(r.servings, 4);
  assert.deepEqual(r.tags, ["dinner", "mexican", "easy", "weeknight"]);
  assert.equal(r.ingredients[0], "1 ½ lb chicken thighs");
  assert.deepEqual(r.steps, ["Prep:", "Dice the onion.", "Brown the chicken.", "Add rice and broth; simmer 20 minutes."]);
  assert.equal(r.sourceUrl, "https://example.com/r");
});

test("JSON-LD result normalizes into a stored recipe", () => {
  const r = normalizeRecipe(recipeFromHtml(html), { now: new Date("2026-10-04T00:00:00Z") });
  assert.equal(r.id, "easy-chicken-and-rice");
  assert.deepEqual(r.ingredients[0], { qty: 1.5, unit: "lb", item: "chicken thighs", note: "" });
  assert.deepEqual(r.ingredients[2], { qty: 2, unit: "cup", item: "chicken broth", note: "" });
  assert.deepEqual(r.ingredients[4], { qty: null, unit: "", item: "Salt to taste", note: "" });
});

test("recipeFromHtml returns null without a Recipe", () => {
  assert.equal(recipeFromHtml("<html><body>no recipe</body></html>"), null);
  assert.equal(recipeFromHtml('<script type="application/ld+json">{bad json</script>'), null);
});

test("decodeEntities", () => {
  assert.equal(decodeEntities("Mac &amp; Cheese &#8211; &#x27;best&#x27;"), "Mac & Cheese – 'best'");
});
