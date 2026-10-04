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

test("a page's recipe stores as schema.org with the original ingredient lines", () => {
  const doc = normalizeRecipe(recipeFromHtml(html, "https://example.com/r"), { now: new Date("2026-10-04T00:00:00Z") });
  assert.equal(doc["@type"], "Recipe");
  assert.equal(doc.identifier, "easy-chicken-and-rice");
  assert.deepEqual(doc.recipeIngredient, ["1 ½ lb chicken thighs", "1 cup long-grain rice", "2 cups chicken broth", "1 onion, diced", "Salt to taste"]);
  assert.equal(doc.url, "https://example.com/r");
  assert.equal(doc.recipeYield, "4");
});

test("recipeFromHtml returns null without a Recipe", () => {
  assert.equal(recipeFromHtml("<html><body>no recipe</body></html>"), null);
  assert.equal(recipeFromHtml('<script type="application/ld+json">{bad json</script>'), null);
});

test("decodeEntities", () => {
  assert.equal(decodeEntities("Mac &amp; Cheese &#8211; &#x27;best&#x27;"), "Mac & Cheese – 'best'");
});
