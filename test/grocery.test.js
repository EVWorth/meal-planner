import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGroceryList, planExport, keyFromTitle } from "../src/core/grocery.js";

const tacos = { name: "Tacos", ingredients: [
  { qty: 1, unit: "lb", item: "ground beef" },
  { qty: 1, unit: "", item: "onion" },
  { qty: 0.5, unit: "cup", item: "sour cream" },
  { qty: null, unit: "", item: "salt" },
] };
const chili = { name: "Chili", ingredients: [
  { qty: 8, unit: "oz", item: "ground beef" },
  { qty: 2, unit: "", item: "Onions" },
  { qty: 2, unit: "can", item: "kidney beans" },
  { qty: 4, unit: "tbsp", item: "sour cream" },
] };

test("buildGroceryList merges across recipes and sorts by name", () => {
  const list = buildGroceryList([tacos, chili]);
  assert.deepEqual(list.map((i) => i.title), [
    "Ground beef (1 1/2 lb)",
    "Kidney beans (2 cans)",
    "Onion (3)",
    "Salt",
    "Sour cream (3/4 cup)",
  ]);
  assert.equal(list[0].notes, "Tacos, Chili");
});

test("keyFromTitle ignores the quantity suffix", () => {
  assert.equal(keyFromTitle("Onions (3)"), "onion");
  assert.equal(keyFromTitle("onion"), "onion");
});

test("planExport marks duplicates and pantry items", () => {
  const list = buildGroceryList([tacos, chili]);
  const out = planExport(list, ["Onions (2)", "milk"], { pantry: ["Salt"] });
  const status = Object.fromEntries(out.map((i) => [i.name, i.status]));
  assert.deepEqual(status, { Onion: "duplicate", "Ground beef": "add", "Sour cream": "add", "Kidney beans": "add", Salt: "pantry" });
});
