import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIngredientLine, parseNumber, itemKey } from "../src/core/ingredients.js";

test("parseNumber handles fractions and unicode", () => {
  assert.equal(parseNumber("1 1/2"), 1.5);
  assert.equal(parseNumber("½"), 0.5);
  assert.equal(parseNumber("1½"), 1.5);
  assert.equal(parseNumber(".25"), 0.25);
  assert.equal(parseNumber("x"), null);
});

const cases = [
  ["1 1/2 cups all-purpose flour, sifted", { qty: 1.5, unit: "cup", item: "all-purpose flour", note: "sifted" }],
  ["2 (14 oz) cans diced tomatoes", { qty: 2, unit: "can", item: "diced tomatoes", note: "14 oz" }],
  ["2-3 cloves garlic, minced", { qty: 3, unit: "clove", item: "garlic", note: "minced" }],
  ["½ tsp salt", { qty: 0.5, unit: "tsp", item: "salt", note: "" }],
  ["3 large eggs", { qty: 3, unit: "", item: "large eggs", note: "" }],
  ["Salt and pepper to taste", { qty: null, unit: "", item: "Salt and pepper", note: "to taste" }],
  ["1 cup of milk (optional)", { qty: 1, unit: "cup", item: "milk", note: "optional" }],
  ["8 fl oz chicken stock", { qty: 8, unit: "fl oz", item: "chicken stock", note: "" }],
  ["▢ 1 lb ground beef", { qty: 1, unit: "lb", item: "ground beef", note: "" }],
];
for (const [line, expected] of cases) {
  test(`parseIngredientLine: ${line}`, () => assert.deepEqual(parseIngredientLine(line), expected));
}

test("itemKey merges plurals and size words", () => {
  assert.equal(itemKey("Large Onions"), "onion");
  assert.equal(itemKey("onion"), "onion");
  assert.equal(itemKey("Tomatoes"), "tomato");
  assert.equal(itemKey("cherries"), "cherry");
  assert.equal(itemKey("bay leaves"), "bay leaf");
  assert.equal(itemKey("cloves"), "clove");
  assert.equal(itemKey("asparagus"), "asparagus");
  assert.equal(itemKey("Swiss cheese"), "swiss cheese");
});
