import { test } from "node:test";
import assert from "node:assert/strict";
import { chatbotPrompt, parseRecipeJson, normalizeRecipe } from "../src/core/index.js";

test("the prompt's own example imports cleanly", () => {
  const example = chatbotPrompt().match(/\{[\s\S]*?\n\}/)[0];
  const [input] = parseRecipeJson(example);
  const r = normalizeRecipe(input);
  assert.equal(r.name, "Chicken Tacos");
  assert.deepEqual(r.ingredients[0], { qty: 1.5, unit: "lb", item: "chicken thighs", note: "boneless" });
});
