import { test } from "node:test";
import assert from "node:assert/strict";
import { chatbotPrompt, DEFAULT_AISLES, parseRecipeJson, normalizeRecipe } from "../src/core/index.js";

test("chatbotPrompt lists the aisles", () => {
  assert.ok(chatbotPrompt().includes(DEFAULT_AISLES.join(", ")));
  assert.ok(chatbotPrompt(["A", "B"]).includes("one of: A, B."));
});

test("the prompt's own example imports cleanly", () => {
  const example = chatbotPrompt().match(/\{[\s\S]*?\n\}/)[0];
  const [input] = parseRecipeJson(example);
  const r = normalizeRecipe(input);
  assert.equal(r.name, "Chicken Tacos");
  assert.equal(r.ingredients[0].aisle, "Meat & Seafood");
});
