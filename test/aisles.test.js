import { test } from "node:test";
import assert from "node:assert/strict";
import { guessAisle } from "../src/core/aisles.js";

const cases = {
  "yellow onion": "Produce",
  eggplant: "Produce",
  eggs: "Dairy & Eggs",
  "peanut butter": "Pantry",
  "fish sauce": "Pantry",
  "chicken thighs": "Meat & Seafood",
  "chicken broth": "Canned & Jarred",
  "green beans": "Produce",
  "black beans": "Canned & Jarred",
  "garlic powder": "Spices",
  "olive oil": "Pantry",
  cornstarch: "Pantry",
  "frozen peas": "Frozen",
  tortillas: "Bakery",
  "mystery thing": "Other",
};
for (const [item, aisle] of Object.entries(cases)) {
  test(`guessAisle: ${item}`, () => assert.equal(guessAisle(item), aisle));
}

test("guessAisle respects a custom aisle list", () => {
  assert.equal(guessAisle("onion", ["Fresh", "Everything else"]), "Everything else");
});
