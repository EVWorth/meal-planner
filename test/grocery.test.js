import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGroceryList, planExport, keyFromTitle, groupByAisle } from "../src/core/grocery.js";

const tacos = { name: "Tacos", ingredients: [
  { qty: 1, unit: "lb", item: "ground beef", aisle: "Meat & Seafood" },
  { qty: 1, unit: "", item: "onion", aisle: "Produce" },
  { qty: 0.5, unit: "cup", item: "sour cream", aisle: "Dairy & Eggs" },
  { qty: null, unit: "", item: "salt", aisle: "Spices" },
] };
const chili = { name: "Chili", ingredients: [
  { qty: 8, unit: "oz", item: "ground beef", aisle: "Meat & Seafood" },
  { qty: 2, unit: "", item: "Onions", aisle: "Produce" },
  { qty: 2, unit: "can", item: "kidney beans", aisle: "Canned & Jarred" },
  { qty: 4, unit: "tbsp", item: "sour cream", aisle: "Dairy & Eggs" },
] };

test("buildGroceryList merges across recipes and sorts by aisle", () => {
  const list = buildGroceryList([tacos, chili]);
  assert.deepEqual(list.map((i) => i.title), [
    "Onion (3)",
    "Ground beef (1 1/2 lb)",
    "Sour cream (3/4 cup)",
    "Salt",
    "Kidney beans (2 cans)",
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

test("groupByAisle", () => {
  const groups = groupByAisle(buildGroceryList([tacos, chili]));
  assert.deepEqual(groups.map((g) => [g.aisle, g.items.length]), [
    ["Produce", 1], ["Meat & Seafood", 1], ["Dairy & Eggs", 1], ["Spices", 1], ["Canned & Jarred", 1],
  ]);
});
