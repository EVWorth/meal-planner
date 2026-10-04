import { test } from "node:test";
import assert from "node:assert/strict";
import { chatbotPrompt, parseRecipeJson, normalizeRecipe, buildGroceryList, toDraft } from "../src/core/index.js";

test("the prompt's own example imports cleanly", () => {
  const example = chatbotPrompt().match(/\{[\s\S]*?\n\}/)[0];
  const [input] = parseRecipeJson(example);
  const r = normalizeRecipe(input);
  assert.equal(r.name, "Chicken Tacos");
  assert.equal(r.recipeYield, "4");
  assert.deepEqual(r.recipeIngredient, ["1 1/2 lb chicken thighs, boneless", "8 small corn tortillas", "salt, to taste"]);
  assert.deepEqual(buildGroceryList([toDraft(r)]).map((i) => i.title), ["Chicken thighs (1 1/2 lb)", "Salt", "Small corn tortillas (8)"]);
});
